// src/data/registry/itemRegistry.js
export var ITEM_REGISTRY = {
  flashlight: { name: '手电筒', aliases: [], type: 'light', stackable: false },
  notebook: { name: '笔记本和笔', aliases: ['笔记本'], type: 'tool', stackable: false },
  first_aid_kit: { name: '急救包', aliases: ['急救'], type: 'healing', stackable: true },
  pocket_watch: { name: '怀表', aliases: [], type: 'tool', stackable: false },
  dry_ration: { name: '干粮', aliases: ['压缩饼干'], type: 'food', stackable: true },
  canned_food: { name: '罐头', aliases: [], type: 'food', stackable: true },
  holy_water: { name: '圣水', aliases: [], type: 'ritual', stackable: true },
  moonlight_incense: { name: '月光熏香', aliases: [], type: 'ritual', stackable: true },
  warehouse_key: { name: '仓库钥匙碎片', aliases: ['仓库钥匙'], type: 'key', stackable: false },
  dark_door_key: { name: '暗门钥匙', aliases: [], type: 'key', stackable: false },
  chain_key_clue: { name: '铁链钥匙线索', aliases: [], type: 'key', stackable: false },
  silver_dagger: { name: '银质匕首', aliases: ['银匕首'], type: 'weapon', stackable: false },
  bronze_mirror: { name: '螺旋铜镜', aliases: [], type: 'clue', stackable: false },
  seal_crystal: { name: '封印水晶', aliases: [], type: 'key', stackable: false },
  elder_sign_copy: {
    name: '旧印拓片（关键道具：可在封印仪式中使用）',
    aliases: ['旧印'],
    type: 'key',
    stackable: false,
  },
};

export var CLUE_ITEMS = [
  '潮汐时刻表',
  '粘液样本',
  '深海之鳞',
  '溺亡者的手镯',
  '失踪者名单副本',
  '扭曲的圣经页',
  '疯乞丐的涂鸦（暗含地图线索）',
  '夜魔羽毛（黑色，冰冷）',
  '发光蘑菇',
  '湿透的笔记（可阅读）',
  '撕裂的外套',
  '石碑拓片',
  '金属盒子（锁住）',
  '碎纸条',
  '陶瓷碎片（可作为标记物）',
  '银质护身符',
  '暗河水样',
  '河底碎片（未知材质）',
  '壁画临摹（含隐藏通道线索）',
  '食尸鬼秘物',
  '伊斯记忆碎片（可学习）',
  '时间碎片',
  '透镜碎片',
  '腐蚀之血',
  '古树种子',
  '修格斯残留物（未知用途）',
  '封印仪式记录（关键线索）',
  '虚空回响记忆（永久效果：克苏鲁神话+3）',
  '维度碎片',
  '以诺·沃特的日记',
  '海底神殿草图',
  '深海之水',
  '深潜者祭品碎片',
  '克苏鲁之梦记忆',
  '深渊水晶',
  '祭祀记忆碎片',
  '奈亚拉托提普印记',
  '骨之花园记录',
  '石碑拓片碎片',
  '伊斯人残影记忆',
  '机器示意图残片',
  '星图石板',
  '莫里斯家族封印记录',
  '守护符文',
  '可疑商品目录',
];
CLUE_ITEMS.forEach(function (name, i) {
  var id = 'clue_item_' + i;
  if (!ITEM_REGISTRY[id])
    ITEM_REGISTRY[id] = { name: name, aliases: [], type: 'clue', stackable: false };
});

// Create helpers via registryUtils (if available)
var _ih = typeof createRegistryHelpers === 'function' ? createRegistryHelpers(ITEM_REGISTRY) : null;

export var ITEM_NAME_TO_ID = _ih ? _ih.nameToId : {};
(function () {
  if (!_ih) {
    for (var id in ITEM_REGISTRY) {
      var e = ITEM_REGISTRY[id];
      ITEM_NAME_TO_ID[e.name] = id;
      for (var i = 0; i < (e.aliases || []).length; i++) ITEM_NAME_TO_ID[e.aliases[i]] = id;
    }
  }
})();

export function resolveItemId(input) {
  return _ih
    ? _ih.resolveId(input)
    : ITEM_REGISTRY[input]
      ? input
      : ITEM_NAME_TO_ID[input] || input;
}
export function getItemName(input) {
  return _ih ? _ih.getName(input) : (ITEM_REGISTRY[input] && ITEM_REGISTRY[input].name) || input;
}
export function normalizeItemRef(input) {
  if (typeof input === 'string') {
    var id = resolveItemId(input);
    return { id: id, name: getItemName(id) };
  }
  if (input && typeof input === 'object') {
    var rawId = input.id || input.item_id || input.item || input.name;
    var rid = resolveItemId(rawId);
    return { id: rid, name: getItemName(rid), uses: input.uses, amount: input.amount };
  }
  return input;
}
export function migrateInventory(inv) {
  return _ih
    ? _ih.migrateArray(inv, 'name')
    : Array.isArray(inv)
      ? inv.map(function (item) {
          if (typeof item === 'string') return resolveItemId(item);
          if (item && typeof item === 'object') {
            var rid = resolveItemId(item.id || item.name);
            return Object.assign({}, item, { id: rid, name: getItemName(rid) });
          }
          return item;
        })
      : inv;
}
export function addItem(s, itemInput, count) {
  var ref = normalizeItemRef(itemInput);
  if (!ref || !ref.id) return;
  var ex = s.inventory.find(function (i) {
    return i.id === ref.id;
  });
  if (ex && ex.uses > 0) {
    ex.uses += count || 1;
  } else {
    s.inventory.push({ id: ref.id, name: ref.name, uses: count || 1 });
  }
}
export function removeItem(s, itemInput, count) {
  var ref = normalizeItemRef(itemInput);
  if (!ref || !ref.id) return;
  var idx = s.inventory.findIndex(function (i) {
    return i.id === ref.id || i.name === ref.id;
  });
  if (idx < 0) return;
  if (count && s.inventory[idx].uses > 0) {
    s.inventory[idx].uses -= count;
    if (s.inventory[idx].uses <= 0) s.inventory.splice(idx, 1);
  } else {
    s.inventory.splice(idx, 1);
  }
}
export function hasItem(s, itemInput) {
  var ref = normalizeItemRef(itemInput);
  if (!ref || !ref.id) return false;
  return s.inventory.some(function (i) {
    return i.id === ref.id || i.name === ref.id;
  });
}
export function getItemCount(s, itemInput) {
  var ref = normalizeItemRef(itemInput);
  if (!ref || !ref.id) return 0;
  var item = s.inventory.find(function (i) {
    return i.id === ref.id || i.name === ref.id;
  });
  return item ? item.uses || 1 : 0;
}
try {
  module.exports = {
    ITEM_REGISTRY,
    ITEM_NAME_TO_ID,
    resolveItemId,
    getItemName,
    normalizeItemRef,
    migrateInventory,
    addItem,
    removeItem,
    hasItem,
    getItemCount,
  };
} catch (e) {}
