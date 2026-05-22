// src/reducers/itemReducer.js - Item usage logic (data-driven)

import { applyEffects } from './effectReducer.js';

export function getItemDef(itemId, ctx) {
  const { GD } = ctx;
  const items = GD.items || [];
  return items.find(i => i.id === itemId);
}

export function useItemByDef(state, item, narr, ctx) {
  const def = getItemDef(item.id, ctx);
  if (!def) return false;

  if (def.use_text_ref === 'clue_count') {
    narr('system', '你翻看笔记本，记录了' + state.clues.length + '条线索。');
    return false;
  }
  if (def.use_text_ref === 'show_day') {
    narr('system', '指针不规则地转动——有时倒转。现在是第' + state.day + '天。');
    return false;
  }

  if (def.effects && def.effects.length > 0) {
    applyEffects(state, def.effects, { source: 'item_use', item_id: item.id });
    const effectDesc = def.effects.map(e => {
      if (e.type === 'modify_stat') return `${e.target} ${e.amount > 0 ? '+' : ''}${e.amount}`;
      if (e.type === 'modify_resource') return `${e.resource} ${e.amount > 0 ? '+' : ''}${e.amount}`;
      if (e.type === 'add_item') return `获得 ${e.name || e.item_id}`;
      if (e.type === 'add_clue') return `获得线索`;
      if (e.type === 'add_flag') return `标记 ${e.flag_id}`;
      return e.type;
    }).join(', ');
    narr('system', '使用 ' + item.name + '，' + effectDesc);
  } else if (def.use_text) {
    narr('system', def.use_text);
  }

  return !!def.consume_on_use;
}
