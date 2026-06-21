// src/managers/AudioManager.js — Audio system (paths, ambient, effects, UI)

export const AUDIO_PATHS = {
  // Legacy fallback
  ambient_day: 'audio/ambient_day_loop.mp3',
  ambient_night: 'audio/ambient_night_loop.mp3',
  // Area ambient loops
  amb_town_day: 'audio/amb_town_day_loop.wav',
  amb_town_night: 'audio/amb_town_night_loop.wav',
  amb_harbor_day: 'audio/amb_harbor_day_loop.wav',
  amb_harbor_night: 'audio/amb_harbor_night_loop.wav',
  amb_lighthouse: 'audio/amb_lighthouse_wind_loop.wav',
  amb_manor: 'audio/amb_manor_hall_loop.wav',
  amb_catacombs: 'audio/amb_catacombs_drip_loop.wav',
  amb_forest: 'audio/amb_forest_whisper_loop.wav',
  // Bell variants
  bell_normal: 'audio/bell_12_normal.wav',
  bell_reverse: 'audio/bell_13_reverse.wav',
  bell_underwater: 'audio/bell_13_underwater.wav',
  bell_wrong: 'audio/bell_13_wrong.wav',
  bell_memory: 'audio/bell_memory_after_death.wav',
  // SAN loss (tiered)
  san_loss: 'audio/san_drop_heartbeat.mp3',
  san_loss_minor: 'audio/san_loss_minor.wav',
  san_loss_medium: 'audio/san_loss_medium.wav',
  san_loss_major: 'audio/san_loss_major.wav',
  san_critical_breath: 'audio/san_critical_layer_breath.wav',
  // Death variants
  death_physical: 'audio/death_physical_short.wav',
  death_mental: 'audio/death_san_collapse.wav',
  death_hybrid: 'audio/death_hybrid_void.wav',
  // Madness
  madness: 'audio/madness_tinnitus.mp3',
  madness_loop: 'audio/madness_tinnitus_loop_short.wav',
  // Wall break / corruption
  wall_break: 'audio/break_wall_noise.mp3',
  catacombs_stone: 'audio/catacombs_stone_shift.wav',
  // Clue / discovery
  clue_found: 'audio/clue_found.wav',
  // Items
  item_gain: 'audio/item_gain.wav',
  item_use: 'audio/item_use.wav',
  // Skill checks
  skill_roll: 'audio/skill_roll.wav',
  skill_success: 'audio/skill_success.wav',
  skill_fail: 'audio/skill_fail.wav',
  skill_critical_fail: 'audio/skill_critical_fail.wav',
  // Loop system
  loop_memory: 'audio/loop_memory_flash.wav',
  loop_pollution: 'audio/loop_pollution_gain.wav',
  loop_restart: 'audio/loop_restart_breath.wav',
  // Area-specific events
  harbor_water_omen: 'audio/harbor_water_omen.wav',
  lighthouse_lens_crack: 'audio/lighthouse_lens_crack.wav',
  // Begin / first bell
  begin: 'audio/begin_low_bell.mp3',
  // Thirteenth bell entrance — Day 1 delayed hook (bell_reverse layered with low drone)
  bell_entrance: 'audio/bell_13_reverse.wav',
  // UI
  ui_click: 'audio/ui_click_soft.wav',
  ui_click_forbidden: 'audio/ui_click_forbidden.wav',
  ui_hover: 'audio/ui_hover_paper.wav',
  ui_panel_open: 'audio/ui_panel_open.wav',
  ui_panel_close: 'audio/ui_panel_close.wav',
  ui_log_write: 'audio/ui_log_write.wav',
  ui_save: 'audio/ui_save.wav',
  ui_error: 'audio/ui_error_soft.wav',
  // NPC trust tier change
  trust_tier_change: 'audio/clue_found.wav',
  // Safehouse / rest voice lines
  rest_generic: 'audio/安全屋休息 1.wav',
  rest_alt: 'audio/安全屋休息 2.wav',
  safehouse_breath: 'audio/安全屋像在呼吸.wav',
  safehouse_not_safe: 'audio/不能叫安全屋.wav',
  safehouse_wall: 'audio/不是门外，是墙里.wav',
};

// Area → ambient key mapping
export const AREA_AMBIENT_MAP = {
  town_center: 'amb_town',
  harbor_district: 'amb_harbor',
  lighthouse: 'amb_lighthouse',
  voxchester_manor: 'amb_manor',
  catacombs_entrance: 'amb_catacombs',
  deep_catacombs: 'amb_catacombs',
  ruins_of_yith: 'amb_catacombs',
  whispering_forest: 'amb_forest',
  forbidden_grove: 'amb_forest',
};

export const SUDDEN_EFFECTS = [
  'san_loss',
  'san_loss_minor',
  'san_loss_medium',
  'san_loss_major',
  'wall_break',
  'madness',
  'madness_loop',
  'death_physical',
  'death_mental',
  'death_hybrid',
];

