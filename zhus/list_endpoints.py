"""
列出所有可用的Gradio API端点
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from gradio_client import Client

API_URL = "http://106.75.213.91:7860/"

def list_all_endpoints():
    print("=" * 70)
    print("Gradio API 端点列表")
    print("=" * 70)
    
    try:
        client = Client(API_URL)
        print(f"\n✓ 连接成功: {API_URL}")
        
        # 获取所有端点信息
        endpoints_info = client.view_api(all_endpoints=True, return_type="info")
        
        # 查找包含"predict"或音频相关关键词的端点
        audio_related_keywords = ['audio', 'sound', 'generate', 'prompt', 'text']
        relevant_endpoints = []
        
        print("\n[所有命名端点]")
        print("-" * 70)
        
        for i, ep_name in enumerate(endpoints_info.keys()):
            ep_data = endpoints_info[ep_name]
            
            # 显示每个端点的简要信息
            title = ep_data.get('title', 'N/A')
            description = ep_data.get('description', '')[:50]
            
            print(f"\n[{i+1}] {ep_name}")
            print(f"    标题: {title}")
            if description:
                print(f"    描述: {description}...")
            
            # 查看参数
            parameters = ep_data.get('parameters', [])
            if parameters:
                print(f"    参数 ({len(parameters)}个):")
                for param in parameters[:5]:  # 只显示前5个参数
                    param_name = param.get('name', '?')
                    param_type = param.get('type', '?')
                    param_default = param.get('default', '')
                    if param_default != '':
                        print(f"      - {param_name}: {param_type} (默认值: {param_default})")
                    else:
                        print(f"      - {param_name}: {param_type}")
                if len(parameters) > 5:
                    print(f"      ... 还有 {len(parameters)-5} 个参数")
                
                # 特别标记有prompt参数的端点
                has_prompt = any(p.get('name') == 'prompt' or p.get('name') == '正向提示词' for p in parameters)
                returns_audio = any('audio' in str(p).lower() for p in parameters if isinstance(p, dict))
                
                if has_prompt or returns_audio:
                    print(f"    ★ 可能是音频生成端点!")
                    relevant_endpoints.append({
                        'name': ep_name,
                        'data': ep_data
                    })
            
            # 查看返回值
            returns = ep_data.get('returns', [])
            if returns:
                print(f"    返回值 ({len(returns)}个):")
                for ret in returns[:3]:
                    ret_name = ret.get('name', '?')
                    ret_type = ret.get('type', '?')
                    print(f"      - {ret_name}: {ret_type}")
        
        # 总结可能的音频生成端点
        if relevant_endpoints:
            print("\n\n" + "=" * 70)
            print("推荐的音频生成端点:")
            print("=" * 70)
            
            for ep in relevant_endpoints:
                print(f"\n  • {ep['name']}")
                params = [p['name'] for p in ep['data'].get('parameters', [])]
                print(f"    参数: {', '.join(params[:8])}")
                returns = [r['type'] for r in ep['data'].get('returns', [])]
                print(f"    返回: {returns}")
        
        return relevant_endpoints
        
    except Exception as e:
        print(f"\n✗ 错误: {e}")
        import traceback
        traceback.print_exc()
        return []


if __name__ == "__main__":
    relevant = list_all_endpoints()
    
    if relevant:
        print("\n\n下一步:")
        print("1. 选择一个合适的音频生成端点")
        print("2. 更新脚本中的 API_NAME 变量")
        print("3. 根据端点参数调整调用代码")
