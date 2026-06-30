// scripts/find-missing-imports.cjs — Scan src/ for identifiers used without import/definition
const fs = require('fs');
const path = require('path');

// Known globals that don't need import
const KNOWN_GLOBALS = new Set([
  'console', 'window', 'document', 'Math', 'JSON', 'Date', 'Object', 'Array',
  'String', 'Number', 'Boolean', 'Error', 'TypeError', 'ReferenceError', 'SyntaxError',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'undefined', 'null', 'NaN', 'Infinity',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'fetch', 'Promise',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'RegExp',
  'alert', 'confirm', 'prompt', 'location', 'history', 'navigator',
  'requestAnimationFrame', 'cancelAnimationFrame',
  'Audio', 'Image', 'CanvasRenderingContext2D',
  'React', 'ReactDOM', 'produce', 'GD', 'module', 'exports', 'require',
  'globalThis', 'global', 'process', 'Buffer',
  'MutationObserver', 'ResizeObserver', 'IntersectionObserver',
  'CustomEvent', 'Event', 'addEventListener', 'removeEventListener',
  'getComputedStyle', 'matchMedia',
  'TextEncoder', 'TextDecoder', 'structuredClone',
  'AbortController', 'AbortSignal',
  'DOMParser', 'Node', 'Element', 'HTMLElement',
  'queueMicrotask', 'reportError', 'btoa', 'atob',
  'Reflect', 'Proxy', 'BigInt',
  'SharedArrayBuffer', 'Atomics',
  // React hooks destructured from global React
  'useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'memo',
  'useReducer', 'useContext', 'useLayoutEffect', 'useImperativeHandle',
  'useDebugValue', 'useDeferredValue', 'useTransition', 'useId',
  'createContext', 'createRef', 'forwardRef', 'lazy', 'Suspense',
  'createElement', 'cloneElement', 'isValidElement', 'Children',
  'Component', 'PureComponent', 'Fragment', 'StrictMode',
  // Common JS keywords that my regex might catch
  'if', 'else', 'for', 'while', 'switch', 'return', 'throw', 'new',
  'typeof', 'instanceof', 'delete', 'void', 'in', 'of', 'try', 'catch',
  'finally', 'class', 'extends', 'super', 'import', 'export', 'default',
  'yield', 'await', 'async', 'break', 'continue', 'case', 'debugger',
  'do', 'enum', 'const', 'let', 'var', 'function', 'static', 'get', 'set',
  'true', 'false', 'this', 'arguments',
  // Common type annotations
  'string', 'number', 'boolean', 'any', 'never', 'unknown',
  // Common constructors
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array',
  'BigInt64Array', 'BigUint64Array', 'ArrayBuffer', 'DataView',
  'WebAssembly', 'Wasm',
  'Intl', 'IntlProvider',
  'CSS', 'CSSStyleSheet',
  'BroadcastChannel',
  'Worker', 'WebSocket', 'XMLHttpRequest',
  'FormData', 'Blob', 'File', 'FileReader', 'URL', 'URLSearchParams',
  'AudioContext', 'webkitAudioContext',
  'OffscreenCanvas',
  'localStorage', 'sessionStorage',
  'performance', 'crypto', 'Crypto', 'SubtleCrypto',
  'CustomEvent', 'EventTarget',
  'requestIdleCallback',
  'reportError',
  'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'escape', 'unescape',
  'eval',
  'isFinite', 'isNaN',
  'parseInt', 'parseFloat',
]);

