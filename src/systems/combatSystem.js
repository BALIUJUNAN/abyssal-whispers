// src/systems/combatSystem.js — Turn-based combat system for monster encounters
// Data-driven: monster templates defined inline, scaled by difficulty.
// Integrates with existing skill check, SAN, and inventory systems.

import { rand } from '../reducers/utils.js';
import { applySanLoss } from '../reducers/utils.js';
import { getNpcTrustByRef } from '../utils/npcStateAccess.js';

// ── Monster Templates ──────────────────────────────────────────────
// Based on GD.systems.progression.combat_system design + game_meta monster_presence data.

var MONSTER_TEMPLATES = {
  deep_ones: {
    id: 'deep_ones',
    name: '深潜者',
    baseHp: 8,
    baseAttack: [2, 5],
    fearValue: 35,
    special: 'group', // attacks twice on partial/full presence
    immuneTo: [], // no immunity
    vulnerableTo: ['fire', 'holy'],
    description: '半人半鱼的怪物，身上覆盖着鳞片，眼睛突出。',
    stages: {
      trace: { name: '深潜者痕迹', hpMod: 0.3, attackMod: 0.5 },
      influence: { name: '深潜者影响', hpMod: 0.5, attackMod: 0.7 },
      partial_presence: { name: '深潜者阴影', hpMod: 0.8, attackMod: 1.0 },
      full_presence: { name: '深潜者', hpMod: 1.0, attackMod: 1.2 },
    },
  },
  night_gaunts: {
    id: 'night_gaunts',
    name: '夜魔',
    baseHp: 5,
    baseAttack: [1, 4],
    fearValue: 30,
    special: 'fast',
    immuneTo: [],
    vulnerableTo: [],
    description: '无面的黑色身影，发出刺耳的尖叫。',
    stages: {
      trace: { name: '夜魔痕迹', hpMod: 0.3, attackMod: 0.5 },
      influence: { name: '夜魔影响', hpMod: 0.5, attackMod: 0.7 },
      partial_presence: { name: '夜魔', hpMod: 0.8, attackMod: 1.0 },
      full_presence: { name: '夜魔群', hpMod: 1.0, attackMod: 1.3 },
    },
  },
  shoggoth: {
    id: 'shoggoth',
    name: '修格斯',
    baseHp: 15,
    baseAttack: [3, 8],
    fearValue: 50,
    special: 'regenerate',
    immuneTo: ['physical'], // immune to normal weapons
    vulnerableTo: ['fire', 'explosive'],
    description: '流动的黑色胶状物，没有固定形态。',
    stages: {
      trace: { name: '修格斯痕迹', hpMod: 0.3, attackMod: 0.5 },
      influence: { name: '修格斯影响', hpMod: 0.5, attackMod: 0.7 },
      partial_presence: { name: '修格斯', hpMod: 0.8, attackMod: 1.0 },
      full_presence: { name: '修格斯巨体', hpMod: 1.0, attackMod: 1.3 },
    },
  },
};

// Items that can be used in combat
var COMBAT_ITEMS = {
  flashlight: { type: 'light', effect: 'blind', damage: 2, desc: '强光致盲' },
  glowing_mushroom: { type: 'special', effect: 'confuse', damage: 1, desc: '致幻孢子' },
  silver_dagger: { type: 'weapon', effect: 'slash', damage: 4, desc: '银质武器' },
  deep_sea_water: { type: 'special', effect: 'sacrifice', damage: 0, desc: '深海之水' },
  bandage: { type: 'heal', effect: 'heal_self', heal: 2, desc: '包扎伤口' },
  tranquilizer: { type: 'heal', effect: 'heal_self', heal: 1, sanGain: 2, desc: '镇静剂' },
};

/**
 * Initialize combat state from a monster type and stage.
 * @param {string} creatureType - 'deep_ones' | 'night_gaunts' | 'shoggoth'
 * @param {string} stage - 'trace' | 'influence' | 'partial_presence' | 'full_presence'
 * @param {object} state - game state (for difficulty scaling)
 * @returns {object} combat state
 */
