// src/components/ui/DevPanel.jsx - Developer Debug Panel
const { memo, useState, useEffect, useRef } = React;

export var DevPanel = memo(function DevPanel(props) {
  var state = props.state;
  var dispatch = props.dispatch;
  var _o = useState(false);
  var open = _o[0],
    setOpen = _o[1];
  var _t = useState('state');
  var tab = _t[0],
    setTab = _t[1];
  useEffect(function () {
    function h(e) {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd'))) {
        e.preventDefault();
        setOpen(function (v) {
          return !v;
        });
      }
    }
    window.addEventListener('keydown', h);
    return function () {
      window.removeEventListener('keydown', h);
    };
  }, []);
  if (!open) return null;
  function R(l, v) {
    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          padding: '3px 0',
          borderBottom: '1px solid #222',
        },
      },
      React.createElement('span', { style: { color: '#888' } }, l),
      React.createElement('span', { style: { color: '#0f0' } }, String(v))
    );
  }
  function B(t, fn, c) {
    return React.createElement(
      'button',
      {
        style: {
          background: '#111',
          color: c || '#0f0',
          border: '1px solid ' + (c || '#0f0'),
          padding: '4px 10px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '11px',
          margin: '2px',
        },
        onClick: fn,
      },
      t
    );
  }
  function C(l, v, fn, c) {
    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          padding: '3px 0',
          borderBottom: '1px solid #222',
        },
      },
      React.createElement('span', { style: { color: '#888' } }, l),
      React.createElement(
        'span',
        null,
        B('-1', function () {
          fn(v - 1);
        }),
        React.createElement(
          'span',
          { style: { margin: '0 6px', color: c || '#0f0', fontSize: '14px' } },
          String(v)
        ),
        B('+1', function () {
          fn(v + 1);
        })
      )
    );
  }
  function qS(v) {
    dispatch({ type: 'SET_META_FIELD', field: 'san', value: Math.max(0, Math.min(99, v)) });
  }
  function qD(v) {
    dispatch({ type: 'SET_META_FIELD', field: 'day', value: Math.max(1, v) });
  }
  function qL(v) {
    dispatch({ type: 'SET_META_FIELD', field: 'loopCount', value: Math.max(0, v) });
  }
  function qH(v) {
    dispatch({
      type: 'SET_META_FIELD',
      field: 'hp',
      value: Math.max(0, Math.min(state.maxHp || 11, v)),
    });
  }
  function rP() {
    dispatch({ type: 'SET_META_FIELD', field: 'pollution', value: 0 });
    dispatch({ type: 'SET_META_FIELD', field: 'safehouseCorruption', value: 0 });
  }
  var oS = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '420px',
    background: 'rgba(0,0,0,0.92)',
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: '12px',
    zIndex: 99999,
    overflow: 'auto',
    padding: '12px',
    borderLeft: '2px solid #0f0',
  };
  var tS = function (a) {
    return {
      display: 'inline-block',
      padding: '4px 12px',
      cursor: 'pointer',
      borderBottom: '2px solid ' + (a ? '#0f0' : 'transparent'),
      color: a ? '#0f0' : '#666',
    };
  };
  var hS = { color: '#ff0', fontSize: '13px', marginBottom: '4px', borderBottom: '1px solid #333' };
  return React.createElement(
    'div',
    { style: oS },
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          borderBottom: '1px solid #0f0',
          paddingBottom: '6px',
        },
      },
      React.createElement('span', null, '[ DEV PANEL ]'),
      React.createElement(
        'span',
        { style: { fontSize: '10px', color: '#666' } },
        'F12 / Ctrl+Shift+D'
      ),
      B(
        'X',
        function () {
          setOpen(false);
        },
        '#f00'
      )
    ),
    React.createElement(
      'div',
      { style: { marginBottom: '8px' } },
      ['state', 'tools', 'weights', 'perf'].map(function (t) {
        return React.createElement(
          'span',
          {
            key: t,
            style: tS(tab === t),
            onClick: function () {
              setTab(t);
            },
          },
          t.toUpperCase()
        );
      })
    ),
    tab === 'state'
      ? React.createElement(
          'div',
          null,
          React.createElement('div', { style: hS }, 'Core State'),
          C('SAN', state.san, qS, '#0f0'),
          C('HP', state.hp, qH, '#f00'),
          C('Day', state.day, qD, '#ff0'),
          C('Loop', state.loopCount, qL, '#f0f'),
          R('AP', state.ap + '/' + state.maxAp),
          R('Area', state.currentArea),
          R('Food', state.food + '/' + (state.maxFood || 5)),
          R('Money', state.money || 0),
          R('Pollution', Math.round((state.pollution || 0) * 100) + '%'),
          R('Safehouse', state.safehouseCorruption || 0),
          R('Humanity', state.humanityScore !== undefined ? state.humanityScore : 50),
          R('Mythos', state.mythosLevel || 0),
          R('Seal', state.sealState),
          R('Clues', (state.clues || []).length),
          R('Light', state.lightLevel || 0)
        )
      : null,
    tab === 'tools'
      ? React.createElement(
          'div',
          null,
          React.createElement('div', { style: hS }, 'Quick Actions'),
          React.createElement(
            'div',
            { style: { marginTop: '6px' } },
            B(
              'EXPLORE',
              function () {
                dispatch({ type: 'EXPLORE' });
              },
              '#ff0'
            ),
            B(
              'REST',
              function () {
                dispatch({ type: 'REST' });
              },
              '#ff0'
            ),
            B(
              'New Game',
              function () {
                dispatch({ type: 'NEW_GAME' });
              },
              '#f00'
            )
          ),
          React.createElement(
            'div',
            { style: { marginTop: '6px' } },
            B('ResetPoll', rP, '#f00'),
            B('FullSAN', function () {
              qS(99);
            }),
            B('FullHP', function () {
              qH(state.maxHp || 11);
            })
          )
        )
      : null,
    tab === 'weights'
      ? React.createElement(
          'div',
          null,
          React.createElement('div', { style: hS }, 'Event Weight Debug'),
          R('Triggered', (state.triggeredEvents || []).length + ' events'),
          R('Today', (state._todayEventTypes || []).length),
          R('Abnormal', state.abnormalStreak || 0),
          R('Recent', (state._recentEventIds || []).slice(-5).join(', ') || '(none)'),
          R('CatToday', JSON.stringify(state.categoryCountsToday || {})),
          R('CatRun', JSON.stringify(state.categoryCountsRun || {}))
        )
      : null,
    tab === 'perf' ? React.createElement(DevPerfMonitor, null) : null
  );
});

