const fs = require('fs');
const path = require('path');

const toolbarHtmlPath = path.join(__dirname, '../src/renderer/toolbar.html');
const overlayHtmlPath = path.join(__dirname, '../src/renderer/overlay.html');
const mainPath = path.join(__dirname, '../main.js');
const toolbarJsPath = path.join(__dirname, '../src/renderer/toolbar.js');
const preloadPath = path.join(__dirname, '../src/preload.js');

const htmlContent = fs.readFileSync(toolbarHtmlPath, 'utf8');
const overlayHtmlContent = fs.readFileSync(overlayHtmlPath, 'utf8');
const mainContent = fs.readFileSync(mainPath, 'utf8');
const toolbarJsContent = fs.readFileSync(toolbarJsPath, 'utf8');
const preloadContent = fs.readFileSync(preloadPath, 'utf8');

// Extract all data-tool="..." and data-subtool="..." attributes in toolbar.html
const toolRegex = /data-(?:tool|subtool)=['"]([^'"]+)['"]/g;
let match;
const htmlTools = new Set();
while ((match = toolRegex.exec(htmlContent)) !== null) {
  htmlTools.add(match[1]);
}

// In main.js, find the list of tools handled in setTool
// Look for strings inside setTool function or check known tools
const knownToolsInMain = ['cursor', 'pen', 'highlighter', 'eraser', 'shapes', 'laser', 'text', 'select', 'spotlight', 'magnifier', 'calligraphy'];

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
const trayIconPath = path.join(__dirname, '../src/renderer/assets/tray-icon.png');
const appIconPath = path.join(__dirname, '../src/renderer/assets/app-icon.png');

if (!fs.existsSync(trayIconPath) || fs.statSync(trayIconPath).size < 512 || !/tray-icon\.png/.test(mainContent)) {
  console.error('[FAIL] Windows tray must use a real PNG asset before SVG fallback');
  hasError = true;
} else {
  console.log('[PASS] Windows tray uses a real PNG icon asset');
}

if (!fs.existsSync(appIconPath) || fs.statSync(appIconPath).size < 1024 || !/function\s+createAppIcon/.test(mainContent) || !/app-icon\.png/.test(mainContent)) {
  console.error('[FAIL] Main app windows must use a distinct app PNG icon instead of the compact tray icon');
  hasError = true;
} else {
  console.log('[PASS] Main app windows use a distinct PNG app icon');
}

