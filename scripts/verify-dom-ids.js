const fs = require('fs');
const path = require('path');

const toolbarJsPath = path.join(__dirname, '../src/renderer/toolbar.js');
const toolbarHtmlPath = path.join(__dirname, '../src/renderer/toolbar.html');

const jsContent = fs.readFileSync(toolbarJsPath, 'utf8');
const htmlContent = fs.readFileSync(toolbarHtmlPath, 'utf8');

// Extract all getElementById calls in toolbar.js
const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const jsIds = new Set();
while ((match = idRegex.exec(jsContent)) !== null) {
  jsIds.add(match[1]);
}

// Extract all id="..." attributes in toolbar.html
const htmlIdRegex = /id=['"]([^'"]+)['"]/g;
const htmlIds = new Set();
while ((match = htmlIdRegex.exec(htmlContent)) !== null) {
  htmlIds.add(match[1]);
}

const elementsObject = jsContent.match(/const elements = \{([\s\S]*?)\n\};/);
const declaredElementKeys = new Set();
if (elementsObject) {
  const keyRegex = /^\s*([A-Za-z_$][\w$]*):/gm;
  while ((match = keyRegex.exec(elementsObject[1])) !== null) {
    declaredElementKeys.add(match[1]);
  }
}

const elementRefRegex = /elements\.([A-Za-z_$][\w$]*)/g;
const referencedElementKeys = new Set();
while ((match = elementRefRegex.exec(jsContent)) !== null) {
  referencedElementKeys.add(match[1]);
}

let hasError = false;
console.log('--- Verifying DOM IDs ---');
for (const id of jsIds) {
  if (!htmlIds.has(id)) {
    console.error(`[FAIL] ID "${id}" is referenced in toolbar.js but missing from toolbar.html`);
    hasError = true;
  } else {
    console.log(`[PASS] ID "${id}" found in both JS and HTML`);
  }
}

for (const key of referencedElementKeys) {
  if (!declaredElementKeys.has(key)) {
    console.error(`[FAIL] elements.${key} is referenced in toolbar.js but missing from the elements registry`);
    hasError = true;
  }
}

if (hasError) {
  console.error('DOM ID verification failed!');
  process.exit(1);
} else {
  console.log('All DOM IDs verified successfully!');
  process.exit(0);
}
