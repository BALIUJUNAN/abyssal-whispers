// src/hooks/useAudioAutoplayUnlock.js
// Phase 1 extract: useEffect #7 — Unlock audio context on first user gesture
import { useEffect } from 'react';
import { audioManager } from '../managers/AudioManager.js';

export function useAudioAutoplayUnlock() {
  useEffect(function () {
    function handler() {
      audioManager.unlock();
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('keydown', handler);
    }
    window.addEventListener('click', handler);
    window.addEventListener('touchstart', handler);
    window.addEventListener('keydown', handler);
    return function () {
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('keydown', handler);
    };
  }, []);
}