export function initCombat(creatureType, stage, state) {
  var template = MONSTER_TEMPLATES[creatureType];
  if (!template) return null;
  var stageData = template.stages[stage] || template.stages.partial_presence;
  var difficulty = state.difficulty || 'normal';
  var hpMult = difficulty === 'nightmare' ? 1.5 : difficulty === 'hard' ? 1.3 : 1.0;

  var maxHp = Math.ceil(template.baseHp * stageData.hpMod * hpMult);
  var attackMin = Math.floor(template.baseAttack[0] * stageData.attackMod * hpMult);
  var attackMax = Math.ceil(template.baseAttack[1] * stageData.attackMod * hpMult);

  return {
    active: true,
    creatureType: creatureType,
    creatureName: stageData.name || template.name,
    monsterHp: maxHp,
    monsterMaxHp: maxHp,
    monsterAttack: [Math.max(1, attackMin), Math.max(2, attackMax)],
    monsterFearValue: template.fearValue,
    monsterSpecial: template.special,
    monsterImmuneTo: template.immuneTo || [],
    monsterVulnerableTo: template.vulnerableTo || [],
    monsterDescription: template.description,
    turn: 'player', // 'player' | 'monster'
    round: 0,
    log: [],
    playerFled: false,
    monsterDefeated: false,
    fearCheckDone: false,
    fearCheckPassed: false,
    sanLossThisCombat: 0,
  };
}

/**
 * Execute a player combat action.
 * @param {object} combatState - current combat state
 * @param {string} actionType - 'attack' | 'flee' | 'item' | 'communicate'
 * @param {object} actionPayload - { itemId?, skill? }
 * @param {object} state - game state
 * @param {object} c - reducer context { narr, log, effects, bt, rng }
 * @param {object} ctx - { GD }
 * @returns {object} updated combat state
 */
export function executeCombatAction(combatState, actionType, actionPayload, state, c, ctx) {
  if (!combatState || !combatState.active) return combatState;
  if (combatState.turn !== 'player') return combatState;

  var updated = Object.assign({}, combatState);
  updated.round++;

  switch (actionType) {
    case 'attack':
      updated = _doAttack(updated, state, c, ctx);
      break;
    case 'flee':
      updated = _doFlee(updated, state, c, ctx);
      break;
    case 'item':
      updated = _doCombatItem(updated, actionPayload, state, c, ctx);
      break;
    case 'communicate':
      updated = _doCommunicate(updated, state, c, ctx);
      break;
    default:
      updated.log.push('无效的行动。');
      return updated;
  }

  // Check combat end conditions
  if (updated.monsterHp <= 0) {
    updated.monsterDefeated = true;
    updated.active = false;
    updated.turn = 'player';
    updated.log.push(combatState.creatureName + '被击败了！');
    c.narr('system', '【战斗胜利】' + updated.creatureName + '倒下了。', { isSpecial: true });
    c.bt.meta_boundary_breaks = (c.bt.meta_boundary_breaks || 0) + 1;
    c.effects.push({ type: 'AUDIO_PLAY', id: 'combat_victory' });
    return updated;
  }
  if (updated.playerFled) {
    updated.active = false;
    updated.turn = 'player';
    return updated;
  }

  // Switch to monster turn
  updated.turn = 'monster';
  return updated;
}

/**
 * Process the monster's turn.
 * @param {object} combatState - current combat state
 * @param {object} state - game state
 * @param {object} c - reducer context
 * @param {object} ctx - { GD }
 * @returns {object} updated combat state
 */
