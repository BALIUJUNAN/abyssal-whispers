#!/usr/bin/env python3
import os, re, glob

ROOT = r"D:\ZHIJIGozgewan\COC"
WEBP_DIR = os.path.join(ROOT, "assets", "webp")
ENDING_DIR = os.path.join(ROOT, "assets", "webp_ending")
pm_content = open(os.path.join(ROOT, "src", "portraitMap.js"), encoding='utf-8').read()

def get_files(d):
    if not os.path.exists(d): return set()
    return {f for f in os.listdir(d) if f.endswith('.webp')}

webp_f = get_files(WEBP_DIR)
ending_f = get_files(ENDING_DIR)
refs = set(re.findall(r"'([^']+\.webp)'", pm_content))

print("=" * 60)
print("WebP 素材审计报告")
print("=" * 60)
print(f"assets/webp/       : %d 张" % len(webp_f))
print(f"assets/webp_ending/ : %d 张" % len(ending_f))
print(f"总计               : %d 张" % (len(webp_f) + len(ending_f)))
print(f"portraitMap.js 引用: %d 个路径" % len(refs))

# Part 1: unused in webp/
unused_w = sorted(webp_f - refs)
missing_w = sorted(refs - webp_f)
print("\n" + "=" * 60)
print("PART 1: assets/webp/ 审计")
print("=" * 60)
if unused_w:
    print("\n  未被引用 (%d 张):" % len(unused_w))
    for f in unused_w:
        sz = os.path.getsize(os.path.join(WEBP_DIR, f)) / 1024
        print("    [DEAD] %-45s %7.0f KB" % (f, sz))
else:
    print("\n  全部 %d 张均有引用!" % len(webp_f))

if missing_w:
    print("\n  引用但缺失 (%d):" % len(missing_w))
    for f in missing_w:
        print("    [MISSING] %s" % f)

# Part 2: ending CG
ending_cg_refs = {k.split('/')[-1] if '/' in k else k for k in refs if 'assets/' in k or any(e in k for e in [
    '裂痕','溶盐者','容器','潮声','悦纳者','黑潮圣婚',
    '餐具','屠宰场','回音','人肉税','筹码','伪神','蛆','封印的亲吻',
    '升座','长眠','账房','囚徒','漫游者','守财奴','归海','档案吞噬',
    '永恒记录','观测者','删档祈愿','循环蛆虫','愉悦先知','污圣徒',
    '十三响','血肉合唱','最佳员工','整洁屠夫','木偶师','断环','白页',
    '无效档案','超越者','深渊吞噬','异端降临','第十二声','守门人',
    '希尔达的选择','最后的人事','证据逃离','海上逃离','轮回破壁',
    '成为事件','身心俱灭','黑暗中的手','被观察者','镜中缺席',
    '旧汗渍','空白墓碑','空白事件卡','洗不掉的印记','骨头落地的声音',
    '封印崩塌','无尽的楼梯','肖像全部转头','第二个自己','第四次归来',
    '时间停止','深夜集体','深海阴影','海潮进入','封印石门',
    '封印核心','第600','墨水化','笔记本最后一页','事件日志问号','路人低语',
    '页码599','玩家成为','漂浮的外套'
])}

unused_e = sorted(ending_f - ending_cg_refs)
missing_e = sorted(ending_cg_refs - ending_f)
print("\n" + "=" * 60)
print("PART 2: assets/webp_ending/ 结局CG审计")
print("=" * 60)
if unused_e:
    print("\n  未引用 (%d):" % len(unused_e))
    for f in unused_e:
        sz = os.path.getsize(os.path.join(ENDING_DIR, f)) / 1024
        print("    [DEAD] %-40s %7.0f KB" % (f, sz))
else:
    print("\n  全部 %d 张结局CG均已关联!" % len(ending_f))
if missing_e:
    print("\n  引用但文件缺失 (%d):" % len(missing_e))
    for f in missing_e:
        print("    [MISSING] %s" % f)

# Part 3: event data imageSrc
event_imgs = set()
data_dir = os.path.join(ROOT, "src", "data")
for ef in glob.glob(os.path.join(data_dir, "*.js")):
    ec = open(ef, encoding='utf-8').read()
    for m in re.finditer(r"""['"]?imageSrc['"]?\s*[:=]\s*['"]([^'"]+\.webp)['"]?""", ec):
        bn = m.group(1).split('/')[-1]
        event_imgs.add(bn)

total_refs = refs | event_imgs
still_dead = sorted(webp_f - total_refs)

print("\n" + "=" * 60)
print("PART 3: 综合统计与复用分析")
print("=" * 60)
print("\n  事件数据额外引用: %d 个WebP" % len(event_imgs))
print("  webp未使用总计:   %d 张" % len(still_dead))
for f in still_dead:
    sz = os.path.getsize(os.path.join(WEBP_DIR, f)) / 1024
    print("    [UNUSED] %-45s %7.0f KB" % (f, sz))

# Scene variants analysis
print("\n  场景变体（可动态切换的图片）:")
area_bases = {}
for f in sorted(webp_f):
    b = f.replace(' 白天','').replace(' 深夜','').replace(' 崩坏','')
    b = b.replace(' 正常','').replace(' 污染','').replace(' 救赎','')
    b = b.replace(' 入口','').replace(' 深处','')
    if b != f:
        area_bases.setdefault(b, []).append(f)
for base, vars_list in sorted(area_bases.items()):
    if len(vars_list) >= 2:
        print("    %-25s -> %s" % (base, ', '.join(vars_list)))

# Ending CG reuse
cg_map = {}
for m in re.finditer(r"'([^']+)':\s*'([^']+\.webp)'", pm_content):
    cg_map[m.group(1)] = m.group(2).split('/')[-1]
val_set = set(cg_map.values())
dupes = [(k,v) for k,v in cg_map.items() if list(cg_map.values()).count(v) > 1]
print("\n  结局CG共享情况:")
if dupes:
    seen = set()
    for k, v in dupes:
        if v not in seen:
            others = [kk for kk, vv in cg_map.items() if vv == v and kk != k]
            print("    '%s' <- 共用于: [%s]" % (v, ', '.join(others[:3])))
            seen.add(v)
else:
    print("    无重复，每结局CG唯一对应")

# Summary
used_w = len(webp_f) - len(still_dead)
used_e = len(ending_f) - len(unused_e)
total = len(webp_f) + len(ending_f)
used_total = used_w + used_e

print("\n" + "=" * 60)
print("最终总结")
print("=" * 60)
print("  类别              总数   已用   未用    使用率")
print("  %-18s %4d   %4d   %4d     %.1f%%" % ("assets/webp/", len(webp_f), used_w, len(still_dead), used_w/max(len(webp_f),1)*100))
print("  %-18s %4d   %4d   %4d     %.1f%%" % ("webp_ending/", len(ending_f), used_e, len(unused_e), used_e/max(len(ending_f),1)*100))
print("  %-18s %4d   %4d   %4d     %.1f%%" % ("合计", total, used_total, len(still_dead)+len(unused_e), used_total/max(total,1)*100))
