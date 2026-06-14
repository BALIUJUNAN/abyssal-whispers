// src/systems/eventDebugger.js — Event selection explainability tool (P1-D)
// Diagnoses WHY an event was excluded or selected in the current game state.
// Used by DevPanel to show human-readable event selection debug info.

/**
 * Explain the event selection pipeline for the current game state.
 * For each event in the pool, reports whether it's eligible or excluded (with reasons).
 * For eligible events, reports the computed weight.
 *
 * @param {string} areaId - current area
 * @param {object} state - game state (read-only snapshot)
 * @param {object} ctx - context with GD
 * @returns {{ eligible: object[], excluded: object[], summary: object }}
 */
export function explainEventSelection(areaId, state, ctx) {
  var GD = ctx.GD;
  var allEvents = GD.events || [];
  var eligible = [];
  var excluded = [];

  // Import check functions from extendedEvents
  // We re-implement a lightweight version to capture exclusion reasons
  // without modifying the core event system.
  var triggeredEvents = state.triggeredEvents || [];
  var clues = state.clues || [];
  var loop = state.loopCount || 0;
  var humanity = state.humanityScore ?? 50;
  var mythos = state.mythosLevel || 0;
  var san = state.san || 60;
  var hp = state.hp || 11;
  var maxHp = state.maxHp || 11;
  var food = state.food || 0;
  var light = state.lightLevel || 0;
  var safehouseCorr = state.safehouseCorruption || 0;
  var day = state.day || 1;
  var currentChapter = state.currentChapter || 'chapter_1';

  function hasClue(clueId) {
    return clues.some(function (c) {
      if (typeof c === 'string') return c === clueId;
      return c.id === clueId;
    });
  }

  for (var i = 0; i < allEvents.length; i++) {
    var evt = allEvents[i];
    var reasons = [];
    var t = evt.trigger;

    // Area check
    if (!t || !t.areas || t.areas.length === 0) {
      reasons.push('no_trigger_or_areas');
    } else if (!t.areas.includes(areaId)) {
      reasons.push('area_mismatch');
    }

    // Once-per-run
    if (t && t.once_per_run && triggeredEvents.includes(evt.id)) {
      reasons.push('once_per_run_used');
    }

    // Once-ever
    if (t && t.once_ever && (state.everTriggeredEvents || []).includes(evt.id)) {
      reasons.push('once_ever_used');
    }

    // Cooldown
    var cooldowns = state.eventCooldowns || {};
    if (t && t.cooldown_days && cooldowns[evt.id]) {
      var elapsed = day - cooldowns[evt.id];
      if (elapsed < t.cooldown_days) {
        reasons.push('cooldown(' + elapsed + '/' + t.cooldown_days + ')');
      }
    }

    // Chapter requirement
    if (t && t.chapter && day <= 7 && t.chapter > 1) {
      reasons.push('chapter_mismatch');
    }

    // Required clues/events
    if (t && t.requires && t.requires.length > 0) {
      for (var ri = 0; ri < t.requires.length; ri++) {
        var req = t.requires[ri];
        if (req.startsWith('san_below_')) {
          if (san >= parseInt(req.replace('san_below_', ''))) {
            reasons.push('req:' + req);
          }
        } else if (req.startsWith('san_above_')) {
          if (san < parseInt(req.replace('san_above_', ''))) {
            reasons.push('req:' + req);
          }
        } else if (!hasClue(req) && !triggeredEvents.includes(req)) {
          reasons.push('missing:' + req);
        }
      }
    }

    // Required prev events
    if (t && t.requires_prev_event) {
      for (var rpi = 0; rpi < t.requires_prev_event.length; rpi++) {
        if (!triggeredEvents.includes(t.requires_prev_event[rpi])) {
          reasons.push('missing_event:' + t.requires_prev_event[rpi]);
        }
      }
    }

    // Required clues (explicit)
    if (t && t.requires_clues) {
      for (var rc = 0; rc < t.requires_clues.length; rc++) {
        if (!hasClue(t.requires_clues[rc])) {
          reasons.push('missing_clue:' + t.requires_clues[rc]);
        }
      }
    }

    // Required items
    if (t && t.requires_items) {
      var inv = state.inventory || [];
      for (var ri2 = 0; ri2 < t.requires_items.length; ri2++) {
        var found = inv.some(function (item) {
          return item.id === t.requires_items[ri2] || item.name === t.requires_items[ri2];
        });
        if (!found) reasons.push('missing_item:' + t.requires_items[ri2]);
      }
    }

    // Loop bounds
    if (t && t.min_loop != null && loop < t.min_loop) reasons.push('min_loop(' + t.min_loop + ')');
    if (t && t.max_loop != null && loop > t.max_loop) reasons.push('max_loop(' + t.max_loop + ')');

    // Humanity bounds
    if (t && t.humanity_min != null && humanity < t.humanity_min) reasons.push('humanity_min(' + t.humanity_min + ')');
    if (t && t.humanity_max != null && humanity > t.humanity_max) reasons.push('humanity_max(' + t.humanity_max + ')');

    // Mythos
    if (t && t.min_mythos != null && mythos < t.min_mythos) reasons.push('min_mythos(' + t.min_mythos + ')');

    // SAN bounds
    if (t && t.san_lte != null && san > t.san_lte) reasons.push('san_lte(' + t.san_lte + ')');
    if (t && t.san_gte != null && san < t.san_gte) reasons.push('san_gte(' + t.san_gte + ')');

    // HP ratio
    if (t && t.hp_lte_ratio != null && (hp / maxHp) > t.hp_lte_ratio) {
      reasons.push('hp_ratio(' + t.hp_lte_ratio + ')');
    }

    // Resources
    if (t && t.food_lte != null && food > t.food_lte) reasons.push('food_lte(' + t.food_lte + ')');
    if (t && t.light_lte != null && light > t.light_lte) reasons.push('light_lte(' + t.light_lte + ')');
    if (t && t.safehouse_corruption_gte != null && safehouseCorr < t.safehouse_corruption_gte) {
      reasons.push('safehouse_corr(' + t.safehouse_corruption_gte + ')');
    }

    // NPC requirements
    if (t && t.npc_trust_gte) {
      var npcTrust = state.npcTrust || {};
      for (var npc in t.npc_trust_gte) {
        if ((npcTrust[npc] || 0) < t.npc_trust_gte[npc]) {
          reasons.push('npc_trust:' + npc + '(' + t.npc_trust_gte[npc] + ')');
        }
      }
    }

    // NPC alive/dead
    if (t && t.npc_alive) {
      var npcStates = state.npcStates || {};
      for (var na = 0; na < t.npc_alive.length; na++) {
        if (npcStates[t.npc_alive[na]] && npcStates[t.npc_alive[na]].dead) {
          reasons.push('npc_dead:' + t.npc_alive[na]);
        }
      }
    }
    if (t && t.npc_dead) {
      var npcStates2 = state.npcStates || {};
      for (var nd = 0; nd < t.npc_dead.length; nd++) {
        if (!npcStates2[t.npc_dead[nd]] || !npcStates2[t.npc_dead[nd]].dead) {
          reasons.push('npc_alive:' + t.npc_dead[nd]);
        }
      }
    }

    // Forbidden flags
    if (t && t.forbidden_flags) {
      for (var ff = 0; ff < t.forbidden_flags.length; ff++) {
        if (hasClue(t.forbidden_flags[ff]) || triggeredEvents.includes(t.forbidden_flags[ff])) {
          reasons.push('forbidden:' + t.forbidden_flags[ff]);
        }
      }
    }

    // Max per day category
    if (t && t.max_per_day_category) {
      var catToday = (state.categoryCountsToday || {})[evt.type] || 0;
      if (catToday >= t.max_per_day_category) {
        reasons.push('max_per_day(' + catToday + '/' + t.max_per_day_category + ')');
      }
    }

    // Time phase
    if (t && t.time_phase && t.time_phase.length > 0) {
      var phaseRatio = state.maxAp > 0 ? state.ap / state.maxAp : 0;
      var phase = phaseRatio > 0.66 ? 'morning' : phaseRatio > 0.33 ? 'afternoon' : phaseRatio > 0 ? 'evening' : 'midnight';
      if (!t.time_phase.includes(phase)) {
        reasons.push('time_phase(' + phase + ')');
      }
    }

    var entry = {
      id: evt.id || ('event_' + i),
      name: evt.name || evt.id || '(unnamed)',
      type: evt.type || evt.event_classification || 'unknown',
      area: (t && t.areas) ? t.areas.join(',') : '?',
    };

    if (reasons.length > 0) {
      entry.reasons = reasons;
      entry.primaryReason = reasons[0];
      excluded.push(entry);
    } else {
      // Eligible — compute weight (simplified version of getEventWeight)
      var weight = evt.weight || 1.0;
      if (evt.trigger && evt.trigger.probability != null && evt.trigger.probability < 1) {
        weight *= evt.trigger.probability;
      }
      // Quality tier modifier
      if (evt.quality_tier === 'C') weight *= 0.6;
      else if (evt.quality_tier === 'B') weight *= 0.85;
      entry.weight = Math.round(weight * 100) / 100;
      eligible.push(entry);
    }
  }

  // Sort eligible by weight descending
  eligible.sort(function (a, b) { return b.weight - a.weight; });

  // Summary statistics
  var reasonCounts = {};
  for (var ei = 0; ei < excluded.length; ei++) {
    var r = excluded[ei].primaryReason || 'unknown';
    var category = r.split('(')[0].split(':')[0]; // normalize: cooldown(...) → cooldown
    reasonCounts[category] = (reasonCounts[category] || 0) + 1;
  }

  return {
    area: areaId,
    day: day,
    san: san,
    totalEvents: allEvents.length,
    eligibleCount: eligible.length,
    excludedCount: excluded.length,
    eligible: eligible.slice(0, 20), // top 20
    excluded: excluded.slice(0, 30), // top 30 (grouped by reason)
    reasonCounts: reasonCounts,
    topWeights: eligible.slice(0, 10).map(function (e) {
      return e.name + ' (' + e.weight + ')';
    }),
  };
}