export function processMonsterTurn(combatState, state, c, ctx) {
  if (!combatState || !combatState.active) return combatState;
  if (combatState.turn !== 'monster') return combatState;

  var updated = Object.assign({}, combatState);
  var dmg = rand(updated.monsterAttack[0], updated.monsterAttack[1], c.rng);
  var sanDmg = Math.floor(dmg * 0.5);
  c.effects.push({ type: 'AUDIO_PLAY', id: 'combat_monster_attack' });

  // Monster special: 'group' attacks twice
  if (updated.monsterSpecial === 'group' && updated.round >= 2) {
    var extraDmg = rand(1, 3, c.rng);
    dmg += extraDmg;
    updated.log.push(updated.creatureName + '群体攻击！额外 +' + extraDmg + ' 伤害');
  }
  // Monster special: 'regenerate' heals 1 HP per turn
  if (updated.monsterSpecial === 'regenerate') {
    updated.monsterHp = Math.min(updated.monsterMaxHp, updated.monsterHp + 1);
    updated.log.push(updated.creatureName + '恢复了 1 HP');
  }

  // Apply damage to player
  state.hp = Math.max(0, state.hp - dmg);
  applySanLoss(state, sanDmg);
  updated.sanLossThisCombat = (updated.sanLossThisCombat || 0) + sanDmg;
  updated.log.push(updated.creatureName + '攻击！HP -' + dmg + ', SAN -' + sanDmg);
  c.narr('system', '【' + updated.creatureName + '攻击】HP -' + dmg + '，SAN -' + sanDmg, { isSpecial: true });

  // Check player death
  if (state.hp <= 0) {
    updated.active = false;
    updated.log.push('你倒下了...');
    return updated;
  }

  // Switch back to player turn
  updated.turn = 'player';
  return updated;
}

// ── Private Combat Actions ─────────────────────────────────────────

function _doAttack(combat, state, c, ctx) {
  c.effects.push({ type: 'AUDIO_PLAY', id: 'combat_attack' });
  var fightSkill = state.skills['格斗'] || state.skills['斗殴'] || 20;
  var weaponBonus = 0;
  // Check inventory for weapons
  var hasSilverWeapon = (state.inventory || []).some(function (i) {
    return i.id === 'silver_dagger' || i.id === 'trench_knife';
  });
  if (hasSilverWeapon) weaponBonus = 10;

  var threshold = 50 + weaponBonus;
  var roll = rand(1, 100, c.rng);
  var success = roll <= fightSkill && roll <= threshold;
  var critFail = roll >= 96;

  if (critFail) {
    var dmg = rand(1, 4, c.rng);
    state.hp = Math.max(0, state.hp - dmg);
    c.effects.push({ type: 'AUDIO_PLAY', id: 'combat_player_hurt' });
    combat.log.push('【大失败】攻击失误！HP -' + dmg);
    c.narr('system', '【攻击】掷骰 ' + roll + ' / 格斗' + fightSkill + ' —— 大失败！你被反击了。HP -' + dmg, { isSpecial: true });
  } else if (success) {
    var dmg2 = rand(3, 6, c.rng) + weaponBonus;
    // Check vulnerability
    var immune = combat.monsterImmuneTo.indexOf('physical') >= 0 && !hasSilverWeapon;
    if (immune) {
      c.effects.push({ type: 'AUDIO_PLAY', id: 'combat_miss' });
      combat.log.push(combat.creatureName + '免疫物理攻击！');
      c.narr('system', '【攻击】普通武器对 ' + combat.creatureName + ' 无效！', { isSpecial: true });
    } else {
      var vulnerable = combat.monsterVulnerableTo.some(function (v) {
        return v === 'fire' && (state.inventory || []).some(function (i) { return i.id === 'deep_sea_water'; });
      });
      if (vulnerable) dmg2 = Math.floor(dmg2 * 1.5);
      combat.monsterHp = Math.max(0, combat.monsterHp - dmg2);
      c.effects.push({ type: 'AUDIO_PLAY', id: 'combat_hit' });
      combat.log.push('【命中】造成 ' + dmg2 + ' 伤害');
      c.narr('system', '【攻击】掷骰 ' + roll + ' / 格斗' + fightSkill + ' —— 命中！造成 ' + dmg2 + ' 伤害', { isSpecial: true });
    }
  } else {
    c.effects.push({ type: 'AUDIO_PLAY', id: 'combat_miss' });
    combat.log.push('【未命中】攻击偏了');
    c.narr('system', '【攻击】掷骰 ' + roll + ' / 格斗' + fightSkill + ' —— 未命中。', { isSpecial: true });
  }
  return combat;
}

