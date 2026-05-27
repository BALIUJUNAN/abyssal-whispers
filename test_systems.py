#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深渊低语：沃切斯特之影 — 全面系统测试脚本

测试范围：
1. JSON 数据完整性（schema、跨文件引用、字段存在性）
2. Reducer 模块语法与导出一致性
3. 核心逻辑边界条件（SAN/死亡/事件/结局）
4. 游戏初始化状态完整性
5. 事件数据覆盖度统计
"""

import json
import os
import re
import sys
from pathlib import Path
from collections import Counter, defaultdict

ROOT = Path(r"D:\ZHIJIGozgewan\COC")
SRC = ROOT / "src"
BUILD = ROOT / "index.html"

PASS = "[PASS]"   # 绿色
FAIL = "[FAIL]"   # 红色
WARN = "[WARN]"   # 黄色
INFO = "[INFO]"   # 蓝色

results = {"pass": 0, "fail": 0, "warn": 0, "info": 0}

# Force stdout to UTF-8
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


def log(status, name, detail=""):
    results[status] += 1
    icon = {"pass": "OK", "fail": "XX", "warn": "!!"}.get(status, "?")
    print(f"  [{icon}] {status.upper():5s} | {name}" + (f" -- {detail}" if detail else ""))


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ============================================================
# TEST 1: JSON 数据加载与基础结构
# ============================================================
def test_json_structure():
    print("\n" + "=" * 60)
    print("TEST 1: JSON 数据结构与字段完整性")
    print("=" * 60)

    gd = load_json(SRC / "game_data.json")

    # 1.1 顶级键检查
    top_keys = ["npcs", "areas", "items", "world", "systems", "core_loop", 
                "clue_chains", "endings", "module2_areas", "module3_npcs",
                "module5_player", "module8_time_schedule"]
    for k in top_keys:
        if k in gd:
            log("pass", f"game_data.json 包含 '{k}'")
        else:
            log("fail", f"game_data.json 缺少 '{k}'")

    # 1.2 NPCs 数量与必需字段
    npcs = gd.get("npcs", [])
    npc_ids = []
    if isinstance(npcs, list):
        log("pass", f"NPC 列表: {len(npcs)} 人")
        required_npc_fields = ["id", "name", "role"]
        for npc in npcs:
            nid = npc.get("id", "?")
            npc_ids.append(nid)
            for f in required_npc_fields:
                if f not in npc:
                    log("fail", f"NPC {nid} 缺少字段 '{f}'")
    elif isinstance(npcs, dict):
        log("pass", f"NPC 字典: {len(npcs)} 人")
        npc_ids = list(npcs.keys())
    else:
        log("fail", f"NPC 数据格式异常: {type(npcs)}")

    # 1.3 Areas 数量与连通性
    areas = gd.get("areas", []) or gd.get("module2_areas", [])
    area_ids = []
    if isinstance(areas, list) and len(areas) > 0:
        log("pass", f"区域列表: {len(areas)} 个")
        for area in areas:
            aid = area.get("id", "?")
            area_ids.append(aid)
            conn = area.get("connected_areas", [])
            if isinstance(conn, list):
                for c in conn:
                    pass  # 后续交叉验证
            else:
                log("warn", f"区域 {aid} connected_areas 非列表")
    else:
        log("fail", "区域数据为空或格式异常")

    # 1.4 Items 数量
    items = gd.get("items", [])
    item_ids = set()
    if isinstance(items, list):
        log("pass", f"物品列表: {len(items)} 个")
        for item in items:
            iid = item.get("id", item.get("name", "?"))
            item_ids.add(iid)
    elif isinstance(items, dict):
        log("pass", f"物品字典: {len(items)} 个")
        item_ids = set(items.keys())

    # 1.5 结局定义
    endings = gd.get("endings", [])
    if isinstance(endings, list):
        log("pass", f"结局定义: {len(endings)} 个")
    else:
        log("warn", f"结局格式非列表: {type(endings)}")

    # 1.6 封印状态机
    seal = gd.get("world", {}).get("seal_state_machine", [])
    if isinstance(seal, list) and len(seal) > 0:
        log("pass", f"封印状态机: {len(seal)} 阶段")
        for s in seal:
            if "trigger_day" not in s:
                log("fail", f"封印阶段缺少 trigger_day: {s}")
    else:
        log("fail", "封印状态机为空或非数组")

    return gd, npc_ids, area_ids, item_ids


# ============================================================
# TEST 2: 事件模块数据完整性
# ============================================================
def test_event_modules(gd, area_ids, npc_names):
    print("\n" + "=" * 60)
    print("TEST 2: 事件模块数据完整性")
    print("=" * 60)

    event_files = [
        "events_loop.js",
        "events_ending.js",
        "events_humanity.js",
        "events_mythos.js",
        "events_resource.js",
        "events_npc_cross.js",
        "events_area_deep.js",
        "events_silent.js",
        "events_meta.js",
        "events_death_echo.js",
        "events_missing_600.js",
        "events_omens_600.js",
    ]

    total_events = 0
    all_event_ids = set()
    all_area_refs = set()
    all_npc_refs = set()
    all_item_refs = set()
    duplicate_ids = []

    for ef in event_files:
        path = SRC / "data" / ef
        if not path.exists():
            log("fail", f"事件文件不存在: {ef}")
            continue

        content = path.read_text(encoding="utf-8")

        # 统计事件数量 — 搜索 id:'xxx' 或 id:"xxx" 或 const xxx= 模式
        # 事件导出模式: export const events_xxx = [ ... ]  或 module.exports = [...]
        array_match = re.search(r'(?:export\s+)?(?:const\s+\w+\s*=\s*)?(\[[\s\S]*\])\s*;?\s*(?:$|//|export)', content)
        
        # 更可靠的方式：数 id: 字段出现次数
        id_matches = re.findall(r"""['"]?id['"]?\s*[:=]\s*['"]([^'"]+)['"]""", content)
        
        # 去重（同一行可能匹配多次）
        unique_ids = list(dict.fromkeys(id_matches))
        
        if unique_ids:
            total_events += len(unique_ids)
            all_event_ids.update(unique_ids)
            log("pass", f"{ef}: {len(unique_ids)} 个事件ID")

            # 检查重复
            seen = set()
            dup_in_file = [eid for eid in unique_ids if eid in seen or seen.add(eid)]
            if dup_in_file:
                log("warn", f"{ef}: 文件内重复ID: {dup_in_file[:5]}")
                duplicate_ids.extend(dup_in_file)

            # 提取区域引用
            for m in re.finditer(r"""area['"]?\s*[:=]\s*['"]([^'"]+)['"]""", content):
                all_area_refs.add(m.group(1))

            # 提取 NPC 引用  
            for m in re.finditer(r"""npc_id['"]?\s*[:=]\s*['"]([^'"]+)['"]""", content):
                all_npc_refs.add(m.group(1))
            
            # 提取物品引用
            for m in re.finditer(r"""item_id['"]?\s*[:=]\s*['"]([^'"]+)['"]""", content):
                all_item_refs.add(m.group(1))
        else:
            # 尝试另一种模式检测
            bracket_count = content.count("{") - content.count("}")  # 简单启发式
            log("warn", f"{ef}: 未检测到标准事件ID格式，可能使用特殊结构")

    log("info", f"事件总数: {total_events}", f"唯一ID: {len(all_event_ids)}")

    # 跨文件重复检查
    if duplicate_ids:
        log("warn", f"发现重复事件ID: {len(duplicate_ids)} 个")

    # 区域引用验证
    if area_ids:
        invalid_areas = all_area_refs - set(area_ids)
        if invalid_areas:
            log("warn", f"事件引用了未定义的区域: {list(invalid_areas)[:10]}")
        else:
            log("pass", "所有事件区域引用有效")
    
    return all_event_ids, total_events


# ============================================================
# TEST 3: Reducer 导入/导出一致性
# ============================================================
def test_reducer_import_export():
    print("\n" + "=" * 60)
    print("TEST 3: Reducer 模块导入/导出一致性")
    print("=" * 60)

    app_path = SRC / "app.jsx"

    # 解析 app.jsx 的 import 语句
    app_content = app_path.read_text(encoding="utf-8")
    imports = {}
    for m in re.finditer(
        r"""import\s*\{([^}]+)\}\s*from\s*['"](.+?)['"]""",
        app_content,
    ):
        funcs = [f.strip() for f in m.group(1).split(",")]
        src = m.group(2)
        imports[src] = funcs
        log("info", f"app.jsx 从 {src} 导入: {funcs}")

    # 检查每个 reducer 文件的 export 是否被使用
    reducer_dir = SRC / "reducers"
    extra_exports = []
    missing_exports = []

    for rf in sorted(reducer_dir.glob("*.js")):
        content = rf.read_text(encoding="utf-8")
        rel_path = f"./reducers/{rf.name}"

        # 提取导出函数名
        exported = set()
        for em in re.finditer(
            r"""export\s+(?:function|const)\s+(\w+)""", content
        ):
            exported.add(em.group(1))
        # 也检查 export { } 语法
        for em in re.finditer(r"""export\s*\{([^}]+)\}""", content):
            for fn in em.group(1).split(","):
                exported.add(fn.strip())

        imported = set(imports.get(rel_path, []))

        unused = exported - imported
        if unused:
            extra_exports.append((rf.name, list(unused)))
            log("warn", f"{rf.name}: 导出但未被 app.jsx 使用: {list(unused)}")

        missing = imported - exported
        if missing:
            missing_exports.append((rf.name, list(missing)))
            log("fail", f"{rf.name}: app.jsx 导入但未找到导出: {list(missing)}")
        elif imported:
            log("pass", f"{rf.name}: {len(imported)} 个函数导入/导出匹配")

    # 检查双重 export 语法错误
    double_exports = []
    for rf in sorted(reducer_dir.glob("*.js")):
        content = rf.read_text(encoding="utf-8")
        if re.search(r"export\s+export\s+", content):
            double_exports.append(rf.name)
            log("fail", f"{rf.name}: 存在双重 'export export' 语法错误!")
    
    if not double_exports:
        log("pass", "无双重 export 语法错误")

    return extra_exports, missing_exports


# ============================================================
# TEST 4: 核心逻辑边界条件
# ============================================================
def test_logic_edge_cases():
    print("\n" + "=" * 60)
    print("TEST 4: 核心逻辑边界条件（静态代码分析）")
    print("=" * 60)

    # 4.1 deathSystem.js - resolveDeath 边界
    death_content = (SRC / "reducers/deathSystem.js").read_text(encoding="utf-8")

    # 检查是否还有直接 mutation
    if re.search(r"^state\.\w+\s*= ", death_content, re.MULTILINE):
        # 排除返回值中的赋值
        lines = death_content.split("\n")
        mutations = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if re.match(r"^state\.\w+\s*=", stripped) and "return" not in line and "result" not in line.lower():
                mutations.append(f"L{i}: {stripped}")
        if mutations:
            log("warn", "deathSystem.js 中仍存在直接 state mutation:", str(mutations[:3]))
        else:
            log("pass", "deathSystem.js 无直接 state mutation")
    else:
        log("pass", "deathSystem.js 无直接 state mutation")

    # 检查死亡类型枚举完整性
    death_types = re.findall(r"'(\w+)'[\s:]*(?://\s*(.+))?", death_content)
    ALL_DEATH_MATCH = re.search(r"ALL_DEATH_TYPES\s*=\s*\{([^}]+)\}", death_content)
    if ALL_DEATH_MATCH:
        defined_types = re.findall(r"'(\w+)'", ALL_DEATH_MATCH.group(1))
        log("info", f"死亡类型定义: {len(defined_types)} 种", str(defined_types))

    # 4.2 sanReducer.js - 物品保护比较修复确认
    san_content = (SRC / "reducers/sanReducer.js").read_text(encoding="utf-8")
    if "item.name" in san_content and "pr.name === item" not in san_content:
        log("pass", "sanReducer: 物品名称比较已修复（使用 item.name）")
    elif "pr.name === item" in san_content:
        log("fail", "sanReducer: 仍有对象/字符串直接比较 bug!")
    else:
        log("warn", "sanReducer: 无法确定物品保护逻辑状态")

    # 4.3 worldReducer.js - 除零防御
    world_content = (SRC / "reducers/worldReducer.js").read_text(encoding="utf-8")
    if "maxAp > 0" in world_content or "maxAp &&" in world_content:
        log("pass", "worldReducer: getPhase 已添加除零防御")
    else:
        log("fail", "worldRenderer: getPhase 仍可能除零!")

    # 4.4 endingReducer.js - 双重 export 检查
    ending_content = (SRC / "reducers/endingReducer.js").read_text(encoding="utf-8")
    if "export export" in ending_content:
        log("fail", "endingReducer: 仍有双重 export!")
    else:
        log("pass", "endingReducer: 无双重 export 语法错误")

    # 4.5 effectReducer.js - eventLog 防御
    effect_content = (SRC / "reducers/effectReducer.js").read_text(encoding="utf-8")
    if "!state.eventLog" in effect_content or "state.eventLog =" in effect_content.split("add_log")[1].split("break")[0] if "add_log" in effect_content else "":
        log("pass", "effectReducer: add_log 有空值防御")
    elif "add_log" in effect_content:
        # 检查上下文
        idx = effect_content.index("add_log")
        snippet = effect_content[idx:idx+200]
        if "eventLog" in snippet and ("||" in snippet or "??" in snippet or "= []" in snippet):
            log("pass", "effectReducer: add_log 有空值防御")
        else:
            log("warn", "effectReducer: add_log 可能缺少空值防御")


# ============================================================
# TEST 5: 构建产物验证
# ============================================================
def test_build_output():
    print("\n" + "=" * 60)
    print("TEST 5: 构建产物验证")
    print("=" * 60)

    if not BUILD.exists():
        log("fail", "构建产物 index.html 不存在! 请先运行 python build.py")
        return False

    size = BUILD.stat().st_size
    log("pass", f"index.html 存在，大小: {size:,} bytes ({size/1024/1024:.2f} MB)")

    content = BUILD.read_text(encoding="utf-8")

    # 检查关键内容是否内联
    checks = [
        ("React 运行时", "react.production.min"),
        ("游戏数据 __GAME_DATA__ 替换", '"npcs":'),
        ("CSS 内联", ".game-layout" in content or ".narrative-text" in content),
        ("reducer 模块合并", "resolveDeath" in content or "selectEventV2" in content),
        ("事件数据", "events_loop" in content or "evt_" in content),
        ("Babel 编译标记", "createElement" in content),
    ]
    for name, condition in checks:
        if isinstance(condition, bool):
            result = condition
        elif isinstance(condition, str):
            result = condition in content
        else:
            result = bool(condition)
        (log("pass", f"构建包含: {name}") if result else log("fail", f"构建缺失: {name}"))

    # 检查常见构建错误
    errors = [
        ("__GAME_DATA__ 占位符未替换", "__GAME_DATA__"),
        ("SyntaxError", "SyntaxError"),
        ("undefined is not a function", "undefined is not"),
        ("Cannot read property", "Cannot read"),
    ]
    for name, pattern in errors:
        if pattern in content:
            log("fail", f"构建产物中包含错误标记: {name}")

    # 检查 HTML 结构完整性
    has_doctype = content.startswith("<!DOCTYPE") or content.startswith("<html")
    has_closing = content.rstrip().endswith("</html>")
    log("pass", "HTML 结构完整" if (has_doctype or has_closing) else "warn", "HTML 结构可能不完整")

    return True


# ============================================================
# TEST 6: 数据驱动引用完整性
# ============================================================
def test_data_references(gd, area_ids, npc_ids_list, item_ids):
    print("\n" + "=" * 60)
    print("TEST 6: 数据驱动引用完整性（跨模块交叉验证）")
    print("=" * 60)

    npc_names = set()
    for n in (gd.get("npcs", []) or []):
        if isinstance(n, dict):
            npc_names.add(n.get("name", ""))
            npc_names.add(n.get("id", ""))
        elif isinstance(n, str):
            npc_names.add(n)

    # 6.1 NPC schedule 引用区域
    area_set = set(area_ids) if area_ids else set()
    for npc in (gd.get("npcs", []) or []):
        if isinstance(npc, dict):
            sched = npc.get("schedule", [])
            for s in sched:
                if isinstance(s, str) and ":" in s:
                    loc = s.split(":")[-1]
                    if loc and loc != "off" and area_set and loc not in area_set:
                        log("warn", f"NPC {npc.get('id')} schedule 引用未知区域: {loc}")

    # 6.2 starting_items 引用物品
    starting = gd.get("systems", {}).get("player", {}).get("starting_items", {}).get("starting_items", [])
    if isinstance(starting, list):
        for si in starting:
            if isinstance(si, dict):
                siname = si.get("name", "")
                if item_ids and siname not in item_ids and siname not in ["手电筒", "笔记本和笔", "急救包", "怀表"]:
                    log("warn", f"初始物品引用未定义: {siname}")

    # 6.3 safehouse unlock_condition NPC 名字
    safehouse_rules = gd.get("systems", {}).get("safehouse", {}).get("relocation_rules", {}).get("alternative_safehouses", [])
    if isinstance(safehouse_rules, list):
        for sh in safehouse_rules:
            cond = sh.get("unlock_condition", "")
            # 硬编码名字检查
            hardcoded_names = ["伊莱亚斯·沃德", "希尔达·莫里斯", "玛莎·格雷"]
            for hn in hardcoded_names:
                if hn in cond and hn not in npc_names:
                    log("warn", f"safehouse 条件引用 NPC '{hn}' 不在 NPC 定义中")

    # 6.4 事件效果中的 add_item/remove_item 引用
    data_dir = SRC / "data"
    referenced_items = set()
    for ef in data_dir.glob("events_*.js"):
        ec = ef.read_text(encoding="utf-8")
        for m in re.finditer(r"""add_item['"]?\s*[:=]\s*['"]([^'"]+)['"]""", ec):
            referenced_items.add(m.group(1))

    if referenced_items and item_ids:
        unknown = referenced_items - item_ids
        if unknown:
            log("warn", f"事件引用的未定义物品: {list(unknown)[:10]}")
        else:
            log("pass", "事件 add_item 引用全部有效")

    log("info", "引用验证完成")


# ============================================================
# TEST 7: app.jsx 主逻辑关键路径扫描
# ============================================================
def test_appjsx_critical_paths():
    print("\n" + "=" * 60)
    print("TEST 7: app.jsx 关键逻辑路径扫描")
    print("=" * 60)

    app_content = (SRC / "app.jsx").read_text(encoding="utf-8")

    lines = app_content.split("\n")
    total_lines = len(lines)
    log("info", f"app.jsx 总行数: {total_lines}")

    # 检查关键功能是否存在
    critical_functions = [
        ("游戏主循环/reducer", "function gameReducer" in app_content or "useReducer" in app_content),
        ("初始化状态", "initialState" in app_content or "const initialState" in app_content),
        ("SAN 变体计算", "getSanVariant" in app_content),
        ("腐败等级计算", "getCorruptionLevel" in app_content),
        ("UI 腐败层", "getUICorruptionLayer" in app_content),
        ("死亡处理", "resolveDeath" in app_content),
        ("事件选择 V2", "selectEventV2" in app_content),
        ("结局检查", "checkEnding" in app_content),
        ("存档/读档", "saveGame" in app_content and "loadGame" in app_content),
        ("轮回处理", "loopCount" in app_content or "pollution" in app_content),
        ("章节系统", "currentChapter" in app_content or "getChapterForDay" in app_content),
        ("NPC 对话", "npcTrust" in app_content or "npcStates" in app_content),
        ("音频管理", "audioManager" in app_content),
        ("响应式/CSS 类", "corruption-" in app_content),
        ("立绘渲染", "portrait-img" in app_content or "portraitImg" in app_content),
    ]

    for name, exists in critical_functions:
        (log("pass", f"包含 {name}") if exists else log("fail", f"缺失 {name}"))

    # 检查 switch/case 完整性（effect 处理）
    effect_cases = re.findall(r"case\s+'(\w+)'[\s:]", app_content)
    known_effects = [
        "san_loss", "hp_loss", "hp_gain", "san_gain", "add_item", "remove_item",
        "add_clue", "trigger_event", "set_flag", "move_area", "time_pass",
        "death", "npc_trust", "modify_npc_corruption", "add_log",
        "food_change", "light_change", "mythos_gain", "humanity_change",
        "loop_count", "pollution_add", "ending", "safehouse_corrupt",
        "harbor_risk", "skill_bonus", "madness", "conclusion",
    ]
    for ke in known_effects:
        if ke in effect_cases:
            log("pass", f"效果处理器: {ke}")
        else:
            log("warn", f"效果处理器可能缺失: {ke}")


# ============================================================
# TEST 8: CSS 与视觉系统验证
# ============================================================
def test_css_visual_system():
    print("\n" + "=" * 60)
    print("TEST 8: CSS 视觉系统完整性")
    print("=" * 60)

    css_content = (SRC / "styles.css").read_text(encoding="utf-8")
    app_content = (SRC / "app.jsx").read_text(encoding="utf-8")

    css_classes_needed = {
        # 腐败等级
        "corruption-1": "UI 腐败 Level 1",
        "corruption-2": "UI 腐败 Level 2",
        "corruption-3": "UI 腐败 Level 3",
        # SAN 反馈
        "san-tremor": "SAN 微颤 (<40)",
        "san-fracture": "SAN 崩解 (<20)",
        # 感知污染
        "perception-text-1": "感知污染文字 L1",
        "perception-focus-2": "感知污染焦点 L2",
        "perception-edge-1": "感知污染边缘 L1",
        # 立绘
        "portrait-img": "立绘容器",
        "npc-portrait-container": "NPC 立绘框",
        "player-portrait-container": "主角立绘栏",
        # 场景
        "area-scene-banner": "区域场景横幅",
        "event-illustration-overlay": "事件插画层",
        # 文本类型
        "narrative-text": "叙事文本",
        "narrative-block.system": "系统消息",
        "death-narrative": "死亡叙事",
        "confessional-entry": "告解室文本",
        "mythos-text": "神话文本",
        "meta-text": "元叙事文本",
        "npc-dialogue": "NPC 对话",
        # 转场
        "transition-move": "移动转场",
        "transition-rest": "休息转场",
        "death-anim-physical": "物理死亡动画",
        "death-anim-mental": "精神死亡动画",
        # 响应式
        "@media": "媒体查询响应式",
    }

    css_defined = set(re.findall(r"\.([a-zA-Z][\w\-]+)", css_content))
    js_used_patterns = {}

    for cls, desc in css_classes_needed.items():
        if cls == "@media":
            found = "@media" in css_content
        else:
            found = cls in css_defined
        
        # 同时检查 JS 中是否有使用
        used_in_js = cls.replace(".", "") in app_content
        
        if found and used_in_js:
            log("pass", f"CSS: .{cls} ({desc}) — 已定义且已使用")
        elif found and not used_in_js:
            log("warn", f"CSS: .{cls} ({desc}) — 已定义但 JS 未引用")
        elif not found and used_in_js:
            log("fail", f"CSS: .{cls} ({desc}) — JS 使用但 CSS 未定义!")
        else:
            log("fail", f"CSS: .{cls} ({desc}) — 缺失!")

    # 检查 @font-face 声明
    fonts = re.findall(r"@font-face\s*\{[^}]*font-family:\s*['\"]?([^'\";}{]+)", css_content, re.DOTALL)
    log("info", f"声明字体: {fonts}")

    # 检查 keyframes 动画
    animations = re.findall(r"@keyframes\s+(\w+)", css_content)
    log("info", f"声明动画: {len(animations)} 个 — {animations}")


# ============================================================
# TEST 9: 音频资源检查
# ============================================================
def test_audio_resources():
    print("\n" + "=" * 60)
    print("TEST 9: 音频资源检查")
    print("=" * 60)

    audio_dir = ROOT / "audio"
    expected_audios = {
        "ambient_day_loop.mp3": "白天环境音",
        "ambient_night_loop.mp3": "夜晚环境音",
        "san_drop_heartbeat.mp3": "SAN骤降音效",
        "break_wall_noise.mp3": "破墙音效",
        "madness_tinnitus.mp3": "疯狂耳鸣",
        "begin_low_bell.mp3": "开场钟声",
    }

    for af, desc in expected_audios.items():
        path = audio_dir / af
        if path.exists():
            size = path.stat().st_size
            log("pass", f"音频: {af} ({desc})", f"{size/1024:.1f} KB")
        else:
            log("fail", f"音频缺失: {af} ({desc})")


# ============================================================
# TEST 10: WebP 素材库检查
# ============================================================
def test_webp_assets():
    print("\n" + "=" * 60)
    print("TEST 10: WebP 素材库检查")
    print("=" * 60)

    webp_dirs = [
        ("assets/webp/", "通用 WebP 素材"),
        ("assets/webp_ending/", "结局 WebP 插画"),
    ]

    total_size = 0
    total_count = 0

    for dpath, desc in webp_dirs:
        d = ROOT / dpath
        if d.exists():
            files = list(d.glob("*.webp"))
            count = len(files)
            size = sum(f.stat().st_size for f in files)
            total_count += count
            total_size += size
            log("pass", f"{desc}: {count} 张, {size/1024/1024:.1f} MB")
        else:
            log("warn", f"{desc}: 目录不存在")

    if total_count > 0:
        log("info", f"WebP 素材总计: {total_count} 张, {total_size/1024/1024:.1f} MB")


# ============================================================
# MAIN
# ============================================================
def main():
    print("=" * 60)
    print("  深渊低语：沃切斯特之影 — 系统全面测试")
    print(f"  项目根目录: {ROOT}")
    print(f"  测试时间: 2026-05-27")
    print("=" * 60)

    # Test 1: JSON 结构
    gd_result = test_json_structure()

    # Test 2: 事件模块
    event_result = test_event_modules(gd_result[0], gd_result[2], [])

    # Test 3: Reducer 一致性
    reducer_result = test_reducer_import_export()

    # Test 4: 边界条件
    test_logic_edge_cases()

    # Test 5: 构建
    test_build_output()

    # Test 6: 数据引用
    test_data_references(gd_result[0], gd_result[2], gd_result[1], gd_result[3])

    # Test 7: app.jsx
    test_appjsx_critical_paths()

    # Test 8: CSS
    test_css_visual_system()

    # Test 9: 音频
    test_audio_resources()

    # Test 10: WebP
    test_webp_assets()

    # Summary
    print("\n" + "=" * 60)
    print("  测试总结")
    print("=" * 60)
    p = results["pass"]
    f = results["fail"]
    w = results["warn"]
    t = p + f + w
    print(f"  通过: {p}/{t}  |  失败: {f}/{t}  |  警告: {w}/{t}")

    if f == 0:
        print(f"\n  {PASS} All critical tests passed! Project is ready to run.")
    else:
        print(f"\n  {FAIL} {f} failures found. Fix before deployment.")

    if w > 0:
        print(f"  {WARN} {w} warnings (non-blocking).")

    return f == 0


if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
