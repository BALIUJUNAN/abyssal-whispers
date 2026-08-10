// src/data/registry/eventRegistry.js — Centralized event index and analysis.
//
// Provides a single authoritative view of ALL events from ALL sources.
// Pure functions — no module-level mutable state (ADR-017).
//
// Usage:
//   import { getAllEvents, getEventsByArea, getCoverageReport } from './registry/eventRegistry.js';
//   const events = getAllEvents(GD);                    // flat array, deduplicated, tagged
//   const areaEvents = getEventsByArea(events, 'harbor_district');
//   const report = getCoverageReport(events, GD);

import { ALL_EXTENDED_EVENTS } from '../extended_events_index.js';
import { EVENTS as ch2plusEvents } from '../events/events_ch2plus.js';
import { supplement_events } from '../events/events_supplement.js';
import { EVENTS as deathEchoEvents } from '../events/events_death_echo.js';
import { getDeathMetaEvents } from '../events/events_death_meta.js';
import { DEATH_COUNT_META_EVENTS } from '../events/events_death_count_meta.js';
import { events_legendary } from '../events/events_legendary.js';
import { FEAR_ENDINGS } from '../events/events_fear_endings.js';
import { BEHAVIOR_ENDINGS } from '../behavior_endings.js';
import { OMENS } from '../events/events_omens_600.js';
import { ENDING_PLAYER_BECOMES_EVENT } from '../ending_missing_600.js';

// ── Category Definitions ───────────────────────────────────────────
// Each category: id, label, source file, getter, whether it enters the selection pool.

var CATEGORY_DEFS = [
  { id: 'core_extended', label: '核心扩展', source: 'extended_events_index.js', getter: function () { return ALL_EXTENDED_EVENTS; }, isPool: true },
  { id: 'ch2plus', label: 'Ch2+章节', source: 'events_ch2plus.js', getter: function () { return ch2plusEvents; }, isPool: true },
  { id: 'supplement', label: '补充事件', source: 'events_supplement.js', getter: function () { return supplement_events; }, isPool: true },
  { id: 'death_echo', label: '死亡回声', source: 'events_death_echo.js', getter: function () { return deathEchoEvents; }, isPool: true },
  { id: 'death_meta', label: '死亡元叙事', source: 'events_death_meta.js', getter: function () { return getDeathMetaEvents(); }, isPool: true },
  { id: 'death_count_meta', label: '死亡阈值', source: 'events_death_count_meta.js', getter: function () { return DEATH_COUNT_META_EVENTS; }, isPool: false },
  { id: 'legendary', label: '传奇事件', source: 'events_legendary.js', getter: function () { return events_legendary; }, isPool: true },
  { id: 'fear_endings', label: '恐惧结局', source: 'events_fear_endings.js', getter: function () { return FEAR_ENDINGS; }, isPool: false },
  { id: 'behavior_endings', label: '行为结局', source: 'behavior_endings.js', getter: function () { return BEHAVIOR_ENDINGS; }, isPool: false },
  { id: 'omens', label: '预兆600', source: 'events_omens_600.js', getter: function () { return OMENS; }, isPool: false },
  { id: 'missing_600', label: '第600事件', source: 'ending_missing_600.js', getter: function () { return [ENDING_PLAYER_BECOMES_EVENT]; }, isPool: false },
];

// Base events are loaded from GD at runtime (from game_base.json / game_base/narrative.json).
// They are tagged with category 'base' by getAllEvents().

// ── Core Collection Functions ──────────────────────────────────────

/**
 * Collect all events from all registered categories, plus base events from GD.
 * Deduplicates by id (first-seen wins — base events take priority).
 * Tags each event with _category and _source for traceability.
 *
 * @param {object} GD - global game data (must have GD.events[] for base events)
 * @returns {Array} flat array of all events, deduplicated
 */
