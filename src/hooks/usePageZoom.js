// src/hooks/usePageZoom.js
// Phase 1 extract: useEffect #6 — Apply page zoom from settings
import { useEffect } from 'react';

export function usePageZoom(settings) {
  useEffect(function () {
    var BASE_ZOOM = 1.1;
    var scale = settings.pageScale != null ? settings.pageScale : 100;
    var actualZoom = (scale / 100) * BASE_ZOOM;
    document.documentElement.style.zoom = actualZoom.toString();
    document.documentElement.style.overflow = 'clip';
    document.body.style.overflow = 'clip';
  }, [settings.pageScale]);
}
