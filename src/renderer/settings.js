const DEFAULT_SETTINGS = {
  brushDefaults: {
    pen: {
      color: '#ff5a5f',
      width: 4,
      opacity: 1,
    },
    highlighter: {
      color: '#ffe36d',
      width: 18,
      opacity: 0.3,
    },
    eraser: {
      radius: 18,
    },
  },
  exportDefaults: {
    format: 'png',
    quality: 0.9,
    includeBackground: false,
    autoSavePath: '',
    copyToClipboard: true,
  },
  spotlight: {
    radius: 150,
    alpha: 0.75,
  },
  hotkeys: {
    toggleOverlay: 'CommandOrControl+Alt+H',
    togglePassThrough: 'CommandOrControl+Shift+P',
    pen: 'CommandOrControl+Shift+1',
    highlighter: 'CommandOrControl+Shift+2',
    shapes: 'CommandOrControl+Shift+4',
    laser: 'CommandOrControl+Shift+L',
    text: 'CommandOrControl+Shift+T',
    select: 'CommandOrControl+Alt+V',
    cycleBackground: 'CommandOrControl+Shift+B',
    toggleClickHalo: 'CommandOrControl+Shift+K',
    eraser: 'CommandOrControl+Shift+3',
    undo: 'CommandOrControl+Shift+Z',
    redo: 'CommandOrControl+Shift+Y',
    clear: 'CommandOrControl+Alt+C',
    openSettings: 'CommandOrControl+Shift+O',
    takeScreenshot: 'CommandOrControl+Shift+S',
    revertAutoShape: 'CommandOrControl+Shift+R',
    saveSession: 'CommandOrControl+Alt+S',
    loadSession: 'CommandOrControl+Alt+O',
    prevPage: 'CommandOrControl+Alt+Left',
    nextPage: 'CommandOrControl+Alt+Right',
  },
};

const ACTIONS = [
  { key: 'toggleOverlay', label: 'Toggle overlay', description: 'Show or hide the annotation overlay.' },
  { key: 'togglePassThrough', label: 'Toggle pass-through', description: 'Switch between drawing and normal desktop clicks.' },
  { key: 'pen', label: 'Pen tool', description: 'Activate the freehand pen.' },
  { key: 'highlighter', label: 'Highlighter tool', description: 'Activate the highlight brush.' },
  { key: 'shapes', label: 'Magic Shapes tool', description: 'Activate freehand smart shape recognition.' },
  { key: 'laser', label: 'Laser tool', description: 'Activate the laser pointer.' },
  { key: 'text', label: 'Text tool', description: 'Activate text note annotation.' },
  { key: 'select', label: 'Move / Select tool', description: 'Activate lasso select and move.' },
  { key: 'cycleBackground', label: 'Cycle background', description: 'Cycle through whiteboard, blackboard, grid, and transparent backgrounds.' },
  { key: 'toggleClickHalo', label: 'Toggle click halo', description: 'Show or hide pointer click rings.' },
  { key: 'eraser', label: 'Eraser tool', description: 'Activate the eraser.' },
  { key: 'undo', label: 'Undo', description: 'Revert the last annotation change.' },
  { key: 'redo', label: 'Redo', description: 'Restore the last undone change.' },
  { key: 'clear', label: 'Clear annotations', description: 'Remove all annotations from the current scene.' },
  { key: 'openSettings', label: 'Open settings', description: 'Show this settings window.' },
  { key: 'takeScreenshot', label: 'Take screenshot', description: 'Capture screen or annotations.' },
  { key: 'revertAutoShape', label: 'Revert auto-shape', description: 'Toggle between auto-recognized perfect shape and original freehand drawing.' },
  { key: 'saveSession', label: 'Save notebook session', description: 'Save all notebook pages to a .rpen file.' },
  { key: 'loadSession', label: 'Open notebook session', description: 'Open a multi-page .rpen or .ink session.' },
  { key: 'prevPage', label: 'Previous notebook page', description: 'Go to the previous page in the notebook.' },
  { key: 'nextPage', label: 'Next / New notebook page', description: 'Go to the next page or create a new blank page.' },
];

