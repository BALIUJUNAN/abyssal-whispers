#!/usr/bin/env python3
"""
Check that every ESM import target in REDUCER_FILES is:
  1. Present in the REDUCER_FILES list
  2. Listed BEFORE the file that imports it (topological order)

Usage:
    python scripts/check_build_imports.py

Exit code 0 = all OK, 1 = errors found.
"""
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, 'src')
BUILD_PY = os.path.join(BASE, 'build.py')

def parse_reducer_files(path):
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    m = re.search(r'REDUCER_FILES\s*=\s*\[(.*?)\]', src, re.DOTALL)
    if not m:
        print('ERROR: Cannot find REDUCER_FILES in build.py')
        sys.exit(2)
    return re.findall(r"'([^']+)'", m.group(1))

IMPORT_RE = re.compile(r"""^\s*import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]""", re.MULTILINE)
EXPORT_RE = re.compile(r"""^\s*export\s+\{.*?\}\s+from\s+['"]([^'"]+)['"]""", re.MULTILINE)
COMMENT_RE = re.compile(r'//.*$', re.MULTILINE)

def strip_comments(src):
    return COMMENT_RE.sub('', src)

def resolve(imp, cur):
    if not imp.startswith('.'):
        return None
    r = os.path.normpath(os.path.join(os.path.dirname(cur), imp)).replace(os.sep, '/')
    # Strip leading ../ (src/ subdirectory imports) and src/ prefix
    while r.startswith('../'):
        r = r[3:]
    if r.startswith('src/'):
        r = r[4:]
    return r

def main():
    files = parse_reducer_files(BUILD_PY)
    order = {f: i for i, f in enumerate(files)}
    errors, warns, checked = [], [], 0

    for i, rp in enumerate(files):
        fp = os.path.join(SRC, rp)
        if not os.path.exists(fp):
            fp2 = os.path.join(BASE, rp)
            if os.path.exists(fp2):
                fp = fp2
            else:
                warns.append('  Not found: ' + rp)
                continue
        with open(fp, 'r', encoding='utf-8') as f:
            body = strip_comments(f.read())
        for imp in IMPORT_RE.findall(body) + EXPORT_RE.findall(body):
            res = resolve(imp, rp)
            if res is None:
                continue
            checked += 1
            if res not in order:
                errors.append(
                    '  MISSING: %s imports "%s" -> %s\n'
                    '           Add \'%s\' to REDUCER_FILES before \'%s\''
                    % (rp, imp, res, res, rp))
            elif order[res] >= i:
                errors.append(
                    '  ORDER:   %s (#%d) imports %s (#%d)\n'
                    '           %s must come BEFORE %s'
                    % (rp, i, res, order[res], res, rp))

    print('Checked %d imports across %d REDUCER_FILES entries.\n' % (checked, len(files)))
    if warns:
        print('WARNINGS (%d):' % len(warns))
        for w in warns:
            print(w)
        print()
    if errors:
        print('ERRORS (%d):' % len(errors))
        for e in errors:
            print(e)
        print()
        print('Fix: add missing file to REDUCER_FILES in build.py,')
        print('     positioned before the file that imports it.')
        sys.exit(1)
    print('All imports resolved and correctly ordered.')
    sys.exit(0)

if __name__ == '__main__':
    main()
