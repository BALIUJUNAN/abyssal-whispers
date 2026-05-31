"""
快速测试 - 用实际提示词生成单个音频
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from gradio_client import Client
import os
import shutil

API_URL = "http://106.75.213.91:7860/"

def quick_test():
    print("=" * 60)
    print("  快速测试 - 单个音频生成")
    print("=" * 60)
    
    # 用户提供的提示词
    prompt = """Seamless catacombs entrance ambience. 
Water drops in stone tunnels, low air pressure, distant stone echo, occasional gravel shift. 
Claustrophobic but quiet, no monster, no music. 60 seconds loop."""
    
    # 时长上取整到5的倍数: 60 -> 60 (已经是5的倍数)
    duration = 60
    
    print(f"\n[1] 连接 API...")
    client = Client(API_URL)
    print("✓ 连接成功")
    
    print(f"\n[2] 准备参数:")
    print(f"  模型: small-sfx")
    print(f"  时长: {duration}秒 (已上取整)")
    print(f"  格式: mp3 320k")
    print(f"  步数: 25")
    print(f"\n提示词:\n{prompt}")
    
    print(f"\n[3] 调用 /generate ...")
    print("(这可能需要30-120秒)")
    
    try:
        result = client.predict(
            model_name="small-sfx",      # 音效专用模型
            model_half=True,
            prompt=prompt,
            negative_prompt="",
            seconds_total=duration,      # 60秒
            volume_db=0.0,
            volume_mode="limiter",
            cfg_scale=3.0,
            steps=25,
            seed=-1,                     # 随机种子
            sampler_type="pingpong",
            sigma_max=1.0,              # ✅ 最大值1.0
            cfg_interval_min=0.0,
            cfg_interval_max=1.0,
            file_format="mp3 320k",
            cut_to_seconds_total=True,
            api_name="/generate"
        )
        
        print(f"\n✓ 调用成功!")
        print(f"返回类型: {type(result)}")
        print(f"返回值: {str(result)[:100]}")
        
        # 保存文件
        output_file = "test_catacombs_ambient.mp3"
        success = save_result(result, output_file)
        
        if success and os.path.exists(output_file):
            size_kb = os.path.getsize(output_file) / 1024
            print(f"\n{'='*60}")
            print(f"✓ 测试成功!")
            print(f"{'='*60}")
            print(f"文件: {output_file}")
            if size_kb > 1024:
                print(f"大小: {size_kb/1024:.2f} MB")
            else:
                print(f"大小: {size_kb:.1f} KB")
            
            print(f"\n请打开文件检查音质！")
            return True
        else:
            print(f"\n⚠ 无法保存文件")
            return False
            
    except Exception as e:
        print(f"\n✗ 错误: {type(e).__name__}: {str(e)[:200]}")
        return False


def save_result(result, output_path):
    """保存结果"""
    paths_to_try = []
    
    if isinstance(result, str):
        paths_to_try.append(result.strip())
    elif hasattr(result, 'path'):
        paths_to_try.append(result.path)
    elif hasattr(result, '__str__'):
        paths_to_try.append(str(result).strip())
    
    for p in paths_to_try:
        if p and os.path.exists(p):
            shutil.copy2(p, output_path)
            return True
    
    return False


if __name__ == "__main__":
    success = quick_test()
    
    print("\n" + "=" * 60)
    if success:
        print("状态: ✓ 成功 - API可用！")
        print("\n下一步：运行 batch_generate_audio_v4.py 批量生成")
    else:
        print("状态: ✗ 失败 - 需要排查")
    print("=" * 60)
