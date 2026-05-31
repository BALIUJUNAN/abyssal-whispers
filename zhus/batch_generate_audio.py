"""
最终版本 - 批量音频生成脚本 v3.0
使用正确的 /generate API端点

功能:
- 自动解析音频.txt中的120+个提示词
- 批量调用Gradio /generate API生成音频
- 支持断点续传、错误重试、变体生成
- 智能分类输出目录
"""

import sys
import io
# 修复Windows中文编码问题
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
import re
import time
from pathlib import Path
from gradio_client import Client
from tqdm import tqdm
import shutil

# ============== 配置区 ==============

# API 配置
API_URL = "http://106.75.213.91:7860/"
GENERATE_API_NAME = "/generate"  # ✅ 正确的音频生成端点

# 默认生成参数（可根据需要调整）
DEFAULT_GENERATE_PARAMS = {
    "model_name": "medium",           # 模型: 'medium', 'small-music', 'small-sfx'
    "model_half": True,               # 使用半精度（更快）
    "seconds_total": 10,              # 音频时长(秒) - 会根据每个提示词自动调整
    "volume_db": 0.0,                 # 音量(dB)
    "volume_mode": "limiter",         # 音量模式: 'limiter' 或 'peak'
    "cfg_scale": 3.5,                 # CFG缩放（越高越贴近提示词）
    "steps": 25,                      # 采样步数（质量 vs 速度平衡）
    "seed": -1,                       # 随机种子(-1为随机)
    "sampler_type": "pingpong",       # 采样器
    "sigma_max": 1.0,                 # ✅ sigma最大值 (范围: 0.0-1.0)
    "cfg_interval_min": 0.0,
    "cfg_interval_max": 1.0,
    "cfg_rescale": 0.0,
    "cfg_norm_threshold": 0.0,
    "apg_scale": 1.0,
    "file_format": "mp3 320k",        # 输出格式: 'wav', 'flac', 'mp3 320k', 'mp3 v0'
    "file_naming": "output.wav",
    "cut_to_seconds_total": True,     # 裁剪到指定时长
    "init_audio": None,              # 不使用初始音频
    "init_noise_level": 0.9,
    "mask_maskstart": 0,
    "mask_maskend": 380,
    "inpaint_audio": None,
    "init_audio_type": "初始音频",
    "inversion_steps": 100,
    "inversion_gamma": 0,
    "inversion_unconditional": False,
    "duration_padding_sec": 2.0,     # 时长填充
}

# 文件配置
PROMPT_FILE = "音频.txt"
OUTPUT_DIR = "generated_audio"

# 生成配置
MAX_RETRIES = 3                    # 失败重试次数
RETRY_DELAY = 10                   # 重试间隔(秒)，给服务器缓冲时间
REQUEST_DELAY = 3                  # 请求间隔(秒)
GENERATE_VARIANTS = 2              # 每个提示词生成几个变体 (建议1-3)

# 负向提示词（保持空或自定义，API有默认值）
NEGATIVE_PROMPT = ""


# ============== 提示词解析 ==============

def parse_prompts_from_file(filepath):
    """从音频.txt中解析所有音频提示词"""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    prompts = []
    
    # 匹配文件名和描述
    pattern = r'([a-zA-Z0-9_]+\.mp3)\n(.*?)(?=\n[a-zA-Z0-9_]+\.mp3|\n\d+\. |\n[一二三四五六七八九十]+\.|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    for filename, desc_block in matches:
        lines = [line.strip() for line in desc_block.strip().split('\n') if line.strip()]
        
        if len(lines) >= 2:
            filename_clean = filename.strip()
            title = lines[0]
            description = ' '.join(lines[1:]) if len(lines) > 1 else title
            
            # 构建完整提示词
            prompt = f"{title}\n{description}"
            
            # 从描述中提取时长信息
            duration_match = re.search(r'(\d+)\s*seconds?', description.lower())
            duration = int(duration_match.group(1)) if duration_match else 10
            
            prompts.append({
                "filename": filename_clean,
                "prompt": prompt,
                "description": description,
                "category": categorize_filename(filename_clean),
                "duration": duration
            })
    
    return prompts


