#!/usr/bin/env python3
"""
Build script - Generates single-file index.html from src/ source files.

Reads:
  src/index.template.html       - HTML template with __INLINE_CSS__ and __INLINE_JS__ placeholders
  src/styles.css                - Stylesheet
  src/app.jsx                   - Game logic (JSX, with __GAME_DATA__ placeholder)
  src/reducers/*.js             - Reducer modules (bundled into app.jsx at build time)
  src/game_data.json            - Game data (single source of truth)

Writes:
  index.html                    - Single self-contained HTML file

Usage:
  python build.py              # Build with Babel CLI (requires npm/@babel/cli)
  python build.py --no-babel   # Build without JSX compilation (uses type="text/babel" + Babel standalone CDN)
"""
import json
import os
import re
import subprocess
import sys
import tempfile

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, 'src')
OUTPUT = os.path.join(BASE, 'index.html')

TEMPLATE_PATH = os.path.join(SRC, 'index.template.html')
CSS_PATH = os.path.join(SRC, 'styles.css')
JSX_PATH = os.path.join(SRC, 'app.jsx')
DATA_PATH = os.path.join(SRC, 'game_data.json')
REDUCERS_DIR = os.path.join(SRC, 'reducers')
VENDOR_DIR = os.path.join(SRC, 'vendor')
REACT_PATH = os.path.join(VENDOR_DIR, 'react.production.min.js')
REACTDOM_PATH = os.path.join(VENDOR_DIR, 'react-dom.production.min.js')

# Order matters: utils first, then dependencies
# Includes both reducer modules and data files with function exports
REDUCER_FILES = [
    'portraitMap.js',
    'reducers/utils.js',
    'reducers/worldReducer.js',
    'reducers/sanReducer.js',
    'data/events_missing_600.js',
    'data/events_omens_600.js',
    'reducers/extendedEvents.js',
    'reducers/eventReducer.js',
    'reducers/safehouseReducer.js',
    'data/events_loop.js',
    'data/events_humanity.js',
    'data/events_mythos.js',
    'data/events_resource.js',
    'data/events_npc_cross.js',
    'data/events_area_deep.js',
    'data/events_ending.js',
    'data/events_silent.js',
    'data/events_meta.js',
    'data/extended_events_index.js',
    'data/ending_missing_600.js',
    'data/behavior_endings.js',
    'data/events_death_echo.js',
    'reducers/extendedEventsLoader.js',
    'reducers/extendedEventsInit.js',
    'reducers/effectReducer.js',
    'reducers/itemReducer.js',
    'reducers/endingReducer.js',
    'reducers/objectiveReducer.js',
    'reducers/saveReducer.js',
    'reducers/settingsReducer.js',
    'reducers/achievementReducer.js',
    'reducers/loopReducer.js',
    'reducers/chapterReducer.js',
    'reducers/conclusionReducer.js',
    'reducers/npcReducer.js',
    'reducers/deathSystem.js',
]


def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def strip_es_modules(code):
    """Remove ES module import/export statements for inlining."""
    code = re.sub(r"^import\s+\{[^}]*\}\s+from\s+['\"][^'\"]+['\"];?\s*$", '', code, flags=re.MULTILINE)
    code = re.sub(r"^import\s+\w+\s+from\s+['\"][^'\"]+['\"];?\s*$", '', code, flags=re.MULTILINE)
    code = re.sub(r"^export\s+default\s+[^;]+;?\s*$", '', code, flags=re.MULTILINE)
    code = re.sub(r"^export\s+", '', code, flags=re.MULTILINE)
    code = code.strip() + '\n'
    return code


# Data files that export 'const events' and need unique names to avoid collision.
# Maps filename -> global variable name used by importing code.
DATA_FILE_EVENTS_ALIAS = {
    'data/events_loop.js': 'loopEvents',
    'data/events_humanity.js': 'humanityEvents',
    'data/events_mythos.js': 'mythosEvents',
    'data/events_resource.js': 'resourceEvents',
    'data/events_npc_cross.js': 'npcCrossEvents',
    'data/events_area_deep.js': 'areaDeepEvents',
    'data/events_ending.js': 'endingEvents',
    'data/events_silent.js': 'silentEvents',
    'data/events_meta.js': 'metaEvents',
    'data/events_death_echo.js': 'deathEchoEvents',
}


def process_events_data_file(code, alias):
    """Process a data file that exports 'const events'. Renames the variable
    to avoid collisions when bundled, then assigns to the expected global name."""
    unique = '_events_' + alias
    code = re.sub(r'\bexport const events\b', f'const {unique}', code)
    code = strip_es_modules(code)
    code += f'var {alias} = {unique};\n'
    return code


