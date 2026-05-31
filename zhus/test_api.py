"""
API 测试脚本 - 验证 Gradio API 连接和基本功能

使用方法:
python test_api.py
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
API_NAME = "/update_dist_shift_state_4"

def test_connection():
    """测试 API 连接"""
    
    print("=" * 60)
    print("Gradio API 连接测试")
    print("=" * 60)
    
    try:
        print(f"\n[1] 正在连接: {API_URL}")
        client = Client(API_URL)
        print("✓ 连接成功!")
        
        # 查看可用的API端点
        print(f"\n[2] 查看可用API端点...")
        try:
            endpoints = client.view_api(all_endpoints=True)
            if endpoints:
                print(f"找到 {len(endpoints)} 个端点:")
                for ep in endpoints[:10]:  # 只显示前10个
                    print(f"  - {ep}")
                if len(endpoints) > 10:
                    print(f"  ... 还有 {len(endpoints) - 10} 个")
            else:
                print("未找到端点信息")
        except Exception as e:
            print(f"无法获取端点列表: {e}")
        
        # 测试调用指定端点
        print(f"\n[3] 测试调用: {API_NAME}")
        print("使用默认参数...")
        
        result = client.predict(
            shift_type="LogSNR",
            param_1=2000,
            param_2=-6.2,
            param_3=0,
            param_4=2,
            param_5=256,
            param_6=4096,
            param_7=6.93,
            param_8=6.93,
            param_9=0.5,
            param_10=1.15,
            param_11=256,
            param_12=4096,
            api_name=API_NAME
        )
        
        print(f"\n✓ 调用成功!")
        print(f"\n返回结果类型: {type(result)}")
        print(f"\n返回内容:")
        
        # 尝试显示返回值
        if isinstance(result, (list, tuple)):
            print(f"  列表长度: {len(result)}")
            for i, item in enumerate(result[:3]):  # 显示前3项
                print(f"  [{i}] 类型={type(item).__name__}, 值={str(item)[:100]}")
            if len(result) > 3:
                print(f"  ... 还有 {len(result)-3} 项")
        elif hasattr(result, '__dict__'):
            print(f"  对象属性: {list(result.__dict__.keys())[:5]}")
        else:
            print(f"  值: {str(result)[:200]}")
        
        # 如果返回的是文件，尝试保存
        if isinstance(result, str) and os.path.exists(result):
            print(f"\n检测到文件路径: {result}")
            output_file = "test_output.mp3"
            import shutil
            shutil.copy2(result, output_file)
            print(f"✓ 已保存到: {output_file}")
            size_kb = os.path.getsize(output_file) / 1024
            print(f"  文件大小: {size_kb:.1f} KB")
            
        elif hasattr(result, 'read'):
            # 文件对象
            output_file = "test_output.mp3"
            with open(output_file, 'wb') as f:
                f.write(result.read())
            print(f"✓ 已保存到: {output_file}")
            size_kb = os.path.getsize(output_file) / 1024
            print(f"  文件大小: {size_kb:.1f} KB")
            
        return True
        
    except Exception as e:
        print(f"\n✗ 错误: {e}")
        print("\n可能的原因:")
        print("  1. API服务未启动或地址错误")
        print("  2. 网络连接问题")
        print("  3. 参数格式不正确")
        print("  4. 需要安装依赖: pip install gradio_client")
        return False


def show_usage_example():
    """显示使用示例"""
    
    print("\n" + "=" * 60)
    print("使用示例")
    print("=" * 60)
    
    example_code = '''
# 基本用法
from gradio_client import Client

client = Client("http://106.75.213.91:7860/")

result = client.predict(
    shift_type="LogSNR",      # 采样调度偏移类型
    param_1=2000,             # 锚点长度
    param_2=-6.2,             # 锚点 log-SNR
    param_3=0,                # 速率
    param_4=2,                # log-SNR 结束值
    param_5=256,              # 最小序列长度
    param_6=4096,             # 最大序列长度
    param_7=6.93,             # Alpha 最小值
    param_8=6.93,             # Alpha 最大值
    param_9=0.5,              # 基础偏移
    param_10=1.15,            # 最大偏移
    param_11=256,             # 最小长度
    param_12=4096,            # 最大长度
    api_name="/update_dist_shift_state_4"
)

print("生成完成:", result)
'''
    
    print(example_code)


if __name__ == "__main__":
    success = test_connection()
    
    if success:
        show_usage_example()
        print("\n✓ API 测试通过！可以运行 batch_generate_audio.py 批量生成音频")
    else:
        print("\n✗ API 测试失败，请检查配置后重试")
