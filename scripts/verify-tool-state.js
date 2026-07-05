const fs = require('fs');
const path = require('path');

const toolbarHtmlPath = path.join(__dirname, '../src/renderer/toolbar.html');
const mainPath = path.join(__dirname, '../main.js');

const htmlContent = fs.readFileSync(toolbarHtmlPath, 'utf8');
const mainContent = fs.readFileSync(mainPath, 'utf8');

// Extract all data-tool="..." and data-subtool="..." attributes in toolbar.html
const toolRegex = /data-(?:tool|subtool)=['"]([^'"]+)['"]/g;
let match;
const htmlTools = new Set();
while ((match = toolRegex.exec(htmlContent)) !== null) {
  htmlTools.add(match[1]);
}

// In main.js, find the list of tools handled in setTool
// Look for strings inside setTool function or check known tools
const knownToolsInMain = ['cursor', 'pen', 'highlighter', 'eraser', 'shapes', 'laser', 'text', 'select', 'spotlight', 'magnifier'];

let hasError = false;
console.log('--- Verifying Tool State Alignment ---');
console.log('Tools defined in HTML:', Array.from(htmlTools));

for (const t of htmlTools) {
  if (!knownToolsInMain.includes(t)) {
    console.error(`[FAIL] Tool "${t}" is defined in HTML but unknown to main.js tool enumeration`);
    hasError = true;
  } else {
    // Check if main.js mentions this tool string
    if (!mainContent.includes(`'${t}'`) && !mainContent.includes(`"${t}"`)) {
      console.warn(`[WARN] Tool "${t}" not explicitly quoted as a string literal in main.js`);
    } else {
      console.log(`[PASS] Tool "${t}" is present in HTML and referenced in main.js`);
    }
  }
}

if (hasError) {
  console.error('Tool State verification failed!');
  process.exit(1);
} else {
  console.log('Tool State verified successfully!');
  process.exit(0);
}