def categorize_filename(filename):
    """根据文件名推断类别用于组织输出目录"""
    
    category_map = [
        (lambda f: f.startswith('amb_'), lambda f: categorize_amb(f)),
        (lambda f: f.startswith('ui_'), lambda _: 'ui'),
        (lambda f: any(x in f for x in ['stinger_', 'seal_', 'chapter_', 'meta_', 'fog_roll',
                                         'water_inside', 'whisper_no_words', 'forbidden_book',
                                         'ritual_circle', 'cult_chant', 'monster_near', 'chase_short',
                                         'investigation_chain', 'conclusion_unlocked', 'false_interpretation',
                                         'ending_behavior', 'new_day_start', 'night_fall',
                                         'time_warning_midnight', 'weather_rain', 'weather_blood_moon']),
         lambda _: 'stinger'),
        (lambda f: f.startswith('san_'), lambda _: 'san'),
        (lambda f: f.startswith('death_'), lambda _: 'death'),
        (lambda f: f.startswith('ending_') or f.startswith('credits_'), lambda _: 'ending'),
        (lambda f: f.startswith('npc_'), lambda _: 'npc'),
        (lambda f: any(x in f for x in ['resource_', 'hp_', 'ap_', 'money_', 'objective_',
                                         'dialogue_', 'secret_revealed', 'trust_',
                                         'humanity_', 'corruption_trigger']),
         lambda _: 'resource'),
    ]
    
    for check_func, cat_func in category_map:
        if check_func(filename):
            return cat_func(filename)
    
    return 'other'


def categorize_amb(filename):
    """环境音效子分类"""
    if 'safehouse' in filename:
        return 'amb/safehouse'
    elif any(x in filename for x in ['harbor', 'town', 'street']):
        return 'amb/town'
    elif any(x in filename for x in ['forest', 'grove']):
        return 'amb/forest'
    elif any(x in filename for x in ['ruins', 'catacombs', 'deep']):
        return 'amb/dungeon'
    return 'amb/environment'


# ============== 音频生成器类 ==============

