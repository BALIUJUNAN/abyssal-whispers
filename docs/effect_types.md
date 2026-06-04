# Effect Types Reference

## Legacy Format (events.effects)

| Key | Type | Description |
|-----|------|-------------|
| `HP` | number | HP delta (+/-) |
| `san` | number | SAN delta (+/-) |
| `food` | number | Food delta |
| `mythos` | number | Mythos level delta |
| `humanity` | number | Humanity score delta |
| `items` | string[] | Item names/ids to add (DEPRECATED: use add_item) |
| `add_item` | object | `{ item_id, name, uses }` |
| `add_flag` | string\|string[] | Flag id(s) to set |
| `add_clue` | string\|object | Clue id or `{ id, name }` |
| `npc_trust` | object | `{ "npc_id": delta }` |
| `safehouseCorruption` | number | Corruption delta |
| `add_run_memory` | object | `{ text, type }` |
| `_meta_effect` | string | Meta event type |

## Structured Format (applyEffects)

| type | Fields | Description |
|------|--------|-------------|
| `modify_stat` | target, amount, amount_dice | Modify HP/SAN/stat |
| `modify_resource` | resource, amount | Modify food/light |
| `add_item` | item_id, name, uses | Add item to inventory |
| `remove_item` | item_id, amount | Remove item |
| `add_flag` | flag_id | Set a flag |

## Post-Reducer Effects (c.effects.push)

| type | Fields | Description |
|------|--------|-------------|
| `AUDIO_PLAY` | id | Play sound effect |
| `AUDIO_SKILL` | id | Play skill check sound |
| `AUDIO_AMBIENT` | area, phase | Switch ambient audio |
| `AUDIO_SAN_LOSS` | amount | Play SAN loss sound |
| `AUDIO_UI` | id | Play UI sound |
| `AUDIO_SET_MUTED` | muted | Set mute state |
| `AUDIO_SUDDEN_MUTED` | value | Set sudden mute |
| `INCREMENT_STAT` | key | Increment achievement stat |
| `SAVE_GAME` | state | Save game state |
| `NARRATE_DELAYED` | delay, text, extra, narrType | Delayed narrative entry |

## Rules

- Reducer 内只用 `c.effects.push()` 声明副作用，不直接调用 audioManager
- Reducer 内不调用 `Date.now()` 或 `Math.random()`
- 所有 effect type 必须在 `EFFECT_HANDLERS` 中注册
- 新增 effect type 需同步更新 `effectExecutor.js` + 测试
