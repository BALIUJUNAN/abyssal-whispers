# 批量音频生成工具

## 🎮 项目说明

这是一个为克苏鲁风格文字Roguelite游戏 **"深渊低语：沃克斯彻斯特之影"** 批量生成游戏音频素材的工具。

基于 `音频.txt` 中定义的 **120+ 个音频提示词**，通过 Gradio API 自动生成所有游戏音效。

## 📁 文件结构

```
zhus/
├── 音频.txt                    # 120个音频素材的提示词（已提供）
├── batch_generate_audio.py     # 主批量生成脚本
├── test_api.py                 # API连接测试脚本
├── requirements.txt            # Python依赖
└── generated_audio/            # 输出目录（自动创建）
    ├── ui/                     # UI音效
    ├── amb/                    # 环境循环音效
    │   ├── safehouse/          # 安全屋环境
    │   ├── town/               # 城镇环境
    │   ├── forest/             # 森林环境
    │   └── dungeon/            # 地下城环境
    ├── stinger/                # 剧情音效
    │   ├── atmosphere/         # 氛围音效
    │   ├── time_weather/       # 时间/天气
    │   └── horror/             # 恐怖元素
    ├── san/                    # 低SAN值层
    ├── death/                  # 死亡音效
    ├── ending/                 # 结局音乐
    ├── npc/                    # NPC互动音效
    └── resource/               # 资源反馈音效
```

## 🚀 快速开始

### 第一步：安装依赖

```bash
pip install -r requirements.txt
```

或手动安装：

```bash
pip install gradio_client tqdm
```

### 第二步：测试API连接

**强烈建议先测试API是否可用！**

```bash
python test_api.py
```

这个脚本会：

- 连接到 `http://106.75.213.91:7860/`
- 查看可用的API端点列表
- 测试调用 `/update_dist_shift_state_4` 端点
- 显示返回结果并保存测试文件

如果测试成功，会生成一个 `test_output.mp3` 文件。

### 第三步：批量生成音频

确认API可用后，运行主脚本：

```bash
python batch_generate_audio.py
```

## ⚙️ 配置选项

编辑 `batch_generate_audio.py` 顶部的配置区：

### API配置

```python
API_URL = "http://106.75.213.91:7860/"  # API地址
API_NAME = "/update_dist_shift_state_4"   # API端点名称
```

### 默认参数（音频生成参数）

```python
DEFAULT_PARAMS = {
    "shift_type": "LogSNR",  # 调度类型: 'LogSNR', 'Flux', 'Full', 'None'
    "param_1": 2000,          # 锚点长度 (1-4096)
    "param_2": -6.2,          # 锚点 log-SNR (-20 to -3)
    "param_3": 0,             # 速率 (0-10)
    "param_4": 2,             # log-SNR 结束值
    "param_5": 256,           # 最小序列长度
    "param_6": 4096,          # 最大序列长度
    "param_7": 6.93,          # Alpha 最小值
    "param_8": 6.93,          # Alpha 最大值
    "param_9": 0.5,           # 基础偏移
    "param_10": 1.15,         # 最大偏移
    "param_11": 256,          # 最小长度
    "param_12": 4096,         # 最大长度
}
```

### 生成配置

```python
MAX_RETRIES = 3              # 失败重试次数
RETRY_DELAY = 5              # 重试间隔(秒)
REQUEST_DELAY = 2            # 请求间隔(秒)，避免过快被封
GENERATE_VARIANTS = 3        # 每个提示词生成的变体数量 (1-3)
```

## 📊 输出说明

### 目录结构

脚本会根据文件名自动分类到对应目录：

| 类别        | 文件名前缀            | 示例                                |
| ----------- | --------------------- | ----------------------------------- |
| UI音效      | `ui_*`                | `ui_click.mp3`, `ui_open.mp3`       |
| 环境循环    | `amb_*`               | `amb_harbor_night_loop.mp3`         |
| 剧情stinger | `stinger_*`, `seal_*` | `seal_broken_silence_then_boom.mp3` |
| SAN值效果   | `san_*`               | `san_layer_1.mp3`                   |
| 死亡音效    | `death_*`             | `death_drowning.mp3`                |
| 结局        | `ending_*`            | `ending_good_seal.mp3`              |
| NPC互动     | `npc_*`               | `npc_martha_anchor.mp3`             |
| 资源反馈    | `resource_*`          | `resource_food_gain.mp3`            |

