"""
测试 /generate API端点 - 生成单个音频
验证API是否正常工作
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from gradio_client import Client
import os
import shutil

# API配置
API_URL = "http://106.75.213.91:7860/"
GENERATE_API_NAME = "/generate"

def test_generate():
    """测试生成单个音频"""
    
    print("=" * 70)
    print("  /generate API 端点测试")
    print("=" * 70)
    
    # 测试提示词（从音频.txt取一个简短的）
    test_prompt = """Seamless harbor night ambience.
Foggy 1920s coastal harbor at midnight.
Distant foghorn, wet wood creaking, water lapping against stone.
No music, no monster, atmospheric only. 10 seconds."""
    
    print(f"\n[1] 连接API...")
    
    try:
        client = Client(API_URL)
        print("✓ 连接成功!")
    except Exception as e:
        print(f"✗ 连接失败: {e}")
        return False
    
    print(f"\n[2] 准备生成...")
    print(f"提示词预览:")
    for line in test_prompt.split('\n')[:3]:
        print(f"  {line}")
    print("  ...")
    
    # 生成参数
    params = {
        "model_name": "medium",           # 模型大小
        "model_half": True,               # 半精度(更快)
        "prompt": test_prompt,            # 正向提示词
        "negative_prompt": "",           # 负向提示词(空=使用默认值)
        "seconds_total": 10,             # 时长: 10秒
        "volume_db": 0.0,
        "volume_mode": "limiter",
        "cfg_scale": 3.5,                # CFG缩放
        "steps": 25,                     # 采样步数
        "seed": 12345,                   # 固定种子(可复现)
        "sampler_type": "pingpong",
        "sigma_max": 1.0,               # ✅ 修正：最大值是1.0
        "cfg_interval_min": 0.0,
        "cfg_interval_max": 1.0,
        "cfg_rescale": 0.0,
        "cfg_norm_threshold": 0.0,
        "apg_scale": 1.0,
        "file_format": "mp3 320k",       # 输出格式
        "file_naming": "output.wav",
        "cut_to_seconds_total": True,
        "init_audio": None,
        "init_noise_level": 0.9,
        "mask_maskstart": 0,
        "mask_maskend": 380,
        "inpaint_audio": None,
        "init_audio_type": "初始音频",
        "inversion_steps": 100,
        "inversion_gamma": 0,
        "inversion_unconditional": False,
        "duration_padding_sec": 2.0,
    }
    
    print(f"\n[3] 调用 /generate 端点...")
    print(f"  参数:")
    print(f"    模型: {params['model_name']}")
    print(f"    时长: {params['seconds_total']}秒")
    print(f"    步数: {params['steps']}")
    print(f"    格式: {params['file_format']}")
    print(f"\n  ⏳ 正在生成，这可能需要10-60秒...")
    
    try:
        result = client.predict(
            **params,
            api_name=GENERATE_API_NAME
        )
        
        print(f"\n✓ API调用成功!")
        
        if result is None:
            print("⚠ 返回值为None")
            return False
        
        print(f"\n返回结果类型: {type(result)}")
        print(f"返回值: {str(result)[:150]}")
        
        # 尝试保存文件
        output_filename = "test_harbor_ambient.mp3"
        
        success = save_result(result, output_filename)
        
        if success and os.path.exists(output_filename):
            size_kb = os.path.getsize(output_filename) / 1024
            size_mb = size_kb / 1024
            
            print(f"\n{'='*70}")
            print(f"✓ 测试成功!")
            print(f"{'='*70}")
            print(f"\n输出文件: {output_filename}")
            
            if size_mb >= 1:
                print(f"文件大小: {size_mb:.2f} MB")
            else:
                print(f"文件大小: {size_kb:.1f} KB")
            
            print(f"\n下一步:")
            print(f"  1. 用播放器打开 {output_filename} 检查音质")
            print(f"  2. 如果满意，运行 batch_generate_audio.py 批量生成所有120+个音频")
            print(f"  3. 如需调整参数，编辑 batch_generate_audio.py 的 DEFAULT_GENERATE_PARAMS")
            
            return True
            
        else:
            print("\n✗ 无法保存生成的音频")
            return False
        
    except Exception as e:
        print(f"\n✗ 生成失败!")
        error_type = type(e).__name__
        error_msg = str(e)
        
        print(f"\n错误详情:")
        print(f"  类型: {error_type}")
        print(f"  信息: {error_msg[:300]}")
        
        # 给出常见错误的建议
        lower_msg = error_msg.lower()
        if 'timeout' in lower_msg:
            print("\n建议:")
            print("  - 增加超时时间或检查网络连接")
            print("  - 服务器可能负载较高，稍后重试")
        elif 'connection' in lower_msg or 'refused' in lower_msg:
            print("\n建议:")
            print("  - 检查API地址是否正确: http://106.75.213.91:7860/")
            print("  - 检查网络连接和防火墙设置")
        elif '404' in lower_msg or 'not found' in lower_msg:
            print("\n建议:")
            print("  - API端点可能已更改")
            print("  - 运行 test_api.py 查看可用端点列表")
        elif 'parameter' in lower_msg.lower() or 'invalid' in lower_msg:
            print("\n建议:")
            print("  - 参数格式可能不正确")
            print("  - 查看api_output.txt中的完整参数定义")
        
        return False


def save_result(result, output_path):
    """保存API结果到文件"""
    
    try:
        # 尝试不同的方式处理返回结果
        source_paths_to_try = []
        
        if isinstance(result, str):
            source_paths_to_try.append(result.strip())
        elif hasattr(result, '__str__'):
            source_paths_to_try.append(str(result).strip())
        
        if hasattr(result, 'path'):
            source_paths_to_try.append(result.path)
        if hasattr(result, 'url'):
            url = getattr(result, 'url', '')
            if url and not url.startswith('http'):
                source_paths_to_try.append(url.lstrip('/'))
        
        # 尝试每个可能的路径
        for path_candidate in source_paths_to_try:
            if path_candidate and os.path.exists(path_candidate):
                shutil.copy2(path_candidate, output_path)
                print(f"  ✓ 文件已从源路径复制")
                return True
        
        # 如果都不存在，可能是临时文件或需要特殊处理
        print(f"  ⚠ 未找到可访问的源文件")
        print(f"  尝试过的路径:")
        for p in source_paths_to_try[:5]:
            if p:
                print(f"    - {p[:80]}")
        
        return False
        
    except Exception as e:
        print(f"  ✗ 保存过程出错: {str(e)[:100]}")
        return False


if __name__ == "__main__":
    print("开始测试...\n")
    success = test_generate()
    
    print(f"\n{'='*70}")
    if success:
        print("状态: ✓ 通过")
        print("\n准备就绪！可以开始批量生成了。")
    else:
        print("状态: ✗ 失败")
        print("\n请根据上面的错误信息进行排查。")
    print(f"{'='*70}\n")
