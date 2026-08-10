const fs = require('node:fs');
const path = require('node:path');

const SAMPLE_RATE = 32000;
const OUTPUT_DIR = path.resolve(__dirname, '..', 'audio');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, value) {
  var x = clamp((value - edge0) / Math.max(0.00001, edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function envelope(time, duration, attack, release) {
  return smoothstep(0, attack, time) * (1 - smoothstep(duration - release, duration, time));
}

function eventEnvelope(time, start, attack, hold, release) {
  var local = time - start;
  var duration = attack + hold + release;
  if (local < 0 || local > duration) return 0;
  return envelope(local, duration, attack, release);
}

function pulse(time, center, width) {
  var distance = (time - center) / width;
  return Math.exp(-distance * distance);
}

function tone(frequency, time, phase) {
  return Math.sin(2 * Math.PI * frequency * time + (phase || 0));
}

function chirp(time, duration, startFrequency, endFrequency, phase) {
  if (time < 0 || time > duration) return 0;
  var sweep = (endFrequency - startFrequency) / duration;
  return Math.sin(2 * Math.PI * (startFrequency * time + 0.5 * sweep * time * time) + (phase || 0));
}

function makeRandom(seed) {
  var state = seed >>> 0;
  return function () {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function makeNoise(seed, smoothing) {
  var random = makeRandom(seed);
  var low = 0;
  var previous = 0;
  return function () {
    var white = random() * 2 - 1;
    low += (white - low) * smoothing;
    var result = { white: white, low: low, high: white - low, motion: low - previous };
    previous = low;
    return result;
  };
}

function writeWav(filePath, samples, channels) {
  var bytesPerSample = 2;
  var dataSize = samples.length * bytesPerSample;
  var buffer = Buffer.allocUnsafe(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (var i = 0; i < samples.length; i += 1) {
    buffer.writeInt16LE(Math.round(clamp(samples[i], -1, 1) * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

function renderSound(definition) {
  var channels = definition.channels || 1;
  var frameCount = Math.round(definition.duration * SAMPLE_RATE);
  var fadeFrames = Math.round((definition.loopFade || 0) * SAMPLE_RATE);
  var rawFrames = frameCount + fadeFrames;
  var raw = new Float64Array(rawFrames * channels);
  var synth = definition.create();

  for (var frame = 0; frame < rawFrames; frame += 1) {
    var time = frame / SAMPLE_RATE;
    var value = synth(time, frame);
    if (channels === 1) {
      raw[frame] = Number.isFinite(value) ? value : 0;
    } else {
      raw[frame * 2] = Number.isFinite(value[0]) ? value[0] : 0;
      raw[frame * 2 + 1] = Number.isFinite(value[1]) ? value[1] : 0;
    }
  }

  var output = new Float64Array(frameCount * channels);
  for (var outputFrame = 0; outputFrame < frameCount; outputFrame += 1) {
    for (var channel = 0; channel < channels; channel += 1) {
      var sample = raw[outputFrame * channels + channel];
      if (fadeFrames > 0 && outputFrame < fadeFrames) {
        var alpha = outputFrame / fadeFrames;
        var tail = raw[(frameCount + outputFrame) * channels + channel];
        sample = tail * (1 - alpha) + sample * alpha;
      }
      output[outputFrame * channels + channel] = sample;
    }
  }

  var peak = 0;
  for (var sampleIndex = 0; sampleIndex < output.length; sampleIndex += 1) {
    peak = Math.max(peak, Math.abs(output[sampleIndex]));
  }
  var targetPeak = definition.peak || 0.68;
  var gain = peak > 0 ? targetPeak / peak : 1;
  for (var normalizedIndex = 0; normalizedIndex < output.length; normalizedIndex += 1) {
    output[normalizedIndex] = Math.tanh(output[normalizedIndex] * gain * 1.08) / Math.tanh(1.08);
  }

  var outputPath = path.join(OUTPUT_DIR, definition.name + '.wav');
  writeWav(outputPath, output, channels);
  return { name: definition.name, duration: definition.duration, channels: channels, path: outputPath };
}

function makeImpact(seed, baseFrequency, weight) {
  var noise = makeNoise(seed, 0.07);
  return function (time, center, decay) {
    var local = time - center;
    if (local < 0) return 0;
    var n = noise();
    var env = Math.exp(-local * decay);
    return env * (tone(baseFrequency, local) * weight + n.low * 1.8 + n.high * 0.08);
  };
}

function makeCombatStart() {
  var impact = makeImpact(0x101, 46, 0.8);
  var noise = makeNoise(0x102, 0.008);
  return function (time) {
    var env = envelope(time, 2.8, 0.02, 0.65);
    var sweep = chirp(time, 2.1, 112, 31) * Math.exp(-time * 0.62);
    var metal = eventEnvelope(time, 0.18, 0.01, 0.05, 1.9) *
      (tone(271, time) * 0.22 + tone(417, time, 0.4) * 0.12);
    return env * (impact(time, 0.04, 5.5) + sweep * 0.52 + metal + noise().low * 1.4);
  };
}

function makeWhoosh(seed, descending) {
  var noise = makeNoise(seed, 0.055);
  return function (time) {
    var env = eventEnvelope(time, 0.04, 0.11, 0.16, 0.34);
    var n = noise();
    var sweep = descending ? chirp(time, 0.72, 940, 115) : chirp(time, 0.72, 160, 1060);
    return env * (n.high * 0.62 + sweep * 0.11 + n.low * 0.28);
  };
}

function makeCombatHit() {
  var impact = makeImpact(0x201, 72, 0.75);
  var crack = makeNoise(0x202, 0.2);
  return function (time) {
    var local = Math.max(0, time - 0.035);
    return envelope(time, 0.95, 0.006, 0.32) *
      (impact(time, 0.035, 8.5) + crack().high * Math.exp(-local * 18) * 0.32);
  };
}

function makePlayerHurt() {
  var impact = makeImpact(0x301, 53, 0.78);
  return function (time) {
    var ring = eventEnvelope(time, 0.08, 0.01, 0.06, 0.95) *
      (tone(1350, time) * 0.055 + tone(1870, time, 0.7) * 0.025);
    return envelope(time, 1.15, 0.005, 0.35) * impact(time, 0.025, 7.2) + ring;
  };
}

function makeMonsterAttack() {
  var noise = makeNoise(0x401, 0.018);
  return function (time) {
    var env = eventEnvelope(time, 0.02, 0.22, 0.2, 0.75);
    var scrape = chirp(time, 1.08, 83, 29) * 0.48 + chirp(time, 0.78, 420, 74, 0.6) * 0.13;
    var n = noise();
    return env * (scrape + n.low * 2.2 + n.high * 0.06);
  };
}

function makeFlee() {
  var noise = makeNoise(0x501, 0.12);
  var steps = [0.08, 0.31, 0.52, 0.7, 0.86, 1.0];
  return function (time) {
    var result = 0;
    var n = noise();
    for (var i = 0; i < steps.length; i += 1) {
      var strength = 1 - i * 0.08;
      result += pulse(time, steps[i], 0.025) * strength * (tone(68 + i * 3, time) * 0.55 + n.low * 1.8);
    }
    return envelope(time, 1.45, 0.01, 0.25) * result;
  };
}

function makeVictory() {
  var impact = makeImpact(0x601, 42, 0.65);
  return function (time) {
    var bell = 0;
    var notes = [110, 164.81, 220];
    for (var i = 0; i < notes.length; i += 1) {
      var local = time - i * 0.24;
      if (local >= 0) bell += tone(notes[i], local, i * 0.3) * Math.exp(-local * 1.15) * (0.24 - i * 0.025);
    }
    return envelope(time, 3.0, 0.015, 0.7) * (impact(time, 0.02, 6) * 0.7 + bell);
  };
}

function makeCombatItem() {
  var noise = makeNoise(0x701, 0.16);
  return function (time) {
    var click = pulse(time, 0.09, 0.012) * (tone(980, time) * 0.35 + noise().high * 0.35);
    var glass = eventEnvelope(time, 0.13, 0.01, 0.02, 0.75) *
      (tone(1460, time) * 0.12 + tone(2210, time, 0.3) * 0.07);
    return envelope(time, 1.15, 0.005, 0.23) * (click + glass);
  };
}

function makeCommunicate() {
  var noise = makeNoise(0x801, 0.006);
  return function (time) {
    var first = eventEnvelope(time, 0.08, 0.15, 0.2, 0.55) *
      (tone(176, time) * 0.3 + tone(264, time, 0.8) * 0.11);
    var reply = eventEnvelope(time, 0.9, 0.2, 0.2, 0.75) *
      (tone(151, time) * 0.27 + tone(226.5, time, 1.1) * 0.1);
    return envelope(time, 2.2, 0.03, 0.45) * (first + reply + noise().low * 1.2);
  };
}

function makeEnding(kind) {
  var seeds = { good: 0x901, bad: 0x902, hidden: 0x903, neutral: 0x904 };
  var noise = makeNoise(seeds[kind], kind === 'bad' ? 0.009 : 0.0035);
  return function (time) {
    var n = noise();
    var base = 0;
    if (kind === 'good') {
      base = tone(55, time) * 0.2 + tone(82.41, time, 0.3) * 0.12;
      base += eventEnvelope(time, 1.3, 0.03, 0.08, 4.0) *
        (tone(220, time) * 0.11 + tone(329.63, time, 0.4) * 0.07);
    } else if (kind === 'bad') {
      base = chirp(time, 5.6, 76, 22) * 0.34 + tone(34, time) * 0.18 + n.low * 2.4;
      base += eventEnvelope(time, 2.0, 0.8, 0.8, 2.2) * n.high * 0.07;
    } else if (kind === 'hidden') {
      var swell = smoothstep(0, 4.7, time);
      base = swell * (tone(43, time) * 0.22 + tone(67.2, time, 0.6) * 0.1 + n.low * 2.0);
      base += eventEnvelope(time, 4.4, 0.05, 0.05, 1.35) * tone(2430, time) * 0.035;
    } else {
      base = tone(48, time) * 0.18 + tone(72, time, 1.2) * 0.09 + n.low * 1.3;
      for (var i = 0; i < 4; i += 1) {
        base += pulse(time, 0.6 + i * 1.15, 0.035) * tone(310 - i * 18, time) * 0.13;
      }
    }
    return envelope(time, 6.2, 0.65, 1.3) * base;
  };
}

function makeRain() {
  var leftNoise = makeNoise(0xa01, 0.035);
  var rightNoise = makeNoise(0xa02, 0.041);
  return function (time) {
    var left = leftNoise();
    var right = rightNoise();
    var tide = 0.78 + 0.2 * tone(0.083, time);
    var lowRumble = tone(28, time) * (0.025 + 0.018 * smoothstep(8, 18, time));
    return [left.high * 0.26 * tide + left.low * 0.9 + lowRumble,
      right.high * 0.25 * tide + right.low * 0.92 + lowRumble];
  };
}

function makeFog() {
  var leftNoise = makeNoise(0xb01, 0.0018);
  var rightNoise = makeNoise(0xb02, 0.0019);
  return function (time) {
    var left = leftNoise();
    var right = rightNoise();
    var horn = 0;
    for (var i = 0; i < 2; i += 1) {
      var start = 5.2 + i * 11.4;
      horn += eventEnvelope(time, start, 1.4, 1.0, 3.6) *
        (tone(58, time) * 0.16 + tone(87, time, 0.7) * 0.055);
    }
    return [left.low * 2.7 + tone(37, time) * 0.055 + horn,
      right.low * 2.7 + tone(37.3, time, 0.4) * 0.055 + horn * 0.82];
  };
}

function makeBloodMoon() {
  var leftNoise = makeNoise(0xc01, 0.004);
  var rightNoise = makeNoise(0xc02, 0.0045);
  return function (time) {
    var phase = time % 1.46;
    var heartbeat = (pulse(phase, 0.1, 0.045) + pulse(phase, 0.31, 0.065) * 0.68) *
      tone(49, phase) * 0.28;
    var drone = tone(31, time) * 0.12 + tone(46.7, time, 0.6) * 0.07;
    var left = leftNoise();
    var right = rightNoise();
    return [drone + heartbeat + left.low * 2.1, drone + heartbeat * 0.92 + right.low * 2.1];
  };
}

function makeSafehouse(stage) {
  var noise = makeNoise(0xd00 + stage, stage === 0 ? 0.08 : 0.012);
  return function (time) {
    var n = noise();
    var sound = 0;
    if (stage === 0) {
      var crackle = 0;
      for (var i = 0; i < 7; i += 1) crackle += pulse(time, 0.4 + i * 0.63, 0.012) * n.high * 0.5;
      sound = n.low * 0.55 + crackle + tone(74, time) * 0.045;
    } else if (stage === 1) {
      sound = n.low * 1.6 + tone(48, time) * 0.08;
      sound += eventEnvelope(time, 1.1, 0.4, 0.15, 1.3) * chirp(time - 1.1, 1.8, 180, 62) * 0.13;
      sound += eventEnvelope(time, 3.4, 0.25, 0.1, 1.0) * chirp(time - 3.4, 1.35, 143, 51) * 0.1;
    } else {
      var breath = 0.5 + 0.5 * tone(0.19, time, -1.2);
      sound = n.low * (1.5 + breath * 1.2) + tone(35, time) * 0.12;
      sound += eventEnvelope(time, 2.2, 0.03, 0.05, 2.2) *
        (tone(67, time) * 0.24 + tone(101, time, 0.5) * 0.08);
    }
    return envelope(time, stage === 2 ? 6.2 : 5.2, 0.35, 0.65) * sound;
  };
}

function makeFootsteps() {
  var noise = makeNoise(0xe01, 0.09);
  var times = [0.12, 0.49, 0.83, 1.16, 1.47, 1.76, 2.03];
  return function (time) {
    var n = noise();
    var result = 0;
    for (var i = 0; i < times.length; i += 1) {
      result += pulse(time, times[i], 0.028) * (tone(63 + i * 2, time) * 0.32 + n.low * 1.6);
    }
    return envelope(time, 2.35, 0.01, 0.2) * result;
  };
}

function makeSearch() {
  var noise = makeNoise(0xf01, 0.12);
  return function (time) {
    var n = noise();
    var rustle = 0;
    for (var i = 0; i < 5; i += 1) {
      rustle += eventEnvelope(time, 0.15 + i * 0.42, 0.05, 0.06, 0.22) * n.high * (0.25 - i * 0.015);
    }
    var object = pulse(time, 1.72, 0.018) * (tone(620, time) * 0.18 + n.low * 0.8);
    return envelope(time, 2.45, 0.01, 0.25) * (rustle + object);
  };
}

function makeRitual(complete) {
  var noise = makeNoise(complete ? 0x1102 : 0x1101, 0.01);
  return function (time) {
    var duration = complete ? 6.4 : 2.9;
    var n = noise();
    var scrape = complete ? chirp(time, 5.2, 53, 18) * 0.3 : chirp(time, 2.5, 520, 91) * 0.15;
    var drone = tone(38, time) * (complete ? 0.2 : 0.1) + n.low * (complete ? 2.4 : 1.2);
    var chime = 0;
    if (complete) {
      chime = eventEnvelope(time, 3.7, 0.02, 0.08, 2.45) *
        (tone(211, time) * 0.11 + tone(337, time, 0.4) * 0.07 + tone(503, time, 0.8) * 0.035);
    }
    return envelope(time, duration, 0.04, complete ? 1.0 : 0.45) * (scrape + drone + chime);
  };
}

var sounds = [
  { name: 'combat_start', duration: 2.8, create: makeCombatStart, peak: 0.72 },
  { name: 'combat_attack', duration: 0.8, create: function () { return makeWhoosh(0x111, true); } },
  { name: 'combat_hit', duration: 0.95, create: makeCombatHit, peak: 0.74 },
  { name: 'combat_miss', duration: 0.8, create: function () { return makeWhoosh(0x112, false); }, peak: 0.58 },
  { name: 'combat_player_hurt', duration: 1.15, create: makePlayerHurt, peak: 0.74 },
  { name: 'combat_monster_attack', duration: 1.25, create: makeMonsterAttack, peak: 0.72 },
  { name: 'combat_flee', duration: 1.45, create: makeFlee, peak: 0.66 },
  { name: 'combat_victory', duration: 3.0, create: makeVictory, peak: 0.68 },
  { name: 'combat_item', duration: 1.15, create: makeCombatItem, peak: 0.58 },
  { name: 'combat_communicate', duration: 2.2, create: makeCommunicate, peak: 0.6 },
  { name: 'ending_good', duration: 6.2, create: function () { return makeEnding('good'); }, peak: 0.62 },
  { name: 'ending_bad', duration: 6.2, create: function () { return makeEnding('bad'); }, peak: 0.72 },
  { name: 'ending_hidden', duration: 6.2, create: function () { return makeEnding('hidden'); }, peak: 0.67 },
  { name: 'ending_neutral', duration: 6.2, create: function () { return makeEnding('neutral'); }, peak: 0.6 },
  { name: 'weather_rain_loop', duration: 24, channels: 2, loopFade: 1.5, create: makeRain, peak: 0.44 },
  { name: 'weather_fog_loop', duration: 24, channels: 2, loopFade: 1.5, create: makeFog, peak: 0.4 },
  { name: 'weather_blood_moon_loop', duration: 24, channels: 2, loopFade: 1.5, create: makeBloodMoon, peak: 0.47 },
  { name: 'safehouse_rest', duration: 5.2, create: function () { return makeSafehouse(0); }, peak: 0.48 },
  { name: 'safehouse_unsettled', duration: 5.2, create: function () { return makeSafehouse(1); }, peak: 0.56 },
  { name: 'safehouse_corrupt', duration: 6.2, create: function () { return makeSafehouse(2); }, peak: 0.65 },
  { name: 'travel_footsteps', duration: 2.35, create: makeFootsteps, peak: 0.55 },
  { name: 'investigate_search', duration: 2.45, create: makeSearch, peak: 0.5 },
  { name: 'ritual_progress', duration: 2.9, create: function () { return makeRitual(false); }, peak: 0.62 },
  { name: 'ritual_complete', duration: 6.4, create: function () { return makeRitual(true); }, peak: 0.73 },
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
var results = sounds.map(renderSound);
for (var i = 0; i < results.length; i += 1) {
  var item = results[i];
  console.log(item.name.padEnd(28) + item.duration.toFixed(2) + 's  ' + item.channels + 'ch');
}
console.log('\nGenerated ' + results.length + ' non-verbal audio assets in ' + OUTPUT_DIR);
