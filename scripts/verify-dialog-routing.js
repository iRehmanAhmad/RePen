const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, '../main.js');
const mainContent = fs.readFileSync(mainPath, 'utf8');

let hasError = false;
console.log('--- Verifying Dialog Routing ---');

if (!/finally\s*\{[\s\S]*updateOverlayIgnoreMouse\(\);/.test(mainContent)) {
  console.error('[FAIL] showModalDialog() must call updateOverlayIgnoreMouse() in its finally block.');
  hasError = true;
} else {
  console.log('[PASS] showModalDialog() routes overlay mouse state correctly via updateOverlayIgnoreMouse().');
}

if (hasError) {
  console.error('Dialog Routing verification failed!');
  process.exit(1);
} else {
  console.log('Dialog Routing verified successfully!');
  process.exit(0);
}
