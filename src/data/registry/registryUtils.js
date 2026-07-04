// src/data/registry/registryUtils.js — Generic registry helper factory.
// Eliminates duplicated resolve/getName/has/migrate patterns across entity registries.

export function createRegistryHelpers(registry, opts) {
  opts = opts || {};
  var nameToId = {};
  var aliasToId = {};

  for (var id in registry) {
    var def = registry[id];
    if (def.name) nameToId[def.name] = id;
    for (var i = 0; i < (def.aliases || []).length; i++) {
      aliasToId[def.aliases[i]] = id;
    }
  }

  return {
    registry: registry,
    nameToId: nameToId,
    aliasToId: aliasToId,

    resolveId: function (input) {
      if (!input) return input;
      if (registry[input]) return input;
      return nameToId[input] || aliasToId[input] || input;
    },

    getName: function (input) {
      var id = this.resolveId(input);
      return (registry[id] && registry[id].name) || input;
    },

    has: function (input) {
      var id = this.resolveId(input);
      return !!registry[id];
    },

    // Migrate an object's keys from Chinese name/alias to id.
    migrateKeys: function (obj) {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
      var next = {};
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          next[this.resolveId(key)] = obj[key];
        }
      }
      return next;
    },

    // Migrate an array of items (strings or {id/name} objects).
    migrateArray: function (arr, nameField) {
      if (!Array.isArray(arr)) return arr;
      var self = this;
      nameField = nameField || 'name';
      return arr.map(function (item) {
        if (typeof item === 'string') return self.resolveId(item);
        if (item && typeof item === 'object') {
          var raw = item.id || item[nameField];
          var resolved = self.resolveId(raw);
          var copy = {};
          for (var k in item) {
            if (Object.prototype.hasOwnProperty.call(item, k)) copy[k] = item[k];
          }
          copy.id = resolved;
          if (copy[nameField]) copy[nameField] = self.getName(resolved);
          return copy;
        }
        return item;
      });
    },

    // Get all registered ids.
    allIds: function () {
      return Object.keys(registry);
    },

    // Get all registered names.
    allNames: function () {
      var names = [];
      for (var id in registry) names.push(registry[id].name);
      return names;
    },
  };
}
