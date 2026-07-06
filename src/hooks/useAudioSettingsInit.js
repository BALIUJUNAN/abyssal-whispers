// src/hooks/useAudioSettingsInit.js
// Phase 1 extract: useEffect #4 — Sync settings to audioManager on mount
import { useEffect } from 'react';
import { audioManager } from '../managers/AudioManager.js';

export function useAudioSettingsInit(settings) {
  useEffect(function () {
    audioManager._volumeScale = settings.volume / 100;
    audioManager._userVolumeScale = settings.volume / 100;
    audioManager._ambientScale = (settings.ambientVolume != null ? settings.ambientVolume : 80) / 100;
    audioManager._effectScale = (settings.effectVolume != null ? settings.effectVolume : 80) / 100;
    audioManager._uiScale = (settings.uiVolume != null ? settings.uiVolume : 80) / 100;
    audioManager.suddenMuted = !settings.suddenSounds;
  }, []);
}
