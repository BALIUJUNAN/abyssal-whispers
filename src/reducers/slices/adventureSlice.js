// src/reducers/slices/adventureSlice.js — BEGIN_ADVENTURE handler
// Extracted from coreSlice.js (was lines 115-331)
//
// Handles: BEGIN_ADVENTURE

import { audio, hooks, fx } from '../../engine/commands.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { applyDifficultyToState } from '../../state/difficultyState.js';
import { pick } from '../utils.js';
import {
  addRunMemory,
  getNpcTrust,
  setNpcTrust,
  CH1_INTRO,
  applyBlessing,
  hasClueId,
  checkSilentEvent,
} from '../../utils/appHelpers.js';
import { getAreaSceneImage } from '../../portraitMap.js';
import { checkSanLegacy } from '../../systems/sanConsequenceChain.js';
import { getLegacyForCategory, applyDeathLegacy } from '../../systems/deathLegacies.js';
import { getDeathCountMetaEvent } from '../../data/events/events_death_count_meta.js';
import { syncTriggeredSet, hasTriggered } from '../../utils/triggeredSet.js';
import { genObjectives } from '../objectiveReducer.js';
import { getChapterForDay } from '../chapterReducer.js';

export function handleAdventureAction(s, action, c, ctx) {
  const GD = ctx.GD;
  switch (action.type) {
    case 'BEGIN_ADVENTURE': {
      s.screen = 'game';
      // 应用13级难度设置
      const diffLv = s.difficultyLevel || 1;
      Object.assign(s, applyDifficultyToState(s, diffLv));
      // 难度起始资源：覆盖初始 food / AP
      if (s.difficultyStartingFood !== undefined) {
        s.food = s.difficultyStartingFood;
      }
      if (s.difficultyStartingAp !== undefined) {
        s.ap = s.difficultyStartingAp;
      }
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
        const rarePool = [
          { id: 'deep_one_scale', name: '深海之鳞' },
          { id: 'zar_scroll_fragment', name: '扎尔之卷碎片' },
          { id: 'drowned_bracelet', name: '溺亡者的手镯' },
          { id: 'lens_fragment', name: '透镜碎片' },
          { id: 'pocket_watch', name: '怀表' },
        ];
        const hasIds = (s.inventory || []).map(function (i) { return i.id; });
        const available = rarePool.filter(function (r) { return hasIds.indexOf(r.id) < 0; });
        if (available.length > 0) {
          const rare = c.pick(available);
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
        // ── Death legacies: consume active legacies from last death ──
        if (s.deathLegacies && s.deathLegacies.length > 0) {
          for (let li = 0; li < s.deathLegacies.length; li++) {
            const leg = s.deathLegacies[li];
            if (leg && leg.effects) {
              applyDeathLegacy(s, leg, c.narr, ctx, c.rng);
            }
          }
          s.deathLegacies = []; // consumed
        }
        // ── Death attribution narrative: display from last death ──
        if (s.deathAttributionNarrative && s.loopCount > 0) {
          const attr = s.deathAttributionNarrative;
          const attrTitle = attr.attributionHint
            ? '【' + attr.attributionHint.trim() + '】'
            : '';
          c.narr('system', attrTitle + attr.title, { isSpecial: true });
          if (attr.lastMoment) {
            c.narr('system', attr.lastMoment, { isSpecial: true });
          }
          s.deathAttributionNarrative = null; // consumed
        }
        // ── Death count meta events: check if threshold was crossed ──
        if (s._pendingDeathCountMeta) {
          const metaEvt = s._pendingDeathCountMeta;
          const metaDesc = metaEvt.event.description;
          c.narr('meta', metaDesc, {
            eventTitle: metaEvt.event.name,
            eventType: 'death_count_meta',
            isSpecial: true,
            intimacyLevel: metaEvt.event.intimacy_level || 1,
          });
          s._pendingDeathCountMeta = null;
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
        // SAN legacy: inject madness memory events based on previous loop collapse count
        if (s.loopCount > 1) {
          const _prevForLegacy = s._prevRunStateForSanLegacy || null;
          const _legacy = checkSanLegacy(_prevForLegacy);
          if (_legacy.madnessEvent) {
            c.narr('event', _legacy.madnessEvent.text, {
              eventTitle: _legacy.madnessEvent.name,
              eventType: 'madness_memory',
              isSpecial: true,
            });
            if (_legacy.madnessEvent.effect && _legacy.madnessEvent.effect.san) {
              s.san = Math.max(0, (s.san || 0) + _legacy.madnessEvent.effect.san);
              c.narr('system', 'SAN ' + _legacy.madnessEvent.effect.san, { isEffect: true });
            }
            s.triggeredEvents.push(_legacy.madnessEvent.id);
            syncTriggeredSet(s, _legacy.madnessEvent.id);
            addRunMemory(s, '疯狂记忆——' + _legacy.madnessEvent.name + '（第' + _legacy.collapseCount + '次崩溃）', 'madness_memory');
          }
          // Cleanup: don't persist legacy reference into game state
          delete s._prevRunStateForSanLegacy;
        }
      }
      CH1_INTRO.forEach((block) =>
        c.narr(block.type, block.text, { locationName: block.locationName })
      );
      // P2: Day 1 unskippable opening cut — "那一刀"
      if (!hasTriggered(s, 'evt_day1_opening_cut')) {
        s.triggeredEvents.push('evt_day1_opening_cut');
        syncTriggeredSet(s, 'evt_day1_opening_cut');
        const cutText =
          '公告栏最下面有一张新的失踪告示。\n纸面干燥，边缘还没有卷起。\n\n照片里的人低着头，外套领口沾着海盐。\n\n你认出那件外套。\n\n你低头看了一眼自己。\n同一颗纽扣，缺了一半。\n\n告示下方写着：\n失踪时间：今天傍晚。';
        c.narr('event', cutText, {
          eventTitle: '第一张告示',
          eventType: 'opening_cut',
          isSpecial: true,
          imageSrc: getAreaSceneImage(s.currentArea, {
            ...c.view,
            visits: (s.visitedAreas || []).filter((a) => a === s.currentArea).visitCount || 1,
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
      // Level 13: schedule periodic reality distortion glitch pulses
      if (s.difficultyLevel === 13 && !s._level13GlitchInterval) {
        // Interval is stored on state; cleared on NEW_GAME or death
        s._level13GlitchScheduled = true;
      }
      // Level 13 SAN inheritance narrative
      if (s._inheritanceNarrative && s.loopCount > 1) {
        c.narr('system', s._inheritanceNarrative, { isSpecial: true });
        delete s._inheritanceNarrative;
      }
      return null;
    }
    default:
      return null;
  }
}