const elements = {
  overlayStatus: document.getElementById('overlayStatus'),
  toolStatus: document.getElementById('toolStatus'),
  passThroughStatus: document.getElementById('passThroughStatus'),
  closeButton: document.getElementById('closeButton'),
  cancelButton: document.getElementById('cancelButton'),
  saveButton: document.getElementById('saveButton'),
  resetButton: document.getElementById('resetButton'),
  message: document.getElementById('message'),
  hotkeyList: document.getElementById('hotkeyList'),
  penColor: document.getElementById('penColor'),
  penWidth: document.getElementById('penWidth'),
  penOpacity: document.getElementById('penOpacity'),
  highlighterColor: document.getElementById('highlighterColor'),
  highlighterWidth: document.getElementById('highlighterWidth'),
  highlighterOpacity: document.getElementById('highlighterOpacity'),
  eraserRadius: document.getElementById('eraserRadius'),
  exportFormat: document.getElementById('exportFormat'),
  exportQuality: document.getElementById('exportQuality'),
  qualityVal: document.getElementById('qualityVal'),
  qualityContainer: document.getElementById('qualityContainer'),
  exportIncludeBackground: document.getElementById('exportIncludeBackground'),
  exportCopyToClipboard: document.getElementById('exportCopyToClipboard'),
  exportAutoSavePath: document.getElementById('exportAutoSavePath'),
  browsePathButton: document.getElementById('browsePathButton'),
  clearPathButton: document.getElementById('clearPathButton'),
  confirmModal: document.getElementById('confirmModal'),
  modalCancelButton: document.getElementById('modalCancelButton'),
  modalDiscardButton: document.getElementById('modalDiscardButton'),
  modalSaveButton: document.getElementById('modalSaveButton'),
};

const appState = {
  overlayVisible: true,
  passThrough: true,
  activeTool: 'pen',
};

let draft = clone(DEFAULT_SETTINGS);
let captureAction = null;
let dirty = false;
let saving = false;
let allowClose = false;
const hotkeyButtons = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeAppState(nextAppState = {}) {
  return {
    overlayVisible: Boolean(nextAppState.overlayVisible),
    passThrough: Boolean(nextAppState.passThrough),
    activeTool: nextAppState.activeTool || 'pen',
    brushDefaults: {
      pen: {
        ...DEFAULT_SETTINGS.brushDefaults.pen,
        ...(((nextAppState.brushDefaults || {}).pen) || {}),
      },
      highlighter: {
        ...DEFAULT_SETTINGS.brushDefaults.highlighter,
        ...(((nextAppState.brushDefaults || {}).highlighter) || {}),
      },
      eraser: {
        ...DEFAULT_SETTINGS.brushDefaults.eraser,
        ...(((nextAppState.brushDefaults || {}).eraser) || {}),
      },
    },
    hotkeys: {
      ...DEFAULT_SETTINGS.hotkeys,
      ...(nextAppState.hotkeys || {}),
    },
    exportDefaults: {
      ...DEFAULT_SETTINGS.exportDefaults,
      ...(nextAppState.exportDefaults || {}),
    },
  };
}

function buildDraftFromAppState(nextAppState) {
  return normalizeAppState(nextAppState);
}

function formatAccelerator(accelerator) {
  if (!accelerator) {
    return 'Not set';
  }

  return accelerator
    .replaceAll('CommandOrControl', 'Ctrl')
    .replaceAll('Control', 'Ctrl')
    .replaceAll('Super', 'Win')
    .replaceAll('Option', 'Alt')
    .replaceAll('AltGr', 'AltGr');
}

