#!/usr/bin/env python3
"""
Refactor game_data.json into clean modular structure.
"""
import json
import copy

with open('D:/ZHIJIGozgewan/COC/game_data.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

out = {}

# ============================================================
# 1. META
# ============================================================
out['version'] = '1.1.0'
out['game_title'] = raw['game_title']
out['language'] = raw['language']

out['design_intent'] = {
    'core_experience': '玩家在沃切斯特的28天倒计时中，通过探索、对话、调查、失败与轮回积累真相。每次轮回既带来知识，也带来污染。结局不仅判断封印是否成功，还判断玩家是否在恐怖中保住人性。',
    'genre': '克苏鲁文字 Roguelite 调查游戏',
    'key_mechanics': ['SAN系统', '轮回记忆与污染', 'NPC信任与背叛', '线索链推理', '28天倒计时', '人性判定'],
    'art_philosophy': raw.get('art_direction', {}).get('core_expression', '不可名状的恐怖，来自你无法理解的事物。最好的恐怖文本读起来像正常叙述，但细想之下有什么不对。'),
    'text_style': {
        'principles': raw.get('text_style_guide', {}).get('core_rules', []),
        'forbidden_words': raw.get('text_style_guide', {}).get('forbidden_words', []),
        'imagery_isolation': '每个区域只保留1-2个主意象，禁止堆砌'
    }
}

# ============================================================
# 2. CORE LOOP
# ============================================================
roguelike = raw.get('module6_roguelike_mechanics', {})
game_config = raw.get('game_config', {})

out['core_loop'] = {
    'description': '每日12 AP，探索区域、对话NPC、调查物品、触发事件。HP=0死亡/SAN=0疯狂，触发轮回。28天倒计时，封印状态逐步恶化。',
    'action_points_per_day': game_config.get('action_points_per_day', 12),
    'day_length': 28,
    'ap_costs': roguelike.get('core_loop', {}).get('description', ''),
    'daily_events': roguelike.get('core_loop', {}).get('daily_events', ''),
    'death_triggers': {
        'hp_zero': '角色死亡，触发轮回',
        'san_zero': '角色疯狂，触发轮回'
    },
    'difficulty_levels': game_config.get('difficulty_levels', {}),
    'weather_system': roguelike.get('weather_system', '')
}

# ============================================================
# 3. WORLD
# ============================================================
world_desc = raw.get('module1_world', {})
time_sched = raw.get('module8_time_schedule', {})

out['world'] = {
    'setting': world_desc.get('world_description', ''),
    'game_rules': world_desc.get('game_rules', ''),
    'mythos_logic': world_desc.get('mythos_logic', ''),
    'day_phases': time_sched.get('day_phases', []),
    'seal_state_machine': time_sched.get('seal_state_machine', {}).get('states', []),
    'countdown': raw.get('module_world_countdown', {}).get('global_state', {}),
    'mythos_name_control': raw.get('mythos_name_control', {}),
    'horror_density_control': {
        'core_principle': raw.get('horror_density_control', {}).get('core_principle', ''),
        'per_chapter': raw.get('horror_density_control', {}).get('density_rules', {}).get('per_chapter', {}),
        'per_area': raw.get('horror_density_control', {}).get('density_rules', {}).get('per_area', {}),
        'normalcy_anchors': raw.get('horror_density_control', {}).get('normalcy_anchors', {}),
        'sequence_rule': raw.get('horror_density_control', {}).get('density_rules', {}).get('per_event_sequence', {})
    }
}

# ============================================================
# 4. SYSTEMS
# ============================================================
out['systems'] = {}

# 4a. Resource system (v2 only)
res_v2 = raw.get('resource_system_v2', {})
out['systems']['resources'] = {
    'description': res_v2.get('description', ''),
    'design_principle': res_v2.get('design_principle', ''),
    'resources': res_v2.get('resources', {}),
    'resource_pressure_by_area': {
        a['id']: a.get('resource_pressure', {})
        for a in raw['module2_areas']
    },
    'pressure_modifiers': {
        a['id']: {
            'required_light_level': a.get('required_light_level', 0),
            'food_consumption_modifier': a.get('food_consumption_modifier', 1.0),
            'fatigue_gain': a.get('fatigue_gain', 5),
            'infection_risk': a.get('infection_risk', 0),
            'safe_rest_available': a.get('safe_rest_available', True)
        }
        for a in raw['module2_areas']
    }
}

# 4b. Safehouse system (unified)
safe_v2 = raw.get('safehouse_system', {})
safe_old = raw.get('module_safehouse', {})
out['systems']['safehouse'] = {
    'description': safe_v2.get('description', safe_old.get('description', '')),
    'main_safehouse': safe_v2.get('main_safehouse', {}),
    'degradation_stages': safe_v2.get('degradation_stages', []),
    'degradation_triggers': safe_v2.get('degradation_triggers', {}),
    'alternative_safehouses': safe_v2.get('alternative_safehouses', []),
    'relocation_rules': safe_old.get('safehouse_relocation', {})
}

# 4c. SAN system
player = raw.get('module5_player', {})
san_distort = raw.get('module_sanity_distortion', {})
out['systems']['sanity'] = {
    'description': 'SAN值代表角色的精神稳定程度。接触知识、遭遇怪物、使用禁忌法术都会降低SAN。',
    'base_max': '99 - CthulhuMythos',
    'starting': 'POW属性值',
    'recovery_methods': roguelike.get('sanity_mechanics', {}).get('recovery', ''),
    'stage_effects': player.get('san_stage_effects', {}),
    'san_loss_scale': {
        'normal_event': 0,
        'minor_abnormal': [-1, -2],
        'clear_horror': [-3, -5],
        'mythos_direct': [-6, -8],
        'chapter_1_cap': -5,
        'skill_check_success_reduction': '30%-60%'
    },
    'distortion_stages': san_distort.get('san_distortion_stages', []),
    'temporary_madness_table': player.get('temporary_madness_table', {}),
    'sanity_check_table': player.get('sanity_check_table', {}),
    'item_protection': player.get('item_san_protection', [])
}

# 4d. Player system
out['systems']['player'] = {
    'default_template': player.get('default_template', {}),
    'skills': player.get('skills', []),
    'starting_items': player.get('items', [])
}

# 4e. Loop system (new structured version)
loop_raw = raw.get('module_loop_memory_and_pollution', {})
out['systems']['loop'] = {
    'description': loop_raw.get('description', ''),
    'design_philosophy': loop_raw.get('design_philosophy', ''),
    'retained_knowledge_rules': loop_raw.get('loop_benefits', {}).get('inherited_knowledge', []),
    'pollution_rules': loop_raw.get('loop_pollution', {}).get('inherited_pollution', []),
    'loop_count_effects': loop_raw.get('loop_pollution', {}).get('loop_count_effects', {}),
    'npc_deja_vu_rules': [
        {'threshold': 'loop_3', 'description': '核心NPC开始轻微识别玩家'},
        {'threshold': 'loop_5', 'description': '世界本身开始识别玩家'},
        {'threshold': 'loop_7', 'description': '事件文本和UI出现明显污染'}
    ],
    'world_recognition_thresholds': [
        {'loop': 3, 'effect': 'NPC出现似曾相识台词'},
        {'loop': 5, 'effect': '区域描述出现轮回痕迹'},
        {'loop': 7, 'effect': 'UI元素开始异常'}
    ],
    'loop_breaker_requirements': raw.get('ending_definitions', [{}])[-1].get('required_conditions', []) if raw.get('ending_definitions') else [],
    'loop_cost': '每次轮回SAN上限永久-5，随机增加一个污染标记'
}

# 4f. Skill check template
out['systems']['skill_check_template'] = {
    'structure': {
        'skill': '技能名称',
        'threshold': '检定阈值',
        'success': {'text': '', 'effects': {}},
        'failure': {'text': '', 'effects': {}},
        'critical_failure': {
            'range': [96, 100],
            'text': '',
            'effects': {}
        }
    },
    'note': '所有事件的skill_check字段统一使用此结构'
}

# 4g. Trigger template
out['systems']['trigger_template'] = {
    'structure': {
        'areas': ['区域ID列表'],
        'time_phase': ['morning', 'afternoon', 'evening', 'midnight'],
        'probability': '0.0-1.0',
        'requires': ['所需flag/线索/物品'],
        'forbidden_flags': ['禁止触发的flag'],
        'chapter': '最低章节要求',
        'san_below': 'SAN低于此值时触发概率修正',
        'day_range': [1, 28]
    },
    'note': '所有事件的trigger字段统一使用此结构，替代旧的自然语言condition'
}

# 4h. Progression
out['systems']['progression'] = {
    'skill_growth': roguelike.get('progression', {}).get('skill_growth', ''),
    'meta_progression': roguelike.get('progression', {}).get('meta_progression', {}),
    'combat_system': roguelike.get('combat_system', {}),
    'achievement_system': raw.get('module9_achievements', {})
}

# 4i. Perception corruption
out['systems']['perception_corruption'] = raw.get('perception_corruption_system', {})
out['systems']['ui_corruption'] = raw.get('ui_corruption_layers', {})
out['systems']['subjective_reality'] = raw.get('subjective_reality_system', {})
out['systems']['motifs'] = raw.get('motif_system', {})

# 4j. Clue conclusion system
out['systems']['clue_conclusion'] = raw.get('clue_conclusion_system', {})
out['systems']['wrong_inference'] = raw.get('module_wrong_inference_consequences', {})

# ============================================================
# 5. AREAS - restructured with imagery isolation
# ============================================================
def restructure_area(a):
    area = {
        'id': a['id'],
        'name': a['name'],
        'type': a.get('type', ''),
        'description': a['description'],
        'danger_level': a['danger_level'],
        'chapter_unlock': a.get('chapter_unlock', 'chapter_1'),
        'mythos_visibility_level': a.get('mythos_visibility_level', 1),
        'connected_areas': a.get('connected_areas', []),
        'narrative_function': a.get('narrative_function', ''),
        'gameplay_function': a.get('gameplay_function', ''),
        'main_clue_chain': a.get('main_clue_chain', ''),
        'early_game_alias': a.get('early_game_alias', ''),
        'hidden_features': a.get('hidden_features', []),
        'layout_variants': a.get('layout_variants', []),
        'item_placement_pool': a.get('item_placement_pool', {}),
        'micro_events': a.get('micro_events', []),
        'events_pool': a.get('events_pool', []),
        'resource_pressure': {
            'food_availability': a.get('resource_pressure', {}).get('food_availability', 'moderate'),
            'light_requirement': a.get('resource_pressure', {}).get('light_requirement', 'low'),
            'rest_safety': a.get('resource_pressure', {}).get('rest_safety', 'moderate'),
            'required_light_level': a.get('required_light_level', 0),
            'food_consumption_modifier': a.get('food_consumption_modifier', 1.0),
            'fatigue_gain': a.get('fatigue_gain', 5),
            'infection_risk': a.get('infection_risk', 0),
            'safe_rest_available': a.get('safe_rest_available', True)
        },
        'imagery_focus': get_imagery(a['id']),
        'chapter_1_role': get_ch1_role(a['id'])
    }
    return area

def get_imagery(area_id):
    imagery = {
        'town_center': {'primary': ['钟声', '公告栏'], 'secondary': ['居民沉默', '路灯黄晕'], 'avoid_repeating': ['低语', '螺旋', '触手']},
        'harbor_district': {'primary': ['潮汐', '鱼腥'], 'secondary': ['失踪船员', '海底歌声'], 'avoid_repeating': ['甜腻气味', '绿光', '非欧几里得']},
        'lighthouse': {'primary': ['绿光', '螺旋楼梯'], 'secondary': ['海底通道'], 'avoid_repeating': ['低语', '触手', '甜腻气味']},
        'whispering_forest': {'primary': ['花香', '树影'], 'secondary': ['迷路'], 'avoid_repeating': ['眼睛', '深渊', '绿光']},
        'voxchester_manor': {'primary': ['肖像', '家族记录'], 'secondary': ['地下室深度'], 'avoid_repeating': ['低语', '触手', '绿光']},
        'catacombs_entrance': {'primary': ['石棺', '冷空气'], 'secondary': ['封印符号'], 'avoid_repeating': ['甜腻气味', '螺旋', '被注视']},
        'ruins_of_yith': {'primary': ['时间错位', '几何异常'], 'secondary': [], 'avoid_repeating': ['低语', '触手', '深渊']},
        'forbidden_grove': {'primary': ['古树', '祭坛'], 'secondary': ['梦境裂缝'], 'avoid_repeating': ['绿光', '非欧几里得', '甜腻气味']},
        'deep_catacombs': {'primary': ['星图', '竖井'], 'secondary': ['封印核心'], 'avoid_repeating': ['低语', '被注视', '花香']}
    }
    return imagery.get(area_id, {'primary': [], 'secondary': [], 'avoid_repeating': []})

def get_ch1_role(area_id):
    roles = {
        'town_center': 'fully_accessible',
        'harbor_district': 'fully_accessible',
        'lighthouse': 'rumor_only',
        'voxchester_manor': 'rumor_only',
        'catacombs_entrance': 'rumor_only',
        'whispering_forest': 'rumor_only',
        'ruins_of_yith': 'locked',
        'forbidden_grove': 'locked',
        'deep_catacombs': 'locked'
    }
    return roles.get(area_id, 'locked')

out['areas'] = [restructure_area(a) for a in raw['module2_areas']]

# ============================================================
# 6. NPCs - with trust profiles
# ============================================================
def get_trust_profile(npc_name):
    # Use exact NPC names from the source data
    # Actual names (from npc_names.txt):
    # 伊莱亚斯·沃德, 玛莎·格雷, 约书亚·布莱克, 希尔达·莫里斯,
    # 汤米·陈, 伊莎贝拉·韦伯, 老费舍, 埃德加·洛夫克拉夫特
    DOT = '·'
    profiles = {
        f'伊莱亚斯{DOT}沃德': {
            'surface_reliability': 7,
            'betrayal_risk': 3,
            'corruption_risk': 5,
            'emotional_anchor_strength': 4,
            'recommended_player_reading': '知识可靠，但精神不稳定。可以信任他提供的学术信息，但要注意他的精神状态可能影响判断。'
        },
        f'玛莎{DOT}格雷': {
            'surface_reliability': 7,
            'betrayal_risk': 5,
            'corruption_risk': 3,
            'emotional_anchor_strength': 8,
            'recommended_player_reading': '中高可靠，情感动机强。她的善意是真实的，但失踪的丈夫可能成为她做出危险选择的动机。'
        },
        f'约书亚{DOT}布莱克': {
            'surface_reliability': 4,
            'betrayal_risk': 7,
            'corruption_risk': 8,
            'emotional_anchor_strength': 3,
            'recommended_player_reading': '高危险，高痛苦，低理性稳定。他的疯狂是真实的，但他知道的事情也可能是真的。'
        },
        f'希尔达{DOT}莫里斯': {
            'surface_reliability': 6,
            'betrayal_risk': 6,
            'corruption_risk': 4,
            'emotional_anchor_strength': 6,
            'recommended_player_reading': '情感可信，但自保动机强。莫里斯家族的诅咒让她习惯于保护自己优先。'
        },
        f'埃德加{DOT}洛夫克拉夫特': {
            'surface_reliability': 5,
            'betrayal_risk': 3,
            'corruption_risk': 7,
            'emotional_anchor_strength': 5,
            'recommended_player_reading': '低主动恶意，高梦境泄露风险。他的灵感来自不该接触的地方，但他的善意是真诚的。'
        },
        '老费舍': {
            'surface_reliability': 8,
            'betrayal_risk': 2,
            'corruption_risk': 7,
            'emotional_anchor_strength': 7,
            'recommended_player_reading': '高可靠，高腐化风险，低主动背叛。他的混血身份让他知道太多，但他选择保护人类。'
        },
        f'伊莎贝拉{DOT}韦伯': {
            'surface_reliability': 5,
            'betrayal_risk': 7,
            'corruption_risk': 8,
            'emotional_anchor_strength': 4,
            'recommended_player_reading': '高风险，可能敌对，也可能救赎。不要完全信任她，也不要完全放弃她。'
        },
        f'汤米{DOT}陈': {
            'surface_reliability': 6,
            'betrayal_risk': 2,
            'corruption_risk': 3,
            'emotional_anchor_strength': 6,
            'recommended_player_reading': '低恶意，高事故风险。他的好奇心大于判断力，可能会无意中把你也拖入危险。'
        }
    }
    return profiles.get(npc_name, {
        'surface_reliability': 5,
        'betrayal_risk': 5,
        'corruption_risk': 5,
        'emotional_anchor_strength': 5,
        'recommended_player_reading': '信息不足，无法判断。'
    })

def restructure_npc(n):
    npc = {
        'id': n['name'],
        'name': n['name'],
        'role': n.get('role', ''),
        'location': n.get('location', ''),
        'schedule': n.get('schedule', []),
        'personality': n.get('personality', ''),
        'background': n.get('background', ''),
        'possible_interactions': n.get('possible_interaction', []),
        'sanity_impact': n.get('sanity_impact', 0),
        'trust_threshold': n.get('trust_threshold', 2),
        'trust_layers': n.get('trust_layers', []),
        'secrets': n.get('secrets', []),
        'trust_profile': get_trust_profile(n['name']),
        'chapter_1_availability': get_npc_ch1(n['name']),
        'san_recovery_effect': get_npc_san_recovery(n['name'])
    }
    return npc

def get_npc_ch1(name):
    DOT = '·'
    ch1 = {
        f'玛莎{DOT}格雷': 'core',
        '老费舍': 'core',
        f'伊莱亚斯{DOT}沃德': 'core',
        f'汤米{DOT}陈': 'core',
        f'伊莎贝拉{DOT}韦伯': 'limited_appearance',
        f'希尔达{DOT}莫里斯': 'rumor_only',
        f'约书亚{DOT}布莱克': 'rumor_only',
        f'埃德加{DOT}洛夫克拉夫特': 'rumor_only'
    }
    return ch1.get(name, 'rumor_only')

def get_npc_san_recovery(name):
    DOT = '·'
    effects = {
        f'玛莎{DOT}格雷': {'normal_chat': 'SAN+1, 疲劳-1', 'description': '与玛莎正常聊天能让人感到一丝温暖，暂时忘记恐惧。'},
        '老费舍': {'normal_chat': '降低当晚码头事件风险10%', 'description': '老费舍提供潮汐建议，让你对码头的夜晚有所准备。'},
        f'伊莱亚斯{DOT}沃德': {'normal_chat': '减少错误仪式风险', 'cost': '可能增加神话知识污染', 'description': '伊莱亚斯解读资料成功时减少错误仪式风险，但解读过程可能增加神话知识污染。'},
        f'汤米{DOT}陈': {'normal_chat': '增加侦查线索', 'description': '汤米展示照片证据，增加侦查线索但不直接扣SAN。'}
    }
    return effects.get(name, {})

out['npcs'] = [restructure_npc(n) for n in raw['module3_npcs']]

# ============================================================
# 7. EVENTS - restructured with structured triggers
# ============================================================
def parse_condition(cond_str):
    """Parse natural language condition into structured trigger."""
    trigger = {
        'areas': [],
        'time_phase': [],
        'probability': 0.5,
        'requires': [],
        'forbidden_flags': [],
        'chapter': 1
    }
    if not cond_str:
        return trigger

    # Extract area
    import re
    area_match = re.search(r'区域[=：](\w+)', cond_str)
    if area_match:
        trigger['areas'] = [area_match.group(1)]

    # Extract time
    if '深夜' in cond_str or '午夜' in cond_str or '夜晚' in cond_str:
        trigger['time_phase'] = ['midnight']
    elif '白天' in cond_str:
        trigger['time_phase'] = ['morning', 'afternoon']
    elif '夜晚' in cond_str:
        trigger['time_phase'] = ['evening', 'midnight']

    # Extract probability
    prob_match = re.search(r'概率?(\d+)%', cond_str)
    if prob_match:
        trigger['probability'] = int(prob_match.group(1)) / 100.0
    else:
        prob_match = re.search(r'(\d+)%', cond_str)
        if prob_match:
            trigger['probability'] = int(prob_match.group(1)) / 100.0

    # Extract SAN requirement
    san_match = re.search(r'SAN[<>](\d+)', cond_str)
    if san_match:
        if '<' in cond_str:
            trigger['requires'].append(f"san_below_{san_match.group(1)}")
        else:
            trigger['requires'].append(f"san_above_{san_match.group(1)}")

    return trigger

def classify_event(e):
    """Classify event into normal/minor/investigation/horror based on type and SAN."""
    evt_type = e.get('type', '')
    san = abs(e.get('sanity_damage', 0) or 0)
    if evt_type in ('正常事件',):
        return 'normal'
    elif evt_type in ('轻微异常',):
        return 'minor_abnormal'
    elif evt_type in ('线索', '调查', 'NPC对话'):
        return 'investigation'
    elif evt_type in ('超自然遭遇', '怪物遭遇'):
        return 'horror'
    # Auto-classify original events
    elif san == 0:
        return 'investigation'  # no SAN damage = investigation/dialogue
    elif san <= 2:
        return 'minor_abnormal'
    elif san <= 5:
        return 'horror'
    else:
        return 'horror'

def restructure_event(e):
    classification = classify_event(e)
    is_anchor = classification == 'normal'
    san = e.get('sanity_damage', 0) or 0
    # Chapter 1 SAN cap: -5 max unless midnight deep-dive
    ch1_eligible = is_ch1_eligible(e)
    ch1_san_note = None
    if ch1_eligible and san < -5:
        ch1_san_note = '第一章仅在深夜主动探索时触发，白天/黄昏不触发'

    evt = {
        'id': e['id'],
        'name': e['name'],
        'type': e.get('type', ''),
        'event_classification': classification,
        'chapter': e.get('chapter', 1),
        'trigger': parse_condition(e.get('condition', '')),
        'description': e.get('description', ''),
        'effects': e.get('effects', {}),
        'sanity_damage': san,
        'original_condition': e.get('condition', ''),
        'distortion_trigger': e.get('distortion_trigger'),
        'distortion_text': e.get('distortion_text_variant'),
        'false_memory': e.get('false_memory_variant'),
        'skill_check': e.get('skill_check'),
        'choices': e.get('choices', []),
        'chapter_1_eligible': ch1_eligible,
        'normalcy_anchor': is_anchor,
        'chapter_1_san_note': ch1_san_note
    }
    return evt

def is_ch1_eligible(e):
    cond = e.get('condition', '')
    ch1_areas = ['town_center', 'harbor_district']
    for area in ch1_areas:
        if area in cond:
            return True
    return False

# Main events
out['events'] = [restructure_event(e) for e in raw['module4_events']]

# Add chapter 1 normal anchor events (new)
ch1_new_events = [
    {
        'id': 'evt_ch1_grocery_supply',
        'name': '杂货店买补给',
        'type': '正常事件',
        'event_classification': 'normal',
        'chapter': 1,
        'trigger': {
            'areas': ['town_center'],
            'time_phase': ['morning', 'afternoon'],
            'probability': 0.3,
            'requires': [],
            'forbidden_flags': [],
            'chapter': 1
        },
        'description': '杂货店老板正在整理货架。店里弥漫着蜡烛和肥皂的气味，货架上的商品摆放整齐，标价清晰。你买了一些补给品。老板找零时手指微微发抖，但笑容是真诚的。',
        'effects': {'food': 1},
        'sanity_damage': 0,
        'chapter_1_eligible': True,
        'normalcy_anchor': True
    },
    {
        'id': 'evt_ch1_martha_polish',
        'name': '玛莎擦杯子',
        'type': '正常事件',
        'event_classification': 'normal',
        'chapter': 1,
        'trigger': {
            'areas': ['town_center', 'harbor_district'],
            'time_phase': ['afternoon', 'evening'],
            'probability': 0.35,
            'requires': [],
            'forbidden_flags': [],
            'chapter': 1
        },
        'description': '玛莎·格雷站在吧台后面，慢条斯理地擦着一个已经很干净的啤酒杯。吧台尽头有一个座位，放着一条叠好的围巾。"给我丈夫留的，"她注意到你的目光，"他出海了，很快就会回来的。"她的声音很轻，像在说服自己。',
        'effects': {},
        'sanity_damage': 0,
        'san_recovery': 1,
        'chapter_1_eligible': True,
        'normalcy_anchor': True
    },
    {
        'id': 'evt_ch1_fisher_mending',
        'name': '老费舍修补渔网',
        'type': '正常事件',
        'event_classification': 'normal',
        'chapter': 1,
        'trigger': {
            'areas': ['harbor_district'],
            'time_phase': ['morning', 'afternoon'],
            'probability': 0.35,
            'requires': [],
            'forbidden_flags': [],
            'chapter': 1
        },
        'description': '老费舍蹲在码头边修补渔网，手指灵活得不像他那个年纪的人。"潮汐不对，"他头也不抬地说，"这个月的潮位比往年低了三尺。你要去码头就别在黄昏后。"他没有解释原因。',
        'effects': {'harbor_night_risk_reduction': 0.1},
        'sanity_damage': 0,
        'chapter_1_eligible': True,
        'normalcy_anchor': True
    },
    {
        'id': 'evt_ch1_tommy_photo',
        'name': '汤米展示照片',
        'type': '正常事件',
        'event_classification': 'normal',
        'chapter': 1,
        'trigger': {
            'areas': ['town_center'],
            'time_phase': ['morning', 'afternoon', 'evening'],
            'probability': 0.25,
            'requires': [],
            'forbidden_flags': [],
            'chapter': 1
        },
        'description': '汤米兴奋地掏出一张刚洗出来的照片给你看——码头的全景，阳光正好。"天气好的时候还是不错的，对吧？"他笑着说。照片里一切正常，只是栈桥尽头有团模糊的影子，也许是镜头污渍。',
        'effects': {'investigation_bonus': 2},
        'sanity_damage': 0,
        'chapter_1_eligible': True,
        'normalcy_anchor': True
    },
    {
        'id': 'evt_ch1_bell_excuse',
        'name': '镇民避谈钟声',
        'type': '正常事件',
        'event_classification': 'normal',
        'chapter': 1,
        'trigger': {
            'areas': ['town_center'],
            'time_phase': ['morning', 'afternoon'],
            'probability': 0.4,
            'requires': ['evt_strange_clock_seen'],
            'forbidden_flags': [],
            'chapter': 1
        },
        'description': '你向路过的镇民询问教堂钟声的事。"老钟坏了好几年了，"一个中年男人摆摆手，"齿轮错位，修不好。不是什么大事。"他加快脚步离开了，像是怕你继续追问。',
        'effects': {},
        'sanity_damage': 0,
        'chapter_1_eligible': True,
        'normalcy_anchor': True
    },
    {
        'id': 'evt_ch1_sailor_weather',
        'name': '水手谈天气',
        'type': '正常事件',
        'event_classification': 'normal',
        'chapter': 1,
        'trigger': {
            'areas': ['harbor_district'],
            'time_phase': ['evening'],
            'probability': 0.3,
            'requires': [],
            'forbidden_flags': [],
            'chapter': 1
        },
        'description': '两个水手坐在码头边喝酒，谈论最近的捕捞量。"今年鱼少得可怜，"其中一个说，"连海鸥都不来了。可能是暖流偏了。"另一个咕哝了几句，把空酒瓶扔进海里。瓶子漂了一会儿，沉了。',
        'effects': {},
        'sanity_damage': 0,
        'chapter_1_eligible': True,
        'normalcy_anchor': True
    },
    {
        'id': 'evt_ch1_streetlamp_out',
        'name': '雨中路灯熄灭',
        'type': '轻微异常',
        'event_classification': 'minor_abnormal',
        'chapter': 1,
        'trigger': {
            'areas': ['town_center'],
            'time_phase': ['evening'],
            'probability': 0.2,
            'requires': [],
            'forbidden_flags': [],
            'chapter': 1
        },
        'description': '雨下大了。街角的路灯忽闪了几下，熄灭了。黑暗持续了大约十秒，灯又亮了。什么都没有发生。但你的影子在灯光恢复的瞬间，朝相反的方向动了一下。也许是错觉。',
        'effects': {},
        'sanity_damage': -1,
        'chapter_1_eligible': True,
        'normalcy_anchor': False
    },
    {
        'id': 'evt_ch1_poster_removed',
        'name': '有人撕掉告示',
        'type': '轻微异常',
        'event_classification': 'minor_abnormal',
        'chapter': 1,
        'trigger': {
            'areas': ['town_center'],
            'time_phase': ['morning', 'afternoon'],
            'probability': 0.2,
            'requires': [],
            'forbidden_flags': [],
            'chapter': 1
        },
        'description': '你看到一个穿深色外套的人站在公告栏前，撕下了一张失踪告示，仔细叠好放进口袋。他注意到你在看他，微微点头示意，然后走进了旁边的小巷。告示栏上少了一张纸，但你不确定上面写的是谁的名字。',
        'effects': {'investigation_bonus': 1},
        'sanity_damage': -1,
        'chapter_1_eligible': True,
        'normalcy_anchor': False
    },
    {
        'id': 'evt_ch1_cat_stare',
        'name': '码头的猫',
        'type': '正常事件',
        'event_classification': 'normal',
        'chapter': 1,
        'trigger': {
            'areas': ['harbor_district'],
            'time_phase': ['morning', 'afternoon'],
            'probability': 0.25,
            'requires': [],
            'forbidden_flags': [],
            'chapter': 1
        },
        'description': '一只花斑猫从缆绳堆后面探出头来，歪着脑袋看你。它脖子上系着一条褪色的丝带，像是某个孩子系上去的。你蹲下来伸出手，它犹豫了一下，蹭了蹭你的手指，然后跳上栈桥的栏杆消失了。',
        'effects': {'fatigue': -1},
        'sanity_damage': 0,
        'chapter_1_eligible': True,
        'normalcy_anchor': True
    },
    {
        'id': 'evt_ch1_church_organ',
        'name': '教堂风琴声',
        'type': '正常事件',
        'event_classification': 'normal',
        'chapter': 1,
        'trigger': {
            'areas': ['town_center'],
            'time_phase': ['morning'],
            'probability': 0.2,
            'requires': [],
            'forbidden_flags': [],
            'chapter': 1
        },
        'description': '教堂里传来风琴声，有人在练习一首赞美诗。旋律有些跑调，但演奏者很认真。门半开着，你看到一个白发老妇坐在风琴前，闭着眼睛沉浸在音乐中。这是沃切斯特里为数不多的正常声音。',
        'effects': {'san': 1},
        'sanity_damage': 0,
        'chapter_1_eligible': True,
        'normalcy_anchor': True
    }
]
out['events'].extend(ch1_new_events)

# Event extensions
out['event_chains'] = raw.get('module4_event_extensions', {}).get('event_chains', [])

# ============================================================
# 8. CLUE CHAINS - restructured
# ============================================================
clue_raw = raw.get('module_clue_chains', {})
chains = clue_raw.get('main_investigation_chains', {})

out['clue_chains'] = []
for chain_id, chain_data in chains.items():
    c = {
        'id': chain_data.get('id', chain_id),
        'name': chain_data.get('name', ''),
        'chapter': max(n.get('chapter', 1) for n in chain_data.get('nodes', [])) if chain_data.get('nodes') else 1,
        'description': chain_data.get('description', ''),
        'clue_category': chain_data.get('clue_category', ''),
        'clues': [
            {
                'id': n['id'],
                'name': n['name'],
                'source': n.get('source', ''),
                'type': n.get('type', 'surface'),
                'chapter': n.get('chapter', 1),
                'weight': n.get('weight', 1),
                'unlocks': n.get('unlocks'),
                'required_for_endings': n.get('required_for_endings', [])
            }
            for n in chain_data.get('nodes', [])
        ],
        'chain_reward': chain_data.get('chain_reward', ''),
        'chapter_1_focus': chain_data.get('id', '') in ['chain_harbor', 'chain_heretical'],
        'required_for': [],
        'optional_reveals': [],
        'false_interpretations': [],
        'completion_effects': {}
    }
    out['clue_chains'].append(c)

# Mark which chains are required for which endings
for ending in raw.get('ending_definitions', []):
    for cond in ending.get('required_conditions', []):
        for chain in out['clue_chains']:
            if chain['id'] in cond or chain['name'] in cond:
                chain['required_for'].append(ending['id'])

# ============================================================
# 9. ENDINGS - unified v2 system
# ============================================================
out['endings'] = raw.get('ending_definitions', [])

out['ending_judgement'] = raw.get('ending_judgement', {})

# Archive old endings
out['deprecated_endings_archive'] = {
    'description': '旧版module7_endings，不再参与正式判定。保留供参考。',
    'note': '以ending_definitions中的10个结局为准。',
    'old_endings': raw.get('module7_endings', []),
    'old_extensions': raw.get('module7_ending_extensions', {})
}

# ============================================================
# 10. VERTICAL SLICE (Chapter 1 playable plan)
# ============================================================
ch1_areas = [a for a in out['areas'] if a['chapter_1_role'] in ('fully_accessible', 'rumor_only')]
ch1_npcs = [n for n in out['npcs'] if n['chapter_1_availability'] in ('core', 'limited_appearance')]
ch1_events = [e for e in out['events'] if e.get('chapter_1_eligible')]
ch1_clues = [c for c in out['clue_chains'] if c.get('chapter_1_focus')]

# Categorize ch1 events using classification field
normal_events = [e for e in ch1_events if e.get('event_classification') == 'normal']
minor_abnormal = [e for e in ch1_events if e.get('event_classification') == 'minor_abnormal']
investigation = [e for e in ch1_events if e.get('event_classification') == 'investigation']
horror = [e for e in ch1_events if e.get('event_classification') == 'horror']

total = len(ch1_events) or 1
out['vertical_slice'] = {
    'chapter': 1,
    'title': '十三声钟响',
    'description': '玩家初到沃切斯特，在镇中心和码头之间活动，接触核心NPC，发现钟声和失踪案的初步异常。本章不涉及深层神话实体，只建立"有什么不对"的感觉。',
    'accessible_areas': [a['id'] for a in ch1_areas if a['chapter_1_role'] == 'fully_accessible'],
    'rumor_areas': [a['id'] for a in ch1_areas if a['chapter_1_role'] == 'rumor_only'],
    'locked_areas': [a['id'] for a in out['areas'] if a['chapter_1_role'] == 'locked'],
    'core_npcs': [n['id'] for n in ch1_npcs if n['chapter_1_availability'] == 'core'],
    'limited_npcs': [n['id'] for n in ch1_npcs if n['chapter_1_availability'] == 'limited_appearance'],
    'rumor_npcs': [n['id'] for n in out['npcs'] if n['chapter_1_availability'] == 'rumor_only'],
    'active_clue_chains': [c['id'] for c in ch1_clues],
    'event_distribution': {
        'total_events': len(ch1_events),
        'normal_events': len(normal_events),
        'minor_abnormal': len(minor_abnormal),
        'investigation': len(investigation),
        'horror': len(horror),
        'normal_ratio': f"{len(normal_events)/total*100:.0f}%",
        'target_ratio': '40% normal / 35% minor / 20% investigation / 5% horror'
    },
    'san_cap': -5,
    'mythos_name_rule': '第一章禁止使用任何神话专名，只用模糊称呼',
    'day_1_morning_script': [
        '玩家抵达沃切斯特，听到十三声钟响（evt_strange_clock自动触发）',
        '前往镇中心，看到公告栏上的失踪告示',
        '可选：进入杂货店/酒馆，触发正常锚点事件'
    ],
    'day_1_afternoon_script': [
        '前往码头区，接触老费舍和汤米',
        '潮汐异常初步暗示',
        '可选：与玛莎对话'
    ],
    'playable_goals': [
        '了解镇中心和码头两个核心区域',
        '至少与3个核心NPC建立初步对话',
        '获得"十三声钟响"和"失踪告示"两条初始线索',
        '建立安全屋（酒馆二楼）',
        'SAN不应低于起始值-10'
    ]
}

# ============================================================
# 11. IMPLEMENTATION NOTES
# ============================================================
out['implementation_notes'] = {
    'priorities': raw.get('implementation_priorities', {}),
    'chapters': raw.get('module_chapter_progression', {}),
    'chapter_art_pacing': raw.get('chapter_art_pacing', {}),
    'death_restart_text': raw.get('death_and_restart_text', {}),
    'silent_events': raw.get('silent_events', {}),
    'loop_text_variants': raw.get('loop_text_variants', {}),
    'npc_redemption': raw.get('npc_redemption_art_beats', {}),
    'map_surrealism': raw.get('map_surrealism_rules', {}),
    'memory_decay': raw.get('memory_decay_map_system', {}),
    'monster_presence': raw.get('monster_presence_rules', {}),
    'san_text_variants': raw.get('san_text_variants', {}),
    'philosophical_mechanics': raw.get('philosophical_mechanics', {}),
    'ending_text_rewrite': raw.get('ending_text_rewrite', {}),
    'ending_system_v2': raw.get('ending_system_v2', {}),
    'implementation_examples': raw.get('implementation_examples', {}),
    'accessibility': raw.get('accessibility_and_safety_options', {}),
    'chapter_progression_events': raw.get('module8_time_schedule', {}).get('special_day_events', []),
    'failure_states': raw.get('module_failure_states', {})
}

# ============================================================
# OUTPUT
# ============================================================
output_path = 'D:/ZHIJIGozgewan/COC/game_data_refactored.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

# Stats
print(f"Output written to: {output_path}")
print(f"Top-level keys: {list(out.keys())}")
print(f"Areas: {len(out['areas'])}")
print(f"NPCs: {len(out['npcs'])}")
print(f"Events: {len(out['events'])}")
print(f"  - Chapter 1 eligible: {len(ch1_events)}")
print(f"  - Normal anchors: {len(normal_events)}")
print(f"Clue chains: {len(out['clue_chains'])}")
print(f"Endings: {len(out['endings'])}")
print(f"Deprecated endings archived: {len(out['deprecated_endings_archive']['old_endings'])}")

# Verify JSON
with open(output_path, 'r', encoding='utf-8') as f:
    verify = json.load(f)
print(f"\nJSON verification: OK (loaded {len(json.dumps(verify, ensure_ascii=False))} chars)")
