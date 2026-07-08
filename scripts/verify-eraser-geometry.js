const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, '../main.js');
const mainContent = fs.readFileSync(mainPath, 'utf8');

let hasError = false;
console.log('--- Verifying Eraser Geometry ---');

if (!/shapeType\s*===\s*['"]rectangle['"]/.test(mainContent)) {
  console.error('[FAIL] Eraser logic is missing exact match for "rectangle" shapeType.');
  hasError = true;
} else {
  console.log('[PASS] Eraser handles "rectangle".');
}

if (!/shapeType\s*===\s*['"]circle['"]/.test(mainContent)) {
  console.error('[FAIL] Eraser logic is missing exact match for "circle" shapeType.');
  hasError = true;
} else {
  console.log('[PASS] Eraser handles "circle".');
}

if (!/shapeType\s*===\s*['"]line['"]/.test(mainContent)) {
  console.error('[FAIL] Eraser logic is missing exact match for "line" shapeType.');
  hasError = true;
} else {
  console.log('[PASS] Eraser handles "line".');
}

if (!/shapeType\s*===\s*['"]triangle['"]\s*\|\|\s*stroke\.shapeType\s*===\s*['"]arrow['"]/.test(mainContent)) {
  console.error('[FAIL] Eraser logic is missing fallback logic for "triangle" or "arrow".');
  hasError = true;
} else {
  console.log('[PASS] Eraser handles "triangle" and "arrow" explicitly in fallback.');
}

if (hasError) {
  console.error('Eraser Geometry verification failed!');
  process.exit(1);
} else {
  console.log('Eraser Geometry verified successfully!');
  process.exit(0);
}