### 变体命名

如果设置 `GENERATE_VARIANTS > 1`，会生成多个版本：

```
amb_harbor_night_loop.mp3        # 原始文件名
amb_harbor_night_loop_v01.mp3    # 变体1
amb_harbor_night_loop_v02.mp3    # 变体2
amb_harbor_night_loop_v03.mp3    # 变体3
```

选择最满意的版本后，可以重命名为正式名。

## ✨ 功能特性

### 1. 断点续传

- 已生成的文件会自动跳过
- 可以随时中断和重新运行
- 失败的记录保存在 `failed.txt` 中

### 2. 错误重试机制

- 自动重试失败的请求（默认3次）
- 指数退避策略避免频繁请求

### 3. 进度显示

- 实时显示生成进度
- 显示成功/失败统计
- 完成后展示目录树结构

### 4. 智能分类

- 根据文件名自动归类到合适目录
- 符合游戏的资源管理规范

## 🔍 故障排除

### 常见问题

**Q: 连接超时或失败**

```
✗ API连接失败: Connection timeout
```

解决方案：

1. 检查网络连接
2. 确认API服务正在运行: http://106.75.213.91:7860/
3. 尝试使用VPN或代理（如果是国内访问）

**Q: 返回空结果**
检查API参数是否正确，查看 `test_api.py` 的输出。

**Q: 生成的音频质量不好**
调整 `DEFAULT_PARAMS`：

- 增大 `param_6`（最大序列长度）提高质量
- 调整 `shift_type` 尝试不同调度方式
- 根据具体音频类型微调其他参数

**Q: 部分文件失败**
查看 `generated_audio/failed.txt` 记录，重新运行脚本即可继续生成。

## 📝 提示词格式要求

`音频.txt` 中的每个提示词应遵循此格式：

```
filename.mp3
简短描述（一行）
详细描述（多行）
时长信息（X seconds）

示例：
amb_harbor_night_loop.mp3
Seamless harbor night ambience.
Foggy 1920s coastal harbor at midnight.
Distant foghorn, wet wood creaking, water lapping.
No music, no monster, atmospheric only. 60 seconds loop.
```

## 📈 生成计划建议

按照以下批次顺序生成，优先级从高到低：

### 第一批：核心UI（20个）

- 安全屋环境循环 ×5
- UI交互音效 ×8
- 检定音效 ×4
- 死亡/轮回音效 ×3

### 第二批：区域环境（25个）

- 各场景环境循环 ×12
- 区域事件短音 ×8
- 低SAN层音效 ×5

### 第三批：剧情推进（25个）

- 封印状态音效 ×5
- 章节转场 ×3
- Meta破壁音效 ×3
- NPC腐化/互动 ×14

### 第四批：结局与细节（20-30个）

- 结局音乐 ×5
- 资源反馈 ×7
- 天气/时间 ×5
- 特殊死亡变体 ×3
- 隐藏事件 ×5+

## 🛠️ 自定义修改

### 修改API端点

如果要使用不同的API端点，编辑配置：

```python
# 例如使用 /lambda 端点
API_NAME = "/lambda"
```

注意：不同端点的参数可能不同，需要相应修改调用代码。

### 添加自定义提示词

在 `音频.txt` 末尾添加新条目：

```
custom_sound_effect.mp3
Custom sound description.
Detailed description here.
Duration info.
```

重新运行脚本即可生成。

### 导出为其他格式

如需转换音频格式（如wav→ogg），可在脚本中添加后处理步骤：

```python
import subprocess
# 使用ffmpeg转换
subprocess.run(['ffmpeg', '-i', input_path, output_path])
```

## 📞 技术支持

遇到问题？

1. 先运行 `test_api.py` 排查连接问题
2. 查看 `failed.txt` 了解失败详情
3. 检查控制台输出的详细错误信息

## 📄 许可与版权

- 所有生成的音频均为原创、无版权素材
- 可用于商业游戏开发
- 请遵守负面提示词中的约束条件

---

**祝你的游戏音频制作顺利！🎵**
