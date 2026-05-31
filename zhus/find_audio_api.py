"""
查找音频生成API端点
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from gradio_client import Client
from datetime import datetime

API_URL = "http://106.75.213.91:7860/"

def find_audio_endpoint():
    print("=" * 70)
    print("查找音频生成端点")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    try:
        client = Client(API_URL)
        print(f"\n✓ 连接成功\n")
        
        # 获取API信息（使用正确的方式）
        api_info = client.view_api(all_endpoints=True)
        
        print("发现的所有命名端点:\n")
        
        audio_candidates = []
        
        if isinstance(api_info, str):
            # 如果是字符串，打印并分析
            lines = api_info.split('\n')
            for i, line in enumerate(lines):
                print(line)
                
                # 查找包含音频相关关键词的行
                lower_line = line.lower()
                if any(kw in lower_line for kw in ['audio', 'prompt', 'predict']):
                    if 'api_name' in line or '->' in line:
                        audio_candidates.append(line.strip())
                        print("  ^^^ 可能是音频端点!")
                        
        elif isinstance(api_info, dict):
            # 如果是字典
            for ep_name, ep_data in api_info.items():
                print(f"\n{ep_name}:")
                if isinstance(ep_data, dict):
                    for key, value in ep_data.items():
                        print(f"  {key}: {value}")
                else:
                    print(f"  {ep_data}")
        
        # 总结候选端点
        if audio_candidates:
            print("\n\n" + "=" * 70)
            print("可能的音频生成端点:")
            print("=" * 70)
            for candidate in audio_candidates:
                print(f"  • {candidate}")
            
        return audio_candidates
        
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()
        return []


if __name__ == "__main__":
    candidates = find_audio_endpoint()
    
    print("\n\n提示:")
    print("- 查看上面的输出，找到接受 'prompt' 参数且返回 'audio' 的端点")
    print("- 然后更新 batch_generate_audio.py 中的 GENERATE_API_NAME 变量")
