#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const ALLOWED_GLOBALS = new Set([
  'AbortController', 'Array', 'Audio', 'BigInt', 'Blob', 'Boolean', 'CSS',
  'CustomEvent', 'Date', 'Error', 'EvalError', 'Event', 'File', 'FileReader',
  'Element', 'EventTarget', 'FormData', 'HTMLElement', 'Image', 'Infinity', 'Intl', 'JSON', 'Map',
  'Math', 'MutationObserver', 'NaN', 'Number', 'Object', 'Promise', 'Proxy',
  'RangeError', 'ReferenceError', 'Reflect', 'RegExp', 'Request', 'Response',
  'ResizeObserver', 'Set', 'String', 'Symbol', 'SyntaxError', 'TextDecoder', 'TextEncoder',
  'TypeError', 'URIError', 'URL', 'URLSearchParams', 'WeakMap', 'WeakSet',
  'WebSocket', 'alert', 'cancelAnimationFrame', 'clearInterval', 'clearTimeout', 'confirm',
  'console', 'crypto', 'decodeURIComponent', 'document', 'encodeURIComponent',
  'fetch', 'globalThis', 'history', 'indexedDB', 'isFinite', 'isNaN',
  'localStorage', 'location', 'navigator', 'parseFloat', 'parseInt',
  'performance', 'process', 'queueMicrotask', 'requestAnimationFrame', 'screen', 'sessionStorage',
  'setInterval', 'setTimeout', 'structuredClone', 'undefined', 'window',
]);

function collectFiles(dir, result) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, result);
    else if (/\.(?:js|jsx|mjs|cjs)$/.test(entry.name)) result.push(full);
  }
}

const files = [];
collectFiles(SRC, files);
const findings = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(source, {
      sourceType: 'module',
      plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator'],
    });
  } catch (error) {
    findings.push({ file, line: error.loc?.line || 1, column: error.loc?.column || 0, name: '<parse-error>' });
    continue;
  }

  traverse(ast, {
    ReferencedIdentifier(identifierPath) {
      const name = identifierPath.node.name;
      if (ALLOWED_GLOBALS.has(name) || identifierPath.scope.hasBinding(name)) return;
      findings.push({
        file,
        line: identifierPath.node.loc?.start.line || 1,
        column: identifierPath.node.loc?.start.column || 0,
        name,
      });
    },
  });
}

const unique = Array.from(
  new Map(findings.map((item) => [`${item.file}:${item.line}:${item.column}:${item.name}`, item])).values()
).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);

if (unique.length > 0) {
  for (const item of unique) {
    console.error(`${path.relative(ROOT, item.file)}:${item.line}:${item.column + 1} ${item.name} is not defined`);
  }
  console.error(`\n${unique.length} unbound identifier(s) found.`);
  process.exitCode = 1;
} else {
  console.log(`No unbound identifiers found in ${files.length} source files.`);
}
