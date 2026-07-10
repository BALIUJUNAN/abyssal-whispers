#!/usr/bin/env python3
"""
check_build_imports.py — Vite ESM 构建验证

v0.9.7 后 build.py 已删除，拼接构建不再存在。
此脚本改为检查测试套件依赖的关键文件是否存在，
确保没有因文件移动/重命名导致的断裂引用。

Usage:
    python scripts/check_build_imports.py

Exit code 0 = all OK, 1 = errors found.
"""
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 测试文件引用的关键源文件和数据文件
REQUIRED_FILES = [
    # Game data
    'src/data/game_base.json',
    'src/data/game_ch2plus.json',
    'src/data/game_meta.json',
    # Event files
    'src/data/events/events_loop.js',
    'src/data/events/events_humanity.js',
    'src/data/events/events_mythos.js',
    'src/data/events/events_resource.js',
    'src/data/events/events_npc_cross.js',
    'src/data/events/events_area_deep.js',
    'src/data/events/events_ending.js',
    'src/data/events/events_silent.js',
    'src/data/events/events_meta.js',
    'src/data/events/events_ch2plus.js',
    # Reducers
    'src/reducers/loopReducer.js',
    'src/reducers/npcReducer.js',
    'src/reducers/endingReducer.js',
    'src/reducers/extendedEvents.js',
    'src/reducers/slices/exploreSlice.js',
    # Systems
    'src/systems/explore/explorePipeline.js',
    'src/systems/explore/textRenderingPipeline.js',
    'src/systems/explore/eventConsequenceSystem.js',
    'src/systems/playerTraces.js',
    'src/systems/deathSummary.js',
]

def main():
    errors = []
    checked = 0

    for rel in REQUIRED_FILES:
        fp = os.path.join(BASE, rel)
        checked += 1
        if not os.path.exists(fp):
            errors.append('  MISSING: ' + rel)

    print('Checked %d files.\n' % checked)
    if errors:
        print('ERRORS (%d):' % len(errors))
        for e in errors:
            print(e)
        print()
        print('Fix: restore or move the missing files,')
        print('     or update REQUIRED_FILES in this script.')
        sys.exit(1)

    print('All required files present.')
    print('Vite ESM handles import resolution — no build-order check needed.')
    sys.exit(0)

if __name__ == '__main__':
    main()