function _doFlee(combat, state, c, ctx) {
  var dodgeSkill = state.skills['闪避'] || 20;
  var roll = rand(1, 100, c.rng);
  var success = roll <= dodgeSkill;
  var fleeChance = success ? 0.7 : 0.3;
  if (c.rng.next() < fleeChance) {
    combat.playerFled = true;
    c.effects.push({ type: 'AUDIO_PLAY', id: 'combat_flee' });
    combat.log.push('逃跑成功！');
    c.narr('system', '【逃跑】你成功脱离了战斗。', { isSpecial: true });
  } else {
    c.effects.push({ type: 'AUDIO_PLAY', id: 'combat_monster_attack' });
    combat.log.push('逃跑失败！');
    c.narr('system', '【逃跑】你没能甩掉它。', { isSpecial: true });
    // Monster gets a free hit
    var dmg = rand(combat.monsterAttack[0], combat.monsterAttack[1], c.rng);
    state.hp = Math.max(0, state.hp - dmg);
    combat.log.push(combat.creatureName + '追击！HP -' + dmg);
  }
  return combat;
}

function _doCombatItem(combat, payload, state, c, ctx) {
  var itemId = payload && payload.itemId;
  if (!itemId) {
    combat.log.push('没有可用的战斗道具。');
    return combat;
  }
  var inv = (state.inventory || []);
  var idx = inv.findIndex(function (i) { return i.id === itemId; });
  if (idx < 0) {
    combat.log.push('物品不在背包中。');
    return combat;
  }
  var itemDef = COMBAT_ITEMS[itemId];
  c.effects.push({ type: 'AUDIO_PLAY', id: 'combat_item' });
  if (!itemDef) {
    // Fallback: try GD.items
    var GD = ctx.GD;
    var gdItem = (GD.items || []).find(function (i) { return i.id === itemId; });
    if (!gdItem || !gdItem.effects) {
      combat.log.push(itemId + '无法在战斗中使用。');
      return combat;
    }
    // Apply generic effects
    combat.log.push('使用了 ' + (gdItem.name || itemId));
    c.narr('system', '使用了 ' + (gdItem.name || itemId), { isSpecial: true });
    return combat;
  }
  // Apply combat item effect
  if (itemDef.effect === 'heal_self') {
    state.hp = Math.min(state.maxHp, state.hp + (itemDef.heal || 1));
    if (itemDef.sanGain) state.san = Math.min(state.maxSan, state.san + itemDef.sanGain);
    combat.log.push('使用 ' + itemDef.desc + '，恢复 HP +' + (itemDef.heal || 1));
    c.narr('system', '【使用】' + itemDef.desc + '，HP +' + (itemDef.heal || 1), { isSpecial: true });
  } else if (itemDef.effect === 'blind' || itemDef.effect === 'confuse') {
    var bonusDmg = itemDef.damage || 2;
    combat.monsterHp = Math.max(0, combat.monsterHp - bonusDmg);
    combat.log.push(itemDef.desc + '！造成 ' + bonusDmg + ' 伤害');
    c.narr('system', '【使用】' + itemDef.desc + '，造成 ' + bonusDmg + ' 伤害', { isSpecial: true });
  } else if (itemDef.effect === 'slash') {
    var slashDmg = itemDef.damage || 4;
    var isVulnerable = combat.monsterVulnerableTo.indexOf('physical') >= 0;
    if (isVulnerable) slashDmg = Math.floor(slashDmg * 1.5);
    combat.monsterHp = Math.max(0, combat.monsterHp - slashDmg);
    combat.log.push(itemDef.desc + '！造成 ' + slashDmg + ' 伤害');
    c.narr('system', '【使用】' + itemDef.desc + '，造成 ' + slashDmg + ' 伤害', { isSpecial: true });
  } else {
    combat.log.push('使用了 ' + itemDef.desc);
    c.narr('system', '使用了 ' + itemDef.desc, { isSpecial: true });
  }
  // Consume item
  if (inv[idx].uses === -1 || inv[idx].uses === undefined) {
    // Unconsumable (like flashlight) - just reduce a use counter temporarily
  } else if (inv[idx].uses <= 1) {
    inv.splice(idx, 1);
  } else {
    inv[idx].uses--;
  }
  return combat;
}

