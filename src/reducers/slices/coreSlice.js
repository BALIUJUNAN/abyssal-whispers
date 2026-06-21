// src/reducers/slices/coreSlice.js - Core game setup slice
// START_GAME, SET_DIFFICULTY, SET_ARCHETYPE, ROLL_STATS, SWITCH_SAFEHOUSE, GLITCH_PULSE, RESIST_SAN_DRAIN
//
// BEGIN_ADVENTURE → adventureSlice.js (handleAdventureAction)
// NEW_GAME / CONTINUE_GAME / LOOP_SHOP_PURCHASE → loopSlice.js (handleLoopAction)

import { rollDice, clamp } from '../utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { audio, hooks, fx } from '../../engine/commands.js';
import { initPrologueState } from '../prologueReducer.js';
import { initSkills } from '../../utils/gameHelpers.js';
import { getAreaSceneImage } from '../../portraitMap.js';

export function handleCoreAction(s, action, c, ctx) {
  switch (action.type) {
    case 'START_GAME':
      s.screen = 'prologue';
      s.prologue = initPrologueState();
      s.fearTuning = null;
      s.skills = initSkills();
      return null;
    case 'SET_DIFFICULTY': {
      const lv = action.difficulty;
      s.difficultyLevel = lv;
      // 向后兼容：映射到旧的字符串key供 game_base.json 的 difficulty_levels 查表
      s.difficulty = lv <= 1 ? 'normal' : lv <= 2 ? 'hard' : 'nightmare';
      return null;
    }
    case 'SET_ARCHETYPE':
      s.archetype = action.archetypeId;
      return null;
    case 'ROLL_STATS': {
      const d =
        (ctx.GD.systems?.player?.default_template || ctx.GD.module5_player?.default_template || {})
          .base_stats || {};
      const st = {};
      Object.entries(d).forEach(([k, v]) => {
        st[k] = typeof v === 'object' ? rollDice(v.dice) * (v.multiplier ?? 5) : 50;
      });
      // Fallback: if base_stats was empty (GD not loaded), use safe defaults
      const _statNames = ['STR', 'CON', 'DEX', 'APP', 'POW', 'INT', 'SIZ', 'EDU'];
      const _statDefaults = {
        STR: 50, CON: 55, DEX: 55, APP: 50, POW: 60,
        INT: 65, SIZ: 60, EDU: 70,
      };
      _statNames.forEach((k) => {
        if (typeof st[k] !== 'number' || isNaN(st[k]) || st[k] <= 0) st[k] = _statDefaults[k];
      });
      // Apply archetype stat modifiers (P1-1)
      const archDef = (ctx.GD.systems?.player?.archetypes || []).find((a) => a.id === s.archetype);
      if (archDef?.stat_modifiers) {
        Object.entries(archDef.stat_modifiers).forEach(([k, v]) => {
          st[k] = (st[k] || 50) + v;
        });
      }
      // Enforce minimum stat floor
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
      return null;
    }
    case 'SWITCH_SAFEHOUSE': {
      const shName = action.safehouse;
      if (shName === 'main') {
        s.currentSafehouse = 'main';
        c.narr('system', '你决定回到原来的酒馆安全屋。');
      } else {
        const alts = ctx.GD.systems?.safehouse?.relocation_rules?.alternative_safehouses || [];
        const sh = alts.find((a) => a.name === shName);
        if (sh) {
          s.currentSafehouse = sh.name;
          c.narr('system', '你搬到了' + sh.name + '。' + (sh.drawback || ''));
        }
      }
      return null;
    }
    case 'GLITCH_PULSE': {
      // Canvas distortion pulse — strength 1-10, read by SanPollutionLayer
      s.glitchPulse = Math.max(1, Math.min(10, action.strength || 5));
      return null;
    }
    case 'GLITCH_PULSE_CLEAR': {
      s.glitchPulse = 0;
      return null;
    }
    case 'RESIST_SAN_DRAIN': {
      // AbyssPopup resist mechanic: player taps to resist, costs SAN
      const drainAmt = Math.max(1, action.amount || 1);
      s.san = clamp(s.san - drainAmt, 0, s.maxSan);
      return null;
    }
    default:
      return null;
  }
}
