#!/usr/bin/env python3
"""
scripts/add_description_variants.py — 区域事件描述变体注入
为 area_deep 事件添加基于访问次数的描述变体，营造轮回中的既视感。

变体层级:
  visit_2_3   — "既视感萌芽": 2-3次访问，微妙熟悉
  visit_4_6   — "记忆重叠": 4-6次访问，主动预判
  visit_7_plus — "肌肉记忆": 7次+访问，身体先于意识

用法:
  python scripts/add_description_variants.py --dry-run   # 预览
  python scripts/add_description_variants.py              # 执行
"""

import re
import sys
import os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data')
AREA_FILE = os.path.join(SRC, 'events_area_deep.js')

AREA_THEMES = {
    'town_center': {
        'sensory': ['鹅卵石', '风铃', '面包房', '公告栏', '教堂', '钟声'],
        'familiarity': '脚下的路',
        'memory': '公告栏上',
    },
    'harbor_district': {
        'sensory': ['海风', '盐味', '渔网', '木板', '汽笛', '柴油'],
        'familiarity': '码头的木板',
        'memory': '某根系缆桩',
    },
    'whispering_forest': {
        'sensory': ['松针', '苔藓', '鸟鸣', '树影', '雾气', '腐殖质'],
        'familiarity': '某棵熟悉的树',
        'memory': '上次刻标记的地方',
    },
    'voxchester_manor': {
        'sensory': ['壁炉', '画像', '地毯', '楼梯', '灰尘', '旧书'],
        'familiarity': '某级台阶',
        'memory': '某幅画像',
    },
    'catacombs_entrance': {
        'sensory': ['石壁', '潮湿', '铁锈', '黑暗', '回声', '硫磺'],
        'familiarity': '某道转弯',
        'memory': '某个划痕',
    },
    'lighthouse': {
        'sensory': ['灯光', '旋转', '螺旋梯', '玻璃', '风声', '灯油'],
        'familiarity': '某级台阶的磨损',
        'memory': '灯室的地板',
    },
    'ruins_of_yith': {
        'sensory': ['金属', '刻痕', '几何', '共振', '晶体', '异星'],
        'familiarity': '某面墙壁的纹路',
        'memory': '上次触碰的机器',
    },
    'forbidden_grove': {
        'sensory': ['浆果', '树皮', '花粉', '藤蔓', '荧光', '蜂鸣'],
        'familiarity': '某棵树的纹理',
        'memory': '上次摘浆果的地方',
    },
    'deep_catacombs': {
        'sensory': ['深水', '黑暗', '符号', '低语', '水声', '窒息'],
        'familiarity': '某段路的倾斜度',
        'memory': '竖井的边缘',
    },
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
    """从事件 ID 提取区域 ID"""
    prefix = event_id[:event_id.rfind('_')]
    return EVENT_TO_AREA.get(prefix, 'town_center')


def generate_variants(area_id):
    """为指定区域生成三级描述变体"""
    theme = AREA_THEMES.get(area_id, {
        'sensory': ['这个'], 'familiarity': '这里的', 'memory': '某个角落'
    })
    s0 = theme['sensory'][0]
    s1 = theme['sensory'][1] if len(theme['sensory']) > 1 else s0
    fam = theme['familiarity']
    mem = theme['memory']

    return {
        'visit_2_3': (
            f"{fam}有些不一样了。\\n"
            f"不是变了——是你看它的方式变了。\\n"
            f"上次经过时忽略的细节，这次突然撞进眼里。\\n"
            f"也许是{s0}的味道比上次浓了一些。\\n"
            f"也许是光线从另一个角度照进来。\\n"
            f"你知道这里是哪里。但你知道——\\n"
            f"你不只是路过。"
        ),
        'visit_4_6': (
            f"你已经在脑子里走了一遍。\\n"
            f"不需要眼睛——{mem}的画面已经刻好了。\\n"
            f"你甚至能预判{s0}从哪个方向来。\\n"
            f"但你还是走了和上次一样的路。\\n"
            f"每一步都踩在记忆的印子上。\\n"
            f"你知道前方有什么。\\n"
            f"问题是你这次会不会做出同样的选择。"
        ),
        'visit_7_plus': (
            f"你的身体先于你的意识动了。\\n"
            f"不需要思考——{fam}的每一寸你都记得。\\n"
            f"你知道哪里不平、哪里会响、哪里藏着什么。\\n"
            f"像是你亲手布置的。但你没有。\\n"
            f"你只是来过足够多次，让这个地方长在了你身上。\\n"
            f"长在了你的骨头里。\\n"
            f"现在你是这个地方的一部分了——\\n"
            f"就像它也是你的一部分一样。"
        ),
    }


def extract_event(content, event_id, search_start=0):
    """Brace counting 提取完整事件对象"""
    id_pat = re.compile(r"id:\s*'" + re.escape(event_id) + "'")
    m = id_pat.search(content, search_start)
    if not m:
        return None, -1, -1

    brace_start = content.rfind('{', 0, m.start())
    if brace_start == -1:
        return None, -1, -1

    depth = 0
    i = brace_start
    while i < len(content):
        c = content[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return content[brace_start:i + 1], brace_start, i + 1
        elif c == "'" or c == '"':
            quote = c
            i += 1
            while i < len(content):
                if content[i] == '\\':
                    i += 2
                    continue
                if content[i] == quote:
                    break
                i += 1
        i += 1
    return None, -1, -1


def inject_variants(content):
    """为所有 area_* 事件注入 description_variants"""
    content_orig = content

    # Find all area_* event IDs
    id_pat = re.compile(r"id:\s*'(area_[^']+)'")
    event_ids = []
    for m in id_pat.finditer(content):
        eid = m.group(1)
        if eid not in event_ids:
            event_ids.append(eid)

    modified = 0
    skipped = 0
    errors = 0

    # Process from end to start
    for event_id in reversed(event_ids):
        event_text, start, end = extract_event(content, event_id)
        if not event_text:
            errors += 1
            continue

        # Skip if already has description_variants
        if 'description_variants' in event_text:
            skipped += 1
            continue

        # Get area theme
        area_id = get_area_id(event_id)
        variants = generate_variants(area_id)

        # Build injection block
        indent = '    '
        lines = ['', indent + 'description_variants: {']
        for k, v in variants.items():
            safe_v = v.replace("'", "\\'")
            lines.append(f"{indent}  {k}: '{safe_v}',")
        lines.append(indent + '},')

        # Insert before choices or normalcy_anchor
        choices_pos = event_text.find('\n    choices:')
        if choices_pos != -1:
            insert_pos = choices_pos
        else:
            anchor_pos = event_text.rfind('\n    normalcy_anchor:')
            insert_pos = anchor_pos + 1 if anchor_pos != -1 else len(event_text) - 1

        new_event = event_text[:insert_pos] + '\n'.join(lines) + event_text[insert_pos:]

        content = content[:start] + new_event + content[end:]
        modified += 1

    return content, modified, skipped, errors


def main():
    dry_run = '--dry-run' in sys.argv[1:]
    verbose = '--verbose' in sys.argv[1:]

    print(f"\n{'='*60}")
    print(f"  区域事件描述变体注入")
    print(f"{'='*60}\n")

    content = open(AREA_FILE, 'r', encoding='utf-8').read()

    content, modified, skipped, errors = inject_variants(content)

    if modified == 0 and skipped > 0:
        print(f"  ℹ️  所有 {skipped} 个区域事件已有描述变体")
        return

    if dry_run:
        print(f"  🔍 将为 {modified} 个区域事件添加描述变体（dry run）")
        if verbose:
            # Show one sample per area
            for area_key in EVENT_TO_AREA:
                pat = re.compile(r"id: '(" + re.escape(area_key) + r"[^']+)'")
                m = pat.search(content)
                if m:
                    eid = m.group(1)
                    evt, _, _ = extract_event(content, eid)
                    if evt:
                        dv = re.search(r"description_variants: \{(.*?)\n    \}", evt, re.DOTALL)
                        if dv:
                            keys = re.findall(r"  (\w+):", dv.group(0))
                            print(f"\n  {eid}: {keys}")
                            # Show first variant preview
                            first = re.search(r"  (visit_2_3): '([^']{0,50})'", dv.group(0))
                            if first:
                                print(f"    {first.group(1)}: {first.group(2)}...")
    else:
        open(AREA_FILE, 'w', encoding='utf-8', newline='\n').write(content)
        print(f"  ✅ 已为 {modified} 个区域事件添加描述变体")
        if skipped:
            print(f"  ℹ️  跳过 {skipped} 个已有变体的事件")
        if errors:
            print(f"  ⚠️  {errors} 个事件解析失败")

    print(f"\n{'='*60}\n")


if __name__ == '__main__':
    main()