export function getAllEvents(GD) {
  var seen = {};
  var result = [];

  // Phase 1: Base events from GD (highest priority — first-seen wins)
  var baseEvents = (GD && GD.events) ? GD.events : [];
  for (var i = 0; i < baseEvents.length; i++) {
    var e = baseEvents[i];
    if (!e || !e.id) continue;
    if (seen[e.id]) continue;
    seen[e.id] = true;
    result.push({
      _category: 'base',
      _source: 'game_base',
      _index: result.length,
      id: e.id,
      name: e.name,
      type: e.type,
      subtype: e.subtype,
      tier: e.tier,
      quality_tier: e.quality_tier,
      weight: e.weight || 1,
      trigger: e.trigger || {},
      description: e.description || '',
      effects: e.effects || {},
      choices: e.choices || [],
      tags: e.tags || [],
      event_classification: e.event_classification,
      distortion_variants: e.distortion_variants || {},
      unreliable_narration_level: e.unreliable_narration_level || 0,
      normalcy_anchor: e.normalcy_anchor || false,
      _raw: e,
    });
  }

  // Phase 2: Registered categories
  for (var c = 0; c < CATEGORY_DEFS.length; c++) {
    var cat = CATEGORY_DEFS[c];
    var events;
    try {
      events = cat.getter();
    } catch (err) {
      continue; // skip categories that fail to load
    }
    if (!Array.isArray(events)) continue;
    for (var j = 0; j < events.length; j++) {
      var evt = events[j];
      if (!evt || !evt.id) continue;
      if (seen[evt.id]) continue; // dedup: base wins
      seen[evt.id] = true;
      result.push({
        _category: cat.id,
        _source: cat.source,
        _index: result.length,
        id: evt.id,
        name: evt.name || evt.id,
        type: evt.type || cat.id,
        subtype: evt.subtype || '',
        tier: evt.tier || 'normal',
        quality_tier: evt.quality_tier || 'C',
        weight: evt.weight || 1,
        trigger: evt.trigger || {},
        description: evt.description || '',
        effects: evt.effects || {},
        choices: evt.choices || [],
        tags: evt.tags || [],
        event_classification: evt.event_classification || '',
        distortion_variants: evt.distortion_variants || {},
        unreliable_narration_level: evt.unreliable_narration_level || 0,
        normalcy_anchor: evt.normalcy_anchor || false,
        _raw: evt,
      });
    }
  }

  return result;
}

/**
 * Get all events that can trigger in a specific area.
 *
 * @param {Array} events - flat event array from getAllEvents()
 * @param {string} areaId - area identifier
 * @returns {Array} events matching the area
 */
export function getEventsByArea(events, areaId) {
  return events.filter(function (e) {
    var areas = e.trigger && e.trigger.areas;
    if (!areas || areas.length === 0) return false;
    // Wildcard events (e.g., virtual events with areas: ['*'])
    if (areas.indexOf('*') >= 0) return true;
    return areas.indexOf(areaId) >= 0;
  });
}

/**
 * Get all events from a specific category.
 *
 * @param {Array} events - flat event array from getAllEvents()
 * @param {string} categoryId - category identifier
 * @returns {Array} events in the category
 */
export function getEventsByCategory(events, categoryId) {
  return events.filter(function (e) {
    return e._category === categoryId;
  });
}

// ── Analysis Functions ─────────────────────────────────────────────

/**
 * Generate a coverage report across all axes.
 *
 * @param {Array} events - flat event array from getAllEvents()
 * @param {object} GD - global game data (for area definitions)
 * @returns {object} coverage report with per-area, per-tier, per-category counts and gaps
 */
export function getCoverageReport(events, GD) {
  var areas = {};
  var tiers = {};
  var categories = {};
  var types = {};
  var totalPool = 0;

  // Initialize area counts from GD if available
  var gdAreas = (GD && GD.areas) ? GD.areas : [];
  for (var a = 0; a < gdAreas.length; a++) {
    areas[gdAreas[a].id] = { count: 0, events: [], label: gdAreas[a].name || gdAreas[a].id, isCanonical: true };
  }

  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    if (!e._raw) continue;

    // Tiers
    var tier = e.tier || 'unknown';
    tiers[tier] = (tiers[tier] || 0) + 1;

    // Categories
    var cat = e._category || 'unknown';
    categories[cat] = (categories[cat] || 0) + 1;

    // Types
    var type = e.type || 'unknown';
    types[type] = (types[type] || 0) + 1;

    // Areas (only pool events have meaningful area coverage)
    if (e._raw.trigger && e._raw.trigger.areas) {
      var evtAreas = e._raw.trigger.areas;
      for (var j = 0; j < evtAreas.length; j++) {
        var areaId = evtAreas[j];
        if (areaId === '*') continue; // wildcard
        if (!areas[areaId]) {
          // Some events use contextual scopes (for example safehouse/tavern)
          // that are not explorable world areas. Keep them visible in the
          // report, but do not judge them by world-area coverage thresholds.
          areas[areaId] = { count: 0, events: [], label: areaId, isCanonical: gdAreas.length === 0 };
        }
        areas[areaId].count++;
        areas[areaId].events.push(e.id);
      }
    }

    if (e._raw.isPool !== false) totalPool++;
  }

  // Identify gaps
  var underServed = [];
  var overServed = [];
  for (var areaId in areas) {
    var a = areas[areaId];
    if (!a.isCanonical) continue;
    if (a.count < 10) underServed.push({ area: areaId, count: a.count, label: a.label, severity: a.count < 5 ? 'critical' : 'warn' });
    else if (a.count > 150) overServed.push({ area: areaId, count: a.count, label: a.label });
  }
  underServed.sort(function (x, y) { return x.count - y.count; });
  overServed.sort(function (x, y) { return y.count - x.count; });

  return {
    totalEvents: events.length,
    totalPool: totalPool,
    byArea: areas,
    byTier: tiers,
    byCategory: categories,
    byType: types,
    underServed: underServed,
    overServed: overServed,
  };
}

