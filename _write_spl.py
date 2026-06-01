# Generated script
import os
path = os.path.join("src", "components", "SanPollutionLayer.jsx")
C = []
C = ["// src/components/SanPollutionLayer.jsx - Unified SAN visual corruption layer", "// Three tiers: low(60-40), mid(39-20), extreme(<20)", "", "const { useEffect, useRef, useCallback, useState, memo } = React;", "", "const TIER = { LOW_MAX: 60, MID_MAX: 40, EXT_MAX: 20 };", "const FPS_CAP = 15;", "const FRAME_MS = 1000 / FPS_CAP;", "const LERP = 0.06;", "", "function lerp(a, b, t) { return a + (b - a) * t; }", "", "let _noise = null;", "function getNoise(w, h) {", "  if (_noise && _noise.width === w && _noise.height === h) return _noise;", "  _noise = document.createElement(\"canvas\");", "  _noise.width = w; _noise.height = h;", "  const nc = _noise.getContext(\"2d\");", "  const id = nc.createImageData(w, h);", "  const d = id.data;", "  for (let i = 0; i < d.length; i += 4) {", "    const v = Math.random() * 255;", "    d[i] = d[i+1] = d[i+2] = v; d[i+3] = 18;", "  }", "  nc.putImageData(id, 0, 0);", "  return _noise;", "}"]
with open(path, "w", encoding="utf-8") as out:
    out.write(chr(10).join(C))
print(f"Wrote {len(C)} lines to {path}")
