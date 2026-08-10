// src/systems/sanFeedback.js — SAN loss feedback by severity tier
// Different presentation for small/medium/large/critical SAN losses.

/**
 * Classify a SAN loss amount into a severity tier.
 * @param {number} amount   - SAN lost (positive number)
 * @param {object} state    - game state (for context: current SAN, maxSan)
 * @returns {{ tier, label, color, duration, screenEffect, soundId, narrative }}
 */
export function getSanLossPresentation(amount, state, rng) {
  const san = state?.san ?? 50;
  const maxSan = state?.maxSan ?? 99;
  const ratio = san / maxSan;

  // Tier 1: Minor (1-3 SAN) — subtle, barely noticeable
  if (amount <= 3) {
    return {
      tier: 'minor',
      label: '轻微不安',
      color: 'var(--san-mid, #f39c12)',
      duration: 300, // ms
      screenEffect: 'none',
      soundId: 'san_loss_minor',
      narrative: _pickRandom([
        '一阵轻微的寒意。',
        '你眨了眨眼，刚才发生了什么？',
        '远处传来一声叹息。不是风。',
      ], rng),
    };
  }

  // Tier 2: Moderate (4-8 SAN) — noticeable, screen tint
  if (amount <= 8) {
    return {
      tier: 'moderate',
      label: '精神侵蚀',
      color: 'var(--danger2, #e67e22)',
      duration: 600,
      screenEffect: 'vignette_flash',
      soundId: 'san_loss_medium',
      narrative: _pickRandom([
        '你的视线模糊了一瞬。墙壁似乎在呼吸。',
        '有什么东西在你耳边低语。你不想听清它说了什么。',
        '你的手在发抖。这不是恐惧——是更深层的东西。',
      ], rng),
    };
  }

  // Tier 3: Severe (9-15 SAN) — alarming, strong distortion
  if (amount <= 15) {
    return {
      tier: 'severe',
      label: '理智崩裂',
      color: 'var(--danger, #c0392b)',
      duration: 1200,
      screenEffect: 'screen_shake',
      soundId: 'san_loss_major',
      narrative: _pickRandom([
        '你的视野扭曲了。现实像湿纸一样皱缩。',
        '你听到了自己的尖叫声——但你的嘴没有张开。',
        '世界裂开了一条缝。你从缝隙里看到了不该看到的东西。',
      ], rng),
    };
  }

  // Tier 4: Critical (16+ SAN) — near-death, extreme
  return {
    tier: 'critical',
    label: '濒临疯狂',
    color: '#8e44ad',
    duration: 2000,
    screenEffect: 'full_distortion',
    soundId: 'san_critical_breath',
    narrative: _pickRandom([
      '你感到自己正在溶解。不是身体——是更核心的东西。',
      '你试图抓住一个念头。任何念头。但思绪像水一样从指缝间流走。',
      '你看到了沃切斯特的真面目。只有一瞬间。但足够了。',
    ], rng),
  };
}

/**
 * Get SAN stage feedback for the current SAN value.
 * Uses the san_stages from game_base.json.
 * @param {number} san - current SAN
 * @param {object} ctx - { GD }
 * @returns {{ stage, description, ambientText, uiHints }}
 */
export function getSanStageFeedback(san, ctx) {
  const { GD } = ctx;
  const stages = GD.systems?.sanity?.san_stages || [];

  let current = stages[0];
  for (const stage of stages) {
    if (san >= stage.range[0] && san <= stage.range[1]) { current = stage; break; }
  }
  if (san <= 0) {
    return {
      stage: 'death',
      description: '理智归零。',
      ambientText: '',
      uiHints: { heartbeat: false, distortion: 0, vignette: 0 },
    };
  }

  const uiHints = {
    stable:          { heartbeat: false, distortion: 0, vignette: 0 },
    mild_erosion:    { heartbeat: false, distortion: 0.1, vignette: 0.1 },
    perception_shift:{ heartbeat: true,  distortion: 0.2, vignette: 0.2 },
    explanation_loss:{ heartbeat: true,  distortion: 0.4, vignette: 0.3 },
    reality_dissolution: { heartbeat: true, distortion: 0.7, vignette: 0.5 },
    narrative_death: { heartbeat: true,  distortion: 1.0, vignette: 0.7 },
  };

  return {
    stage: current?.id || 'stable',
    description: current?.description || '',
    ambientText: current?.ambient_text || '',
    uiHints: uiHints[current?.id] || uiHints.stable,
  };
}

function _pickRandom(arr, rng) {
  return rng ? rng.pick(arr) : arr[0];
}