function keyFromEvent(event) {
  const codeMap = {
    Escape: 'Esc',
    Space: 'Space',
    Enter: 'Enter',
    Tab: 'Tab',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Minus: '-',
    Equal: '=',
    Comma: ',',
    Period: '.',
    Slash: '/',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    BracketLeft: '[',
    BracketRight: ']',
    Backquote: '`',
  };

  if (codeMap[event.code]) {
    return codeMap[event.code];
  }

  if (/^Key[A-Z]$/.test(event.code)) {
    return event.code.slice(3);
  }

  if (/^Digit[0-9]$/.test(event.code)) {
    return event.code.slice(5);
  }

  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(event.code)) {
    return event.code;
  }

  if (/^Numpad[0-9]$/.test(event.code)) {
    return event.code.replace('Numpad', 'Num');
  }

  return null;
}

function eventToAccelerator(event) {
  const modifiers = [];
  if (event.ctrlKey || event.metaKey) {
    modifiers.push('CommandOrControl');
  }
  if (event.altKey) {
    modifiers.push('Alt');
  }
  if (event.shiftKey) {
    modifiers.push('Shift');
  }

  const key = keyFromEvent(event);
  if (!key) {
    return null;
  }

  if (['Shift', 'Control', 'Alt', 'Meta', 'Command', 'CommandOrControl'].includes(key)) {
    return null;
  }

  return [...modifiers, key].join('+');
}

function setMessage(text, kind = 'info') {
  elements.message.textContent = text;
  elements.message.dataset.kind = kind;
}

function updateSummary() {
  elements.overlayStatus.textContent = appState.overlayVisible ? 'Overlay on' : 'Overlay hidden';
  elements.toolStatus.textContent =
    appState.activeTool.charAt(0).toUpperCase() + appState.activeTool.slice(1);
  elements.passThroughStatus.textContent = appState.passThrough ? 'Pass-through on' : 'Draw mode on';
}

function setFieldValue(element, value) {
  if (!element) {
    return;
  }
  element.value = String(value);
}

function renderBrushControls() {
  setFieldValue(elements.penColor, draft.brushDefaults.pen.color);
  setFieldValue(elements.penWidth, draft.brushDefaults.pen.width);
  setFieldValue(elements.penOpacity, draft.brushDefaults.pen.opacity);
  setFieldValue(elements.highlighterColor, draft.brushDefaults.highlighter.color);
  setFieldValue(elements.highlighterWidth, draft.brushDefaults.highlighter.width);
  setFieldValue(elements.highlighterOpacity, draft.brushDefaults.highlighter.opacity);
  setFieldValue(elements.eraserRadius, draft.brushDefaults.eraser.radius);

  if (elements.exportFormat && draft.exportDefaults) {
    elements.exportFormat.value = draft.exportDefaults.format || 'png';
    elements.exportQuality.value = draft.exportDefaults.quality || 0.9;
    elements.qualityVal.textContent = Math.round((draft.exportDefaults.quality || 0.9) * 100) + '%';
    elements.qualityContainer.style.display = draft.exportDefaults.format === 'png' ? 'none' : 'flex';
    elements.exportIncludeBackground.checked = Boolean(draft.exportDefaults.includeBackground);
    elements.exportCopyToClipboard.checked = Boolean(draft.exportDefaults.copyToClipboard);
    elements.exportAutoSavePath.value = draft.exportDefaults.autoSavePath || '';
  }
}

function getHotkeyConflicts() {
  const counts = new Map();
  for (const [action, acc] of Object.entries(draft.hotkeys || {})) {
    if (!acc) continue;
    const norm = acc.toLowerCase();
    counts.set(norm, (counts.get(norm) || 0) + 1);
  }
  const conflicts = new Set();
  for (const [action, acc] of Object.entries(draft.hotkeys || {})) {
    if (!acc) continue;
    const norm = acc.toLowerCase();
    if (counts.get(norm) > 1) {
      conflicts.add(action);
    }
  }
  return conflicts;
}

