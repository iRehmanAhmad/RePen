const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, '../main.js');
const mainContent = fs.readFileSync(mainPath, 'utf8');

let hasError = false;

console.log('--- Verifying Scene Store Separation ---');

const loadStateMatch = mainContent.match(/function loadState\(\) \{([\s\S]*?)\n\}/);
if (!loadStateMatch) {
  console.error('[FAIL] loadState() was not found in main.js');
  hasError = true;
} else {
  const loadStateBody = loadStateMatch[1];
  const transparentResetIndex = loadStateBody.indexOf("state.backgroundMode = 'transparent';");
  const desktopAnnotationIndex = loadStateBody.indexOf('annotations = desktopPage.annotations;', transparentResetIndex);
  const desktopUndoIndex = loadStateBody.indexOf('undoStack = desktopPage.undoStack;', transparentResetIndex);
  const desktopRedoIndex = loadStateBody.indexOf('redoStack = desktopPage.redoStack;', transparentResetIndex);

  if (transparentResetIndex === -1) {
    console.error('[FAIL] loadState() does not explicitly reset startup backgroundMode to transparent');
    hasError = true;
  } else if (desktopAnnotationIndex === -1 || desktopUndoIndex === -1 || desktopRedoIndex === -1) {
    console.error('[FAIL] loadState() resets to transparent without rebinding the active scene to desktopPage');
    hasError = true;
  } else {
    console.log('[PASS] loadState() transparent startup rebinds active scene to desktopPage');
  }
}

const setBackgroundModeMatch = mainContent.match(/function setBackgroundMode\(mode\) \{([\s\S]*?)\n\}/);
if (!setBackgroundModeMatch) {
  console.error('[FAIL] setBackgroundMode() was not found in main.js');
  hasError = true;
} else {
  const body = setBackgroundModeMatch[1];
  const requiredSnippets = [
    'syncPageStore();',
    "if (newMode === 'transparent')",
    'annotations = desktopPage.annotations || [];',
    'undoStack = desktopPage.undoStack || [];',
    'redoStack = desktopPage.redoStack || [];',
    'annotations = page.annotations || [];',
  ];

  for (const snippet of requiredSnippets) {
    if (!body.includes(snippet)) {
      console.error(`[FAIL] setBackgroundMode() missing scene-store transition snippet: ${snippet}`);
      hasError = true;
    }
  }

  if (!hasError) {
    console.log('[PASS] setBackgroundMode() swaps between desktopPage and board pages');
  }
}

if (hasError) {
  console.error('Scene store separation verification failed!');
  process.exit(1);
}

console.log('Scene store separation verified successfully!');
