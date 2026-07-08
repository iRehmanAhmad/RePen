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

const overlayPath = path.join(__dirname, '../src/renderer/overlay.js');
const overlayContent = fs.readFileSync(overlayPath, 'utf8');

if (!/resetInteractionState\('background mode changed'\)/.test(overlayContent)) {
  console.error('[FAIL] overlay.js must reset interaction state on backgroundMode changes');
  hasError = true;
} else {
  console.log('[PASS] overlay.js resets interaction state on backgroundMode changes');
}

if (!/segmentToSegmentDistance/.test(mainContent)) {
  console.error('[FAIL] main.js must use segmentToSegmentDistance for accurate erasing');
  hasError = true;
} else {
  console.log('[PASS] main.js uses segmentToSegmentDistance for accurate erasing');
}

if (!/broadcastState\(\);\s*updateOverlayIgnoreMouse\(\);/.test(mainContent)) {
  console.error('[FAIL] main.js must broadcast state before updating overlay mouse capture in setTool');
  hasError = true;
} else {
  console.log('[PASS] main.js broadcasts state before updating overlay mouse capture');
}

if (!/function\s+setPassThrough\s*\([^)]*\)\s*\{[\s\S]*state\.activeTool\s*=\s*['"]cursor['"]/.test(mainContent)) {
  console.error('[FAIL] setPassThrough() must set activeTool to "cursor" when pass-through is enabled');
  hasError = true;
} else {
  console.log('[PASS] setPassThrough() clears active tools by switching to cursor mode');
}

if (!/function\s+setPassThrough\s*\([^)]*\)\s*\{[\s\S]*state\.magnifierBgUrls\s*=\s*null/.test(mainContent)) {
  console.error('[FAIL] setPassThrough() must clear magnifier background state when cursor mode is enabled');
  hasError = true;
} else {
  console.log('[PASS] setPassThrough() clears magnifier background state');
}

if (!/function\s+captureMagnifierBackground\s*\([^)]*\)\s*\{[\s\S]*state\.activeTool\s*!==\s*['"]magnifier['"][\s\S]*state\.passThrough[\s\S]*state\.magnifierBgUrls\s*=\s*null/.test(mainContent)) {
  console.error('[FAIL] captureMagnifierBackground() must not publish stale magnifier state after cursor/pass-through is enabled');
  hasError = true;
} else {
  console.log('[PASS] captureMagnifierBackground() ignores stale captures outside magnifier mode');
}

if (hasError) {
  console.error('Tool State verification failed!');
  process.exit(1);
} else {
  console.log('Tool State verified successfully!');
  process.exit(0);
}
