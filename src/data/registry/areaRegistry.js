// src/data/registry/areaRegistry.cjs — Area identity registry
// Areas already use stable IDs (town_center, harbor_district, etc.)
// This registry adds display names and aliases for completeness.

export var AREA_REGISTRY = {
  town_center: { name: '沃切斯特镇中心', aliases: ['镇中心', '广场'] },
  harbor_district: { name: '沃切斯特码头', aliases: ['码头', '港口', '码头区'] },
  whispering_forest: { name: '低语森林', aliases: ['森林'] },
  voxchester_manor: { name: '莫里斯庄园', aliases: ['庄园', '莫里斯庄园'] },
  catacombs_entrance: { name: '地下墓穴入口', aliases: ['墓穴入口', '地下墓穴'] },
  deep_catacombs: { name: '墓穴深层', aliases: ['深层墓穴'] },
  lighthouse: { name: '灯塔', aliases: [] },
  ruins_of_yith: { name: '伊斯遗迹', aliases: ['海底遗迹', '伊斯'] },
  forbidden_grove: { name: '禁忌树林', aliases: ['石碑区'] },
};

export var AREA_NAME_TO_ID = {};
(function () {
  for (var id in AREA_REGISTRY) {
    var entry = AREA_REGISTRY[id];
    AREA_NAME_TO_ID[entry.name] = id;
    for (var i = 0; i < (entry.aliases || []).length; i++) {
      AREA_NAME_TO_ID[entry.aliases[i]] = id;
    }
  }
})();

export function resolveAreaId(input) {
  if (!input) return input;
  if (AREA_REGISTRY[input]) return input;
  return AREA_NAME_TO_ID[input] || input;
}

export function getAreaName(id) {
  var entry = AREA_REGISTRY[id];
  return entry ? entry.name : id;
}