function updateConflictIndicators() {
  const conflicts = getHotkeyConflicts();
  for (const [actionKey, button] of hotkeyButtons.entries()) {
    const isConflict = conflicts.has(actionKey);
    button.classList.toggle('conflict', isConflict);
    const row = button.closest('.hotkey-row');
    if (row) {
      row.classList.toggle('conflict-row', isConflict);
    }
  }
  if (conflicts.size > 0) {
    setMessage('Hotkey conflict detected! Multiple actions share the same shortcut.', 'error');
  }
}

function updateHotkeyButton(actionKey) {
  const button = hotkeyButtons.get(actionKey);
  if (!button) {
    return;
  }

  const value = draft.hotkeys[actionKey];
  button.textContent = captureAction === actionKey ? 'Press keys...' : formatAccelerator(value);
  button.classList.toggle('capturing', captureAction === actionKey);
  updateConflictIndicators();
}

function renderHotkeys() {
  elements.hotkeyList.innerHTML = '';
  hotkeyButtons.clear();

  for (const action of ACTIONS) {
    const row = document.createElement('article');
    row.className = 'hotkey-row';

    const title = document.createElement('div');
    title.className = 'hotkey-title';
    title.innerHTML = `<strong>${action.label}</strong><span>${action.description}</span>`;

    const captureButton = document.createElement('button');
    captureButton.type = 'button';
    captureButton.className = 'hotkey-capture';
    captureButton.dataset.action = action.key;
    captureButton.addEventListener('click', () => beginCapture(action.key));
    hotkeyButtons.set(action.key, captureButton);

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'secondary-button hotkey-clear';
    clearButton.textContent = 'Clear';
    clearButton.addEventListener('click', () => {
      draft.hotkeys[action.key] = '';
      dirty = true;
      setMessage(`${action.label} cleared. Save to apply.`, 'info');
      updateHotkeyButton(action.key);
      updateSaveState();
    });

    row.appendChild(title);
    row.appendChild(captureButton);
    row.appendChild(clearButton);
    elements.hotkeyList.appendChild(row);

    updateHotkeyButton(action.key);
  }
  updateConflictIndicators();
}

function updateSaveState() {
  elements.saveButton.disabled = saving;
  elements.resetButton.disabled = saving;
  elements.cancelButton.disabled = saving;
  elements.closeButton.disabled = saving;
  elements.saveButton.textContent = saving ? 'Saving...' : 'Save changes';
}

function markDirty() {
  dirty = true;
  setMessage('Changes are not saved yet.', 'info');
}

function beginCapture(actionKey) {
  captureAction = actionKey;
  setMessage('Press a new shortcut, or Esc to cancel. Backspace clears the binding.', 'info');
  updateHotkeyButton(actionKey);
}

function finishCapture() {
  if (!captureAction) {
    return;
  }

  const actionKey = captureAction;
  captureAction = null;
  updateHotkeyButton(actionKey);
}

function applyDraftToUi() {
  renderBrushControls();
  renderHotkeys();
  updateSummary();
}

function loadDraft(nextState) {
  draft = buildDraftFromAppState(nextState);
  dirty = false;
  allowClose = false;
  captureAction = null;
  applyDraftToUi();
  setMessage('Changes are local until you save them.', 'info');
  updateSaveState();
}

function collectDraftFromUi() {
  draft.brushDefaults.pen.color = elements.penColor.value;
  draft.brushDefaults.pen.width = Number(elements.penWidth.value);
  draft.brushDefaults.pen.opacity = Number(elements.penOpacity.value);
  draft.brushDefaults.highlighter.color = elements.highlighterColor.value;
  draft.brushDefaults.highlighter.width = Number(elements.highlighterWidth.value);
  draft.brushDefaults.highlighter.opacity = Number(elements.highlighterOpacity.value);
  draft.brushDefaults.eraser.radius = Number(elements.eraserRadius.value);

  if (elements.exportFormat && draft.exportDefaults) {
    draft.exportDefaults.format = elements.exportFormat.value;
    draft.exportDefaults.quality = Number(elements.exportQuality.value);
    draft.exportDefaults.includeBackground = elements.exportIncludeBackground.checked;
    draft.exportDefaults.copyToClipboard = elements.exportCopyToClipboard.checked;
    draft.exportDefaults.autoSavePath = elements.exportAutoSavePath.value;
  }
}

