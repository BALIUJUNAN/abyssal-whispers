// src/data/registry/npcRegistry.js — NPC identity registry
// Phase B: uses createRegistryHelpers for shared logic.

export var NPC_REGISTRY = {
  elias_ward:       { name: '伊莱亚斯·沃德',       aliases: ['伊莱亚斯', '沃德'],           portrait: { normal: '伊莱亚斯·沃德 正常.webp',       corrupted: '伊莱亚斯·沃德 污染.webp' } },
  martha_grey:      { name: '玛莎·格雷',            aliases: ['玛莎', '酒馆老板'],            portrait: { normal: '玛莎·格雷 正常.webp',            corrupted: '玛莎·格雷 污染.webp' } },
  joshua_black:     { name: '约书亚·布莱克',        aliases: ['约书亚'],                      portrait: { normal: '约书亚·布莱克 正常.webp',        corrupted: '约书亚·布莱克 污染.webp' } },
  hilda_morris:     { name: '希尔达·莫里斯',        aliases: ['希尔达', '莫里斯'],            portrait: { normal: '希尔达·莫里斯 正常.webp',        corrupted: '希尔达·莫里斯 污染.webp', redeemed: '希尔达 救赎.webp' } },
  tommy_chen:       { name: '汤米·陈',              aliases: ['汤米'],                        portrait: { normal: '汤米·陈 正常.webp',              corrupted: '汤米·陈 污染.webp' } },
  isabella_weber:   { name: '伊莎贝拉·韦伯',        aliases: ['伊莎贝拉', '修女'],            portrait: { normal: '伊莎贝拉·韦伯 正常.webp',        corrupted: '伊莎贝拉·韦伯 污染.webp' } },
  old_fisher:       { name: '老费舍',               aliases: ['费舍', '渔夫'],                portrait: { normal: '老费舍 正常.webp',               corrupted: '老费舍 污染.webp', redeemed: '老费舍 救赎.webp' } },
  edgar_lovecraft:  { name: '埃德加·洛夫克拉夫特',  aliases: ['埃德加', '洛夫克拉夫特'],      portrait: { normal: '埃德加·洛夫克拉夫特 正常.webp',  corrupted: '埃德加·洛夫克拉夫特 污染.webp' } },
};

// Create helpers via registryUtils (if available)
var _h = typeof createRegistryHelpers === 'function' ? createRegistryHelpers(NPC_REGISTRY) : null;

export var NPC_NAME_TO_ID = _h ? _h.nameToId : (function(){var m={};for(var id in NPC_REGISTRY){var e=NPC_REGISTRY[id];m[e.name]=id;(e.aliases||[]).forEach(function(a){m[a]=id;});}return m;})();

export function resolveNpcId(input) { return _h ? _h.resolveId(input) : (NPC_REGISTRY[input] ? input : (NPC_NAME_TO_ID[input] || input)); }
export function getNpcName(input)   { return _h ? _h.getName(input) : ((NPC_REGISTRY[input] && NPC_REGISTRY[input].name) || input); }
export function migrateNpcKeys(obj) { return _h ? _h.migrateKeys(obj) : obj; }

try { module.exports = { NPC_REGISTRY, NPC_NAME_TO_ID, resolveNpcId, getNpcName, migrateNpcKeys }; } catch(e) {}
