import os

dir_path = r'D:\ZHIJIGozgewan\COC人物图'
files = [f for f in os.listdir(dir_path) if f.endswith('.png')]

npc_names = ['老费舍','玛莎·格雷','汤米·陈','希尔达','伊莱亚斯·沃德',
             '伊莎贝拉·韦伯','约书亚·布莱克','报童','疯乞丐','医生',
             '治安官','埃德加','可疑摊贩','镇民','码头工人','失踪者家属',
             '溺亡水手','半转化妇人','半转化镇民','晨星会祭司','晨星会教徒',
             '教堂祈祷者','庄园仆人幽影']
monster_names = ['深潜者','夜魔','食尸鬼','修格斯','无脸访客','伊斯残影',
                 '海边巨大阴影','海底巨大阴影','第二个自己','第四次归来',
                 '无脸访客靠近','梦境访客']

npc_files = {}
monster_files = {}
player_files = []
env_files = []
misc_files = []

for f in files:
    matched = False
    for n in npc_names:
        if n in f:
            npc_files.setdefault(n, []).append(f)
            matched = True
            break
    if not matched:
        for m in monster_names:
            if m in f:
                monster_files.setdefault(m, []).append(f)
                matched = True
                break
    if not matched and ('我 ' in f or f.startswith('我 ')):
        player_files.append(f)
        matched = True
    if not matched:
        env_files.append(f)

print("=== NPC立绘 ===")
for name in sorted(npc_files.keys()):
    fs = npc_files[name]
    variants = []
    for f in fs:
        v = f.replace(name + ' ', '').replace('.png', '')
        variants.append(v)
    print(f"  {name}: {len(fs)} variants ({', '.join(variants)})")

print(f"\n=== 怪物/存在 ({len(monster_files)}种) ===")
for name in sorted(monster_files.keys()):
    fs = monster_files[name]
    variants = [f.replace(name + ' ', '').replace('.png', '') for f in fs]
    print(f"  {name}: {len(fs)} ({', '.join(variants)})")

print(f"\n=== 主角(我) ({len(player_files)}张) ===")
for f in sorted(player_files):
    v = f.replace('我 ', '').replace('.png', '')
    print(f"  {v}")

print(f"\n=== 环境/场景 ({len(env_files)}张) === (部分)")
for f in sorted(env_files)[:25]:
    print(f"  {f}")
if len(env_files) > 25:
    print(f"  ... 还有 {len(env_files)-25} 张")

print(f"\n总计: {len(files)} 张")