async function saveChanges() {
  if (saving) {
    return false;
  }

  collectDraftFromUi();

  const conflicts = getHotkeyConflicts();
  if (conflicts.size > 0) {
    setMessage('Cannot save: Please resolve hotkey conflicts before saving.', 'error');
    return false;
  }
  saving = true;
  updateSaveState();
  setMessage('Saving settings...', 'info');

  const result = await window.appBridge.saveSettings(clone(draft));
  saving = false;
  updateSaveState();

  if (!result.ok) {
    const latest = await window.appBridge.getSettings();
    draft = buildDraftFromAppState(latest.appState || {});
    dirty = false;
    captureAction = null;
    applyDraftToUi();
    const failed = result.failures.map((entry) => `${entry.name} (${formatAccelerator(entry.accelerator)})`).join(', ');
    setMessage(`Could not register: ${failed}. Your previous shortcuts were restored.`, 'error');
    return false;
  }

  dirty = false;
  setMessage('Settings saved successfully.', 'success');
  return true;
}

function resetToDefaults() {
  draft = clone(DEFAULT_SETTINGS);
  dirty = true;
  captureAction = null;
  applyDraftToUi();
  setMessage('Defaults restored in the form. Save to apply them.', 'info');
  updateSaveState();
}

elements.penColor.addEventListener('input', () => {
  draft.brushDefaults.pen.color = elements.penColor.value;
  markDirty();
});

elements.penWidth.addEventListener('input', () => {
  draft.brushDefaults.pen.width = Number(elements.penWidth.value);
  markDirty();
});

elements.penOpacity.addEventListener('input', () => {
  draft.brushDefaults.pen.opacity = Number(elements.penOpacity.value);
  markDirty();
});

elements.highlighterColor.addEventListener('input', () => {
  draft.brushDefaults.highlighter.color = elements.highlighterColor.value;
  markDirty();
});

elements.highlighterWidth.addEventListener('input', () => {
  draft.brushDefaults.highlighter.width = Number(elements.highlighterWidth.value);
  markDirty();
});

elements.highlighterOpacity.addEventListener('input', () => {
  draft.brushDefaults.highlighter.opacity = Number(elements.highlighterOpacity.value);
  markDirty();
});

elements.eraserRadius.addEventListener('input', () => {
  draft.brushDefaults.eraser.radius = Number(elements.eraserRadius.value);
  markDirty();
});

if (elements.exportFormat) {
  elements.exportFormat.addEventListener('change', () => {
    if (draft.exportDefaults) {
      draft.exportDefaults.format = elements.exportFormat.value;
      elements.qualityContainer.style.display = elements.exportFormat.value === 'png' ? 'none' : 'flex';
      markDirty();
    }
  });

  elements.exportQuality.addEventListener('input', () => {
    if (draft.exportDefaults) {
      draft.exportDefaults.quality = Number(elements.exportQuality.value);
      elements.qualityVal.textContent = Math.round(draft.exportDefaults.quality * 100) + '%';
      markDirty();
    }
  });

  elements.exportIncludeBackground.addEventListener('change', () => {
    if (draft.exportDefaults) {
      draft.exportDefaults.includeBackground = elements.exportIncludeBackground.checked;
      markDirty();
    }
  });

  elements.exportCopyToClipboard.addEventListener('change', () => {
    if (draft.exportDefaults) {
      draft.exportDefaults.copyToClipboard = elements.exportCopyToClipboard.checked;
      markDirty();
    }
  });

  elements.browsePathButton.addEventListener('click', async () => {
    const dir = await window.appBridge.selectDirectory();
    if (dir && draft.exportDefaults) {
      draft.exportDefaults.autoSavePath = dir;
      elements.exportAutoSavePath.value = dir;
      markDirty();
    }
  });

  elements.clearPathButton.addEventListener('click', () => {
    if (draft.exportDefaults) {
      draft.exportDefaults.autoSavePath = '';
      elements.exportAutoSavePath.value = '';
      markDirty();
    }
  });
}