export var DevPerfMonitor = memo(function () {
  var _m = useState({ fps: 0 });
  var m = _m[0],
    setM = _m[1];
  useEffect(function () {
    var lt = performance.now();
    var c = 0;
    var raf;
    function t() {
      c++;
      var n = performance.now();
      if (n - lt >= 1000) {
        setM({ fps: Math.round((c * 1000) / (n - lt)) });
        c = 0;
        lt = n;
      }
      raf = requestAnimationFrame(t);
    }
    raf = requestAnimationFrame(t);
    return function () {
      cancelAnimationFrame(raf);
    };
  }, []);
  var mem = typeof performance !== 'undefined' && performance.memory ? performance.memory : null;
  var gs = typeof getGameState === 'function' ? getGameState() : null;
  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      {
        style: {
          color: '#ff0',
          fontSize: '13px',
          marginBottom: '6px',
          borderBottom: '1px solid #333',
        },
      },
      'Performance Monitor'
    ),
    React.createElement(
      'div',
      { style: { color: '#888' } },
      React.createElement(
        'div',
        null,
        'FPS: ',
        React.createElement(
          'span',
          { style: { color: m.fps > 50 ? '#0f0' : m.fps > 30 ? '#ff0' : '#f00' } },
          String(m.fps || '--')
        )
      ),
      React.createElement('div', null, 'State keys: ' + Object.keys(gs || {}).length),
      React.createElement(
        'div',
        null,
        'Narrative: ' + (gs ? (gs.narrative || []).length : 0) + ' entries'
      ),
      mem
        ? React.createElement(
            'div',
            null,
            'Heap: ' +
              Math.round(mem.usedJSHeapSize / 1024 / 1024) +
              'MB / ' +
              Math.round(mem.jsHeapSizeLimit / 1024 / 1024) +
              'MB'
          )
        : null
    )
  );
});
