#!/usr/bin/env python3
"""
scripts/add_echo_overlays.py — 区域事件回声覆盖层注入
为 area_deep 事件添加 echo_overlay 字段，当该区域有上一轮NPC死亡回声时触发。

回声文本原则：不说破，让玩家自己毛。
  - 不提到NPC名字
  - 不解释原因
  - 只是一句淡淡的感受
"""

import re
import sys
import os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data')
AREA_FILE = os.path.join(SRC, 'events_area_deep.js')

# 每个区域的"回声感觉" — 只说感受，不说原因
ECHO_OVERLAYS = {
    'town_center': (
        "镇中心的某个角落空了。\\n"
        "不是你能指认的空——是空气里少了一种声音。\\n"
        "你走了几个来回。确认了。\\n"
        "某个一直在这里的东西，不在了。"
    ),
    'harbor_district': (
        "码头比上次来时安静了一些。\\n"
        "不是人少了——是有什么东西不在了。\\n"
        "你闻了闻空气。盐味还是一样的。\\n"
        "但混在里面的另一种味道——消失了。"
    ),
    'whispering_forest': (
        "林子里少了点什么。\\n"
        "不是你能指认的——是某种节奏变了。\\n"
        "风还在吹。鸟还在叫。\\n"
        "但有一种默契不再了。"
    ),
    'voxchester_manor': (
        "庄园的某个房间空了。\\n"
        "不是家具少了——是空气的密度变了。\\n"
        "你经过那个房间门口时放慢了脚步。\\n"
        "你没有进去。你知道里面没有人在等你。"
    ),
    'catacombs_entrance': (
        "墓穴入口的某个回声位置空了。\\n"
        "不是石头少了——是某种持续了很久的'在场'结束了。\\n"
        "你站在入口处等了一下。\\n"
        "没有人和你一起等。"
    ),
    'lighthouse': (
        "灯塔的某个位置空了。\\n"
        "不是灯灭了——是灯后面的人不在了。\\n"
        "你走上螺旋梯时数了级数。\\n"
        "和上次一样。但走到顶的时候——\\n"
        "你觉得这段路比上次长了一些。"
    ),
    'ruins_of_yith': (
        "遗迹的某个角落空了。\\n"
        "不是装置少了——是一种共鸣消失了。\\n"
        "你把手放在那面墙壁上。\\n"
        "以前能感到的振动——现在没有了。"
    ),
    'forbidden_grove': (
        "禁忌之林的某个位置空了。\\n"
        "不是果子少了——是某个采集的痕迹不在了。\\n"
        "你找到了那个地方。\\n"
        "藤蔓还在。浆果还在。\\n"
        "但来采它们的人——不在了。"
    ),
    'deep_catacombs': (
        "深渊深处有个位置空了。\\n"
        "不是空间少了——是某种注视消失了。\\n"
        "你往下看。黑暗还是一样的。\\n"
        "但黑暗里不再有东西在看你。\\n"
        "这让你更加不安。"
    ),
}

EVENT_TO_AREA = {
    'area_town_center': 'town_center',
    'area_harbor': 'harbor_district',
    'area_forest': 'whispering_forest',
    'area_manor': 'voxchester_manor',
    'area_catacombs': 'catacombs_entrance',
    'area_lighthouse': 'lighthouse',
    'area_ruins': 'ruins_of_yith',
    'area_grove': 'forbidden_grove',
    'area_deep': 'deep_catacombs',
}


def get_area_id(event_id):
    prefix = event_id[:event_id.rfind('_')]
    return EVENT_TO_AREA.get(prefix, 'town_center')


def inject_echo_overlays(content):
    content_orig = content

    id_pat = re.compile(r"id:\s*'(area_[^']+)'")
    event_ids = []
    for m in id_pat.finditer(content):
        eid = m.group(1)
        if eid not in event_ids:
            event_ids.append(eid)

    modified = 0
    skipped = 0
    errors = 0

    for event_id in reversed(event_ids):
        # Extract event
        id_match = re.search(r"id:\s*'" + re.escape(event_id) + "'", content)
        if not id_match:
            errors += 1
            continue

        brace_start = content.rfind('{', 0, id_match.start())
        if brace_start == -1:
            errors += 1
            continue

        depth = 0
        i = brace_start
        while i < len(content):
            if content[i] == '{':
                depth += 1
            elif content[i] == '}':
                depth -= 1
                if depth == 0:
                    event_text = content[brace_start:i + 1]
                    start = brace_start
                    end = i + 1

                    if 'echo_overlay' in event_text:
                        skipped += 1
                        break

                    area_id = get_area_id(event_id)
                    overlay = ECHO_OVERLAYS.get(area_id)
                    if not overlay:
                        break

                    indent = '    '
                    lines = ['', indent + 'echo_overlay: \'' + overlay.replace("'", "\\'") + '\',']

                    choices_pos = event_text.find('\n    choices:')
                    if choices_pos != -1:
                        insert_pos = choices_pos
                    else:
                        anchor_pos = event_text.rfind('\n    normalcy_anchor:')
                        insert_pos = anchor_pos + 1 if anchor_pos != -1 else len(event_text) - 1

                    new_event = event_text[:insert_pos] + '\n'.join(lines) + event_text[insert_pos:]
                    content = content[:start] + new_event + content[end:]
                    modified += 1
                    break
            elif content[i] == "'" or content[i] == '"':
                quote = content[i]
                i += 1
                while i < len(content):
                    if content[i] == '\\':
                        i += 2
                        continue
                    if content[i] == quote:
                        break
                    i += 1
            i += 1

    return content, modified, skipped, errors


def main():
    dry_run = '--dry-run' in sys.argv[1:]

    print(f"\n{'='*60}")
    print(f"  区域事件回声覆盖层注入")
    print(f"{'='*60}\n")

    content = open(AREA_FILE, 'r', encoding='utf-8').read()
    content, modified, skipped, errors = inject_echo_overlays(content)

    if modified == 0 and skipped > 0:
        print(f"  ℹ️  所有 {skipped} 个区域事件已有 echo_overlay")
        return

    if dry_run:
        print(f"  🔍 将为 {modified} 个区域事件添加 echo_overlay（dry run）")
    else:
        open(AREA_FILE, 'w', encoding='utf-8', newline='\n').write(content)
        print(f"  ✅ 已为 {modified} 个区域事件添加 echo_overlay")
        if skipped:
            print(f"  ℹ️  跳过 {skipped} 个已有覆盖层的事件")
        if errors:
            print(f"  ⚠️  {errors} 个事件解析失败")

    print(f"\n{'='*60}\n")


if __name__ == '__main__':
    main()