/**
 * Detect potentially redundant event pairs using Jaccard similarity on description keywords
 * and trigger area overlap.
 *
 * @param {Array} events - flat event array from getAllEvents()
 * @param {number} threshold - Jaccard similarity threshold (0-1, default 0.7)
 * @returns {Array} groups of potentially redundant events
 */
export function detectRedundancy(events, threshold) {
  threshold = threshold || 0.7;
  var groups = [];
  var poolEvents = events.filter(function (e) { return e.description && e.description.length > 20; });

  for (var i = 0; i < poolEvents.length; i++) {
    for (var j = i + 1; j < poolEvents.length; j++) {
      var a = poolEvents[i];
      var b = poolEvents[j];

      // Must share at least one area
      var aAreas = (a.trigger && a.trigger.areas) || [];
      var bAreas = (b.trigger && b.trigger.areas) || [];
      var sharedAreas = aAreas.filter(function (x) { return bAreas.indexOf(x) >= 0; });
      if (sharedAreas.length === 0 && !(aAreas.indexOf('*') >= 0 || bAreas.indexOf('*') >= 0)) continue;

      // Compute Jaccard similarity on description keywords
      var tokensA = tokenize(a.description);
      var tokensB = tokenize(b.description);
      if (tokensA.length < 3 || tokensB.length < 3) continue;

      var intersection = tokensA.filter(function (t) { return tokensB.indexOf(t) >= 0; }).length;
      var union = tokensA.length + tokensB.length - intersection;
      var sim = union > 0 ? intersection / union : 0;

      if (sim >= threshold) {
        groups.push({
          eventA: a.id,
          eventB: b.id,
          similarity: Math.round(sim * 100) / 100,
          sharedAreas: sharedAreas,
          sharedTokens: intersection,
        });
      }
    }
  }

  // Sort by similarity descending
  groups.sort(function (x, y) { return y.similarity - x.similarity; });
  return groups;
}

/**
 * Simulate weighted event selection to identify events that never fire.
 *
 * @param {Array} events - flat event array from getAllEvents()
 * @param {number} iterations - number of simulated selections (default 1000)
 * @returns {object} simulation results with frequency stats
 */
export function simulateSelection(events, iterations) {
  iterations = iterations || 1000;
  var poolEvents = events.filter(function (e) { return e._raw && e._raw.isPool !== false; });
  var frequencies = {};
  var totalWeight = 0;

  // Compute total weight
  for (var i = 0; i < poolEvents.length; i++) {
    totalWeight += poolEvents[i].weight || 1;
  }

  // Monte Carlo simulation
  for (var iter = 0; iter < iterations; iter++) {
    // rng-exempt: offline coverage Monte Carlo, never used for gameplay selection.
    var r = Math.random() * totalWeight;
    var cum = 0;
    for (var k = 0; k < poolEvents.length; k++) {
      cum += poolEvents[k].weight || 1;
      if (r <= cum) {
        frequencies[poolEvents[k].id] = (frequencies[poolEvents[k].id] || 0) + 1;
        break;
      }
    }
  }

  // Compute stats
  var neverSelected = [];
  var lowFrequency = [];
  var highFrequency = [];

  for (var m = 0; m < poolEvents.length; m++) {
    var id = poolEvents[m].id;
    var freq = frequencies[id] || 0;
    var expected = ((poolEvents[m].weight || 1) / totalWeight) * iterations;
    var ratio = expected > 0 ? freq / expected : 0;

    if (freq === 0) neverSelected.push({ id: id, weight: poolEvents[m].weight, expected: Math.round(expected) });
    else if (ratio < 0.3) lowFrequency.push({ id: id, weight: poolEvents[m].weight, actual: freq, expected: Math.round(expected), ratio: Math.round(ratio * 100) / 100 });
    else if (freq > iterations * 0.05) highFrequency.push({ id: id, weight: poolEvents[m].weight, actual: freq });
  }

  return {
    totalPool: poolEvents.length,
    iterations: iterations,
    neverSelected: neverSelected,
    lowFrequency: lowFrequency,
    topFrequency: highFrequency.slice(0, 5),
    totalWeight: Math.round(totalWeight * 100) / 100,
  };
}