export const audioManager = {
  muted: false,
  suddenMuted: false,
  ambientEl: null,
  _volumeScale: 1,
  _userVolumeScale: 1,
  _ambientScale: 1,
  _effectScale: 1,
  _uiScale: 1,
  // P2-4: Audio pool — reuse Audio objects for frequently played effects.
  // Avoids creating new Audio() on every play (prevents GC pressure on rapid triggers).
  _pool: {},
  _poolMaxPerSrc: 2,
  _getPoolEl(src) {
    if (!this._pool[src]) this._pool[src] = [];
    // Find an idle element (ended or paused at 0)
    for (var i = 0; i < this._pool[src].length; i++) {
      var el = this._pool[src][i];
      if (el.ended || el.paused && el.currentTime === 0) {
        return el;
      }
    }
    // Create new if pool not full
    if (this._pool[src].length < this._poolMaxPerSrc) {
      var newEl = new Audio(src);
      this._pool[src].push(newEl);
      return newEl;
    }
    // Pool full — reuse oldest
    return this._pool[src][0];
  },
  _play(src, loop = false, category = 'effect') {
    try {
      if (this.muted) return null;
      var catScale =
        category === 'ambient'
          ? this._ambientScale
          : category === 'ui'
            ? this._uiScale
            : this._effectScale;
      // P2-4: Use pool for non-looping effects; new Audio for ambient (single instance)
      var el;
      if (loop) {
        el = new Audio(src); // ambient: always new (single instance managed by stopAmbient)
      } else {
        el = this._getPoolEl(src);
        el.currentTime = 0; // rewind for reuse
      }
      el.loop = loop;
      el.volume = 0.5 * (this._volumeScale || 1) * catScale;
      var self = this;
      el.play().catch(function () {
        // Autoplay blocked — don't overwrite area/phase already saved by playAreaAmbient
        if (loop && !self._unlocked && !self._pendingAmbient) {
          self._pendingAmbient = { src: src };
        }
      });
      return el;
    } catch (e) {
      return null;
    }
  },
  playAreaAmbient(areaId, phase) {
    try {
      this.stopAmbient();
      // Save for autoplay unlock replay
      if (!this._unlocked) this._pendingAmbient = { area: areaId, phase: phase };
      const base = AREA_AMBIENT_MAP[areaId];
      if (!base) {
        this.ambientEl = this._play(
          phase === 'night' || phase === 'midnight'
            ? AUDIO_PATHS.ambient_night
            : AUDIO_PATHS.ambient_day,
          true,
          'ambient'
        );
        return;
      }
      const dayNightMap = { amb_town: 'amb_town', amb_harbor: 'amb_harbor' };
      if (dayNightMap[base]) {
        const suffix = phase === 'night' || phase === 'midnight' || phase === 'evening' ? '_night' : '_day';
        const key = base + suffix;
        this.ambientEl = this._play(AUDIO_PATHS[key], true, 'ambient');
      } else {
        this.ambientEl = this._play(AUDIO_PATHS[base], true, 'ambient');
      }
    } catch (e) {}
  },
  playAmbientDay() {
    try {
      this.stopAmbient();
      this.ambientEl = this._play(AUDIO_PATHS.ambient_day, true, 'ambient');
    } catch (e) {}
  },
  playAmbientNight() {
    try {
      this.stopAmbient();
      this.ambientEl = this._play(AUDIO_PATHS.ambient_night, true, 'ambient');
    } catch (e) {}
  },
  playEffect(type) {
    try {
      if (this.suddenMuted && SUDDEN_EFFECTS.includes(type)) return;
      const src = AUDIO_PATHS[type];
      if (src) this._play(src, false, 'effect');
    } catch (e) {}
  },
  playSanLoss(dmg) {
    try {
      if (this.suddenMuted) return;
      if (dmg >= 7) {
        this._play(AUDIO_PATHS.san_loss_major, false, 'effect');
        this._play(AUDIO_PATHS.san_critical_breath, false, 'effect');
      } else if (dmg >= 5) this._play(AUDIO_PATHS.san_loss_major, false, 'effect');
      else if (dmg >= 3) this._play(AUDIO_PATHS.san_loss_medium, false, 'effect');
      else if (dmg >= 1) this._play(AUDIO_PATHS.san_loss_minor, false, 'effect');
    } catch (e) {}
  },
  playSkillEffect(result) {
    try {
      if (result === 'critical_fail') this._play(AUDIO_PATHS.skill_critical_fail, false, 'effect');
      else if (result === 'fail') this._play(AUDIO_PATHS.skill_fail, false, 'effect');
      else if (result === 'success') this._play(AUDIO_PATHS.skill_success, false, 'effect');
      else this._play(AUDIO_PATHS.skill_roll, false, 'effect');
    } catch (e) {}
  },
  playUI(type) {
    try {
      const src = AUDIO_PATHS['ui_' + type] || AUDIO_PATHS.ui_click;
      if (src) this._play(src, false, 'ui');
    } catch (e) {}
  },
  stopAmbient() {
    try {
      if (this.ambientEl) {
        this.ambientEl.pause();
        this.ambientEl.currentTime = 0;
        this.ambientEl.src = '';  // 释放媒体资源引用，允许 GC 回收 Audio 对象
        this.ambientEl = null;
      }
    } catch (e) {}
  },
  setMuted(m) {
    this.muted = m;
    if (m) this.stopAmbient();
  },
  // Browser autoplay unlock: call on first user gesture (click/touch/keydown).
  // Creates a silent AudioContext, resumes it, and replays pending ambient.
  _unlocked: false,
  _pendingAmbient: null,
  unlock() {
    if (this._unlocked) return;
    this._unlocked = true;
    try {
      var actx = new (window.AudioContext || window.webkitAudioContext)();
      actx.resume().catch(function () {});
      // Browsers unlock all Audio elements after a user gesture;
      // replay the ambient that was blocked on first load.
      if (this._pendingAmbient) {
        var area = this._pendingAmbient.area;
        var phase = this._pendingAmbient.phase;
        this._pendingAmbient = null;
        this.playAreaAmbient(area, phase);
      }
    } catch (e) {}
  },
};