def bundle_reducers():
    """Read all reducer/data files, strip module syntax, concatenate."""
    parts = []
    for fname in REDUCER_FILES:
        path = os.path.join(SRC, fname)
        if os.path.exists(path):
            code = read_file(path)
            if fname in DATA_FILE_EVENTS_ALIAS:
                code = process_events_data_file(code, DATA_FILE_EVENTS_ALIAS[fname])
            else:
                code = strip_es_modules(code)
            parts.append(f'// === {fname} ===\n{code}')
            print(f'  Bundled: {fname} ({len(code)} bytes)')
        else:
            print(f'  Warning: {path} not found, skipping')
    return '\n'.join(parts)


def compile_jsx_with_babel(jsx_code):
    """Try to compile JSX using Babel CLI. Returns compiled JS or None on failure."""
    # On Windows, subprocess needs .cmd extension for node tools
    npx_cmd = 'npx.cmd' if sys.platform == 'win32' else 'npx'

    # Write JSX to temp file, compile, read result
    with tempfile.NamedTemporaryFile(mode='w', suffix='.jsx', delete=False, encoding='utf-8') as tmp:
        tmp.write(jsx_code)
        tmp_path = tmp.name

    out_path = tmp_path + '.js'
    try:
        result = subprocess.run(
            [npx_cmd, '--no-install', 'babel', tmp_path, '--out-file', out_path,
             '--presets', '@babel/preset-react'],
            capture_output=True, text=True, timeout=120, encoding='utf-8', errors='replace'
        )
        if result.returncode != 0:
            print(f'Babel compilation failed:\n{result.stderr}', file=sys.stderr)
            return None
        compiled = read_file(out_path)
        if result.stderr:
            print(f'  Babel: {result.stderr.strip()[:200]}')
        return compiled
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        print(f'Babel not available: {e}', file=sys.stderr)
        return None
    finally:
        for p in [tmp_path, out_path]:
            if os.path.exists(p):
                os.unlink(p)


def build(use_babel=True):
    # Read source files
    template = read_file(TEMPLATE_PATH)
    css = read_file(CSS_PATH)
    game_data_raw = read_file(DATA_PATH)
    react_js = read_file(REACT_PATH)
    reactdom_js = read_file(REACTDOM_PATH)

    # Compact game data
    game_data = json.dumps(
        json.loads(game_data_raw),
        ensure_ascii=False,
        separators=(',', ':')
    )

    # Bundle reducer modules
    print('Bundling reducer modules...')
    reducer_bundle = bundle_reducers()

    # Read app.jsx, strip its imports (they're satisfied by the bundled reducers above)
    jsx = read_file(JSX_PATH)
    jsx_stripped = strip_es_modules(jsx)

    # Combine: reducers first, then app.jsx
    combined_js = reducer_bundle + '\n// === app.jsx ===\n' + jsx_stripped

    # Replace __GAME_DATA__ placeholder
    js_with_data = combined_js.replace('__GAME_DATA__', game_data)

    # Try to compile JSX
    compiled_js = None
    if use_babel:
        print('Attempting JSX compilation with Babel...')
        compiled_js = compile_jsx_with_babel(js_with_data)
        if compiled_js:
            print(f'JSX compiled successfully with Babel.')
        else:
            print('Babel not available, falling back to Babel standalone CDN.')

    if compiled_js:
        # Production build: precompiled JSX, no Babel standalone
        html = template.replace('__INLINE_REACT__', react_js)
        html = html.replace('__INLINE_REACTDOM__', reactdom_js)
        html = html.replace('__INLINE_CSS__', css)
        html = html.replace('__INLINE_JS__', compiled_js)
    else:
        # Dev build: Babel standalone in browser
        babel_script = '<script src="https://cdn.bootcdn.net/ajax/libs/babel-standalone/7.24.7/babel.min.js"></script>\n'
        html = template.replace(
            '<script>\n__INLINE_JS__\n</script>',
            '<script type="text/babel">\n__INLINE_JS__\n</script>'
        )
        html = html.replace(
            '<script type="text/babel">',
            babel_script + '<script type="text/babel">'
        )
        html = html.replace('__INLINE_REACT__', react_js)
        html = html.replace('__INLINE_REACTDOM__', reactdom_js)
        html = html.replace('__INLINE_CSS__', css)
        html = html.replace('__INLINE_JS__', js_with_data)

    write_file(OUTPUT, html)

    # Report (use byte counts for accurate file sizes with CJK text)
    size = os.path.getsize(OUTPUT)
    print(f'\nBuild complete: {OUTPUT}')
    print(f'  Output size: {size:,} bytes ({size / 1024:.1f} KB)')
    print(f'  Game data:   {len(game_data.encode("utf-8")):,} bytes')
    print(f'  CSS:         {len(css.encode("utf-8")):,} bytes')
    print(f'  JS:          {len((compiled_js or js_with_data).encode("utf-8")):,} bytes')
    print(f'  Babel used:  {"yes" if compiled_js else "no (standalone)"}')


if __name__ == '__main__':
    use_babel = '--no-babel' not in sys.argv
    build(use_babel)