class AudioGenerator:
    def __init__(self):
        self.client = None
    
    def connect(self):
        """连接到Gradio API"""
        print(f"正在连接 API: {API_URL}")
        self.client = Client(API_URL)
        print("✓ API 连接成功")
    
    def generate_single_audio(self, prompt, output_path, duration=10, variant_seed=None):
        """
        使用 /generate 端点生成单个音频
        
        参数:
            prompt: 正向提示词
            output_path: 输出文件路径
            duration: 音频时长(秒)
            variant_seed: 变体种子（用于生成不同变体）
        
        返回:
            bool: 是否成功
        """
        
        # 准备参数
        params = DEFAULT_GENERATE_PARAMS.copy()
        params["prompt"] = prompt
        params["seconds_total"] = duration
        
        if NEGATIVE_PROMPT:
            params["negative_prompt"] = NEGATIVE_PROMPT
        
        # 为不同变体设置不同种子
        if variant_seed is not None:
            params["seed"] = variant_seed
        elif GENERATE_VARIANTS > 1:
            import random
            params["seed"] = random.randint(1, 999999)
        
        try:
            print(f"\n  🎵 生成中...")
            print(f"     时长: {duration}秒 | 步数: {params['steps']} | 格式: {params['file_format']}")
            
            # 调用 /generate API
            result = self.client.predict(
                **params,
                api_name=GENERATE_API_NAME
            )
            
            # 处理返回结果（应该是音频文件路径）
            if result is not None:
                audio_path = result
                
                # 复制文件到目标位置
                success = self._save_audio(audio_path, output_path)
                
                if success and os.path.exists(output_path):
                    size_kb = os.path.getsize(output_path) / 1024
                    print(f"  ✓ 已保存: {os.path.basename(output_path)} ({size_kb:.1f} KB)")
                    return True
                else:
                    return False
            else:
                print(f"  ✗ 返回结果为空")
                return False
                
        except Exception as e:
            error_msg = str(e)
            
            # 过滤常见但无害的错误信息
            if 'timeout' in error_msg.lower():
                print(f"  ⏱ 超时 ({error_msg[:50]}...)")
            elif 'connection' in error_msg.lower():
                print(f"  🔌 连接问题 ({error_msg[:50]}...)")
            else:
                print(f"  ✗ 错误: {error_msg[:100]}")
            
            raise e
    
    def _save_audio(self, source_path, target_path):
        """保存音频文件到目标位置"""
        try:
            source_str = str(source_path).strip()
            
            # 尝试各种可能的路径格式
            possible_paths = [source_str]
            
            if hasattr(source_path, 'path'):
                possible_paths.append(source_path.path)
            if hasattr(source_path, 'url'):
                url = source_path.url
                if url.startswith('/'):
                    possible_paths.append(url)
            
            for path_candidate in possible_paths:
                if os.path.exists(path_candidate):
                    shutil.copy2(path_candidate, target_path)
                    return True
            
            # 如果路径不存在，可能是临时文件或其他格式
            print(f"  ⚠ 无法访问源文件: {source_str[:80]}")
            return False
            
        except Exception as e:
            print(f"  ✗ 保存失败: {str(e)[:60]}")
            return False
    
    def generate_with_retry(self, prompt, output_path, duration=10, variant_seed=None, max_retries=MAX_RETRIES):
        """带重试机制的音频生成"""
        
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                success = self.generate_single_audio(prompt, output_path, duration, variant_seed)
                if success:
                    return True
                    
            except Exception as e:
                last_error = e
                
                if attempt < max_retries:
                    wait_time = RETRY_DELAY * (attempt + 1)
                    print(f"  ⏳ 等待 {wait_time}秒后重试... ({attempt+1}/{max_retries})")
                    time.sleep(wait_time)
                else:
                    print(f"  ✗ 重试耗尽，跳过此文件")
        
        return False


# ============== 主流程 ==============

