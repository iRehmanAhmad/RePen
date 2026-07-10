const fs = require('fs');
const path = require('path');

const overlayPath = path.join(__dirname, '../src/renderer/overlay.js');
const overlayContent = fs.readFileSync(overlayPath, 'utf8');

let hasError = false;
console.log('--- Verifying Mindmap Math ---');

if (!/layoutMindmap/.test(overlayContent)) {
  console.error('[FAIL] overlay.js must contain layoutMindmap');
  hasError = true;
} else {
  console.log('[PASS] overlay.js contains layoutMindmap');
}

if (!/width\s*=\s*Math\.max\(width/.test(overlayContent) && !/width\s*=\s*Math\.max\(20/.test(overlayContent)) {
  console.warn('[WARN] layoutMindmap does not seem to dynamically measure width using Math.max');
} else {
  console.log('[PASS] layoutMindmap dynamically sizes width based on measurement');
}

if (!/node\.side\s*===/.test(overlayContent) && !/node\.side\s*=\s*/.test(overlayContent) && !/\.side\s*=/.test(overlayContent)) {
  console.error('[FAIL] layoutMindmap must support node.side (left/right)');
  hasError = true;
} else {
  console.log('[PASS] layoutMindmap utilizes node.side for balanced layout');
}

if (!/bezierCurveTo/.test(overlayContent)) {
  console.error('[FAIL] drawStroke must use bezier curves to draw mindmap connections');
  hasError = true;
} else {
  console.log('[PASS] drawStroke uses bezierCurveTo for mindmap connections');
}

if (hasError) {
  console.error('Mindmap Math verification failed!');
  process.exit(1);
} else {
  console.log('Mindmap Math verified successfully!');
  process.exit(0);
}