function _doCommunicate(combat, state, c, ctx) {
  c.effects.push({ type: 'AUDIO_PLAY', id: 'combat_communicate' });
  var psychSkill = state.skills['心理学'] || 10;
  var occultSkill = state.skills['神秘学'] || 0;
  var roll = rand(1, 100, c.rng);
  var bestSkill = Math.max(psychSkill, occultSkill);
  var success = roll <= bestSkill;

  if (success) {
    // Some monsters can be pacified
    if (combat.creatureType === 'deep_ones' && getNpcTrustByRef(state, '老费舍') >= 3) {
      combat.monsterHp = 0; // 老费舍 helps communicate
      combat.log.push('老费舍的信任帮助你与深潜者沟通。它们退去了。');
      c.narr('system', '【沟通】老费舍站出来说了几句话。深潜者缓缓退回了水中。', { isSpecial: true });
    } else if (combat.creatureType === 'night_gaunts') {
      combat.log.push('夜魔被你的坚定吓退了。');
      combat.monsterHp = Math.max(0, combat.monsterHp - 2);
      c.narr('system', '【沟通】你直视夜魔，没有退缩。它们似乎有些犹豫。', { isSpecial: true });
    } else {
      combat.log.push('沟通尝试成功，怪物犹豫了。');
      c.narr('system', '【沟通】你尝试与它交流。它似乎能理解你。', { isSpecial: true });
      combat.monsterHp = Math.max(0, combat.monsterHp - 1);
    }
    // Small SAN cost for trying
    applySanLoss(state, 1);
  } else {
    combat.log.push('沟通失败！');
    c.narr('system', '【沟通】你试着说话，但它没有回应。', { isSpecial: true });
    // Monster gets a free hit on failed communication
    var dmg = rand(combat.monsterAttack[0], Math.floor(combat.monsterAttack[1] * 0.7), c.rng);
    state.hp = Math.max(0, state.hp - dmg);
    combat.log.push(combat.creatureName + '趁机攻击！HP -' + dmg);
  }
  return combat;
}

/**
 * Check if a combat is still active.
 */
export function isCombatActive(combatState) {
  return !!(combatState && combatState.active);
}

/**
 * Get available combat actions for the current state.
 */
export function getCombatActions(combatState, state) {
  if (!combatState || !combatState.active) return [];
  if (combatState.turn !== 'player') return [];

  var actions = [
    { type: 'attack', label: '⚔️ 攻击', desc: '使用格斗技能', icon: '⚔️' },
    { type: 'flee', label: '🏃 逃跑', desc: '闪避检定', icon: '🏃' },
    { type: 'communicate', label: '💬 沟通', desc: '心理学/神秘学', icon: '💬' },
  ];

  // Add usable items from inventory
  var inv = state.inventory || [];
  var usableItems = inv.filter(function (item) {
    return COMBAT_ITEMS[item.id] || (item.effects && item.effects.length > 0);
  });
  if (usableItems.length > 0) {
    actions.push({ type: 'item', label: '🎒 道具', desc: usableItems.map(function (i) { return i.name; }).join(', '), icon: '🎒', items: usableItems });
  }

  return actions;
}