/**
 * Validate EVENT_BUDGET feasibility.
 * Checks if minPerRun can be achieved given maxPerDay constraints over a 28-day run.
 *
 * @param {Array} events - flat event array from getAllEvents()
 * @returns {Array} budget issues (empty = all feasible)
 */
export function validateBudgetFeasibility(events) {
  var issues = [];

  // EVENT_BUDGET from extendedEvents.js — replicated here to avoid circular import
  var EVENT_BUDGET = {
    loop_locked: { maxPerDay: 2, minPerRun: 10 },
    humanity: { maxPerDay: 2, minPerRun: 6 },
    mythos: { maxPerDay: 2, minPerRun: 6 },
    resource_pressure: { maxPerDay: 1, minPerRun: 5 },
    npc_cross: { maxPerDay: 1, minPerRun: 4 },
    area_deep: { maxPerDay: 2, minPerRun: 12 },
    silent: { maxPerDay: 3, minPerRun: 0 },
    meta: { maxPerRun: 2, minPerRun: 0 },
  };

  var DAYS = 28;

  for (var type in EVENT_BUDGET) {
    var budget = EVENT_BUDGET[type];
    if (!budget.minPerRun || budget.minPerRun === 0) continue;

    var maxPossible = (budget.maxPerDay || 999) * DAYS;
    if (maxPossible < budget.minPerRun) {
      issues.push({
        severity: 'critical',
        type: type,
        message: type + ': maxPerDay(' + (budget.maxPerDay || '∞') + ') * ' + DAYS + ' = ' + maxPossible + ' < minPerRun(' + budget.minPerRun + ') — IMPOSSIBLE',
        maxPossible: maxPossible,
        minRequired: budget.minPerRun,
      });
    } else {
      // Check if enough events exist in the pool for this type
      var available = events.filter(function (e) {
        return e.type === type && e._raw && e._raw.isPool !== false;
      }).length;
      if (available < budget.minPerRun) {
        issues.push({
          severity: 'high',
          type: type,
          message: type + ': only ' + available + ' events in pool, but minPerRun is ' + budget.minPerRun,
          available: available,
          minRequired: budget.minPerRun,
        });
      }
    }
  }

  return issues;
}

/**
 * Model pool exhaustion: simulate N explore actions and report consumption.
 *
 * @param {Array} events - flat event array from getAllEvents()
 * @param {Array} exploreCounts - array of explore counts to simulate (default [10, 25, 50, 100])
 * @returns {object} exhaustion stats per explore count
 */
export function modelPoolExhaustion(events, exploreCounts) {
  exploreCounts = exploreCounts || [10, 25, 50, 100];
  var poolEvents = events.filter(function (e) { return e._raw && e._raw.isPool !== false; });
  var oncePerRun = poolEvents.filter(function (e) { return e._raw.once_per_run; }).length;
  var totalPool = poolEvents.length;

  var results = {};
  for (var c = 0; c < exploreCounts.length; c++) {
    var n = exploreCounts[c];
    // Simplistic model: each explore picks a unique event (optimistic)
    // Real behavior depends on weights and trigger conditions
    var uniqueSeen = Math.min(n, totalPool);
    var onceConsumed = Math.min(n, oncePerRun);
    results[n] = {
      explores: n,
      uniqueEventsSeen: uniqueSeen,
      totalPool: totalPool,
      exhaustionRate: Math.round((uniqueSeen / totalPool) * 1000) / 10,
      oncePerRunConsumed: onceConsumed,
      oncePerRunTotal: oncePerRun,
    };
  }

  return results;
}

/**
 * Generate actionable recommendations from coverage analysis.
 *
 * @param {object} report - coverage report from getCoverageReport()
 * @param {Array} redundancy - redundancy groups from detectRedundancy()
 * @param {object} selection - selection simulation from simulateSelection()
 * @param {Array} budgetIssues - budget issues from validateBudgetFeasibility()
 * @returns {Array} prioritized recommendations
 */
