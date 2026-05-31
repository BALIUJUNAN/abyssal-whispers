"""
单个音频生成测试
测试 /predict_1 端点是否正常工作
"""

import sys
import io
# 修复Windows中文编码问题
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from gradio_client import Client
import os

# API 配置
API_URL = "http://106.75.213.91:7860/"
GENERATE_API_NAME = "/predict_1"

def test_single_audio():
    """测试生成单个音频"""
    
    print("=" * 70)
    print("单音频生成测试")
    print("=" * 70)
    
    # 测试提示词（从音频.txt中取一个）
    test_prompt = """Seamless harbor night ambience.
Foggy 1920s coastal harbor at midnight, distant foghorn, wet wood creaking, water lapping against stone.
No music, no monster, atmospheric only. 60 seconds loop."""
    
    print(f"\n[1] 连接API...")
    try:
        client = Client(API_URL)
        print("✓ 连接成功!")
    except Exception as e:
        print(f"✗ 连接失败: {e}")
        return False
    
    print(f"\n[2] 准备生成音频...")
    print(f"提示词预览:")
    for line in test_prompt.split('\n')[:3]:
        print(f"  {line}")
    print(f"  ...")
    
    # 负向提示词
    negative_prompt = "No vocals, no lyrics, no jump scare scream, no modern EDM, no heroic orchestra"
    
    print(f"\n[3] 调用生成API ({GENERATE_API_NAME})...")
    print("这可能需要几秒到几十秒时间...")
    
    try:
        result = client.predict(
            prompt=test_prompt,
            negative_prompt=negative_prompt,
            audio_input_file=None,
            init_audio_type=None,
            inversion_steps=100,
            inversion_gamma=0,
            inversion_unconditional=False,
            duration_padding_sec=6.0,  # 适当延长时长
            api_name=GENERATE_API_NAME
        )
        
        print(f"\n✓ 调用成功!")
        
        # 处理返回结果
        if result is None:
            print("⚠ 返回值为None")
            return False
        
        print(f"\n返回结果类型: {type(result)}")
        print(f"返回值: {result}")
        
        # 尝试保存文件
        output_path = "test_harbor_ambient.mp3"
        
        if isinstance(result, str) and os.path.exists(result):
            import shutil
            shutil.copy2(result, output_path)
            size_kb = os.path.getsize(output_path) / 1024
            print(f"\n✓ 音频已保存到: {output_path}")
            print(f"  文件大小: {size_kb:.1f} KB")
            return True
            
        elif hasattr(result, '__str__'):
            path_str = str(result)
            print(f"\n尝试路径: {path_str}")
            
            # 可能是相对路径或URL
            possible_paths = [
                path_str,
                os.path.join(os.getcwd(), path_str),
                os.path.join(os.path.dirname(__file__), path_str),
            ]
            
            for p in possible_paths:
                if os.path.exists(p):
                    import shutil
                    shutil.copy2(p, output_path)
                    size_kb = os.path.getsize(output_path) / 1024
                    print(f"✓ 音频已保存到: {output_path}")
                    print(f"  文件大小: {size_kb:.1f} KB")
                    return True
            
            # 如果都不存在，可能需要其他方式处理
            print(f"⚠ 返回的路径无法直接访问: {path_str}")
            print(f"这可能是临时文件、URL或其他格式")
            print(f"\n返回值的详细信息:")
            if hasattr(result, '__dict__'):
                print(f"  属性: {list(result.__dict__.keys())}")
            return False
        
        else:
            print(f"\n⚠ 无法识别返回格式: {type(result)}")
            print(f"原始值: {result}")
            return False
            
    except Exception as e:
        print(f"\n✗ 生成失败!")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)[:200]}")
        
        if "timeout" in str(e).lower():
            print("\n提示: API响应超时，可能是网络问题或服务器负载过高")
        elif "connection" in str(e).lower():
            print("\n提示: 连接失败，请检查网络和API地址")
        
        return False


if __name__ == "__main__":
    success = test_single_audio()
    
    print("\n" + "=" * 70)
    if success:
        print("✓ 单个音频生成测试通过！")
        print("\n现在可以运行 batch_generate_audio.py 批量生成所有120+个音频")
    else:
        print("✗ 测试失败，请检查错误信息并调整参数")
        print("\n常见问题:")
        print("  1. 检查API地址是否正确: http://106.75.213.91:7860/")
        print("  2. 检查网络连接")
        print("  3. 查看API文档确认参数格式")
    print("=" * 70)
