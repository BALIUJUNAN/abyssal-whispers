#!/usr/bin/env node
/**
 * Audio asset and routing quality gate.
 *
 * Verifies that every registered path exists, literal gameplay sound IDs are
 * registered, and the generated non-verbal pack contains valid, audible WAVs.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const AUDIO_MANAGER_PATH = path.join(SRC, 'managers', 'AudioManager.js');

const REQUIRED_PACK_IDS = [
  'combat_start', 'combat_attack', 'combat_hit', 'combat_miss',
  'combat_player_hurt', 'combat_monster_attack', 'combat_flee',
  'combat_victory', 'combat_item', 'combat_communicate',
  'ending_good', 'ending_bad', 'ending_hidden', 'ending_neutral',
  'weather_rain', 'weather_fog', 'weather_blood_moon',
  'safehouse_rest', 'safehouse_unsettled', 'safehouse_corrupt',
  'travel_footsteps', 'investigate_search', 'ritual_progress', 'ritual_complete',
];

var failures = [];
var warnings = [];
var checked = 0;

function fail(message) {
  failures.push(message);
}

function walk(directory, result) {
  var entries = fs.readdirSync(directory, { withFileTypes: true });
  for (var i = 0; i < entries.length; i += 1) {
    var entry = entries[i];
    var fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, result);
    else if (/\.(?:js|jsx)$/.test(entry.name)) result.push(fullPath);
  }
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function parseAudioRegistry() {
  var source = fs.readFileSync(AUDIO_MANAGER_PATH, 'utf8');
  var match = source.match(/AUDIO_PATHS\s*=\s*\{([\s\S]*?)\};/);
  if (!match) {
    fail('Could not parse AUDIO_PATHS from AudioManager.js');
    return new Map();
  }
  var registry = new Map();
  var entryPattern = /^\s*([A-Za-z0-9_]+):\s*['"]([^'"]+\.(?:mp3|wav|ogg))['"],?\s*$/gm;
  var entry;
  while ((entry = entryPattern.exec(match[1])) !== null) registry.set(entry[1], entry[2]);
  return registry;
}

function collectLiteralAudioIds() {
  var files = [];
  var references = new Map();
  walk(SRC, files);
  var patterns = [
    /audio\.play\(\s*['"]([^'"]+)['"]/g,
    /playEffect\(\s*['"]([^'"]+)['"]/g,
    /type:\s*['"]AUDIO_PLAY['"][^}\n]*?id:\s*['"]([^'"]+)['"]/g,
    /emit\(\s*['"]AUDIO_PLAY['"]\s*,\s*\{[^}\n]*?name:\s*['"]([^'"]+)['"]/g,
    /type:\s*['"]playEffect['"][^}\n]*?id:\s*['"]([^'"]+)['"]/g,
    /soundId:\s*['"]([^'"]+)['"]/g,
  ];
  for (var i = 0; i < files.length; i += 1) {
    var file = files[i];
    var source = stripComments(fs.readFileSync(file, 'utf8'));
    for (var patternIndex = 0; patternIndex < patterns.length; patternIndex += 1) {
      var pattern = patterns[patternIndex];
      pattern.lastIndex = 0;
      var match;
      while ((match = pattern.exec(source)) !== null) {
        if (!references.has(match[1])) references.set(match[1], []);
        references.get(match[1]).push(path.relative(ROOT, file));
      }
    }
  }

  var resourceSource = fs.readFileSync(path.join(SRC, 'systems', 'resourceNarrative.js'), 'utf8');
  var resourcePattern = /sound:\s*['"]([^'"]+)['"]/g;
  var resourceMatch;
  while ((resourceMatch = resourcePattern.exec(resourceSource)) !== null) {
    if (!references.has(resourceMatch[1])) references.set(resourceMatch[1], []);
    references.get(resourceMatch[1]).push('src/systems/resourceNarrative.js');
  }
  return references;
}

function inspectWav(filePath) {
  var buffer = fs.readFileSync(filePath);
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    return { valid: false, reason: 'invalid RIFF/WAVE header' };
  }
  var channels = buffer.readUInt16LE(22);
  var sampleRate = buffer.readUInt32LE(24);
  var bits = buffer.readUInt16LE(34);
  var dataSize = buffer.readUInt32LE(40);
  if (bits !== 16 || channels < 1 || channels > 2 || sampleRate < 22050 || dataSize + 44 > buffer.length) {
    return { valid: false, reason: 'unsupported or truncated PCM format' };
  }
  var samples = Math.floor(dataSize / 2);
  var peak = 0;
  var energy = 0;
  var clipped = 0;
  for (var offset = 44; offset + 1 < 44 + dataSize; offset += 2) {
    var value = buffer.readInt16LE(offset) / 32768;
    peak = Math.max(peak, Math.abs(value));
    energy += value * value;
    if (Math.abs(value) >= 0.999) clipped += 1;
  }
  var seam = 0;
  for (var channel = 0; channel < channels; channel += 1) {
    var first = buffer.readInt16LE(44 + channel * 2) / 32768;
    var lastOffset = 44 + (samples - channels + channel) * 2;
    var last = buffer.readInt16LE(lastOffset) / 32768;
    seam = Math.max(seam, Math.abs(first - last));
  }
  return {
    valid: true,
    channels: channels,
    sampleRate: sampleRate,
    duration: samples / channels / sampleRate,
    peak: peak,
    rms: Math.sqrt(energy / Math.max(1, samples)),
    clipped: clipped,
    seam: seam,
  };
}

var registry = parseAudioRegistry();
for (var registryEntry of registry.entries()) {
  var id = registryEntry[0];
  var relativePath = registryEntry[1];
  var absolutePath = path.join(ROOT, relativePath);
  checked += 1;
  if (!fs.existsSync(absolutePath)) fail(id + ' points to missing file: ' + relativePath);
  else if (fs.statSync(absolutePath).size <= 44) fail(id + ' points to an empty audio file: ' + relativePath);
}

var references = collectLiteralAudioIds();
for (var reference of references.entries()) {
  var referencedId = reference[0];
  if (referencedId === 'ending_') {
    var endingIds = ['ending_good', 'ending_bad', 'ending_hidden', 'ending_neutral'];
    for (var endingIndex = 0; endingIndex < endingIds.length; endingIndex += 1) {
      if (!registry.has(endingIds[endingIndex])) fail('Missing dynamic ending sound id: ' + endingIds[endingIndex]);
    }
    continue;
  }
  if (!registry.has(referencedId)) {
    fail('Unmapped audio id "' + referencedId + '" in ' + Array.from(new Set(reference[1])).join(', '));
  }
}

for (var requiredIndex = 0; requiredIndex < REQUIRED_PACK_IDS.length; requiredIndex += 1) {
  var requiredId = REQUIRED_PACK_IDS[requiredIndex];
  if (!registry.has(requiredId)) {
    fail('Required non-verbal pack id is not registered: ' + requiredId);
    continue;
  }
  var requiredPath = path.join(ROOT, registry.get(requiredId));
  if (!fs.existsSync(requiredPath)) continue;
  var wav = inspectWav(requiredPath);
  checked += 1;
  if (!wav.valid) {
    fail(requiredId + ': ' + wav.reason);
    continue;
  }
  if (wav.duration < 0.25) fail(requiredId + ': duration is too short');
  if (wav.peak < 0.05 || wav.rms < 0.003) fail(requiredId + ': audio is effectively silent');
  if (wav.clipped > 0) fail(requiredId + ': contains ' + wav.clipped + ' clipped samples');
  if (requiredId.startsWith('weather_') && wav.seam > 0.2) {
    fail(requiredId + ': loop seam is too large (' + wav.seam.toFixed(3) + ')');
  }
}

console.log('Audio quality gate');
console.log('  Registered paths: ' + registry.size);
console.log('  Literal sound IDs: ' + references.size);
console.log('  Generated pack:    ' + REQUIRED_PACK_IDS.length);
console.log('  Checks performed:  ' + checked);

for (var warningIndex = 0; warningIndex < warnings.length; warningIndex += 1) {
  console.warn('WARN: ' + warnings[warningIndex]);
}
if (failures.length > 0) {
  console.error('\nFailures:');
  for (var failureIndex = 0; failureIndex < failures.length; failureIndex += 1) {
    console.error('  - ' + failures[failureIndex]);
  }
  process.exit(1);
}

console.log('  Result: PASS');