function showConfirmModal() {
  if (!elements.confirmModal) {
    return;
  }
  elements.confirmModal.classList.add('open');
  elements.confirmModal.setAttribute('aria-hidden', 'false');
  if (elements.modalSaveButton) {
    elements.modalSaveButton.focus();
  }
}

function hideConfirmModal() {
  if (!elements.confirmModal) {
    return;
  }
  elements.confirmModal.classList.remove('open');
  elements.confirmModal.setAttribute('aria-hidden', 'true');
}

function requestClose() {
  if (!dirty || allowClose) {
    allowClose = true;
    window.close();
    return;
  }
  showConfirmModal();
}

elements.saveButton.addEventListener('click', saveChanges);
elements.resetButton.addEventListener('click', resetToDefaults);
elements.cancelButton.addEventListener('click', () => requestClose());
elements.closeButton.addEventListener('click', () => requestClose());

if (elements.modalCancelButton) {
  elements.modalCancelButton.addEventListener('click', () => {
    hideConfirmModal();
  });
}

if (elements.modalDiscardButton) {
  elements.modalDiscardButton.addEventListener('click', async () => {
    hideConfirmModal();
    try {
      const payload = await window.appBridge.getSettings();
      loadDraft((payload && payload.appState) || {});
    } catch {
      dirty = false;
    }
    allowClose = true;
    window.close();
  });
}

if (elements.modalSaveButton) {
  elements.modalSaveButton.addEventListener('click', async () => {
    const success = await saveChanges();
    if (success) {
      hideConfirmModal();
      allowClose = true;
      window.close();
    } else {
      hideConfirmModal();
    }
  });
}

if (elements.confirmModal) {
  elements.confirmModal.addEventListener('click', (event) => {
    if (event.target === elements.confirmModal) {
      hideConfirmModal();
    }
  });
}

window.addEventListener('beforeunload', (event) => {
  if (dirty && !allowClose) {
    event.returnValue = false;
    showConfirmModal();
  }
});

window.addEventListener('keydown', (event) => {
  if (!captureAction && event.key === 'Escape') {
    if (elements.confirmModal && elements.confirmModal.classList.contains('open')) {
      hideConfirmModal();
      return;
    }
    requestClose();
    return;
  }

  if (!captureAction) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (event.key === 'Escape') {
    setMessage('Shortcut capture cancelled.', 'info');
    finishCapture();
    return;
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    draft.hotkeys[captureAction] = '';
    dirty = true;
    setMessage('Shortcut cleared. Save to apply.', 'info');
    updateHotkeyButton(captureAction);
    finishCapture();
    updateSaveState();
    return;
  }

  const accelerator = eventToAccelerator(event);
  if (!accelerator) {
    return;
  }

  draft.hotkeys[captureAction] = accelerator;
  dirty = true;
  setMessage(`Captured ${formatAccelerator(accelerator)} for ${captureAction}. Save to apply.`, 'success');
  updateHotkeyButton(captureAction);
  finishCapture();
  updateSaveState();
});

window.addEventListener('click', (event) => {
  if (captureAction) {
    const target = event.target;
    if (target && target.closest && target.closest('.hotkey-capture')) {
      return;
    }
    event.preventDefault();
  }
});

window.appBridge.onStateChanged((nextAppState) => {
  appState.overlayVisible = Boolean(nextAppState.overlayVisible);
  appState.passThrough = Boolean(nextAppState.passThrough);
  appState.activeTool = nextAppState.activeTool || 'pen';
  updateSummary();
});

window.appBridge.getSettings().then((payload) => {
  const nextAppState = payload.appState || {};
  appState.overlayVisible = Boolean(nextAppState.overlayVisible);
  appState.passThrough = Boolean(nextAppState.passThrough);
  appState.activeTool = nextAppState.activeTool || 'pen';
  loadDraft(nextAppState);
});
