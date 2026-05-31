"""
精确提取音频生成端点的完整信息
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from gradio_client import Client

API_URL = "http://106.75.213.91:7860/"

def extract_audio_endpoint():
    print("正在分析所有API端点...\n")
    
    client = Client(API_URL)
    
    # 获取API信息
    api_text = client.view_api(all_endpoints=True)
    
    lines = api_text.split('\n')
    
    current_endpoint = None
    in_params = False
    in_returns = False
    audio_endpoints = []
    temp_data = {}
    
    for line in lines:
        stripped = line.strip()
        
        # 检测新端点
        if 'predict(api_name="' in stripped:
            # 保存上一个端点的信息
            if current_endpoint and 'prompt' in temp_data.get('params_lower', []):
                audio_endpoints.append({
                    'name': current_endpoint,
                    **temp_data
                })
            
            # 提取新的端点名称
            import re
            match = re.search(r'api_name="([^"]+)"', stripped)
            if match:
                current_endpoint = match.group(1)
                temp_data = {
                    'title': '',
                    'params': [],
                    'params_lower': [],
                    'returns': []
                }
                
                # 提取标题
                if '->' in stripped:
                    title_part = stripped.split('->')[1].strip()
                    temp_data['title'] = title_part
            
            in_params = False
            in_returns = False
            
        elif 'Parameters:' in stripped:
            in_params = True
            in_returns = False
            
        elif 'Returns:' in stripped:
            in_returns = True
            in_params = False
            
        elif in_params and '- [' in stripped:
            param_match = stripped[stripped.find('- [')+3:]
            if ':' in param_match:
                param_info = param_match.split(':', 1)
                if len(param_info) >= 2:
                    param_type = param_info[0].strip().strip('[]')
                    param_name = param_info[1].split('(')[0].strip()
                    
                    temp_data['params'].append(f"{param_name}: {param_type}")
                    temp_data['params_lower'].append(param_name.lower())
                    
        elif in_returns and '- [' in stripped:
            return_match = stripped[stripped.find('- [')+3:]
            if ':' in return_match:
                ret_info = return_match.split(':', 1)
                if len(ret_info) >= 2:
                    ret_type = ret_info[0].strip().strip('[]')
                    ret_name = ret_info[1].split('(')[0].strip()
                    temp_data['returns'].append(f"{ret_name}: {ret_type}")
    
    # 不要忘记最后一个端点
    if current_endpoint and 'prompt' in temp_data.get('params_lower', []):
        audio_endpoints.append({
            'name': current_endpoint,
            **temp_data
        })
    
    # 显示结果
    print("=" * 70)
    print(f"找到 {len(audio_endpoints)} 个可能的音频生成端点:\n")
    
    for i, ep in enumerate(audio_endpoints, 1):
        print(f"[{i}] 端点名称: {ep['name']}")
        print(f"    标题: {ep.get('title', 'N/A')}")
        
        print(f"    参数 ({len(ep['params'])}个):")
        for p in ep['params'][:8]:
            print(f"      • {p}")
        if len(ep['params']) > 8:
            print(f"      ... 还有 {len(ep['params'])-8} 个")
        
        print(f"    返回值 ({len(ep['returns'])}个):")
        for r in ep['returns']:
            print(f"      • {r}")
        
        print()
    
    # 返回最可能的主端点（通常是第一个）
    if audio_endpoints:
        best_match = audio_endpoints[0]
        
        print("=" * 70)
        print("推荐使用的主端点:")
        print(f"  API_NAME = \"{best_match['name']}\"")
        print("=" * 70)
        
        return best_match['name']
    
    return None


if __name__ == "__main__":
    endpoint_name = extract_audio_endpoint()
    
    if endpoint_name:
        print(f"\n✓ 找到音频生成端点: {endpoint_name}")
        print("\n下一步:")
        print("1. 将此端点名称更新到 batch_generate_audio.py")
        print("2. 根据上面的参数信息调整调用代码")
        print("3. 运行测试验证功能")
    else:
        print("\n✗ 未找到合适的音频生成端点")
        print("请检查API是否正确配置")