if (/const\s+SELECT_TOOLS\s*=\s*\[[^\]]*['"]select['"]/.test(toolbarJsContent)) {
  console.error('[FAIL] Select/move should be routed through the cursor button, not exposed as a separate view-group primary tool');
  hasError = true;
} else {
  console.log('[PASS] Select/move is not exposed as a separate view-group primary tool');
}

const cursorButtonHandler = toolbarJsContent.match(/elements\.togglePassThrough\.addEventListener\('click',\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\}\);/);
const cursorButtonBody = cursorButtonHandler ? cursorButtonHandler[1] : '';
if (!/setPassThrough\(true\)/.test(cursorButtonBody) || /setTool\(['"]select['"]\)/.test(cursorButtonBody)) {
  console.error('[FAIL] Cursor button must enable desktop pass-through directly instead of entering select/move mode');
  hasError = true;
} else {
  console.log('[PASS] Cursor button enables desktop pass-through directly');
}

if (!/resetInteractionState\('background mode changed'\)/.test(overlayContent)) {
  console.error('[FAIL] overlay.js must reset interaction state on backgroundMode changes');
  hasError = true;
} else {
  console.log('[PASS] overlay.js resets interaction state on backgroundMode changes');
}

if (!/let\s+cleanupScreenshotMode\s*=\s*null/.test(overlayContent) || !/function\s+cancelScreenshotMode\s*\(/.test(overlayContent)) {
  console.error('[FAIL] overlay.js must expose a reusable screenshot-mode cleanup path');
  hasError = true;
} else {
  console.log('[PASS] overlay.js has reusable screenshot-mode cleanup');
}

if (!/prevTool\s*!==\s*appState\.activeTool\s*\|\|\s*prevPassThrough\s*!==\s*appState\.passThrough[\s\S]*cancelScreenshotMode\(true\)/.test(overlayContent)) {
  console.error('[FAIL] overlay.js must cancel screenshot mode when tool/pass-through state changes');
  hasError = true;
} else {
  console.log('[PASS] overlay.js cancels screenshot mode on tool/pass-through changes');
}

if (!/function\s+hexToRgba\s*\([^)]*\)\s*\{[\s\S]*typeof\s+hex\s*===\s*['"]string['"][\s\S]*['"]#ff5a5f['"]/.test(overlayContent)) {
  console.error('[FAIL] hexToRgba() must tolerate missing stroke colors so one malformed annotation cannot break drawing');
  hasError = true;
} else {
  console.log('[PASS] hexToRgba() tolerates missing stroke colors');
}

if (!/segmentToSegmentDistance/.test(mainContent)) {
  console.error('[FAIL] main.js must use segmentToSegmentDistance for accurate erasing');
  hasError = true;
} else {
  console.log('[PASS] main.js uses segmentToSegmentDistance for accurate erasing');
}

const exportPdfMatch = mainContent.match(/async\s+function\s+exportPdf\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
const exportPdfBody = exportPdfMatch ? exportPdfMatch[1] : '';
if (!/syncPageStore\(\)/.test(exportPdfBody) || !/pages\.map/.test(exportPdfBody) || !/buildPdfExportHtml/.test(exportPdfBody)) {
  console.error('[FAIL] exportPdf() must export all stored notebook pages via a dedicated PDF render document');
  hasError = true;
} else {
  console.log('[PASS] exportPdf() exports stored notebook pages through a dedicated render document');
}

if (/async\s+function\s+exportPdf\s*\([^)]*\)\s*\{[\s\S]*overlayWindows[\s\S]*printToPDF/.test(mainContent)) {
  console.error('[FAIL] exportPdf() must not print the live overlay window because it captures only the visible page and UI controls');
  hasError = true;
} else {
  console.log('[PASS] exportPdf() avoids printing the live overlay window');
}

if (!/function\s+getPdfPageBounds\s*\([^)]*\)\s*\{[\s\S]*maxRight[\s\S]*pageAnnotations[\s\S]*width:\s*Math\.max/.test(mainContent) || !/buildPdfExportHtml[\s\S]*getPdfPageBounds\(pageAnnotations,\s*bounds\)/.test(mainContent)) {
  console.error('[FAIL] PDF export must widen each page from its annotation extents so right-side board drawings are not clipped');
  hasError = true;
} else {
  console.log('[PASS] PDF export expands each page to include right-side board drawings');
}

if (!/boardViewport:\s*\{[\s\S]*x:\s*0[\s\S]*zoom:\s*1/.test(mainContent) || !/function\s+normalizeBoardViewport/.test(mainContent) || !/ipcMain\.handle\(['"]app:set-board-viewport['"]/.test(mainContent)) {
  console.error('[FAIL] main.js must own a clamped boardViewport state and IPC setter for board pan/zoom');
  hasError = true;
} else {
  console.log('[PASS] main.js owns clamped board viewport state');
}

if (!/setBoardViewport:\s*\(viewport\)\s*=>\s*ipcRenderer\.invoke\(['"]app:set-board-viewport['"]/.test(preloadContent)) {
  console.error('[FAIL] preload.js must expose setBoardViewport() to the overlay');
  hasError = true;
} else {
  console.log('[PASS] preload.js exposes board viewport IPC');
}

if (!/function\s+globalToLocal\s*\([^)]*\)\s*\{[\s\S]*getBoardViewport\(\)[\s\S]*viewport\.zoom/.test(overlayContent) || !/function\s+localToGlobal\s*\([^)]*\)\s*\{[\s\S]*getBoardViewport\(\)[\s\S]*viewport\.zoom/.test(overlayContent)) {
  console.error('[FAIL] overlay.js must map board coordinates through boardViewport for infinite-right drawing');
  hasError = true;
} else {
  console.log('[PASS] overlay.js maps board drawing through boardViewport');
}

if (!/id=["']boardPanRightButton["']/.test(overlayHtmlContent) || !/id=["']boardZoomInButton["']/.test(overlayHtmlContent)) {
  console.error('[FAIL] overlay.html must provide compact pan and zoom controls in the board toolbar');
  hasError = true;
} else {
  console.log('[PASS] overlay.html provides compact board pan/zoom controls');
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

if (/state\.activeTool\s*=\s*['"]select['"]/.test(mainContent.match(/function\s+setPassThrough\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/)?.[1] || '')) {
  console.error('[FAIL] setPassThrough(false) must not restore select/move from cursor mode');
  hasError = true;
} else {
  console.log('[PASS] setPassThrough(false) does not restore select/move from cursor mode');
}

if (!/function\s+setPassThrough\s*\([^)]*\)\s*\{[\s\S]*state\.magnifierBgUrls\s*=\s*null/.test(mainContent)) {
  console.error('[FAIL] setPassThrough() must clear magnifier background state when cursor mode is enabled');
  hasError = true;
} else {
  console.log('[PASS] setPassThrough() clears magnifier background state');
}

if (!/brushDefaults:\s*\{[\s\S]*calligraphy:\s*\{[\s\S]*color:\s*['"]#ff5a5f['"]/.test(mainContent)) {
  console.error('[FAIL] DEFAULT_STATE must include a non-red calligraphy brush default aligned with the regular pen color');
  hasError = true;
} else {
  console.log('[PASS] DEFAULT_STATE includes calligraphy brush defaults aligned with pen color');
}

const setToolMatch = mainContent.match(/function\s+setTool\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
const setToolBody = setToolMatch ? setToolMatch[1] : '';
if (!/tool\s*===\s*['"]calligraphy['"][\s\S]*state\.brushDefaults\.calligraphy\.color\s*=\s*previousBrush\.color/.test(setToolBody)) {
  console.error('[FAIL] setTool() must carry the current ink color into calligraphy instead of reverting to red');
  hasError = true;
} else {
  console.log('[PASS] setTool() carries current ink color into calligraphy');
}

if (!/function\s+captureMagnifierBackground\s*\([^)]*\)\s*\{[\s\S]*state\.activeTool\s*!==\s*['"]magnifier['"][\s\S]*state\.passThrough[\s\S]*state\.magnifierBgUrls\s*=\s*null/.test(mainContent)) {
  console.error('[FAIL] captureMagnifierBackground() must not publish stale magnifier state after cursor/pass-through is enabled');
  hasError = true;
} else {
  console.log('[PASS] captureMagnifierBackground() ignores stale captures outside magnifier mode');
}

const updateOverlayIgnoreMouseMatch = mainContent.match(/function\s+updateOverlayIgnoreMouse\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
const updateOverlayIgnoreMouseBody = updateOverlayIgnoreMouseMatch ? updateOverlayIgnoreMouseMatch[1] : '';
if (/activeTool\s*===\s*['"](laser|spotlight|magnifier)['"]/.test(updateOverlayIgnoreMouseBody)) {
  console.error('[FAIL] laser, spotlight, and magnifier must receive pointer events; do not ignore overlay mouse input for those tools');
  hasError = true;
} else {
  console.log('[PASS] pointer-driven presentation tools keep overlay mouse input enabled');
}

if (!/setFocusable\(!shouldIgnore\)/.test(updateOverlayIgnoreMouseBody)) {
  console.error('[FAIL] overlay windows must remain focusable for every active non-pass-through tool so drawing input is captured after tool switches');
  hasError = true;
} else {
  console.log('[PASS] overlay windows stay focusable for active drawing and editing tools');
}

for (const [fnName, field] of [
  ['setColor', 'color'],
  ['setWidth', 'width'],
  ['setOpacity', 'opacity'],
]) {
  const fnMatch = mainContent.match(new RegExp(`function\\s+${fnName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
  const fnBody = fnMatch ? fnMatch[1] : '';
  const expected = new RegExp(`state\\.activeTool\\s*===\\s*['"]calligraphy['"][\\s\\S]*state\\.brushDefaults\\.calligraphy\\.${field}`);
  if (!expected.test(fnBody)) {
    console.error(`[FAIL] ${fnName}() must update calligraphy ${field} when calligraphy is active`);
    hasError = true;
  } else {
    console.log(`[PASS] ${fnName}() updates calligraphy ${field}`);
  }
}

if (hasError) {
  console.error('Tool State verification failed!');
  process.exit(1);
} else {
  console.log('Tool State verified successfully!');
  process.exit(0);
}
