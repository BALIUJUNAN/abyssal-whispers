// src/components/VirtualList.jsx — Virtual scrolling list for large datasets
// Only renders items visible in the viewport + overscan buffer.
// Prevents DOM bloat when event logs exceed 50+ entries.
//
// Features:
//   - Fixed row height (configurable, default 28px)
//   - Overscan buffer (renders N extra rows above/below viewport)
//   - Auto-detects when to activate (threshold: 50 items)
//   - Graceful fallback to full render for small lists
//   - Scroll-to-bottom support for auto-scrolling logs
//
// Usage:
//   <VirtualList
//     items={state.eventLog}
//     rowHeight={24}
//     overscan={5}
//     threshold={50}
//     renderRow={(item, index) => <div key={index}>...</div>}
//     autoScroll
//   />

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';

const DEFAULT_ROW_HEIGHT = 28;
const DEFAULT_OVERSCAN = 5;
const DEFAULT_THRESHOLD = 50;

/**
 * VirtualList — renders only visible rows for large lists.
 *
 * @param {object} props
 * @param {Array}   props.items       — data array
 * @param {number}  props.rowHeight   — height per row in px (default 28)
 * @param {number}  props.overscan    — extra rows above/below viewport (default 5)
 * @param {number}  props.threshold   — min items before virtualization kicks in (default 50)
 * @param {function} props.renderRow  — (item, index) => ReactNode
 * @param {boolean} props.autoScroll  — auto-scroll to bottom on new items
 * @param {string}  props.className   — container class
 * @param {number}  props.maxHeight   — max container height in px (default 400)
 */
