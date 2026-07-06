#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""area_deep 去重效果对比"""
import re
from collections import defaultdict

with open('src/data/events/events_area_deep.js', encoding='utf-8') as f:
    text = f.read()

ENTRY_PAT = re.compile(r"(\w+):\s*'((?:[^'\\]|\\.)*)'")
blocks = re.findall(r"distortion_variants:\s*\{(.*?)\}\s*,\s*choices", text, re.DOTALL)
if not blocks:
    blocks = re.findall(r"distortion_variants:\s*\{(.*?)\}\s*,\s*$", text, re.DOTALL | re.MULTILINE)

print(f"area_deep: {len(blocks)} variants found by parser")
print()

total_before = {'san_low': 70, 'san_mid': 50, 'corruption_high': 41, 'loop_3_plus': 48, 'fear_depth': 33}
total_after = {}
unique_before = {'san_low': 22, 'san_mid': 3, 'corruption_high': 4, 'loop_3_plus': 3, 'fear_depth': 3}
unique_after = {}

for level in ['san_low', 'san_mid', 'corruption_high', 'loop_3_plus', 'fear_depth']:
    seen = {}
    for block in blocks:
        v = {}
        for m in ENTRY_PAT.finditer(block):
            v[m.group(1)] = m.group(2).replace("\\'", "'")
        if level not in v:
            continue
        key = v[level][:60]
        seen[key] = seen.get(key, 0) + 1

    total_after[level] = sum(seen.values())
    unique_after[level] = len(seen)
    dups = {k: v for k, v in seen.items() if v > 1}
    dup_count = total_after[level] - unique_after[level]

    print(f"[{level}]")
    print(f"  去重前: {unique_before[level]} unique / {total_before[level]} total / {total_before[level] - unique_before[level]} dup")
    print(f"  去重后: {unique_after[level]} unique / {total_after[level]} total / {dup_count} dup")
    print(f"  改进: 重复率 {100*(total_before[level]-unique_before[level])/total_before[level]:.0f}% → {100*dup_count/total_after[level]:.0f}%")
    if dups:
        for k, cnt in sorted(dups.items(), key=lambda x: -x[1])[:2]:
            print(f"    仍有 x{cnt}: {k[:50]}...")
    print()
