"""
保存完整API信息到文件
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from gradio_client import Client

API_URL = "http://106.75.213.91:7860/"

print("正在获取API信息...")

client = Client(API_URL)
api_text = client.view_api(all_endpoints=True)

# 保存到文件
output_file = "api_endpoints_full.txt"
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(api_text)

print(f"✓ 已保存到: {output_file}")
print(f"\n文件大小: {len(api_text)} 字符")

# 同时在控制台显示关键部分（查找prompt和audio）
lines = api_text.split('\n')
in_audio_endpoint = False
endpoint_lines = []

for i, line in enumerate(lines):
    # 查找包含prompt参数的端点
    if '[Textbox] prompt:' in line or 'prompt: str' in line.lower():
        print(f"\n在第 {i+1} 行发现 prompt 参数!")
        # 回溯找到端点名称
        for j in range(max(0, i-5), i):
            if 'api_name="' in lines[j]:
                import re
                match = re.search(r'api_name="([^"]+)"', lines[j])
                if match:
                    endpoint_name = match.group(1)
                    print(f"  端点名称: {endpoint_name}")
                    
                    # 收集这个端点的信息
                    endpoint_lines.append(f"\n{'='*70}\n")
                    endpoint_lines.append(f"音频生成端点: {endpoint_name}\n")
                    endpoint_lines.append(f"{'='*70}\n")
                    
                    for k in range(j, min(len(lines), i+50)):
                        endpoint_lines.append(lines[k] + '\n')
                        
                        if 'Returns:' in lines[k]:
                            # 继续收集返回值部分
                            for l in range(k+1, min(len(lines), k+10)):
                                if '- [' not in lines[l] and lines[l].strip() != '':
                                    break
                                endpoint_lines.append(lines[l] + '\n')
                            break
                    
                    break
    
    # 查找包含audio返回值的端点
    if '[Audio]' in line and 'filepath' in line.lower():
        print(f"\n在第 {i+1} 行发现 Audio 返回值!")

if endpoint_lines:
    audio_endpoint_file = "audio_endpoint_details.txt"
    with open(audio_endpoint_file, 'w', encoding='utf-8') as f:
        f.writelines(endpoint_lines)
    
    print(f"\n✓ 音频端点详细信息已保存到: {audio_endpoint_file}")

print("\n完成!")