export const VirtualList = memo(function VirtualList(props) {
  const items = props.items || [];
  const rowHeight = props.rowHeight || DEFAULT_ROW_HEIGHT;
  const overscan = props.overscan != null ? props.overscan : DEFAULT_OVERSCAN;
  const threshold = props.threshold != null ? props.threshold : DEFAULT_THRESHOLD;
  const renderRow = props.renderRow;
  const autoScroll = props.autoScroll;
  const className = props.className || '';
  const maxHeight = props.maxHeight || 400;

  const useVirtual = items.length > threshold;
  const totalHeight = items.length * rowHeight;

  // Scroll container ref
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(maxHeight);

  // Track container height
  useEffect(function () {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(function (entries) {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return function () { observer.disconnect(); };
  }, []);

  // Auto-scroll to bottom when items change
  useEffect(function () {
    if (!autoScroll || !useVirtual) return;
    const el = containerRef.current;
    if (el) {
      el.scrollTop = totalHeight;
    }
  }, [items.length, autoScroll, useVirtual, totalHeight]);

  // Scroll handler (throttled via rAF)
  const rafId = useRef(null);
  const handleScroll = useCallback(function (e) {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(function () {
      setScrollTop(e.target.scrollTop);
      rafId.current = null;
    });
  }, []);

  // Calculate visible range
  const visibleRange = useMemo(function () {
    if (!useVirtual) return { start: 0, end: items.length };
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / rowHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);
    return { start, end };
  }, [useVirtual, scrollTop, viewportHeight, rowHeight, overscan, items.length]);

  const visibleItems = useMemo(function () {
    if (!useVirtual) return items;
    return items.slice(visibleRange.start, visibleRange.end).map(function (item, i) {
      return { item, index: visibleRange.start + i };
    });
  }, [useVirtual, items, visibleRange.start, visibleRange.end]);

  // For non-virtual mode, render all items directly (simpler DOM)
  if (!useVirtual) {
    return (
      <div
        className={className}
        style={{ maxHeight, overflowY: 'auto' }}
      >
        {items.map(function (item, i) {
          return <div key={i} style={{ height: rowHeight }}>{renderRow(item, i)}</div>;
        })}
      </div>
    );
  }

  // Virtual mode: only render visible slice
  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        maxHeight,
        overflowY: 'auto',
        position: 'relative',
        contain: 'strict', // CSS containment for perf
      }}
      onScroll={handleScroll}
    >
      {/* Spacer: total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(function ({ item, index }) {
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                top: index * rowHeight,
                left: 0,
                right: 0,
                height: rowHeight,
                overflow: 'hidden',
              }}
            >
              {renderRow(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
});

/**
 * NarrativeVirtualList — specialized VirtualList for narrative log entries.
 * Handles the common pattern of event logs with day markers and text.
 *
 * @param {Array} entries — array of { day, text, type?, timestamp? }
 * @param {number} maxHeight — max container height
 * @param {boolean} autoScroll — auto-scroll to newest
 */
export const NarrativeVirtualList = memo(function NarrativeVirtualList(props) {
  const entries = props.entries || [];
  const maxHeight = props.maxHeight || 400;
  const autoScroll = props.autoScroll !== false;
  const rowHeight = 26;

  function renderRow(entry, index) {
    return (
      <div
        className="log-entry"
        style={{
          fontSize: '0.72rem',
          color: 'var(--text-dim)',
          padding: '0.15rem 0.5rem',
          borderBottom: '1px solid var(--border-light)',
          lineHeight: rowHeight + 'px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        <span style={{ opacity: 0.5, marginRight: '0.3rem' }}>
          [{entry.day != null ? 'Day ' + entry.day : ''}]
        </span>
        {entry.text}
      </div>
    );
  }

  return (
    <VirtualList
      items={entries}
      rowHeight={rowHeight}
      overscan={8}
      threshold={50}
      renderRow={renderRow}
      autoScroll={autoScroll}
      className="narrative-virtual-list"
      maxHeight={maxHeight}
    />
  );
});

/**
 * useVirtualList — hook version for integration with existing components.
 * Returns { visibleItems, totalHeight, containerRef, handleScroll }.
 *
 * Usage:
 *   const { visibleItems, totalHeight, containerRef, handleScroll } = useVirtualList({
 *     items: state.eventLog, rowHeight: 26, overscan: 5, threshold: 50
 *   });
 */
export function useVirtualList(opts) {
  const items = opts.items || [];
  const rowHeight = opts.rowHeight || DEFAULT_ROW_HEIGHT;
  const overscan = opts.overscan != null ? opts.overscan : DEFAULT_OVERSCAN;
  const threshold = opts.threshold != null ? opts.threshold : DEFAULT_THRESHOLD;
  const maxHeight = opts.maxHeight || 400;

  const useVirtual = items.length > threshold;
  const totalHeight = useVirtual ? items.length * rowHeight : 0;
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(maxHeight);

  useEffect(function () {
    const el = containerRef.current;
    if (!el || !useVirtual) return;
    const ro = new ResizeObserver(function (entries) {
      for (const entry of entries) {
        setViewportH(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return function () { ro.disconnect(); };
  }, [useVirtual]);

  // Auto-scroll
  useEffect(function () {
    if (!opts.autoScroll || !useVirtual) return;
    const el = containerRef.current;
    if (el) el.scrollTop = totalHeight;
  }, [items.length, opts.autoScroll, useVirtual, totalHeight]);

  const rafId = useRef(null);
  const handleScroll = useCallback(function (e) {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(function () {
      setScrollTop(e.target.scrollTop);
      rafId.current = null;
    });
  }, []);

  const range = useMemo(function () {
    if (!useVirtual) return null;
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visible = Math.ceil(viewportH / rowHeight);
    const end = Math.min(items.length, start + visible + overscan * 2);
    return { start, end };
  }, [useVirtual, scrollTop, viewportH, rowHeight, overscan, items.length]);

  const visibleItems = useMemo(function () {
    if (!useVirtual || !range) return items;
    return items.slice(range.start, range.end).map(function (item, i) {
      return { item, index: range.start + i, isVirtual: true };
    });
  }, [useVirtual, items, range]);

  return {
    useVirtual,
    totalHeight,
    visibleItems,
    containerRef,
    handleScroll,
    rowHeight,
    scrollTop: useVirtual ? scrollTop : 0,
  };
}
