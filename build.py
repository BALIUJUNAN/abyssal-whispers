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
REDUCER_FILES = [
    'utils.js',
    'worldReducer.js',
    'sanReducer.js',
    'eventReducer.js',
    'safehouseReducer.js',
    'effectReducer.js',
    'itemReducer.js',
    'endingReducer.js',
    'objectiveReducer.js',
    'saveReducer.js',
    'loopReducer.js',
    'chapterReducer.js',
    'conclusionReducer.js',
    'npcReducer.js',
]


def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def strip_es_modules(code):
    """Remove ES module import/export statements for inlining."""
    # Remove single-line imports: import { x, y } from './module.js';
    code = re.sub(r"^import\s+\{[^}]*\}\s+from\s+['\"][^'\"]+['\"];?\s*$", '', code, flags=re.MULTILINE)
    # Remove default imports: import x from './module.js';
    code = re.sub(r"^import\s+\w+\s+from\s+['\"][^'\"]+['\"];?\s*$", '', code, flags=re.MULTILINE)
    # Remove export keyword from declarations: export function, export const, export class
    code = re.sub(r"^export\s+", '', code, flags=re.MULTILINE)
    # Remove trailing blank lines
    code = code.strip() + '\n'
    return code


def bundle_reducers():
    """Read all reducer files, strip module syntax, concatenate."""
    parts = []
    for fname in REDUCER_FILES:
        path = os.path.join(REDUCERS_DIR, fname)
        if os.path.exists(path):
            code = read_file(path)
            code = strip_es_modules(code)
            parts.append(f'// === {fname} ===\n{code}')
            print(f'  Bundled: reducers/{fname} ({len(code)} bytes)')
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
            capture_output=True, text=True, timeout=120
        )
        if result.returncode != 0:
            print(f'Babel compilation failed:\n{result.stderr}', file=sys.stderr)
            return None
        return read_file(out_path)
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
            print('JSX compiled successfully with Babel.')
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

    # Report
    size = len(html)
    print(f'\nBuild complete: {OUTPUT}')
    print(f'  Output size: {size:,} bytes ({size / 1024:.1f} KB)')
    print(f'  Game data:   {len(game_data):,} bytes')
    print(f'  CSS:         {len(css):,} bytes')
    print(f'  JS:          {len(compiled_js or js_with_data):,} bytes')
    print(f'  Babel used:  {"yes" if compiled_js else "no (standalone)"}')


if __name__ == '__main__':
    use_babel = '--no-babel' not in sys.argv
    build(use_babel)
