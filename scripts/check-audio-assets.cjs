#!/usr/bin/env node
/**
 * P2-2: Asset Path CI Check
 *
 * Scans source code for audio/image path references and verifies each file exists.
 * Run: node scripts/check-audio-assets.cjs
 *
 * Exit code 0 = all assets found, 1 = missing assets detected.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
let passed = 0;
let failed = 0;
const missing = [];

function check(filePath, source) {
  const abs = path.join(ROOT, filePath);
  if (fs.existsSync(abs)) {
    passed++;
  } else {
    failed++;
    missing.push({ file: filePath, source });
  }
}

// ── 1. Audio paths from AudioManager.js ──
console.log('Checking audio assets...');
const amContent = fs.readFileSync(path.join(SRC, 'managers', 'AudioManager.js'), 'utf8');
const audioPathRegex = /(?:id|key|path):\s*['"]([^'"]+\.(mp3|wav|ogg))['"]/g;
const audioPathsFromObject = [];
let m;

// Extract from AUDIO_PATHS object values
const audioObjMatch = amContent.match(/AUDIO_PATHS\s*=\s*\{([\s\S]*?)\};/);
if (audioObjMatch) {
  const objBody = audioObjMatch[1];
  const valRegex = /:\s*['"]([^'"]+\.(mp3|wav|ogg))['"]/g;
  while ((m = valRegex.exec(objBody)) !== null) {
    audioPathsFromObject.push(m[1]);
  }
}

// Check each audio path
for (const ap of audioPathsFromObject) {
  check(ap, 'AudioManager.js: ' + ap);
}

// ── 2. Audio paths pushed as effects in reducer slices ──
console.log('Checking audio effect references in slices...');
const sliceDir = path.join(SRC, 'reducers', 'slices');
if (fs.existsSync(sliceDir)) {
  const sliceFiles = fs.readdirSync(sliceDir).filter(f => f.endsWith('.js'));
  for (const file of sliceFiles) {
    const content = fs.readFileSync(path.join(sliceDir, file), 'utf8');
    // Match AUDIO_PLAY, AUDIO_SKILL, AUDIO_AMBIENT effect IDs
    const effectRegex = /type:\s*['"]AUDIO_(?:PLAY|SKILL|AMBIENT)['"],\s*id:\s*['"]([^'"]+)['"]/g;
    while ((m = effectRegex.exec(content)) !== null) {
      const effectId = m[1];
      // Look up in AUDIO_PATHS
      const pathEntry = audioPathsFromObject.find(p => p.includes(effectId));
      if (pathEntry) {
        check(pathEntry, 'slice:' + file + ' AUDIO_PLAY id=' + effectId);
      }
    }
  }
}

// ── 3. Ending CG webp files ──
console.log('Checking ending CG assets...');
const appContent = fs.readFileSync(path.join(SRC, 'app.jsx'), 'utf8');
const endingCgMatch = appContent.match(/ENDING_CGS\s*=\s*\[([\s\S]*?)\]/);
if (endingCgMatch) {
  const cgBody = endingCgMatch[1];
  const cgRegex = /['"]([^'"]+)['"]/g;
  while ((m = cgRegex.exec(cgBody)) !== null) {
    check('assets/webp_ending/' + m[1] + '.webp', 'ENDING_CGS: ' + m[1]);
  }
}

// ── 4. Portrait images referenced in portraitMap.js ──
console.log('Checking portrait map assets...');
const portraitPath = path.join(SRC, 'portraitMap.js');
if (fs.existsSync(portraitPath)) {
  const portraitContent = fs.readFileSync(portraitPath, 'utf8');
  const imgRegex = /['"]assets\/([^'"]+\.(webp|png|jpg|jpeg|gif))['"]/g;
  while ((m = imgRegex.exec(portraitContent)) !== null) {
    check('assets/' + m[1], 'portraitMap.js: assets/' + m[1]);
  }
}

// ── 5. Webp scene images ──
console.log('Checking scene image assets...');
const webpDir = path.join(ROOT, 'assets', 'webp');
if (fs.existsSync(webpDir)) {
  const sceneFiles = fs.readdirSync(webpDir);
  // Just count — don't fail if portraitMap doesn't reference all of them
  console.log('  Found ' + sceneFiles.length + ' scene images in assets/webp/');
}

// ── Report ──
console.log('\n=== Asset Check Results ===');
console.log('  Checked: ' + (passed + failed));
console.log('  Found:   ' + passed);
console.log('  Missing: ' + failed);

if (missing.length > 0) {
  console.log('\nMissing assets:');
  for (const m of missing) {
    console.log('  ✗ ' + m.file + '  (referenced by ' + m.source + ')');
  }
  process.exit(1);
} else {
  console.log('\n  ✅ All referenced assets found.');
  process.exit(0);
}
