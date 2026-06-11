const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
// Find the main script (largest plain script)
const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let mainIdx = -1;
let maxSz = 0;
let m; let i = 0;
while ((m = re.exec(h)) !== null) {
  if (m[1].length > maxSz && !m[0].includes('type=')) {
    maxSz = m[1].length;
    mainIdx = i;
  }
  i++;
}
if (mainIdx >= 0) {
  const scripts = [];
  i = 0;
  while ((m = re.exec(h)) !== null) {
    scripts.push(m[1]);
    i++;
  }
  const mainJs = scripts[mainIdx];
  try {
    new Function(mainJs);
    console.log('✅ Main JS syntax: OK (' + (mainJs.length/1000).toFixed(1) + 'KB)');
  } catch(e) {
    console.error('❌ SYNTAX ERROR:', e.message);
    if (e.line) {
      console.error('  Line:', e.line, ':', mainJs.split('\n')[e.line - 1]?.substring(0, 120));
    }
  }
} else {
  console.log('Could not find main script');
}

// Check critical functions
const allScripts = scripts.join('\n');
const fns = ['handleDailyAction','handleExploreAction','handleUiAction','gameReducer','checkTriggerExtended','getEligibleEvents','chooseWeightedEvent','commitSelectedEvent','processDailyResources','applyResourceTextCorruption','audioManager','ErrorBoundary','Immer'];
for (const fn of fns) {
  const found = new RegExp('\\b' + fn + '\\b').test(allScripts);
  console.log((found ? '✅' : '❌') + ' ' + fn);
}
