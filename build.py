#!/usr/bin/env python3
"""
Build script - Generates single-file index.html from src/ source files.

Reads:
  src/index.template.html       - HTML template with __INLINE_CSS__ and __INLINE_JS__ placeholders
  src/styles.css                - Stylesheet
  src/app.jsx                   - Game logic (JSX, with __GAME_DATA__ placeholder)
  src/reducers/*.js             - Reducer modules (bundled into app.jsx at build time)
  src/data/game_base.json       - Game data (split source of truth — base)
  src/data/game_ch2plus.json    - Game data (split source of truth — ch2+)
  src/data/game_meta.json       - Game data (split source of truth — meta)

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
# Phase 1: Split JSON sources (merged at build time, served separately for lazy loading)
DATA_DIR = os.path.join(SRC, 'data')
DATA_BASE_PATH = os.path.join(DATA_DIR, 'game_base.json')
DATA_CH2PLUS_PATH = os.path.join(DATA_DIR, 'game_ch2plus.json')
DATA_META_PATH = os.path.join(DATA_DIR, 'game_meta.json')
REDUCERS_DIR = os.path.join(SRC, 'reducers')
VENDOR_DIR = os.path.join(SRC, 'vendor')
REACT_PATH = os.path.join(VENDOR_DIR, 'react.production.min.js')
REACTDOM_PATH = os.path.join(VENDOR_DIR, 'react-dom.production.min.js')
BABEL_PATH = os.path.join(VENDOR_DIR, 'babel.min.js')

# Order matters: utils first, then dependencies
# Includes both reducer modules and data files with function exports
REDUCER_FILES = [
    'vendor/immer.production.js',
    'portraitMap.js',
    'components/ErrorBoundary.jsx',
    'reducers/utils.js',
    # ── Balance constants (must precede all slice files) ──
    'state/gameConstants.js',
    'utils/clueNameMap.js',   # MUST precede reducers that import it (extendedEvents, eventReducer, endingReducer, effectReducer, objectiveReducer, conclusionReducer)
    'utils/triggeredSet.js',  # MUST precede reducers that import it (eventReducer, extendedEvents, endingReducer, effectReducer, npcReducer, objectiveReducer, dailySlice, exploreSlice, appHelpers)
    # ── Engine Layer (consolidated core systems) ──
    # engine/WorldTimeSystem.js replaces reducers/worldReducer.js
    'engine/WorldTimeSystem.js',
    'reducers/sanReducer.js',
    # engine/EventEngine.js — 3-layer weighted selection (JS for build.py)
    'engine/EventEngine.js',
    # ── 难度配置 (必须 precedes 所有使用 difficulty 的 reducer) ──
    'config/difficultyLevels.js',  # difficulty data (JSON inlined by resolve_json_imports)
    'config/difficulty.js',            # difficulty accessor functions
    # engine/EventEngine.ts — TypeScript source (noEmit, type-check only via tsc)
    # Phase 5: World decay and corruption advancement
    'systems/worldDecay.js',
    # Phase 6: Resource-narrative binding + safehouse visual stages
    'systems/resourceNarrative.js',
    # engine/PollutionManager.js replaces systems/logicCorruption.js (SAN + logic corruption)
    'engine/PollutionManager.js',
    # Meta-layer corruption (false events, false logs, save name pollution)
    'systems/metaCorruption.js',
    # Phase 7: NPC multi-version dialogue + loop inheritance
    'data/npcContextualLines.js',      # MUST precede npcDialogue.js (selector function)
    'systems/npcDialogue.js',
    'data/events_missing_600.js',
    'data/events_omens_600.js',
    'data/events_supplement.js',      # 后7区补充事件 (+120)
    'data/events_ch2plus.js',         # Ch2+ 章节事件，从 game_ch2plus.json 迁移 (+70)
    # DEPENDENCY: requires eventSystemV2.js + resourceNarrative.js (above) for weight functions
    'reducers/extendedEvents.js',
    'reducers/eventReducer.js',
    'data/descriptionTemplates.js',  # MUST be before events_*.js files that import DESC
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
    'reducers/endingReducer.js',       # MUST precede behavior_endings.js
    'data/behavior_endings.js',
    'data/events_death_echo.js',
    'reducers/extendedEventsLoader.js',
    # UGC system (must precede extendedEventsInit.js)
    'data/ugcSchema.js',
    'reducers/ugcReducer.js',
    # Game utilities (must precede buildEventPool.js and app.jsx)
    'systems/textVariants.js',        # MUST precede gameHelpers.js (getDistortedName) and buildEventPool.js
    'utils/buildEventPool.js',
    'data/milestones.js',             # MUST precede extendedEventsInit.js (CHAPTER_MILESTONES)
    'reducers/extendedEventsInit.js',
    'reducers/achievementReducer.js',  # MUST precede effectReducer.js (imported by it)
    'reducers/effectReducer.js',
    'reducers/miscReducer.js',       # Merged: safehouseReducer + itemReducer + settingsReducer (after effectReducer)
    'reducers/objectiveReducer.js',
    'state/transientKeys.js',
    'data/registry/registryUtils.js',
    'data/registry/npcRegistry.js',
    'data/registry/areaRegistry.js',
    'data/registry/itemRegistry.js',
    'reducers/saveMigration.js',
    # engine/SaveManager.js replaces reducers/saveReducer.js (save system)
    'engine/SaveManager.js',
    'reducers/npcReducer.js',          # MUST precede loopReducer.js (imported by it)
    'systems/reincarnationDiff.js',  # MUST precede loopReducer.js
    'reducers/loopReducer.js',
    'reducers/chapterReducer.js',
    'reducers/conclusionReducer.js',
    'reducers/deathSystem.js',
    # Prologue system
    'data/prologue_events.js',
    'systems/fearProfile.js',
    'systems/fearLens.js',
    # Phase 3: SAN visual + logic corruption
    'systems/sanVisualCorruption.js',
    # logicCorruption.js moved to engine/PollutionManager.js (loaded earlier)
    'reducers/prologueReducer.js',
    # Audio system
    'managers/AudioManager.js',
    # Game utilities (must precede app.jsx)
    'utils/gameHelpers.js',
    'utils/trustGates.js',          # NPC trust gate logic (extracted from appHelpers.js)
    'utils/npcMemory.js',           # NPC loop memory data (extracted from appHelpers.js)
    # utils/uiStore.js removed — migrated to state/uiStore.js (below)
    'utils/errorTracker.js',  # Error tracker for player operation logging & bug reports
    'utils/seededRng.js',     # MUST precede initialState.js (generateRunSeed)
    'utils/glmClient.js',     # GLM-4.7 Flash API client (must precede llmNarrative.js)
    'state/initialState.js',
    # ── Dual Store Architecture ──
    'state/uiStore.js',             # useUiStore — migrated from utils/uiStore.js (re-export)
    # ── Runtime: post-reducer effect execution ──
    'runtime/effectExecutor.js',
    # Phase 2: System modules (must precede appHelpers.js and slices)
    'systems/deathSummary.js',        # MUST precede appHelpers.js
    'systems/firstRunGuide.js',       # Used by app.jsx
    'systems/sanFeedback.js',         # Used by app.jsx
    'systems/npcFeedback.js',         # MUST precede npcSlice.js
    'systems/firstLoopBalance.js',    # MUST precede exploreSlice.js
    'systems/sanityVisual.js',        # MUST precede appHelpers.js (getPerceptionLevels, getSanStageClasses)
    'systems/llmNarrative.js',        # LLM narrative enhancement (optional, depends on glmClient.js)
    # gameSettings.js excluded: DEFAULT_SETTINGS already in miscReducer.js
    # Phase 2: App-level helper functions extracted from app.jsx
    'utils/appHelpers.js',
    'state/difficultyState.js',        # applyDifficultyToState (must precede coreSlice.js)
    # Phase 3: GameReducer slice handlers (extracted from app.jsx)
    'engine/commands.js',            # MUST precede coreSlice.js (audio, hooks, fx)
    'reducers/slices/coreSlice.js',
    'engine/eventBus.js',              # MUST precede exploreSlice.js, dailySlice.js
    'systems/earlyHooks.js',           # MUST precede exploreSlice.js
    'reducers/slices/exploreSlice.js',
    'reducers/slices/npcSlice.js',
    'reducers/slices/dailySlice.js',
    'reducers/slices/darkSlice.js',
    'reducers/slices/uiSlice.js',
    'reducers/slices/systemSlice.js',   # Cross-cutting: AP, tracking (must precede gameReducer.js)
    # ── Slice composition (must precede gameReducer.js) ──
    'engine/combineSlices.js',        # createSlice + combineSlices tool
    # ── Dual Store Architecture (after slice handlers — gameReducer imports slices) ──
    'engine/gameReducer.js',        # Game reducer factory (must precede useGameStore.js)
    'state/useGameStore.js',        # Zustand game store (reactive selectors, imports gameReducer.js)
    'state/gameStore.js',           # Legacy facade — delegates to useGameStore.js
    # Phase 2: UI components extracted from app.jsx
    'components/SanPollutionLayer.jsx',  # Unified SAN visual corruption canvas + CorruptibleChoice
    'components/GameCommon.jsx',     # StatBar, Modal, CollapsibleSection, NarrativeBlock
    'components/GameScreens.jsx',    # PrologueScreen, SurvivalGuide, CharCreation
    'data/mapConstants.js',          # Map layout/edges/zones (extracted from appHelpers.js)
    'components/NPCDialog.jsx',      # NPC dialog sub-component (extracted from GamePanels.jsx)
    'components/CitySketchMap.jsx',  # City sketch map sub-component (extracted from GamePanels.jsx)
    'components/GamePanels.jsx',     # LeftPanel, CenterPanel, RightPanel, EndingScreen, GameHeader
    'components/GameModals.jsx',     # SettingsModal, SaveLoadModal, AchievementGallery
    # UI components (pre-existing)
    'components/TitleScreen.jsx',
    'components/AppToast.jsx',
    # UGC UI component
    'components/UgcImportExport.jsx',
    # ── 暗黑地牢风格城镇地图系统 ──
    'data/townHotspots.js',           # 热点数据结构（区域 + 建筑 + NPC点）
    'components/InteractiveTownMap.jsx',  # 互动城镇全景地图（主界面）
    'components/AreaPanelModal.jsx',      # 热点功能面板（点击后弹出）
    'components/FloatingInfoBar.jsx',     # 浮动信息栏（HUD）
    'components/GameLayout.jsx',          # 布局模式切换入口（地图/经典）
    # ── Dev Panel (debug tools) ──
    'systems/eventDebugger.js',      # P1-D: Event selection explainability
    'components/ui/DevPanel.jsx',    # F12 / Ctrl+Shift+D debug panel
    'components/TransitionCanvas.jsx',  # Canvas 程序化转场效果（必须在 ScreenTransition 之前）
    'components/ScreenTransition.jsx',  # 屏幕转场动画包装器 + Canvas + 音频联动
]


def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def strip_es_modules(code):
    """Remove ES module import/export statements for inlining.

    Handles:
      - Single-line named imports:  import { a, b } from './x.js';
      - Single-line default imports: import Foo from './x.js';
      - Multi-line named imports:    import {\n  a,\n  b\n} from './x.js';
      - Side-effect imports:         import './polyfill.js';
      - Re-exports:                  export { a, b } from './x.js';
      - Export const/let/var/function/class declarations
      - Export default expressions
      - Standalone export { ... }
    """
    # 1) Remove multi-line import statements (import { ...\n } from '...')
    code = re.sub(
        r"^import\s+\{[^}]*\}\s*from\s*['\"][^'\"]+['\"];?\s*$",
        '', code, flags=re.MULTILINE
    )
    # 2) Remove single-line default imports: import Foo from '...'
    code = re.sub(
        r"^import\s+\w+\s+from\s+['\"][^'\"]+['\"];?\s*$",
        '', code, flags=re.MULTILINE
    )
    # 3) Remove side-effect imports: import '...'
    code = re.sub(
        r"^import\s+['\"][^'\"]+['\"];?\s*$",
        '', code, flags=re.MULTILINE
    )
    # 4) Remove re-exports: export { ... } from '...'
    code = re.sub(
        r"^export\s*\{[^}]*\}\s*from\s*['\"][^'\"]+['\"];?\s*$",
        '', code, flags=re.MULTILINE
    )
    # 5) Remove standalone export { ... }
    code = re.sub(
        r"^export\s*\{[^}]*\}\s*;?\s*$",
        '', code, flags=re.MULTILINE
    )
    # 6) Remove export default (keep the expression on same line)
    code = re.sub(
        r"^export\s+default\s+", '', code, flags=re.MULTILINE
    )
    # 7) Remove export keyword from declarations (export const → const)
    #    Also handles: export async function → async function
    #                  export default function → function
    #                  export default async function → async function
    code = re.sub(
        r"^export\s+(?:default\s+)?(?=async\s+(?:function|class)|const |let |var |function |class )",
        '', code, flags=re.MULTILINE
    )
    # 8) Convert React destructuring to var (avoid duplicate const with app.jsx)
    code = re.sub(
        r"^const(\s*\{[^}]*\}\s*=\s*React\s*;?\s*)$",
        r"var\1", code, flags=re.MULTILINE
    )
    # 9) Collapse 3+ consecutive blank lines into 1
    code = re.sub(r'\n{3,}', '\n\n', code)
    code = code.strip() + '\n'
    return code


def resolve_json_imports(code, src_dir):
    """Inline JSON imports: replace `import X from './foo.json'` with
    `const X = { ... };` containing the parsed JSON data.

    Must run before strip_es_modules so the import line is replaced,
    not simply deleted.
    """
    import json
    for m in re.finditer(r"^\s*import\s+(\w+)\s+from\s+['\"]([^'\"]+\.json)['\"];?\s*$", code, re.MULTILINE):
        var_name = m.group(1)
        rel_path = m.group(2)
        abs_path = os.path.normpath(os.path.join(src_dir, rel_path))
        if os.path.exists(abs_path):
            with open(abs_path, 'r', encoding='utf-8') as jf:
                data = json.load(jf)
            json_js = 'const ' + var_name + ' = ' + json.dumps(data, ensure_ascii=False) + ';\n'
            code = code[:m.start()] + json_js + code[m.end():]
        else:
            print(f'  WARNING: JSON import not found: {abs_path}')
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
            file_dir = os.path.dirname(path)
            if fname in DATA_FILE_EVENTS_ALIAS:
                code = process_events_data_file(code, DATA_FILE_EVENTS_ALIAS[fname])
            else:
                code = resolve_json_imports(code, file_dir)
                code = strip_es_modules(code)
            parts.append(f'// === {fname} ===\n{code}')
            print(f'  Bundled: {fname} ({len(code)} bytes)')
        else:
            print(f'  Warning: {path} not found, skipping')
    return '\n'.join(parts)


def minify_css(css):
    """Minify CSS: strip comments, collapse whitespace, remove unnecessary semicolons."""
    import re
    original_len = len(css)
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL)
    css = re.sub(r'\s*\n\s*', '', css)
    css = re.sub(r'  +', ' ', css)
    css = re.sub(r'\s*{\s*', '{', css)
    css = re.sub(r'\s*}\s*', '}', css)
    css = re.sub(r'\s*:\s*', ':', css)
    css = re.sub(r'\s*;\s*', ';', css)
    css = re.sub(r'\s*,\s*', ',', css)
    css = re.sub(r'\s*>\s*', '>', css)
    css = re.sub(r'\s*\+\s*', '+', css)
    css = re.sub(r'\s*~\s*', '~', css)
    css = re.sub(r';}', '}', css)
    css = css.strip()
    ratio = len(css) / original_len * 100 if original_len > 0 else 100
    print(f'  Minified CSS: {original_len:,} -> {len(css):,} bytes ({ratio:.1f}%)')
    return css


def minify_js(code):
    """Minify JavaScript using terser (preferred) or basic regex fallback.

    Tries npx terser first for proper minification.
    Falls back to stripping comments and excess whitespace if terser is unavailable.
    """
    import shutil
    npx_cmd = 'npx.cmd' if sys.platform == 'win32' else 'npx'

    # Try terser via npx
    if shutil.which(npx_cmd):
        try:
            result = subprocess.run(
                [npx_cmd, '--no-install', 'terser', '--compress', 'drop_console=true,passes=2', '--mangle'],
                input=code, capture_output=True, text=True, timeout=60, encoding='utf-8'
            )
            if result.returncode == 0 and result.stdout.strip():
                ratio = len(result.stdout) / len(code) * 100 if len(code) > 0 else 0
                print(f'  Minified with terser: {len(code):,} → {len(result.stdout):,} bytes ({ratio:.1f}%)')
                return result.stdout
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

    # Fallback: basic minification — strip single-line comments, collapse whitespace
    import re
    original_len = len(code)
    # Remove single-line // comments (but not URLs http:// or strings)
    code = re.sub(r'(?<!:)//[^\n]*', '', code)
    # Remove /* ... */ block comments — MUST preserve surrounding spaces
    # e.g. "return/*#__PURE__*/React" → must become "return React", NOT "returnReact"
    code = re.sub(r'(\w)/\*.*?\*/(\w)', r'\1 \2', code, flags=re.DOTALL)
    code = re.sub(r'/\*.*?\*/', ' ', code, flags=re.DOTALL)  # remaining comments → space
    # Insert space at line boundaries where two tokens would collide
    code = re.sub(r'(\w)\n(\w)', r'\1 \2', code)
    # Collapse multiple newlines/spaces
    code = re.sub(r'\n\s*\n', '\n', code)
    code = re.sub(r'  +', ' ', code)
    ratio = len(code) / original_len * 100 if original_len > 0 else 100
    print(f'  Basic minification: {original_len:,} -> {len(code):,} bytes ({ratio:.1f}%)')
    return code


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


def load_and_merge_split_json():
    """Load game data from split JSON files (Phase 1) or fall back to monolithic file.

    Split files:
      game_base.json    — core metadata, ch1 events, areas, npcs, items, shops, chains
      game_ch2plus.json — ch2-ch5 events, endings, ending_judgement
      game_meta.json    — implementation_notes, deprecated_endings_archive

    Returns the merged dict.
    """
    # Try split files first
    if (os.path.exists(DATA_BASE_PATH) and
            os.path.exists(DATA_CH2PLUS_PATH) and
            os.path.exists(DATA_META_PATH)):
        base = json.loads(read_file(DATA_BASE_PATH))
        ch2plus = json.loads(read_file(DATA_CH2PLUS_PATH))
        meta = json.loads(read_file(DATA_META_PATH))

        # Merge: base has everything except ch2+ events and meta-only keys
        merged = {**base}
        # Merge events: base events + ch2+ events
        merged['events'] = (base.get('events', []) or []) + (ch2plus.get('events', []) or [])
        # Merge endings and ending_judgement from ch2plus
        for k in ('endings', 'ending_judgement'):
            if k in ch2plus:
                merged[k] = ch2plus[k]
        # Merge meta keys
        for k in ('implementation_notes', 'deprecated_endings_archive'):
            if k in meta:
                merged[k] = meta[k]

        print(f'  Loaded split JSON: base={os.path.getsize(DATA_BASE_PATH):,} + '
              f'ch2plus={os.path.getsize(DATA_CH2PLUS_PATH):,} + '
              f'meta={os.path.getsize(DATA_META_PATH):,} bytes')
        print(f'  Merged events: {len(merged.get("events", []))} total')
        return merged

    # No fallback — split JSON is the single source of truth
    missing = []
    if not os.path.exists(DATA_BASE_PATH): missing.append('game_base.json')
    if not os.path.exists(DATA_CH2PLUS_PATH): missing.append('game_ch2plus.json')
    if not os.path.exists(DATA_META_PATH): missing.append('game_meta.json')
    raise FileNotFoundError(
        f'Missing split game data files: {", ".join(missing)}\n'
        f'Expected in: {DATA_DIR}\n'
        f'The monolithic src/game_data.json is no longer used.'
    )


def _strip_comments_safe(code):
    """Strip JS comments while respecting string literals and template literals.

    Simple regex-based // stripping breaks when JSON string values contain //
    (e.g. "// text" inside a description field). This state-machine approach
    tracks whether we're inside a string/template literal before stripping.
    """
    out = []
    i = 0
    n = len(code)
    in_str = None  # None, '"', "'", or '`'
    in_regex = False

    while i < n:
        c = code[i]

        # Inside a string literal
        if in_str is not None:
            out.append(c)
            if c == '\\':
                # Escape: skip next char
                if i + 1 < n:
                    out.append(code[i + 1])
                    i += 2
                    continue
            elif c == in_str:
                in_str = None
            elif in_str == '`' and c == '$' and i + 1 < n and code[i + 1] == '{':
                # Template literal expression — handled naively (good enough for minification)
                pass
            i += 1
            continue

        # Start of string literal
        if c in ('"', "'", '`'):
            in_str = c
            out.append(c)
            i += 1
            continue

        # Potential comment
        if c == '/' and i + 1 < n:
            nc = code[i + 1]
            if nc == '/':
                # Single-line comment: skip to end of line
                nl = code.find('\n', i)
                if nl < 0:
                    break  # rest is comment
                i = nl  # keep the newline
                continue
            elif nc == '*':
                # Block comment: skip to */
                # Preserve preceding char for token-boundary detection
                prev_char = out[-1] if out else ''
                end = code.find('*/', i + 2)
                if end < 0:
                    break  # unclosed comment
                i = end + 2  # skip past */
                # Insert space if removing the comment would merge two non-ws tokens.
                # e.g. "return/*PURE__*/React" → "return React" (NOT "returnReact")
                #      ");/*PURE__*/React" → "); React" (NOT ");React")
                next_char = code[i] if i < n else ''
                if prev_char and next_char:
                    prev_is_ws = prev_char in ' \t\n\r'
                    next_is_ws = next_char in ' \t\n\r'
                    if not prev_is_ws and not next_is_ws:
                        # Always insert space between two non-whitespace tokens
                        # unless prev is '(' '[' '{' (no space needed before content)
                        if prev_char not in '([{':
                            out.append(' ')
                continue

        out.append(c)
        i += 1

    return ''.join(out)


def build(use_babel=True):
    # Read source files
    template = read_file(TEMPLATE_PATH)
    css = read_file(CSS_PATH)
    # Fix asset paths for file:// protocol: /webp/ → ./assets/webp/
    css = css.replace("url('/webp/", "url('./assets/webp/")
    print('Minifying CSS...')
    css = minify_css(css)
    react_js = read_file(REACT_PATH)
    reactdom_js = read_file(REACTDOM_PATH)
    babel_js = read_file(BABEL_PATH) if os.path.exists(BABEL_PATH) else ''

    # Load game data (split or monolithic)
    print('Loading game data...')
    game_data_dict = load_and_merge_split_json()

    # Compact game data
    game_data = json.dumps(
        game_data_dict,
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
        # Minify JS for smaller output
        print('Minifying JS...')
        # Skip terser for large bundles (inline JSON data causes terser overhead)
        if len(compiled_js) > 800_000:
            import re as _re
            _orig = len(compiled_js)
            # State-machine comment stripper that respects string literals.
            # Simple regex // removal breaks when JSON string values contain //
            # (e.g. "// 如果角色碰到了这里" in game data).
            compiled_js = _strip_comments_safe(compiled_js)
            # CRITICAL: After comment stripping, ensure tokens don't collide.
            # Babel outputs "return/*#__PURE__*/React" and after removing the comment,
            # we need "return React", NOT "returnReact".
            # Only insert space after punctuation that Babel outputs before PURE annotations:
            #   ) → )React, } → }function, : → :React, = → =React, ! → !function, ~ → ~function
            # Do NOT use broad [^\s] — that would break identifiers like "var" → "v a r".
            # Do NOT include + - ; (breaks ++a, --b, valid ;keyword patterns).
            compiled_js = _re.sub(r'([)}:=!~])(?=[A-Za-z_$])', r'\1 ', compiled_js)
            compiled_js = _re.sub(r'(\w)\n(\w)', r'\1 \2', compiled_js)
            compiled_js = _re.sub(r'\n\s*\n', '\n', compiled_js)
            compiled_js = _re.sub(r'  +', ' ', compiled_js)
            print(f'  Basic minification: {_orig:,} -> {len(compiled_js):,} bytes ({len(compiled_js)/_orig*100:.1f}%)')
        else:
            compiled_js = minify_js(compiled_js)
        html = template.replace('__INLINE_REACT__', react_js)
        html = html.replace('__INLINE_REACTDOM__', reactdom_js)
        html = html.replace('__INLINE_CSS__', css)
        html = html.replace('__INLINE_JS__', compiled_js)
    else:
        # Dev build: Babel standalone in browser (local)
        babel_script = '<script>\n' + babel_js + '\n</script>\n' if babel_js else '<script src="https://cdn.bootcdn.net/ajax/libs/babel-standalone/7.24.7/babel.min.js"></script>\n'
        # Use regex to match <script> wrapping __INLINE_JS__ (tolerates any whitespace/indentation)
        html = re.sub(
            r'<script>(\s*__INLINE_JS__[^<]*)</script>',
            r'<script type="text/babel">\1</script>',
            template, count=1
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

    # Phase 1: Copy split JSON files alongside index.html for web lazy loading
    # These are only used when serving via HTTP (not Tauri single-file mode)
    output_dir = os.path.dirname(OUTPUT)
    split_files_copied = 0
    for src_path, out_name in [
        (DATA_BASE_PATH, 'game_base.json'),
        (DATA_CH2PLUS_PATH, 'game_ch2plus.json'),
        (DATA_META_PATH, 'game_meta.json'),
    ]:
        if os.path.exists(src_path):
            import shutil
            dest = os.path.join(output_dir, out_name)
            shutil.copy2(src_path, dest)
            split_files_copied += 1
    if split_files_copied > 0:
        print(f'  Copied {split_files_copied} split JSON files for web lazy loading')

    # Report (use byte counts for accurate file sizes with CJK text)
    size = os.path.getsize(OUTPUT)
    has_babel_standalone = 'babel.min.js' in html or 'text/babel' in html
    print(f'\nBuild complete: {OUTPUT}')
    print(f'  Output size: {size:,} bytes ({size / 1024:.1f} KB)')
    print(f'  Game data:   {len(game_data.encode("utf-8")):,} bytes')
    print(f'  CSS:         {len(css.encode("utf-8")):,} bytes')
    print(f'  JS:          {len((compiled_js or js_with_data).encode("utf-8")):,} bytes')
    print(f'  Babel used:  {"yes" if compiled_js else "no (standalone)"}')
    if has_babel_standalone:
        print(f'\n  [!] WARNING: Babel standalone is included in output ({size/1024:.0f} KB).')
        print(f'    This adds ~800KB. Install @babel/cli for production builds:')
        print(f'    npm install --save-dev @babel/cli @babel/preset-react')
    else:
        print(f'  [OK] Production build: no Babel standalone in output')


def test_strip_es_modules():
    """Unit tests for the ES module stripping function."""
    tests = [
        # (input, expected_contains, expected_not_contains)
        (
            "import { foo, bar } from './utils.js';\nconst x = 1;\n",
            "const x = 1",
            "import"
        ),
        (
            "import React from 'react';\nconst y = 2;\n",
            "const y = 2",
            "import React"
        ),
        (
            "import './polyfill.js';\nconst z = 3;\n",
            "const z = 3",
            "polyfill"
        ),
        (
            "export const events = [1,2,3];\n",
            "const events = [1,2,3]",
            "export"
        ),
        (
            "export function hello() { return 42; }\n",
            "function hello()",
            "export"
        ),
        (
            "export default class Foo {}\n",
            "class Foo",
            "export"
        ),
        (
            "export { a, b } from './other.js';\nconst c = 1;\n",
            "const c = 1",
            "export"
        ),
        (
            "export { x, y };\nconst z = 9;\n",
            "const z = 9",
            "export"
        ),
        (
            "const {useState, useEffect} = React;\n",
            "var {useState, useEffect} = React",
            "const {useState"
        ),
        (
            "import { A } from './a.js';\n\n\n\nconst B = 1;\n",
            "const B = 1",
            "import"
        ),
        # Phase 1: export async function
        (
            "export async function loadChapterData() { return 1; }\n",
            "async function loadChapterData",
            "export"
        ),
        # export default async function
        (
            "export default async function main() { await 1; }\n",
            "async function main",
            "export"
        ),
    ]
    passed = 0
    for i, (inp, exp_contains, exp_not) in enumerate(tests):
        result = strip_es_modules(inp)
        ok = True
        if exp_contains not in result:
            print(f"  FAIL test {i+1}: expected to contain {repr(exp_contains)}")
            print(f"    got: {repr(result[:100])}")
            ok = False
        if exp_not in result:
            print(f"  FAIL test {i+1}: expected NOT to contain {repr(exp_not)}")
            print(f"    got: {repr(result[:100])}")
            ok = False
        if ok:
            passed += 1
    print(f"  {passed}/{len(tests)} tests passed")
    return passed == len(tests)


def run_verify():
    """Run all tests and validators. Returns True if all pass."""
    tests_dir = os.path.join(BASE, 'tests')
    all_pass = True
    test_files = [
        'test_effect_protocol.cjs',
        'test_game_data_protocol.cjs',
        'test_event_system.cjs',
        'test_smoke_flows.cjs',
    ]
    for tf in test_files:
        tp = os.path.join(tests_dir, tf)
        if not os.path.exists(tp):
            print(f'  [SKIP] {tf} (not found)')
            continue
        result = subprocess.run(['node', tp], capture_output=True, text=True, cwd=BASE)
        passed = result.returncode == 0
        # Count pass/fail from output
        lines = (result.stdout + result.stderr).strip().split('\n')
        summary = [l for l in lines if 'passed' in l.lower() or 'fail' in l.lower()]
        status = 'PASS' if passed else 'FAIL'
        print(f'  [{status}] {tf}' + (f'  ({summary[-1].strip()})' if summary else ''))
        if not passed:
            all_pass = False
            # Show last few lines of failure
            for l in lines[-5:]:
                if l.strip(): print(f'         {l}')
    # Output size check + budgets
    if os.path.exists(OUTPUT):
        size = os.path.getsize(OUTPUT)
        html = read_file(OUTPUT)
        has_babel = 'babel.min.js' in html or 'text/babel' in html
        # Extract JS size from build output comment or estimate
        js_match = re.search(r'JS:\s+([\d,]+)\s+bytes', html + '\n' + str(size))
        print(f'  [INFO] index.html: {size:,} bytes ({size/1024/1024:.1f} MB)')
        if has_babel:
            print(f'  [WARN] Babel standalone in output (+{4700}KB overhead)')
            all_pass = False
        else:
            print(f'  [OK] No Babel standalone (production build)')
        # Size budgets
        SIZE_BUDGETS = [
            (3 * 1024 * 1024, 6 * 1024 * 1024, 'index.html', size),
        ]
        for warn_threshold, fail_threshold, label, actual in SIZE_BUDGETS:
            if actual > fail_threshold:
                print(f'  [FAIL] {label}: {actual/1024/1024:.1f} MB > {fail_threshold/1024/1024:.0f} MB budget')
                all_pass = False
            elif actual > warn_threshold:
                print(f'  [WARN] {label}: {actual/1024/1024:.1f} MB > {warn_threshold/1024/1024:.0f} MB budget')
    # Vite build check (non-blocking: warn only, don't fail verify)
    vite_dist = os.path.join(BASE, 'dist-vite', 'index.html')
    try:
        result = subprocess.run(
            'npm run build:vite', shell=True, capture_output=True, text=True,
            cwd=BASE, timeout=120, encoding='utf-8', errors='replace'
        )
        if result.returncode == 0 and os.path.exists(vite_dist):
            vite_size = os.path.getsize(vite_dist)
            print(f'  [OK] Vite build: {vite_size:,} bytes')
        else:
            print(f'  [WARN] Vite build failed (non-blocking)')
            if result.stderr:
                for line in result.stderr.strip().split('\n')[-3:]:
                    if line.strip(): print(f'         {line.strip()[:120]}')
    except Exception as e:
        print(f'  [WARN] Vite build error: {e}')
    return all_pass


if __name__ == '__main__':
    if '--test' in sys.argv:
        print("Running strip_es_modules tests...")
        ok = test_strip_es_modules()
        sys.exit(0 if ok else 1)
    if '--verify' in sys.argv:
        print("=== Verify ===")
        ok = run_verify()
        sys.exit(0 if ok else 1)
    if '--analyze' in sys.argv:
        # Bundle analysis: show file sizes by category
        print("=== Bundle Analysis ===")
        categories = {}
        for fname in REDUCER_FILES:
            path = os.path.join(SRC, fname)
            if os.path.exists(path):
                size = os.path.getsize(path)
                cat = fname.split('/')[0] if '/' in fname else 'root'
                if cat not in categories: categories[cat] = []
                categories[cat].append((fname, size))
        for cat in sorted(categories):
            total = sum(s for _, s in categories[cat])
            print(f"\n  [{cat}] {total:,} bytes ({total/1024:.1f} KB)")
            for fname, size in sorted(categories[cat], key=lambda x: -x[1]):
                print(f"    {fname:50s} {size:>8,} bytes")
        # app.jsx
        jsx_size = os.path.getsize(JSX_PATH)
        css_size = os.path.getsize(CSS_PATH)
        print(f"\n  [main] app.jsx: {jsx_size:,} bytes | styles.css: {css_size:,} bytes")
        print(f"\n  Total source: {sum(sum(s for _,s in v) for v in categories.values())+jsx_size+css_size:,} bytes")
        sys.exit(0)
    # --dev: skip minification, keep Babel standalone for faster builds
    use_babel = '--no-babel' not in sys.argv and '--dev' not in sys.argv
    prod_require_compiled = '--prod' in sys.argv
    # --prod: run verify before building
    if prod_require_compiled:
        print("=== Pre-build Verify (--prod) ===")
        if not run_verify():
            print('\n[FAIL] --prod: Verify failed. Fix issues before building.', file=sys.stderr)
            sys.exit(1)
        print()
    build(use_babel)
    if prod_require_compiled:
        html = read_file(OUTPUT)
        if 'text/babel' in html or 'babel.min.js' in html:
            print('\n[FAIL] --prod: Babel standalone found in output. Aborting.', file=sys.stderr)
            sys.exit(1)
        print('[OK] --prod: Production build verified.')
