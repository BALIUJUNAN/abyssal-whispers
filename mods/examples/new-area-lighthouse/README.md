# 新区域：废弃灯塔区

> 扩展游戏地图，新增「废弃灯塔区」区域。8个事件构成完整的区域探索体验。

## 安装

1. 打开游戏，点击 **🧩 模组管理**
2. 导入 `new-area-lighthouse/mod.json`
3. **注意**：此 Mod 需要同时安装「老灯塔看守人」NPC Mod 才能完整体验任务链

## 内容概览

| # | 事件名 | 类型 | 稀有度 |
|---|--------|------|--------|
| 1 | 发现灯塔区入口 | exploration | 普通 |
| 2 | 干涸喷泉的深处 | area_deep | 普通 |
| 3 | 倒塌的钟楼 | area_deep | 普通 |
| 4 | 废弃的灯塔管理所 | area_deep | 普通 |
| 5 | 灯塔区的夜晚 | silent | 普通 |
| 6 | 废弃仓库的物资 | resource_pressure | 普通 |
| 7 | 阴影中的低语 | resource_pressure | 稀有 |
| 8 | 灯塔底部的铭文 | area_deep | 普通 |
| 9 | 十字路口的选择 | area_deep | 稀有 |

## 区域解锁条件

- 需要线索 `clue_lh_green_light`（来自 NPC Mod）
- 或通过事件 [lz_explore_001] 的「深入探索」选项解锁

## 新增线索

- `clue_lz_discovery` — 废弃灯塔区的入口
- `clue_lz_red_light` — 红色灯光的记录
- `clue_lz_fountain_symbols` — 广场喷泉的符号
- `clue_lz_fountain_text` — 喷泉底部的铭文
- `clue_lz_bell_tower` — 倒塌的钟楼
- `clue_lz_bell_countdown` — 钟面的倒计时
- `clue_lz_void_entity` — 钟内虚空中的存在
- `clue_lz_keep_records` — 灯塔管理所的记录
- `clue_lz_keeper_missing` — 看守人失踪记录
- `clue_lz_old_photo` — 一百三十三年前的照片
- `clue_lz_base_inscription` — 灯塔基座的铭文
- `clue_lz_thanks` — 灯塔说谢谢
- `clue_lz_crossroads` — 废弃区的十字路口
- `clue_lz_key_stone` — 灯塔钥匙石
- `clue_lz_door_behind` — 灯塔灯室后面的门
- `clue_lz_well_stars` — 井底的星空
- `clue_lz_white_light` — 白光中的启示

## 设计要点

- **区域扩展**：通过 `unlock_area: "lighthouse_zone"` 解锁新区域
- **多路径探索**：十字路口事件提供 3 条探索路线
- **资源回报**：废弃仓库提供食物和金钱补偿探索风险
- **氛围层次**：silent 类型事件在夜间触发，强化恐怖氛围
- **与 NPC Mod 联动**：多处引用 `clue_lh_*` 系列线索