def main():
    """主函数"""
    
    print("=" * 70)
    print("  克苏鲁风格Roguelite游戏 - 批量音频生成工具 v3.0")
    print("  使用 /generate API端点")
    print("=" * 70)
    
    # 1. 解析提示词
    print("\n[1/6] 解析提示词...")
    
    if not os.path.exists(PROMPT_FILE):
        print(f"✗ 未找到提示词文件: {PROMPT_FILE}")
        input("\n按Enter键退出...")
        return
    
    prompts = parse_prompts_from_file(PROMPT_FILE)
    total_prompts = len(prompts)
    total_generations = total_prompts * GENERATE_VARIANTS
    
    print(f"✓ 解析完成: 共 {total_prompts} 个提示词")
    print(f"  计划生成: {total_generations} 个音频文件 (每个{GENERATE_VARIANTS}个变体)")
    
    if total_prompts == 0:
        print("✗ 未找到有效的提示词，请检查文件格式")
        input("\n按Enter键退出...")
        return
    
    # 显示类别统计
    categories = {}
    durations = []
    
    for p in prompts:
        cat = p['category']
        categories[cat] = categories.get(cat, 0) + 1
        durations.append(p['duration'])
    
    print(f"\n  按类别分布:")
    for cat, count in sorted(categories.items()):
        print(f"    {cat}: {count}")
    
    avg_duration = sum(durations) / len(durations) if durations else 10
    max_duration = max(durations) if durations else 10
    print(f"\n  时长统计:")
    print(f"    平均: {avg_duration:.1f}秒 | 最长: {max_duration}秒")
    
    # 2. 初始化生成器
    print(f"\n[2/6] 连接API...")
    
    generator = AudioGenerator()
    
    try:
        generator.connect()
    except Exception as e:
        print(f"\n✗ API连接失败!")
        print(f"  错误: {e}")
        print(f"\n请检查:")
        print(f"  1. API服务是否运行: http://106.75.213.91:7860/")
        print(f"  2. 网络连接是否正常")
        input("\n按Enter键退出...")
        return
    
    # 3. 准备输出目录
    print(f"\n[3/6] 准备输出目录...")
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    files_to_generate = []
    already_exists = 0
    
    for prompt_info in prompts:
        base_name = prompt_info['filename']
        category_dir = os.path.join(OUTPUT_DIR, prompt_info['category'])
        os.makedirs(category_dir, exist_ok=True)
        
        for v in range(1, GENERATE_VARIANTS + 1):
            # 构建输出文件名
            if GENERATE_VARIANTS > 1:
                name_parts = base_name.rsplit('.', 1)
                filename = f"{name_parts[0]}_v0{v}.{name_parts[1]}"
            else:
                filename = base_name
            
            output_path = os.path.join(category_dir, filename)
            
            if os.path.exists(output_path):
                already_exists += 1
            else:
                files_to_generate.append({
                    **prompt_info,
                    'output_path': output_path,
                    'variant': v
                })
    
    total_files = len(files_to_generate) + already_exists
    
    print(f"  总计: {total_files} 个文件")
    print(f"  已存在(将跳过): {already_exists}")
    print(f"  待生成: {len(files_to_generate)}")
    
    # 4. 显示配置摘要
    print(f"\n[4/6] 生成配置:")
    print(f"  模型: {DEFAULT_GENERATE_PARAMS['model_name']}")
    print(f"  采样步数: {DEFAULT_GENERATE_PARAMS['steps']}")
    print(f"  CFG缩放: {DEFAULT_GENERATE_PARAMS['cfg_scale']}")
    print(f"  输出格式: {DEFAULT_GENERATE_PARAMS['file_format']}")
    print(f"  重试次数: {MAX_RETRIES}")
    print(f"  请求间隔: {REQUEST_DELAY}秒")
    
    if len(files_to_generate) == 0:
        print(f"\n{'='*70}")
        print(f"所有文件已存在，无需生成！")
        show_final_report(total_files, already_exists, 0, 0, 0)
        return
    
    # 询问确认
    print(f"\n{'='*70}")
    response = input(f"[5/6] 准备开始生成 {len(files_to_generate)} 个音频？(y/n): ")
    
    if response.lower() != 'y':
        print("已取消。")
        return
    
    # 6. 开始批量生成
    print(f"\n[6/6] 开始批量生成...")
    print(f"{'-'*70}\n")
    
    start_time = time.time()
    success_count = 0
    fail_count = 0
    skip_count = already_exists
    
    progress_bar = tqdm(
        files_to_generate,
        desc="生成进度",
        unit="file",
        bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]'
    )
    
    for i, item in enumerate(progress_bar):
        filename = item['filename']
        prompt = item['prompt']
        output_path = item['output_path']
        duration = item.get('duration', 10)
        variant = item.get('variant', 1)
        
        # 更新进度条显示
        progress_bar.set_postfix_str(
            f'{filename[:20]:<22} 成功:{success_count} 失败:{fail_count}'
        )
        
        # 为不同变体生成不同的随机种子
        variant_seed = None
        if GENERATE_VARIANTS > 1:
            import random
            variant_seed = hash(f"{filename}_v{variant}_{i}") % 1000000
        
        # 生成音频
        success = generator.generate_with_retry(
            prompt=prompt,
            output_path=output_path,
            duration=duration,
            variant_seed=variant_seed
        )
        
        if success:
            success_count += 1
        else:
            fail_count += 1
            
            # 记录失败项
            fail_log_path = os.path.join(OUTPUT_DIR, 'failed_generations.log')
            with open(fail_log_path, 'a', encoding='utf-8') as log:
                log.write(
                    f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] "
                    f"{filename}\t{output_path}\t"
                    f"duration={duration}s\t"
                    f"prompt={prompt[:100]}...\n"
                )
        
        # 请求间隔，避免过快
        if i < len(files_to_generate) - 1:
            time.sleep(REQUEST_DELAY)
    
    elapsed_time = time.time() - start_time
    
    # 完成报告
    show_final_report(total_files, skip_count, success_count, fail_count, elapsed_time)