export function generateRecommendations(report, redundancy, selection, budgetIssues) {
  var recs = [];

  // Budget issues
  for (var b = 0; b < (budgetIssues || []).length; b++) {
    var issue = budgetIssues[b];
    recs.push({
      priority: issue.severity === 'critical' ? 'critical' : 'high',
      type: 'budget',
      category: issue.type,
      message: issue.message,
    });
  }

  // Under-served areas
  for (var u = 0; u < (report.underServed || []).length; u++) {
    var area = report.underServed[u];
    recs.push({
      priority: area.severity === 'critical' ? 'high' : 'medium',
      type: 'coverage',
      category: 'area',
      target: area.area,
      message: area.area + ' (' + area.label + '): only ' + area.count + ' events (target: 20+)',
    });
  }

  // Redundancy
  for (var r = 0; r < (redundancy || []).length; r++) {
    var pair = redundancy[r];
    if (pair.similarity >= 0.85) {
      recs.push({
        priority: 'medium',
        type: 'redundancy',
        category: 'merge',
        target: pair.eventA + ' + ' + pair.eventB,
        message: pair.eventA + ' + ' + pair.eventB + ' (similarity: ' + pair.similarity + ') — consider merging or removing',
      });
    }
  }

  // Never-selected events
  for (var s = 0; s < (selection.neverSelected || []).length; s++) {
    var ns = selection.neverSelected[s];
    recs.push({
      priority: ns.expected > 5 ? 'high' : 'medium',
      type: 'weight',
      category: 'never_selected',
      target: ns.id,
      message: ns.id + ' (weight: ' + ns.weight + ', expected ' + ns.expected + ' selections in 1000 sims) — increase weight or remove',
    });
  }

  // Sort by priority
  var order = { critical: 0, high: 1, medium: 2, low: 3 };
  recs.sort(function (a, b) { return (order[a.priority] || 9) - (order[b.priority] || 9); });

  return recs;
}

// ── Utility ────────────────────────────────────────────────────────

/**
 * Tokenize text for similarity comparison.
 * Chinese-aware: splits on whitespace and punctuation, removes stop words.
 *
 * @param {string} text
 * @returns {Array} unique tokens
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];

  // Split on whitespace and punctuation, keep Chinese characters and words
  var raw = text
    .toLowerCase()
    .replace(/[，。！？、；：""''【】（）《》\s\d\W]/g, ' ')
    .split(/\s+/)
    .filter(function (t) { return t.length >= 2; });

  // Chinese stop words to filter
  var stopWords = {
    '的': 1, '了': 1, '在': 1, '是': 1, '有': 1, '和': 1, '就': 1,
    '都': 1, '要': 1, '会': 1, '可以': 1, '看到': 1, '听到': 1, '感到': 1,
    '这个': 1, '那个': 1, '什么': 1, '怎么': 1, '为什么': 1, '但是': 1,
    '如果': 1, '然后': 1, '因为': 1, '所以': 1, '或者': 1, '虽然': 1,
    '一个': 1, '一些': 1, '某种': 1, '似乎': 1, '好像': 1, '也许': 1,
    '非常': 1, '有点': 1, '有些': 1, '更加': 1, '开始': 1, '继续': 1,
    '知道': 1, '觉得': 1, '认为': 1, '发现': 1, '注意': 1, '注意': 1,
  };

  var unique = {};
  for (var i = 0; i < raw.length; i++) {
    var t = raw[i];
    if (!stopWords[t] && !unique[t]) {
      unique[t] = true;
    }
  }
  return Object.keys(unique);
}

// ── Registration API ───────────────────────────────────────────────

/**
 * Register a new event category.
 * Call this before getAllEvents() if you need custom categories.
 *
 * @param {object} category - { id, label, source, getter, isPool }
 */
export function registerEventCategory(category) {
  if (!category || !category.id || !category.getter) {
    throw new Error('registerEventCategory: id and getter are required');
  }
  // Remove existing entry with same id
  for (var i = 0; i < CATEGORY_DEFS.length; i++) {
    if (CATEGORY_DEFS[i].id === category.id) {
      CATEGORY_DEFS.splice(i, 1);
      break;
    }
  }
  CATEGORY_DEFS.push(category);
}

/**
 * Get all registered category definitions.
 * @returns {Array} category definitions
 */
export function getEventCategories() {
  return CATEGORY_DEFS.map(function (c) {
    return { id: c.id, label: c.label, source: c.source, isPool: c.isPool };
  });
}
