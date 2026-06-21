#!/usr/bin/env python3
"""Update game_base.json SAN stages from 5 to 7."""
import json

with open('src/data/game_base.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

new_stages = [
    {
        "id": "stable",
        "name": "认知稳定",
        "range": [75, 100],
        "level": 0,
        "ap_modifier": 0,
        "description": "心智清晰。现实的边界稳固。你能区分内心与外界的差异。",
        "visual_tier": "clean",
        "event_weight": {"buffer_boost": 1.3, "horror_penalty": 0.8},
        "pollution_effects": [],
        "visual": {
            "saturation": -2, "vignette": 0, "scanline": 0, "noise": 0,
            "barrel_distortion": 0, "chromatic_aberration": 0, "rotation": 0,
            "text_shadow": False, "text_tremble": False, "glow": False,
            "description": "无视觉污染。微冷色调，轻微饱和衰减。"
        },
        "interaction": {
            "button_delay_ms": 0, "hover_corrupt_ms": 0,
            "option_rewrite": False, "option_glitch": False,
            "phantom_options": False, "cursor_corrupt": False,
            "description": "无交互污染"
        },
        "logic": {
            "text_hallucination": False, "fake_messages": False,
            "false_memories": False, "weight_corruption": False,
            "event_distortion_level": 0,
            "description": "无逻辑污染，事件完全正常"
        },
        "meta": {
            "save_corrupt": False, "title_corrupt": False,
            "system_fake_errors": False, "fourth_wall_break": False,
            "description": "无Meta效果"
        }
    },
    {
        "id": "mild_erosion",
        "name": "轻度侵蚀",
        "range": [60, 74],
        "level": 1,
        "ap_modifier": 0,
        "description": "边缘开始模糊。你偶尔不确定自己是否记得某个细节，但无所谓。",
        "visual_tier": "fogged",
        "event_weight": {"buffer_boost": 1.0, "horror_penalty": 1.0},
        "pollution_effects": ["视觉-5"],
        "visual": {
            "saturation": -8, "vignette": 0.03, "scanline": 0, "noise": 0,
            "barrel_distortion": 0, "chromatic_aberration": 0.3, "rotation": 0,
            "text_shadow": True, "text_tremble": False, "glow": False,
            "description": "微冷色调+轻微色偏。文字阴影初现。"
        },
        "interaction": {
            "button_delay_ms": 30, "hover_corrupt_ms": 0,
            "option_rewrite": False, "option_glitch": False,
            "phantom_options": False, "cursor_corrupt": False,
            "description": "按钮延迟轻微增加（30ms），近乎不可察觉"
        },
        "logic": {
            "text_hallucination": False, "fake_messages": False,
            "false_memories": False, "weight_corruption": False,
            "event_distortion_level": 0,
            "description": "无逻辑异常，但污染累积开始"
        },
        "meta": {
            "save_corrupt": False, "title_corrupt": False,
            "system_fake_errors": False, "fourth_wall_break": False,
            "description": "无Meta效果"
        }
    },
    {
        "id": "perception_shift",
        "name": "感知偏移",
        "range": [50, 59],
        "level": 2,
        "ap_modifier": 0,
        "description": "你注意到事物之间的间隙在扩大。有些声音似乎来自不存在的地方。",
        "visual_tier": "flickering",
        "event_weight": {"buffer_boost": 0.8, "horror_penalty": 1.15},
        "pollution_effects": ["视觉-10", "每5-10%概率触发微事件"],
        "visual": {
            "saturation": -15, "vignette": 0.08, "scanline": 0.3, "noise": 0.05,
            "barrel_distortion": 0, "chromatic_aberration": 0.5, "rotation": 0,
            "text_shadow": True, "text_tremble": True, "glow": True,
            "description": "色偏增强。文字开始轻微抖动+微光。扫描线+噪点初现。"
        },
        "interaction": {
            "button_delay_ms": 80, "hover_corrupt_ms": 0,
            "option_rewrite": False, "option_glitch": False,
            "phantom_options": False, "cursor_corrupt": False,
            "description": "按钮延迟增至80ms。可感知但还不会误操作。"
        },
        "logic": {
            "text_hallucination": True, "fake_messages": False,
            "false_memories": False, "weight_corruption": True,
            "event_distortion_level": 1,
            "description": "文本幻觉激活（词替换）。事件权重开始微偏。"
        },
        "meta": {
            "save_corrupt": False, "title_corrupt": False,
            "system_fake_errors": False, "fourth_wall_break": False,
            "description": "无Meta效果"
        }
    },
    {
        "id": "explanation_loss",
        "name": "解释丧失",
        "range": [40, 49],
        "level": 3,
        "ap_modifier": -1,
        "description": "你开始怀疑自己看到的东西。每次选择都像是隔着一层毛玻璃。",
        "visual_tier": "hostile",
        "event_weight": {"buffer_boost": 0.7, "horror_penalty": 1.3},
        "pollution_effects": ["AP-1", "虚假记忆插入", "选项文字改写", "NPC记忆偏差", "任务状态模糊化"],
        "visual": {
            "saturation": -25, "vignette": 0.15, "scanline": 0.6, "noise": 0.12,
            "barrel_distortion": 0.01, "chromatic_aberration": 1.5, "rotation": 0,
            "text_shadow": True, "text_tremble": True, "glow": True,
            "description": "扫描线加重+色差增强。文字抖动。轻微barrel distortion。"
        },
        "interaction": {
            "button_delay_ms": 150, "hover_corrupt_ms": 600,
            "option_rewrite": True, "option_glitch": True,
            "phantom_options": False, "cursor_corrupt": False,
            "description": "选项开始被改写。Hover 600ms后触发扰动。虚假记忆层激活。"
        },
        "logic": {
            "text_hallucination": True, "fake_messages": False,
            "false_memories": True, "weight_corruption": True,
            "event_distortion_level": 2,
            "description": "虚假记忆插入。选项文字改写。NPC记忆偏差加剧。"
        },
        "meta": {
            "save_corrupt": True, "title_corrupt": False,
            "system_fake_errors": False, "fourth_wall_break": False,
            "description": "存档名开始出现轻微污染"
        }
    },
    {
        "id": "cognitive_fog",
        "name": "认知迷雾",
        "range": [30, 39],
        "level": 4,
        "ap_modifier": -1,
        "description": "你的思维被一层浓雾包裹。探索事件开始出现看起来有收益、实则扣资源的虚假选项。",
        "visual_tier": "hostile",
        "event_weight": {"buffer_boost": 0.6, "horror_penalty": 1.4},
        "pollution_effects": ["AP-1(累计-2)", "探索虚假选项", "NPC信任伪造准备", "认知偏差-15", "负面事件权重提升"],
        "visual": {
            "saturation": -30, "vignette": 0.2, "scanline": 0.7, "noise": 0.18,
            "barrel_distortion": 0.02, "chromatic_aberration": 2.0, "rotation": 0.1,
            "text_shadow": True, "text_tremble": True, "glow": True,
            "description": "雾化视觉效果。文字和界面整体模糊。屏幕轻微旋转。"
        },
        "interaction": {
            "button_delay_ms": 200, "hover_corrupt_ms": 800,
            "option_rewrite": True, "option_glitch": True,
            "phantom_options": False, "cursor_corrupt": False,
            "description": "虚假选项出现（探索事件25%）。按钮延迟200ms，Hover扰动800ms。"
        },
        "logic": {
            "text_hallucination": True, "fake_messages": False,
            "false_memories": True, "weight_corruption": True,
            "event_distortion_level": 2,
            "description": "虚假探索选项启动（25%概率）。NPC对话信任伪造准备。"
        },
        "meta": {
            "save_corrupt": True, "title_corrupt": False,
            "system_fake_errors": False, "fourth_wall_break": False,
            "description": "存档污染加剧。系统提示开始掺假。"
        }
    },
    {
        "id": "reality_dissolution",
        "name": "现实溶解",
        "range": [15, 29],
        "level": 5,
        "ap_modifier": -1,
        "description": "你不再确定哪些是真实发生的。NPC的信任提示可能是编造的。你感觉有人在偷你的行动力。",
        "visual_tier": "extreme",
        "event_weight": {"buffer_boost": 0.5, "horror_penalty": 1.5},
        "pollution_effects": ["AP-1(累计-3)", "强制AP偷取(30%概率)", "NPC虚假信任(40%概率)", "负面事件权重x1.5", "幻觉系统消息", "关键信息遗忘"],
        "visual": {
            "saturation": -40, "vignette": 0.25, "scanline": 0.9, "noise": 0.25,
            "barrel_distortion": 0.03, "chromatic_aberration": 3, "rotation": 0.3,
            "text_shadow": True, "text_tremble": True, "glow": True,
            "description": "重度视觉扭曲。色差+barrel distortion+旋转。Canvas撕裂效果激活。"
        },
        "interaction": {
            "button_delay_ms": 250, "hover_corrupt_ms": 1000,
            "option_rewrite": True, "option_glitch": True,
            "phantom_options": False, "cursor_corrupt": True,
            "description": "虚假选项50%概率。NPC虚假信任40%概率。按钮延迟250ms，Hover扰动1000ms。UI随机偏移。"
        },
        "logic": {
            "text_hallucination": True, "fake_messages": True,
            "false_memories": True, "weight_corruption": True,
            "event_distortion_level": 3,
            "description": "虚假系统消息。NPC信任伪造触发。负面事件权重x1.5。强制AP偷取30%概率。"
        },
        "meta": {
            "save_corrupt": True, "title_corrupt": False,
            "system_fake_errors": True, "fourth_wall_break": False,
            "description": "存档名深度污染。假系统错误消息。"
        }
    },
    {
        "id": "narrative_death",
        "name": "叙事死亡",
        "range": [1, 14],
        "level": 6,
        "ap_modifier": -1,
        "description": "你已不在这个世界里。所有的界面、所有的对话、所有的选择——都是虚构的。你只是在看着它们发生。",
        "visual_tier": "extreme",
        "event_weight": {"buffer_boost": 0.4, "horror_penalty": 1.8},
        "pollution_effects": ["AP全面崩溃", "强制AP偷取(60%概率/次-2)", "虚假信任提示(80%概率)", "负面事件权重x2.0", "假游戏结束画面", "Meta叙事接管"],
        "visual": {
            "saturation": -60, "vignette": 0.4, "scanline": 1.0, "noise": 0.4,
            "barrel_distortion": 0.06, "chromatic_aberration": 5, "rotation": 0.8,
            "text_shadow": True, "text_tremble": True, "glow": True,
            "description": "叙事死亡层。全面视觉接管。Canvas撕裂+色差爆炸+旋转。标题污染。"
        },
        "interaction": {
            "button_delay_ms": 350, "hover_corrupt_ms": 1200,
            "option_rewrite": True, "option_glitch": True,
            "phantom_options": True, "cursor_corrupt": True,
            "description": "虚假选项70%概率。NPC虚假信任80%概率。按钮延迟350ms。UI全面不可信。假结局画面。"
        },
        "logic": {
            "text_hallucination": True, "fake_messages": True,
            "false_memories": True, "weight_corruption": True,
            "event_distortion_level": 4,
            "description": "全面逻辑接管。虚假系统全面接管。假结局触发。Meta叙事直接介入。"
        },
        "meta": {
            "save_corrupt": True, "title_corrupt": True,
            "system_fake_errors": True, "fourth_wall_break": True,
            "description": "存档名彻底污染。标题腐败。假系统通知。第四面墙完全打破。"
        }
    }
]

data['systems']['sanity']['san_stages'] = new_stages

with open('src/data/game_base.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print('Updated game_base.json: 5 stages -> 7 stages')
for s in new_stages:
    print(f'  Level {s["level"]}: {s["id"]} range={s["range"]} ap_mod={s["ap_modifier"]}')
