// src/reducers/slices/coreSlice.js - Extracted from gameReducer
// START_GAME, SET_DIFFICULTY, SET_ARCHETYPE, ROLL_STATS, BEGIN_ADVENTURE, NEW_GAME, CONTINUE_GAME, SWITCH_SAFEHOUSE

import { rollDice, clamp } from '../utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { audio, hooks, fx } from '../../engine/commands.js';
import { initialState } from '../../state/initialState.js';
import { initPrologueState } from '../prologueReducer.js';
import { genObjectives } from '../objectiveReducer.js';
import { getChapterForDay } from '../chapterReducer.js';
import { initLoopState } from '../loopReducer.js';
import { buildPreviousRunSummary } from '../extendedEvents.js';
import { ensureExtendedState } from '../extendedEventsLoader.js';
import { clearSave } from '../../engine/SaveManager.js';
import {
  addRunMemory,
  getNpcTrust,
  setNpcTrust,
  CH1_INTRO,
  applyBlessing,
} from '../../utils/appHelpers.js';
import { initSkills } from '../../utils/gameHelpers.js';
import { hasClueId } from '../../utils/clueNameMap.js';
import { getAreaSceneImage } from '../../portraitMap.js';

export function handleCoreAction(s, action, c, ctx) {
  var GD = ctx.GD;
  switch (action.type) {
    case 'START_GAME':
      s.screen = 'prologue';
      s.prologue = initPrologueState();
      s.fearTuning = null;
      s.skills = initSkills();
      return s;
    case 'SET_DIFFICULTY':
      s.difficulty = action.difficulty;
      return s;
    case 'SET_ARCHETYPE':
      s.archetype = action.archetypeId;
      return s;
    case 'ROLL_STATS': {
      const d =
        (GD.systems?.player?.default_template || GD.module5_player?.default_template || {})
          .base_stats || {};
      const st = {};
      Object.entries(d).forEach(([k, v]) => {
        st[k] = typeof v === 'object' ? rollDice(v.dice) * (v.multiplier ?? 5) : 50;
      });
      // Fallback: if base_stats was empty (GD not loaded), use safe defaults
      const _statNames = ['STR', 'CON', 'DEX', 'APP', 'POW', 'INT', 'SIZ', 'EDU'];
      const _statDefaults = {
        STR: 50,
        CON: 55,
        DEX: 55,
        APP: 50,
        POW: 60,
        INT: 65,
        SIZ: 60,
        EDU: 70,
      };
      _statNames.forEach((k) => {
        if (typeof st[k] !== 'number' || isNaN(st[k]) || st[k] <= 0) st[k] = _statDefaults[k];
      });
      // Apply archetype stat modifiers (P1-1)
      const archDef = (GD.systems?.player?.archetypes || []).find((a) => a.id === s.archetype);
      if (archDef?.stat_modifiers) {
        Object.entries(archDef.stat_modifiers).forEach(([k, v]) => {
          st[k] = (st[k] || 50) + v;
        });
      }
      // Enforce minimum stat floor (prevent 0/negative from bad data or extreme modifiers)
      _statNames.forEach((k) => {
        if (typeof st[k] === 'number') st[k] = Math.max(1, st[k]);
      });
      s.stats = st;
      s.maxHp = Math.max(1, Math.floor((st.CON + st.SIZ) / 10));
      s.hp = s.maxHp;
      s.san = st.POW;
      s.maxSan = 99;
      s.luck = rollDice('3d6') * 5;
      s.mp = Math.max(1, Math.floor(st.POW / 5));
      // Occultist SAN penalty: reduced maxSan ceiling, not starting SAN
      if (archDef?.starting_san_penalty) {
        s.san = Math.max(1, s.san - archDef.starting_san_penalty);
        s.maxSan = Math.floor(s.maxSan * 0.7);
      }
      // Floor SAN at 40 for Chapter 1 pacing.
      // 20% of players roll POW<40 (3d6×5), which would drop them straight into
      // explanation_loss (level 3) — text corruption, AP penalty, accelerated decay.
      // Chapter 1 should be "slowly tightening", not "already broken".
      // Occultist's cost is the maxSan cap (69 vs 99), not a crippled start.
      s.san = Math.max(40, s.san);
      s.skills = { ...initSkills() };
      s.skills['闪避'] = Math.floor(st.DEX / 2);
      s.skills['意志'] = Math.floor(st.POW / 2);
      // Apply archetype skill bonuses (P1-1)
      if (archDef?.skill_bonuses) {
        Object.entries(archDef.skill_bonuses).forEach(([k, v]) => {
          s.skills[k] = (s.skills[k] || 0) + v;
        });
      }
      return s;
    }
    case 'BEGIN_ADVENTURE': {
      s.screen = 'game';
      s.objectives = genObjectives(1, ctx);
      // Typed commands (src/engine/commands.js) — replaces raw effect objects
      fx(c.effects, audio.play('begin'), audio.ambient(s.currentArea || 'town_center', 'morning'));
      // SAN visual corruption: now handled by SanPollutionLayer component (no init needed)
      s.currentChapter = getChapterForDay(s.day, ctx).key || 'chapter_1';
      // Apply archetype NPC trust mods (P1-1)
      const archDef2 = (GD.systems?.player?.archetypes || []).find((a) => a.id === s.archetype);
      if (archDef2?.npc_trust_mod) {
        Object.entries(archDef2.npc_trust_mod).forEach(([npc, v]) => {
          setNpcTrust(s, npc, getNpcTrust(s, npc) + v);
        });
      }
      // Apply loop shop purchased effects
      if (s._shopBonusSkillPoints > 0) {
        // Distribute bonus skill points to top skills
        const skillKeys = Object.keys(s.skills).filter(k => s.skills[k] > 0);
        if (skillKeys.length > 0) {
          const target = c.pick(skillKeys);
          s.skills[target] = (s.skills[target] || 0) + s._shopBonusSkillPoints;
          c.narr('system', '你感到某些知识比上次更清晰了。' + target + ' +' + s._shopBonusSkillPoints);
        }
      }
      if (s._shopNpcTrustBonus > 0) {
        // Apply trust bonus to a random NPC
        const coreNpcs = (GD.npcs || []).filter(n => n.chapter_1_availability === 'core');
        if (coreNpcs.length > 0) {
          const target = c.pick(coreNpcs);
          setNpcTrust(s, target.name, getNpcTrust(s, target.name) + s._shopNpcTrustBonus);
          c.narr('system', target.name + '似乎对你有一种莫名的熟悉感。');
        }
      }
      if (s._shopRandomRare) {
        // Grant a random rare item (from curated pool)
        var rarePool = [
          { id: 'deep_one_scale', name: '深海之鳞' },
          { id: 'zar_scroll_fragment', name: '扎尔之卷碎片' },
          { id: 'drowned_bracelet', name: '溺亡者的手镯' },
          { id: 'lens_fragment', name: '透镜碎片' },
          { id: 'pocket_watch', name: '怀表' },
        ];
        var hasIds = (s.inventory || []).map(function (i) { return i.id; });
        var available = rarePool.filter(function (r) { return hasIds.indexOf(r.id) < 0; });
        if (available.length > 0) {
          var rare = c.pick(available);
          s.inventory = s.inventory || [];
          s.inventory.push({ id: rare.id, name: rare.name, uses: -1 });
          c.narr('system', '你的口袋里多了一样东西——' + rare.name + '。你不记得什么时候放进去的。');
        }
        s._shopRandomRare = false; // consumed
      }
      if (s.loopCount > 0) {
        fx(c.effects, audio.play('loop_restart'), audio.play('loop_memory'), audio.play('bell_memory'));
        const drt = GD.implementation_notes?.death_restart_text?.death_types;
        const restartTexts =
          s.lastDeathType === 'mental'
            ? drt?.mental_death?.restart_text
            : drt?.physical_death?.restart_text;
        const loopKey =
          s.loopCount >= GAME_BALANCE.LOOP_TEXT_VARIANT_5
            ? 'loop_5_plus'
            : s.loopCount >= GAME_BALANCE.LOOP_TEXT_VARIANT_3 && s.lastDeathType === 'mental'
              ? 'loop_3_plus'
              : 'loop_' + s.loopCount;
        const restartText = restartTexts?.[loopKey];
        if (restartText) {
          c.narr('system', restartText, { locationName: '轮回·第' + s.loopCount + '次' });
        } else {
          c.narr('system', '你再次睁开眼。浓雾、鹅卵石、紧闭的窗帘——一切都似曾相识。', {
            locationName: '轮回·第' + s.loopCount + '次',
          });
        }
        if (s.pollution > 0) {
          c.narr(
            'system',
            '世界似乎比你记忆中的更加……不对劲。污染指数：' + Math.round(s.pollution * 100) + '%'
          );
        }
        // Death insurance: item retained from previous run
        if (s._deathInsuranceItem) {
          c.narr('system', '你的手里握着一样东西——' + s._deathInsuranceItem + '。你不记得是怎么保住它的。');
          s._deathInsuranceItem = null;
        }
        // Apply loop blessings
        const bKey2 = s.loopCount <= 5 ? 'loop_' + s.loopCount : 'loop_6_plus';
        const curBlessing = GD.systems?.loop?.loop_blessings?.[bKey2];
        if (curBlessing) applyBlessing(s, curBlessing, c.narr, ctx);
        // Loop blessing + cost: atmospheric hints, never explicit numbers
        // "You feel something different but can't name it"
        {
          const loopEffect = GD.systems?.loop?.loop_count_effects?.[bKey2];
          if (curBlessing || loopEffect) {
            // Atmospheric blessing hints — never mention numbers
            const blessingHints = [
              '你又回来了。你觉得自己对这座城市更熟悉了——有些路，你好像本来就知道怎么走。',
              '你隐约感到某些东西在帮助你。不是善意——更像是某种交易的余温。',
              '你口袋里多了一样你不记得什么时候放进去的东西。',
              '你发现自己能读懂一些以前读不懂的暗示了。这不是好事。',
            ];
            const costHints = [
              '但你也感觉到了——你的灵魂又薄了一层。有些感觉，再也找不回来了。',
              '但你的影子比上次淡了一点。你注意到了。你没有在意。',
              '但你照镜子的时候，总觉得镜子里的人比你晚了一瞬才动。',
              '但你听到自己的心跳声比以前远了一点。',
            ];
            c.narr('system', blessingHints[Math.min(s.loopCount - 1, blessingHints.length - 1)] || blessingHints[0], { isSpecial: true });
            c.narr('system', costHints[Math.min(s.loopCount - 1, costHints.length - 1)] || costHints[0], { isSpecial: true });
          }
        }
      }
      CH1_INTRO.forEach((block) =>
        c.narr(block.type, block.text, { locationName: block.locationName })
      );
      // P2: Day 1 unskippable opening cut — "那一刀"
      if (!s.triggeredEvents.includes('evt_day1_opening_cut')) {
        s.triggeredEvents.push('evt_day1_opening_cut');
        const cutText =
          '公告栏最下面有一张新的失踪告示。\n纸面干燥，边缘还没有卷起。\n\n照片里的人低着头，外套领口沾着海盐。\n\n你认出那件外套。\n\n你低头看了一眼自己。\n同一颗纽扣，缺了一半。\n\n告示下方写着：\n失踪时间：今天傍晚。';
        c.narr('event', cutText, {
          eventTitle: '第一张告示',
          eventType: 'opening_cut',
          isSpecial: true,
          imageSrc: getAreaSceneImage(s.currentArea, {
            ...c.view,
            visits: (s.visitedAreas || []).filter((a) => a === s.currentArea).length,
          }),
          imageAlt: '第一张告示',
        });
        if (!hasClueId(s.clues, 'clue_missing_notice_self'))
          s.clues.push({ id: 'clue_missing_notice_self', name: '你的失踪告示' });
        addRunMemory(s, '你在公告栏上看见了自己的失踪告示。', 'opening_cut');
      }
      s.ch1IntroComplete = true;
      addRunMemory(s, s.loopCount > 0 ? '再次踏入沃切斯特' : '初次踏入沃切斯特', 'loop');
      c.log(s.loopCount > 0 ? '第' + s.loopCount + '次轮回开始' : '冒险开始');
      // Thirteenth bell entrance hook: audio + canvas glitch, 6s after game start.
      if (s.loopCount <= 0) {
        c.effects.push(hooks.bellEntrance());
      }
      return s;
    }
    case 'NEW_GAME': {
      // Track refusal of final choice (player chose to loop again rather than accept ending)
      if (s.ending) c.bt.final_choice_refused_count = (c.bt.final_choice_refused_count || 0) + 1;
      // Achievement stats
      c.effects.push({ type: 'INCREMENT_STAT', key: 'total_runs' });
      // Reset early hooks so the thirteenth bell fires on the next BEGIN_ADVENTURE
      c.effects.push(hooks.reset());
      if (s.hp <= 0 || s.san <= 0) c.effects.push({ type: 'INCREMENT_STAT', key: 'total_deaths' });
      // Build previous run summary before reset (extended events system)
      const prevSummary = buildPreviousRunSummary(s);
      const f = initialState();
      // P0-L: 全部循环搬入逻辑已提取至 loopReducer.initLoopState()
      initLoopState(f, s, ctx, { prevSummary });
      clearSave();
      return f;
    }
    case 'CONTINUE_GAME': {
      // Copy saved state fields onto the Immer draft (mutate, don't replace)
      const saved = action.savedState;
      if (saved && typeof saved === 'object') {
        Object.keys(saved).forEach((k) => {
          s[k] = saved[k];
        });
      }
      s.screen = 'game';
      s.transition = null;
      s.narrative = [{ id: Date.now(), type: 'system', text: '—— 你从存档中醒来。' }];
      ensureExtendedState(s);
      return s;
    }
    case 'LOOP_SHOP_PURCHASE': {
      const itemId = action.itemId;
      const cost = action.cost || 0;
      if ((s.endingCoins || 0) < cost) return s;
      if (!s.purchasedShopItems) s.purchasedShopItems = [];
      if (s.purchasedShopItems.includes(itemId)) return s;
      s.endingCoins -= cost;
      s.purchasedShopItems.push(itemId);
      // Apply immediate effects
      const shopEffects = {
        shop_skill_points: () => { s._shopBonusSkillPoints = (s._shopBonusSkillPoints || 0) + 3; },
        shop_npc_trust: () => { s._shopNpcTrustBonus = (s._shopNpcTrustBonus || 0) + 2; },
        shop_resistance: () => { s._shopMythosResistance = (s._shopMythosResistance || 0) + 0.1; },
        shop_death_insurance: () => { s._shopDeathInsurance = true; },
        shop_san_cap_boost: () => { s._shopSanCapBoost = (s._shopSanCapBoost || 0) + 5; },
        shop_random_rare: () => { s._shopRandomRare = true; },
      };
      if (shopEffects[itemId]) shopEffects[itemId]();
      return s;
    }
    case 'SWITCH_SAFEHOUSE': {
      const shName = action.safehouse;
      if (shName === 'main') {
        s.currentSafehouse = 'main';
        c.narr('system', '你决定回到原来的酒馆安全屋。');
      } else {
        const alts = GD.systems?.safehouse?.relocation_rules?.alternative_safehouses || [];
        const sh = alts.find((a) => a.name === shName);
        if (sh) {
          s.currentSafehouse = sh.name;
          c.narr('system', '你搬到了' + sh.name + '。' + (sh.drawback || ''));
        }
      }
      return s;
    }
    case 'GLITCH_PULSE': {
      // Canvas distortion pulse — strength 1-10, read by SanPollutionLayer
      s.glitchPulse = Math.max(1, Math.min(10, action.strength || 5));
      return s;
    }
    case 'GLITCH_PULSE_CLEAR': {
      s.glitchPulse = 0;
      return s;
    }
    case 'RESIST_SAN_DRAIN': {
      // AbyssPopup resist mechanic: player taps to resist, costs SAN
      var drainAmt = Math.max(1, action.amount || 1);
      s.san = clamp(s.san - drainAmt, 0, s.maxSan);
      return s;
    }
    default:
      return null;
  }
}
