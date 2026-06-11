const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
console.log('HTML size:', h.length.toLocaleString(), 'bytes');

// Count scripts and check for issues
const sre = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let si = 0;
let hasBabel = false;
let hasTextBabel = false;
let m;
while ((m = sre.exec(h)) !== null) {
  const tag = m[0].match(/<script[^>]*>/)[0];
  const typeMatch = tag.match(/type="([^"]*)/);
  const typeName = typeMatch ? typeMatch[1] : '(plain)';
  if (typeName === 'text/babel') hasTextBabel = true;
  
  const isBabel = m[1].includes('sourceMappingURL=babel') || m[1].includes('"babel.min.js"') || (m[1].indexOf('!function(e,t){') === 0 && m[1].length > 100000);
  if (isBabel) hasBabel = true;
  
  console.log('Script #' + si + ': [' + typeName + '] ' + m[1].length.toLocaleString() + 'b' + (isBabel ? ' ⚠️babel' : '') + (hasTextBabel ? ' ⚠️text/babel' : ''));
  si++;
}

console.log('');
console.log('Contains babel.min.js string:', h.includes('babel.min.js'));
console.log('Contains type=text/babel:', h.includes('type="text/babel"));
console.log('Script with babel content:', hasBabel);
console.log('Script with text/babel type:', hasTextBabel);

if (!hasBabel && !hasTextBabel && !h.includes('babel.minjs')) {
  console.log('\n✅ CLEAN BUILD');
} else {
  console.log('\n❌ CONTAINS DEV-MODE ARTIFACTS!');
}
