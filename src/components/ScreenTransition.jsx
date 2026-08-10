// src/components/ScreenTransition.jsx - Screen transition with Canvas + audio
import React from 'react';
const { useState, useEffect, useRef } = React;
import { TransitionCanvas } from "./TransitionCanvas.jsx";
import { audioManager } from "../managers/AudioManager.js";

var VARIANT_MAP = {
  title: "default",
  prologue: "inkBleed",
  guide: "fog",
  creation: "voidCircle",
  game: "default",
  ending: "glitchSlices",
};

// Audio: each variant plays a thematic sound effect
var AUDIO_MAP = {
  default: { type: "playUI", id: "panel_open" },
  inkBleed: { type: "playEffect", id: "san_critical_breath" },
  fog: { type: "playEffect", id: "begin" },
  voidCircle: { type: "playEffect", id: "loop_memory" },
  // EndingScreen owns the type-specific ending stinger; avoid double playback.
  glitchSlices: { type: "none" },
};

function getVariant(screenKey) { return VARIANT_MAP[screenKey] || "default"; }
function playTransitionAudio(screenKey) {
  try {
    var entry = AUDIO_MAP[getVariant(screenKey)] || AUDIO_MAP.default;
    if (entry.type === "playEffect") audioManager.playEffect(entry.id);
    else if (entry.type === "playUI") audioManager.playUI(entry.id);
  } catch (e) {}
}

export function ScreenTransition({ screenKey, children, duration }) {
  var canvasRef = useRef(null);
  var prefersReduced =
    typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var settingsReduced = false;
  try {
    var raw = localStorage.getItem("abyssal_whispers_settings");
    if (raw) { var parsed = JSON.parse(raw); settingsReduced = parsed.settings && parsed.settings.reducedMotion; }
  } catch (e) {}
  var noMotion = prefersReduced || settingsReduced;
  var totalDur = noMotion ? 0 : (duration || 800);
  var canvasDur = Math.floor(totalDur * 0.5);
  var cssDur = totalDur - canvasDur;

  var [phase, setPhase] = useState("visible");
  var [renderKey, setRenderKey] = useState(screenKey);
  var [renderChildren, setRenderChildren] = useState(children);
  var [variant, setVariant] = useState(function () { return getVariant(screenKey); });
  var prevKey = useRef(screenKey);
  var timerRef = useRef(null);
  var rafRef = useRef(null);
  var childrenRef = useRef(children);
  childrenRef.current = children;

  // Sync children when NOT transitioning (same screen, state changed)
  useEffect(function () {
    if (phase === "visible" && screenKey === prevKey.current) {
      setRenderChildren(childrenRef.current);
    }
  }, [children, phase, screenKey]);

  useEffect(function () {
    if (screenKey === prevKey.current) return;
    if (totalDur === 0) {
      setRenderKey(screenKey); setRenderChildren(childrenRef.current);
      setVariant(getVariant(screenKey)); prevKey.current = screenKey;
      return;
    }

    // Play transition audio
    playTransitionAudio(screenKey);

    // Phase 1: Canvas exit effect
    setVariant(getVariant(prevKey.current));
    setPhase("exit");

    if (canvasRef.current && canvasRef.current.play) {
      canvasRef.current.play(getVariant(prevKey.current), canvasDur, function () {
        // Canvas complete -> swap content + CSS enter
        setRenderKey(screenKey); setRenderChildren(childrenRef.current);
        setVariant(getVariant(screenKey));
        setPhase("enter");
        prevKey.current = screenKey;
      });
    } else {
      // Fallback: no canvas, just timer-based swap
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(function () {
        setRenderKey(screenKey); setRenderChildren(childrenRef.current);
        setVariant(getVariant(screenKey));
        setPhase("enter");
        prevKey.current = screenKey;
      }, canvasDur);
    }
  }, [screenKey, totalDur, canvasDur]);

  // enter -> visible on next frame
  useEffect(function () {
    if (phase === "enter" && cssDur > 0) {
      rafRef.current = requestAnimationFrame(function () { setPhase("visible"); });
      return function () { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }
  }, [phase, cssDur]);

  // Cleanup
  useEffect(function () {
    return function () {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (totalDur === 0) return renderChildren;

  var cls =
    "screen-transition screen-transition--" + phase +
    " screen-transition--" + variant;

  return (
    <>
      <TransitionCanvas ref={canvasRef} />
      <div
        className={cls}
        style={{ "--trans-dur": cssDur + "ms" }}
        key={renderKey}
      >
        {renderChildren}
      </div>
    </>
  );
}