def show_final_report(total, skipped, success, failed, elapsed_time=0):
    """显示最终报告"""
    
    print(f"\n\n{'='*70}")
    print("  生成完成！")
    print(f"{'='*70}")
    
    print(f"\n  统计汇总:")
    print(f"    总计文件数: {total}")
    print(f"    ✓ 生成成功: {success}")
    print(f"    ⊘ 已存在跳过: {skipped}")
    print(f"    ✗ 生成失败: {failed}")
    
    if total > 0:
        success_rate = (success / (total - skipped)) * 100 if (total - skipped) > 0 else 100
        print(f"\n    成功率: {success_rate:.1f}%")
    
    if elapsed_time > 0 and (success + failed) > 0:
        total_processed = success + failed
        avg_time = elapsed_time / total_processed
        print(f"\n  时间统计:")
        print(f"    总耗时: {format_time(elapsed_time)}")
        print(f"    平均每个: {avg_time:.1f}秒")
        
        estimated_remaining = failed * avg_time
        if estimated_remaining > 0:
            print(f"    预计重新生成失败项需: {format_time(estimated_remaining)}")
    
    print(f"\n  输出目录: {os.path.abspath(OUTPUT_DIR)}")
    
    if failed > 0:
        fail_log = os.path.join(OUTPUT_DIR, 'failed_generations.log')
        print(f"\n  ⚠ 有 {failed} 个文件生成失败")
        print(f"    失败记录: {fail_log}")
        print(f"\n  提示: 可重新运行脚本继续生成失败的文件（会自动跳过已有的）")
    
    # 显示目录结构预览
    print(f"\n{'='*70}")
    print("  输出目录结构:")
    print_directory_tree(OUTPUT_DIR, max_depth=3)


def format_time(seconds):
    """格式化时间显示"""
    if seconds < 60:
        return f"{seconds:.1f}秒"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}分{secs}秒"
    else:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        return f"{hours}小时{minutes}分钟"


def print_directory_tree(root_dir, max_depth=3, prefix=""):
    """打印目录树结构"""
    
    root_path = Path(root_dir)
    if not root_path.exists():
        print(f"  (目录不存在)")
        return
    
    items = sorted(list(root_path.iterdir()))
    dirs = [item for item in items if item.is_dir() and item.name != '.' 
            and not item.name.startswith('.')]
    files = sorted([item for item in items if item.is_file()
                   and item.name not in ['failed_generations.log']],
                   key=lambda f: f.stat().st_size, reverse=True)
    
    # 显示子目录
    for i, d in enumerate(dirs):
        is_last_dir = (i == len(dirs) - 1) and (len(files) == 0)
        connector = "└── " if is_last_dir else "├── "
        print(f"{prefix}{connector}{d.name}/")
        
        if max_depth > 1:
            extension = "    " if is_last_dir else "│   "
            print_directory_tree(str(d), max_depth - 1, prefix + extension)
    
    # 显示部分文件（限制数量避免过长输出）
    display_files = files[:8]
    for i, f in enumerate(display_files):
        is_last = (i == len(display_files) - 1)
        connector = "└── " if is_last else "├── "
        size_kb = f.stat().st_size / 1024
        size_str = f"{size_kb:.1f}" if size_kb >= 1 else f"{size_kb*1024:.0f}"
        unit = "KB" if size_kb >= 1 else "B"
        print(f"{prefix}{connector}{f.name} ({size_str} {unit})")
    
    if len(files) > 8:
        print(f"{prefix}└── ... 还有 {len(files) - 8} 个文件")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n⚠ 用户中断操作")
        print("已生成的文件已保存在:", OUTPUT_DIR)
        print("可以稍后重新运行脚本继续（会自动跳过已有文件）")
