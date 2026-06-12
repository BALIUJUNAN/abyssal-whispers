// Reference Validator — entity id uniqueness + cross-reference integrity
function validateReferences(base, ch2plus, meta) {
  var errors = [];
  var warn = function (r, m, c) {
    errors.push({ level: 'warn', rule: r, message: m, context: c });
  };
  var error = function (r, m, c) {
    errors.push({ level: 'error', rule: r, message: m, context: c });
  };

  var events = [].concat(base.events || []).concat((ch2plus || {}).events || []);
  var endings = [].concat(base.endings || []).concat((ch2plus || {}).endings || []);
  var areas = new Set(
    (base.areas || []).map(function (a) {
      return a.id;
    })
  );
  var npcNames = new Set(
    (base.npcs || []).map(function (n) {
      return n.name;
    })
  );
  var eventIds = new Set();
  var endingIds = new Set();

  // E01: event.id uniqueness (per source)
  (function () {
    var baseIds = new Set();
    (base.events || []).forEach(function (e) {
      if (!e.id) {
        error('E01', 'Event missing id');
        return;
      }
      if (baseIds.has(e.id)) error('E01', 'Dup event in base: ' + e.id);
      baseIds.add(e.id);
      eventIds.add(e.id);
    });
    ((ch2plus || {}).events || []).forEach(function (e) {
      if (!e.id) {
        error('E01', 'Event missing id');
        return;
      }
      if (baseIds.has(e.id)) warn('E01', 'Event overlaps base: ' + e.id);
      eventIds.add(e.id);
    });
  })();

  // E02: ending.id uniqueness (per source)
  (function () {
    var baseIds = new Set();
    (base.endings || []).forEach(function (e) {
      if (!e.id) {
        error('E02', 'Ending missing id');
        return;
      }
      if (baseIds.has(e.id)) error('E02', 'Dup ending in base: ' + e.id);
      baseIds.add(e.id);
      endingIds.add(e.id);
    });
    ((ch2plus || {}).endings || []).forEach(function (e) {
      if (!e.id) {
        error('E02', 'Ending missing id');
        return;
      }
      if (baseIds.has(e.id)) warn('E02', 'Ending overlaps base: ' + e.id);
      endingIds.add(e.id);
    });
  })();

  // E04: trigger areas exist
  events.forEach(function (evt) {
    var t = evt.trigger || {};
    var arr = Array.isArray(t.areas) ? t.areas : t.areas ? [t.areas] : [];
    arr.forEach(function (a) {
      if (a && a !== 'any' && a !== 'all' && !areas.has(a))
        error('E04', 'Unknown area in ' + evt.id + ': ' + a);
    });
  });

  // E05: NPC refs exist
  events.forEach(function (evt) {
    (evt.effects?.npc_changes || []).forEach(function (nc) {
      var name = nc.name || nc.npc;
      if (name && !npcNames.has(name)) warn('E05', 'Unknown NPC in ' + evt.id + ': ' + name);
    });
  });

  // E06: priority_order ids exist
  var ej = base.ending_judgement || (ch2plus || {}).ending_judgement || {};
  (ej.priority_order || []).forEach(function (eid) {
    if (!endingIds.has(eid)) {
      var archive = (meta || {}).deprecated_endings_archive || [];
      var inArchive =
        Array.isArray(archive) &&
        archive.some(function (e) {
          return e.id === eid;
        });
      if (!inArchive) error('E06', 'priority_order unknown ending: ' + eid);
    }
  });

  // E10: event_chains refs
  (base.event_chains || []).forEach(function (chain) {
    (chain.sequence || []).forEach(function (eid) {
      if (!eventIds.has(eid))
        warn('E10', 'Chain ref unknown: ' + (chain.name || '?') + ' -> ' + eid);
    });
  });

  // E09: version
  if (!base.version) warn('E09', 'Missing version');

  return errors;
}
try {
  module.exports = { validateReferences };
} catch (e) {}