function extractCalledIdentifiers(code) {
  // Match standalone function calls: identifier( but NOT .identifier( or obj.identifier(
  const calls = new Set();
  const regex = /(?<![.\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const name = match[1];
    // Skip common method names that are called on objects
    if (/^(push|pop|shift|unshift|splice|slice|map|filter|reduce|forEach|find|findIndex|indexOf|includes|some|every|sort|reverse|join|concat|flat|flatMap|keys|values|entries|has|get|set|delete|clear|add|forEach|toString|toLowerCase|toUpperCase|trim|trimStart|trimEnd|replace|replaceAll|split|substring|substr|slice|startsWith|endsWith|includes|match|matchAll|search|padStart|padEnd|repeat|charAt|charCodeAt|codePointAt|fromCharCode|fromCodePoint|toFixed|toPrecision|toExponential|floor|ceil|round|abs|max|min|pow|sqrt|random|sign|trunc|log|exp|sin|cos|tan|now|parse|stringify|then|catch|finally|next|bind|call|apply|subscribe|unsubscribe|emit|on|off|once|removeListener|addListener|preventDefault|stopPropagation|getAttribute|setAttribute|removeAttribute|querySelector|querySelectorAll|createElement|appendChild|removeChild|insertBefore|replaceChild|cloneNode|contains|matches|closest|focus|blur|click|submit|reset|play|pause|load|open|send|close|getItem|setItem|removeItem|clear|getContext|fillRect|strokeRect|clearRect|drawImage|beginPath|closePath|moveTo|lineTo|arc|fill|stroke|save|restore|scale|rotate|translate|transform|measureText|fillText|strokeText|createImageData|putImageData|getImageData|createLinearGradient|createRadialGradient|createPattern|addColorStop|toDataURL|toBlob|getBoundingClientRect|getClientRects|scrollIntoView|scrollTo|scrollBy|animate|getComputedStyle|requestFullscreen|exitFullscreen|write|writeln|assign|defineProperty|defineProperties|create|freeze|seal|preventExtensions|isFrozen|isSealed|isExtensible|getOwnPropertyDescriptor|getOwnPropertyNames|getOwnPropertySymbols|getPrototypeOf|setPrototypeOf|isPrototypeOf|hasOwnProperty|propertyIsEnumerable|fromEntries|from|of|isArray|resolve|reject|all|allSettled|race|any|parseInt|parseFloat)$/.test(name)) continue;
    calls.add(name);
  }
  return calls;
}

function extractImports(code) {
  const names = new Set();
  const namedRe = /import\s+\{([^}]*)\}\s+from\s+['"]/g;
  let m;
  while ((m = namedRe.exec(code)) !== null) {
    m[1].split(',').forEach(s => {
      const name = s.trim().split(' as ').pop().trim();
      if (name) names.add(name);
    });
  }
  const defaultRe = /import\s+(\w+)\s+from\s+['"]/g;
  while ((m = defaultRe.exec(code)) !== null) names.add(m[1]);
  const nsRe = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]/g;
  while ((m = nsRe.exec(code)) !== null) names.add(m[1]);
  return names;
}

function extractLocalDefs(code) {
  const defs = new Set();
  let m;
  const funcRe = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  while ((m = funcRe.exec(code)) !== null) defs.add(m[1]);
  const varRe = /(?:export\s+)?(?:var|let|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[=;[\]{]/g;
  while ((m = varRe.exec(code)) !== null) defs.add(m[1]);
  const catchRe = /catch\s*\(\s*(\w+)\s*\)/g;
  while ((m = catchRe.exec(code)) !== null) defs.add(m[1]);
  const forRe = /for\s*\(\s*(?:var|let|const)\s+(\w+)/g;
  while ((m = forRe.exec(code)) !== null) defs.add(m[1]);
  return defs;
}

function walkDir(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fp = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== 'vendor' && item.name !== 'node_modules' && item.name !== '__pycache__') {
      files.push(...walkDir(fp));
    } else if (item.isFile() && /\.(js|jsx|ts|tsx)$/.test(item.name)) {
      files.push(fp);
    }
  }
  return files;
}

const srcDir = 'src';
const files = walkDir(srcDir);
const allIssues = [];

for (const file of files) {
  const code = fs.readFileSync(file, 'utf-8');
  const calls = extractCalledIdentifiers(code);
  const imports = extractImports(code);
  const localDefs = extractLocalDefs(code);
  const allKnown = new Set([...KNOWN_GLOBALS, ...imports, ...localDefs]);

  for (const call of calls) {
    if (allKnown.has(call)) continue;
    if (call.startsWith('_')) continue; // private vars
    if (call.length < 2) continue;
    const relPath = path.relative(srcDir, file).replace(/\\/g, '/');
    allIssues.push({ file: relPath, name: call });
  }
}

// Group by file, dedup
const byFile = {};
for (const { file, name } of allIssues) {
  if (!byFile[file]) byFile[file] = new Set();
  byFile[file].add(name);
}

// Filter: only show files with <= 10 issues (too many = likely false positives from data files)
const relevant = Object.entries(byFile)
  .filter(([, names]) => names.size <= 10 && names.size > 0)
  .sort((a, b) => a[0].localeCompare(b[0]));

console.log(`Files with likely missing imports (${relevant.length}):\n`);
for (const [file, names] of relevant) {
  const nameList = [...names].sort().join(', ');
  console.log(`  ${file}: ${nameList}`);
}