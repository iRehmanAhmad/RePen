const COLORS = ['#ff5a5f', '#ffe36d', '#00d26a', '#3b82f6', '#ffffff'];

const INKING_TOOLS = ['pen', 'highlighter', 'calligraphy', 'laser', 'text'];
const INKING_ICONS = {
  pen: '<path d="M62.828,12.482L51.514,1.168c-1.562-1.562-4.093-1.562-5.657,0.001c0,0-44.646,44.646-45.255,45.255C-0.006,47.031,0,47.996,0,47.996l0.001,13.999c0,1.105,0.896,2,1.999,2.001h4.99c0.003,0,9.01,0,9.01,0s0.963,0.008,1.572-0.602s45.256-45.257,45.256-45.257C64.392,16.575,64.392,14.046,62.828,12.482z M37.356,12.497l3.535,3.536L6.95,49.976l-3.536-3.536L37.356,12.497z M8.364,51.39l33.941-33.942l4.243,4.243L12.606,55.632L8.364,51.39z M3.001,61.995c-0.553,0-1.001-0.446-1-0.999v-1.583l2.582,2.582H3.001z M7.411,61.996l-5.41-5.41l0.001-8.73l14.141,14.141H7.411z M17.557,60.582l-3.536-3.536l33.942-33.94l3.535,3.535L17.557,60.582z M52.912,25.227L38.771,11.083l2.828-2.828l14.143,14.143L52.912,25.227z M61.414,16.725l-4.259,4.259L43.013,6.841l4.258-4.257c0.782-0.782,2.049-0.782,2.829-0.002l11.314,11.314C62.195,14.678,62.194,15.943,61.414,16.725z"/>',
  highlighter: '<path d="M3.293,20.707a1,1,0,0,1,0-1.414l16-16a1,1,0,1,1,1.414,1.414l-16,16A1,1,0,0,1,3.293,20.707Z"/>',
  calligraphy: '<path d="M14.6,3.4L19.2,8c0.8,0.8,0.8,2,0,2.8L7,23H2v-5l12.2-12.2C14.6,5.4,14.2,3.8,14.6,3.4z M4,21h2l11-11l-2-2L4,19V21z M16.4,7.6l-2-2l1.4-1.4l2,2L16.4,7.6z"/>',
  laser: '<circle cx="12" cy="12" r="3"/><path fill-rule="evenodd" d="M12 2a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 15a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1zM2 12a1 1 0 0 1 1-1h3a1 1 0 0 1 0 2H3a1 1 0 0 1-1-1zm15 0a1 1 0 0 1 1-1h3a1 1 0 0 1 0 2h-3a1 1 0 0 1-1-1zM4.93 4.93a1 1 0 0 1 1.41 0l2.12 2.12a1 1 0 0 1-1.41 1.42L4.93 6.34a1 1 0 0 1 0-1.41zm10.6 10.6a1 1 0 0 1 1.42 0l2.12 2.12a1 1 0 0 1-1.42 1.42l-2.12-2.12a1 1 0 0 1 0-1.42zM19.07 4.93a1 1 0 0 1 0 1.41l-2.12 2.12a1 1 0 1 1-1.42-1.42l2.12-2.11a1 1 0 0 1 1.42 0zM8.46 15.54a1 1 0 0 1 0 1.41l-2.12 2.12a1 1 0 0 1-1.41-1.42l2.12-2.11a1 1 0 0 1 1.41 0z"/>',
  text: '<path d="M5 4h14a1 1 0 0 1 0 2h-6v13h3a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h3V6H5a1 1 0 0 1 0-2z"/>'
};

const SELECT_TOOLS = ['select', 'spotlight', 'magnifier'];
const SELECT_ICONS = {
  select: '<path d="M11 1a1.5 1.5 0 0 0-1.5 1.5V9h-1V5a1.5 1.5 0 0 0-3 0v9l-2-3a1.5 1.5 0 0 0-2.6 1.6l3 5C6 20 8.5 22 12 22h1a7.5 7.5 0 0 0 7.5-7.5v-7a1.5 1.5 0 0 0-3 0V11h-1V4a1.5 1.5 0 0 0-3 0v7h-1V2.5A1.5 1.5 0 0 0 11 1z"/>',
  spotlight: '<path fill-rule="evenodd" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 3l1.8 3.6L18 10l-3.2 2.4L16 16l-4-2.5L8 16l1.2-3.6L6 10l4.2-1.4L12 5z"/>',
  magnifier: '<path fill-rule="evenodd" d="M10.5 2a8.5 8.5 0 0 1 6.6 13.7l4.6 4.6a1 1 0 0 1-1.4 1.4l-4.6-4.6A8.5 8.5 0 1 1 10.5 2zm0 2a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm1 3a1 1 0 0 0-2 0v2.5H7a1 1 0 0 0 0 2h2.5V14a1 1 0 0 0 2 0v-2.5H14a1 1 0 0 0 0-2h-2.5V7z"/>'
};

const OVERLAY_ICONS = {
  visible: '<path d="M12 4C5 4 1 12 1 12s4 8 11 8 11-8 11-8-4-8-11-8zm0 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/><circle cx="12" cy="12" r="2.5"/>',
  hidden: '<path d="M12 4C5 4 1 12 1 12s4 8 11 8 11-8 11-8-4-8-11-8zm0 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/><circle cx="12" cy="12" r="2.5"/><rect x="11" y="1" width="2" height="22" rx="1" transform="rotate(45 12 12)"/>',
};

const appState = {
  overlayVisible: true,
  passThrough: true,
  activeTool: 'pen',
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
    calligraphy: {
      color: '#ef4444',
      width: 4
    },
    eraser: {
      radius: 18,
    },
  },
  hotkeys: {},
};

const elements = {
  penBar: document.getElementById('penBar'),
  collapseBtn: document.getElementById('collapseBtn'),
  togglePassThrough: document.getElementById('togglePassThrough'),
  selectButton: document.getElementById('selectButton'),
  selectGroupIcon: document.getElementById('selectGroupIcon'),
  selectGroupPopover: document.getElementById('selectGroupPopover'),
  selectSubButtons: Array.from(document.querySelectorAll('#selectGroupPopover .popover-btn')),
  toggleOverlayBtn: document.getElementById('toggleOverlayBtn'),
  eyeIcon: document.getElementById('eyeIcon'),
  screenshotButton: document.getElementById('screenshotButton'),
  settingsButton: document.getElementById('settingsButton'),
  undoButton: document.getElementById('undoButton'),
  clearButton: document.getElementById('clearButton'),
  toolButtons: Array.from(document.querySelectorAll('.tool-button[data-tool]')),
  opacityRange: document.getElementById('inlineOpacityRange'),
  inlineOpacityRange: document.getElementById('inlineOpacityRange'),
  opacityValueBadge: document.getElementById('opacityValDisplay'),
  customColorPicker: document.getElementById('inlineCustomColorPicker'),
  inlineCustomColorPicker: document.getElementById('inlineCustomColorPicker'),
  inkingGroupBtn: document.getElementById('inkingGroupBtn'),
  inkingGroupIcon: document.getElementById('inkingGroupIcon'),
  inkingGroupPopover: document.getElementById('inkingGroupPopover'),
  inkingSubButtons: Array.from(document.querySelectorAll('#inkingGroupPopover .popover-btn')),
  shapesGroupBtn: document.getElementById('shapesGroupBtn'),
  shapesGroupIcon: document.getElementById('shapesGroupIcon'),
  shapesGroupPopover: document.getElementById('shapesGroupPopover'),
  shapesSubButtons: Array.from(document.querySelectorAll('#shapesGroupPopover .popover-btn')),
  penSizeBtn: document.getElementById('penSizeBtn'),
  penSizePopover: document.getElementById('penSizePopover'),
  sizeDotPreview: document.getElementById('sizeDotPreview'),
  sizePopoverButtons: Array.from(document.querySelectorAll('#penSizePopover .size-btn')),
  whiteboardBtn: document.getElementById('whiteboardBtn'),
  eraserBtn: document.getElementById('eraserBtn'),
  whiteboardPopover: document.getElementById('whiteboardPopover'),
  whiteboardSubButtons: Array.from(document.querySelectorAll('#whiteboardPopover .popover-btn[data-bg]')),
  colorChipBtn: document.getElementById('colorChipBtn'),
  currentColorChip: document.getElementById('currentColorChip'),
  inlineSwatches: Array.from(document.querySelectorAll('#inlineColorSwatches .swatch-btn')),
  visibilityPill: null,
  passThroughPill: null,
  toolPill: null,
  toggleOverlay: null,
  bgModeButton: null,
  clickHaloButton: null,
  exportBgButton: null,
  widthRange: null,
  widthValueBadge: null,
  flyoutPanel: null,
  swatches: null,
  shapeButtons: [],
  textModeButtons: [],
  sizePresets: [],
};

function currentBrushValue() {
  if (appState.activeTool === 'pen') {
    return appState.brushDefaults.pen;
  }
  if (appState.activeTool === 'highlighter') {
    return appState.brushDefaults.highlighter;
  }
  if (appState.activeTool === 'calligraphy') {
    return appState.brushDefaults.calligraphy;
  }
  if (appState.activeTool === 'eraser') {
    return appState.brushDefaults.eraser;
  }
  return appState.brushDefaults.pen;
}

function updateToolButtons() {
  const activeColor = currentBrushValue().color || '#ff5a5f';
  if (appState && appState.activeTool && !appState.passThrough) {
    document.documentElement.style.setProperty('--dynamic-active-color', activeColor);
  } else {
    document.documentElement.style.setProperty('--dynamic-active-color', 'var(--accent)');
  }

  for (const button of elements.toolButtons) {
    button.classList.toggle('active', !appState.passThrough && button.dataset.tool === appState.activeTool);
  }
  if (elements.togglePassThrough) {
    elements.togglePassThrough.classList.toggle('active', appState.passThrough);
  }
  if (elements.inkingGroupBtn) {
    const isInkingActive = !appState.passThrough && INKING_TOOLS.includes(appState.activeTool);
    elements.inkingGroupBtn.classList.toggle('active', isInkingActive);
    if (INKING_TOOLS.includes(appState.activeTool) && elements.inkingGroupIcon) {
      elements.inkingGroupIcon.innerHTML = INKING_ICONS[appState.activeTool] || INKING_ICONS.pen;
      elements.inkingGroupBtn.dataset.tool = appState.activeTool;
      if (appState.activeTool === 'pen') {
        elements.inkingGroupIcon.setAttribute('viewBox', '0 0 64 64');
      } else {
        elements.inkingGroupIcon.setAttribute('viewBox', '0 0 24 24');
      }
    }
    if (elements.inkingSubButtons) {
      for (const btn of elements.inkingSubButtons) {
        btn.classList.toggle('active', btn.dataset.subtool === appState.activeTool);
      }
    }
  }
  if (elements.selectButton) {
    const isSelectActive = !appState.passThrough && SELECT_TOOLS.includes(appState.activeTool);
    elements.selectButton.classList.toggle('active', isSelectActive);
    if (SELECT_TOOLS.includes(appState.activeTool) && elements.selectGroupIcon) {
      elements.selectGroupIcon.innerHTML = SELECT_ICONS[appState.activeTool] || SELECT_ICONS.select;
      elements.selectButton.dataset.tool = appState.activeTool;
    } else if (elements.selectGroupIcon) {
      elements.selectGroupIcon.innerHTML = SELECT_ICONS.select;
      elements.selectButton.dataset.tool = 'select';
    }
    if (elements.selectSubButtons) {
      for (const btn of elements.selectSubButtons) {
        btn.classList.toggle('active', btn.dataset.subtool === appState.activeTool);
      }
    }
    const isSpotlight = appState.activeTool === 'spotlight';
    const divider = document.getElementById('spotlightControlsDivider');
    const controls = document.getElementById('spotlightControls');
    if (divider) divider.style.display = isSpotlight ? 'block' : 'none';
    if (controls) {
      controls.style.display = isSpotlight ? 'flex' : 'none';
      const radiusRange = document.getElementById('spotlightRadiusRange');
      const radiusVal = document.getElementById('spotlightRadiusVal');
      const alphaRange = document.getElementById('spotlightAlphaRange');
      const alphaVal = document.getElementById('spotlightAlphaVal');
      const radius = appState.spotlight?.radius || 150;
      const alpha = appState.spotlight?.alpha || 0.75;
      if (radiusRange && document.activeElement !== radiusRange) radiusRange.value = radius;
      if (radiusVal) radiusVal.textContent = `${radius}px`;
      if (alphaRange && document.activeElement !== alphaRange) alphaRange.value = alpha;
      if (alphaVal) alphaVal.textContent = `${Math.round(alpha * 100)}%`;
    }
  }
  if (elements.shapesGroupBtn) {
    const isShapesActive = !appState.passThrough && appState.activeTool === 'shapes';
    elements.shapesGroupBtn.classList.toggle('active', isShapesActive);
    if (elements.shapesSubButtons) {
      for (const btn of elements.shapesSubButtons) {
        btn.classList.toggle('active', btn.dataset.subshape === (appState.activeShapeType || 'rectangle'));
      }
    }
  }
}

function updatePills() {
  if (elements.visibilityPill) {
    elements.visibilityPill.textContent = appState.overlayVisible ? 'Overlay on' : 'Overlay hidden';
  }
  if (elements.passThroughPill) {
    elements.passThroughPill.textContent = appState.passThrough ? 'Pass-through on' : 'Draw mode on';
  }
  const toolLabels = {
    pen: 'Pen',
    highlighter: 'Highlight',
    calligraphy: 'Calligraphy',
    shapes: 'Magic Shapes',
    laser: 'Laser',
    text: 'Text Note',
    select: 'Move Tool',
    spotlight: 'Spotlight',
    magnifier: 'Magnify',
    eraser: 'Eraser'
  };
  if (elements.toolPill) {
    elements.toolPill.textContent = toolLabels[appState.activeTool] || (appState.activeTool.charAt(0).toUpperCase() + appState.activeTool.slice(1));
  }
  if (elements.toggleOverlay) {
    elements.toggleOverlay.textContent = appState.overlayVisible ? 'Hide Overlay' : 'Show Overlay';
  }
  if (elements.toggleOverlayBtn) {
    const label = appState.overlayVisible ? 'Hide overlay' : 'Show overlay';
    elements.toggleOverlayBtn.title = `${label} (Ctrl+Alt+H)`;
    elements.toggleOverlayBtn.setAttribute('aria-label', label);
    elements.toggleOverlayBtn.classList.toggle('muted-state', !appState.overlayVisible);
  }
  if (elements.eyeIcon) {
    elements.eyeIcon.innerHTML = appState.overlayVisible ? OVERLAY_ICONS.visible : OVERLAY_ICONS.hidden;
  }
  if (elements.togglePassThrough) {
    elements.togglePassThrough.title = appState.passThrough
      ? 'Pass-through active (Click to switch to Draw mode)'
      : 'Switch to Cursor / PC Mouse Mode (Ctrl+Shift+P)';
  }

  if (elements.bgModeButton) {
    const bgLabels = {
      transparent: 'Background: Transparent',
      whiteboard: 'Background: Whiteboard',
      blackboard: 'Background: Blackboard',
      grid: 'Background: Grid Paper',
      ruled: 'Background: Ruled Paper',
      staff: 'Background: Music Staff'
    };
    elements.bgModeButton.textContent = bgLabels[appState.backgroundMode] || 'Background: Transparent';
  }
  if (elements.whiteboardSubButtons) {
    for (const btn of elements.whiteboardSubButtons) {
      btn.classList.toggle('active', btn.dataset.bg === (appState.backgroundMode || 'transparent'));
    }
  }
  if (elements.whiteboardBtn) {
    const isBoard = appState.backgroundMode && appState.backgroundMode !== 'transparent';
    elements.whiteboardBtn.classList.toggle('active', isBoard);
    elements.whiteboardBtn.title = isBoard ? 'Board Options' : 'Whiteboard / Digital Paper';
    if (isBoard) {
      elements.whiteboardBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="14" x="3" y="3" rx="2"/><line x1="3" y1="3" x2="21" y2="17"/></svg><span class="group-indicator" aria-hidden="true"></span>`;
    } else {
      elements.whiteboardBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="14" x="3" y="3" rx="2"/><path d="M3 17h18"/><path d="M12 17v4"/><path d="M8 21h8"/></svg><span class="group-indicator" aria-hidden="true"></span>`;
    }
  }
  if (elements.clickHaloButton) {
    elements.clickHaloButton.textContent = appState.clickHalo ? 'Click Halo: On' : 'Click Halo: Off';
    elements.clickHaloButton.classList.toggle('active', appState.clickHalo);
  }
  if (elements.exportBgButton) {
    const isComposite = appState.exportDefaults?.includeBackground !== false;
    elements.exportBgButton.textContent = isComposite ? 'Export: Composite' : 'Export: Transparent';
    elements.exportBgButton.classList.toggle('active', !isComposite);
  }
}

function updateControls() {
  const brush = currentBrushValue();
  let val = 4;
  if (typeof brush.width === 'number') {
    val = brush.width;
    if (elements.widthRange) elements.widthRange.value = String(val);
  } else if (typeof brush.radius === 'number') {
    val = brush.radius;
    if (elements.widthRange) elements.widthRange.value = String(val);
  }
  if (elements.widthValueBadge) elements.widthValueBadge.textContent = `${val}px`;
  if (elements.sizePresets) {
    for (const btn of elements.sizePresets) {
      btn.classList.toggle('active', Number(btn.dataset.size) === val);
    }
  }
  if (elements.sizeDotPreview) {
    const dotVal = Math.min(Math.max(val, 2), 24);
    elements.sizeDotPreview.style.width = `${dotVal}px`;
    elements.sizeDotPreview.style.height = `${dotVal}px`;
  }
  if (elements.sizePopoverButtons) {
    for (const btn of elements.sizePopoverButtons) {
      btn.classList.toggle('active', Number(btn.dataset.size) === val);
    }
  }

  if (typeof brush.opacity === 'number') {
    if (elements.opacityRange) {
      elements.opacityRange.value = String(brush.opacity);
      elements.opacityRange.disabled = false;
    }
    if (elements.opacityValueBadge) {
      elements.opacityValueBadge.textContent = `${Math.round(brush.opacity * 100)}%`;
    }
  } else {
    if (elements.opacityRange) elements.opacityRange.disabled = true;
    if (elements.opacityValueBadge) elements.opacityValueBadge.textContent = '100%';
  }
  if (elements.widthRange) {
    elements.widthRange.disabled = appState.activeTool === 'eraser' && typeof brush.radius === 'number';
  }
}

function updateDockingAndOrientation() {
  const appContainer = document.getElementById('appContainer');
  const penBar = document.getElementById('penBar');
  const isHorizontal = appState.toolbarOrientation === 'horizontal';
  const dockSide = appState.dockSide || (isHorizontal ? 'top' : 'right');

  if (appContainer) {
    appContainer.classList.toggle('horizontal', isHorizontal);
    appContainer.classList.toggle('dock-left', !isHorizontal && dockSide === 'left');
    appContainer.classList.toggle('dock-right', !isHorizontal && dockSide !== 'left');
    appContainer.classList.toggle('dock-top', isHorizontal && dockSide !== 'bottom');
    appContainer.classList.toggle('dock-bottom', isHorizontal && dockSide === 'bottom');
  }
  if (penBar) {
    penBar.classList.toggle('horizontal', isHorizontal);
  }
  document.querySelectorAll('.flyout-panel').forEach((panel) => {
    panel.classList.toggle('horizontal', isHorizontal);
  });
}

function updateUi() {
  updateDockingAndOrientation();
  updateToolButtons();
  updatePills();
  updateControls();
}

function ensureActiveSwatch() {
  const activeColor = currentBrushValue().color || '#ff5a5f';
  if (elements.currentColorChip) {
    elements.currentColorChip.style.backgroundColor = activeColor;
  }
  if (elements.colorChipBtn) {
    elements.colorChipBtn.title = `Color Palette (${activeColor})`;
  }
  if (elements.customColorPicker && typeof activeColor === 'string' && activeColor.startsWith('#') && (activeColor.length === 7 || activeColor.length === 4)) {
    elements.customColorPicker.value = activeColor;
  }
  if (elements.swatches) {
    for (const swatch of elements.swatches.querySelectorAll('.swatch')) {
      swatch.classList.toggle('active', swatch.dataset.color === activeColor);
    }
  }
  if (elements.inlineSwatches) {
    let matchedAny = false;
    for (const swatch of elements.inlineSwatches) {
      if (!swatch.dataset.color) continue;
      const isMatch = swatch.dataset.color.toLowerCase() === (activeColor || '').toLowerCase();
      swatch.classList.toggle('active', isMatch);
      if (isMatch) matchedAny = true;
    }
    const customPicker = document.querySelector('.custom-swatch-picker');
    if (customPicker) {
      customPicker.classList.toggle('active', !matchedAny);
    }
  }
}

function renderSwatches() {
  if (!elements.swatches) return;
  elements.swatches.innerHTML = '';
  for (const color of COLORS) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.dataset.color = color;
    swatch.style.background = color;
    swatch.addEventListener('click', async () => {
      await window.appBridge.setColor(color);
    });
    elements.swatches.appendChild(swatch);
  }
  ensureActiveSwatch();
}

if (elements.eraserBtn) {
  elements.eraserBtn.addEventListener('click', async () => {
    console.log('[Renderer] eraserBtn clicked');
    closeAllPopovers();
    await window.appBridge.setTool('eraser');
  });
}

if (elements.shapeButtons) {
  elements.shapeButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (window.appBridge.setShapeType) {
        await window.appBridge.setShapeType(btn.dataset.shape);
      }
    });
  });
}

if (elements.textModeButtons) {
  elements.textModeButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (window.appBridge.setTextMode) {
        await window.appBridge.setTextMode(btn.dataset.textmode);
      }
    });
  });
}

if (elements.togglePassThrough) {
  elements.togglePassThrough.addEventListener('click', async () => {
    await window.appBridge.setPassThrough(!appState.passThrough);
  });
}

if (elements.screenshotButton) {
  elements.screenshotButton.addEventListener('click', async () => {
    await window.appBridge.takeScreenshot();
  });
}

if (elements.settingsButton) {
  elements.settingsButton.addEventListener('click', async () => {
    await window.appBridge.openSettings();
  });
}

if (elements.undoButton) {
  elements.undoButton.addEventListener('click', async () => {
    await window.appBridge.undo();
  });
}


if (elements.clearButton) {
  elements.clearButton.addEventListener('click', async () => {
    await window.appBridge.clearScene();
  });
}

if (elements.bgModeButton) {
  elements.bgModeButton.addEventListener('click', async () => {
    const modes = ['transparent', 'whiteboard', 'blackboard', 'grid'];
    const nextIdx = (modes.indexOf(appState.backgroundMode || 'transparent') + 1) % modes.length;
    await window.appBridge.setBackgroundMode(modes[nextIdx]);
  });
}

if (elements.clickHaloButton) {
  elements.clickHaloButton.addEventListener('click', async () => {
    await window.appBridge.setClickHalo(!appState.clickHalo);
  });
}

if (elements.exportBgButton) {
  elements.exportBgButton.addEventListener('click', async () => {
    const isComposite = appState.exportDefaults?.includeBackground !== false;
    await window.appBridge.setExportBg(!isComposite);
  });
}

if (elements.widthRange) {
  elements.widthRange.addEventListener('input', async (event) => {
    await window.appBridge.setWidth(Number(event.target.value));
  });
}

if (elements.opacityRange) {
  elements.opacityRange.addEventListener('input', async (event) => {
    await window.appBridge.setOpacity(Number(event.target.value));
  });
}

const appContainer = document.querySelector('.app-container');
if (appContainer) {
  const interactiveElements = Array.from(document.querySelectorAll('.pen-bar, .grouped-popover, #inlineColorSwatches, .modal-overlay, .mark-mini, .collapse-btn'));
  interactiveElements.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      console.log('[Renderer] toolbar interactive element mouseenter:', el.id || el.className);
      window.appBridge.setToolbarHover(true);
    });
    el.addEventListener('mouseleave', (event) => {
      if (event.relatedTarget && appContainer.contains(event.relatedTarget)) {
        return;
      }
      console.log('[Renderer] toolbar interactive elements left completely');
      window.appBridge.setToolbarHover(false);
    });
  });
}



// Main icon: click toggles collapse, drag repositions the toolbar.
if (elements.collapseBtn && elements.penBar) {
  const dragThreshold = 5;
  let activePointerId = null;
  let isDraggingToolbar = false;
  let suppressNextClick = false;
  let pressX = 0;
  let pressY = 0;
  let lastX = 0;
  let lastY = 0;

  const toggleToolbarCollapsed = () => {
    closeAllPopovers();
    elements.penBar.classList.toggle('collapsed');
    const isCollapsed = elements.penBar.classList.contains('collapsed');
    if (elements.flyoutPanel) elements.flyoutPanel.classList.toggle('hidden', isCollapsed);
  };

  const resetToolbarDrag = () => {
    activePointerId = null;
    isDraggingToolbar = false;
  };

  elements.collapseBtn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || activePointerId !== null) {
      return;
    }
    activePointerId = e.pointerId;
    isDraggingToolbar = false;
    pressX = e.screenX;
    pressY = e.screenY;
    lastX = e.screenX;
    lastY = e.screenY;
    elements.collapseBtn.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });

  window.addEventListener('pointermove', (e) => {
    if (activePointerId !== e.pointerId) {
      return;
    }

    const totalDx = e.screenX - pressX;
    const totalDy = e.screenY - pressY;
    const stepDx = e.screenX - lastX;
    const stepDy = e.screenY - lastY;

    if (!isDraggingToolbar && Math.hypot(totalDx, totalDy) >= dragThreshold) {
      isDraggingToolbar = true;
      suppressNextClick = true;
      closeAllPopovers();
    }

    if (isDraggingToolbar && (stepDx !== 0 || stepDy !== 0) && window.appBridge?.moveToolbar) {
      window.appBridge.moveToolbar(stepDx, stepDy);
      lastX = e.screenX;
      lastY = e.screenY;
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (activePointerId !== e.pointerId) {
      return;
    }

    elements.collapseBtn.releasePointerCapture?.(e.pointerId);
    if (isDraggingToolbar) {
      suppressNextClick = true;
    } else {
      toggleToolbarCollapsed();
    }
    resetToolbarDrag();
    e.preventDefault();
  });

  window.addEventListener('pointercancel', (e) => {
    if (activePointerId !== e.pointerId) {
      return;
    }
    elements.collapseBtn.releasePointerCapture?.(e.pointerId);
    resetToolbarDrag();
  });

  elements.collapseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (suppressNextClick) {
      suppressNextClick = false;
    }
  });
}

// 7. Context Menu prevention for main bar

if (elements.customColorPicker) {
  elements.customColorPicker.addEventListener('input', async (event) => {
    await window.appBridge.setColor(event.target.value);
  });
  elements.customColorPicker.addEventListener('change', async (event) => {
    await window.appBridge.setColor(event.target.value);
  });
}

if (elements.sizePresets) {
  elements.sizePresets.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const sz = Number(btn.dataset.size);
      await window.appBridge.setWidth(sz);
    });
  });
}

console.log('[Renderer] toolbar.js loaded! Matched toolButtons count:', elements.toolButtons.length);

window.appBridge.onStateChanged((nextState) => {
  console.log('[Renderer] appBridge:state-changed received');
  Object.assign(appState, nextState);
  updateUi();
  ensureActiveSwatch();
});

window.appBridge.getBootstrap().then((bootstrap) => {
  console.log('[Renderer] appBridge:getBootstrap resolved. State:', JSON.stringify(bootstrap.appState));
  Object.assign(appState, bootstrap.appState);
  renderSwatches();
  updateUi();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    window.appBridge.toggleVisibility(false);
  }
});

// Popover management
function closeAllPopovers() {
  if (elements.selectGroupPopover) elements.selectGroupPopover.classList.remove('show');
  if (elements.inkingGroupPopover) elements.inkingGroupPopover.classList.remove('show');
  if (elements.shapesGroupPopover) elements.shapesGroupPopover.classList.remove('show');
  if (elements.penSizePopover) elements.penSizePopover.classList.remove('show');
  if (elements.whiteboardPopover) elements.whiteboardPopover.classList.remove('show');
  const colorPopover = document.getElementById('inlineColorSwatches');
  if (colorPopover) colorPopover.classList.remove('show');
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.grouped-tool-container')) {
    closeAllPopovers();
  }
});

document.querySelectorAll('.grouped-tool-container').forEach((container) => {
  container.addEventListener('mouseleave', () => {
    closeAllPopovers();
  });
});

// Toggle Overlay Visibility Button
if (elements.toggleOverlayBtn) {
  elements.toggleOverlayBtn.addEventListener('click', async (event) => {
    event.stopPropagation();
    closeAllPopovers();
    await window.appBridge.toggleVisibility(!appState.overlayVisible);
  });
}

// 1b. Select Group Split Button
if (elements.selectButton) {
  elements.selectButton.addEventListener('click', async (event) => {
    const isIndicator = event.target.closest('.group-indicator');
    const isAlreadyActive = !appState.passThrough && SELECT_TOOLS.includes(appState.activeTool);
    if (isIndicator || isAlreadyActive) {
      if (elements.selectGroupPopover) {
        const wasShow = elements.selectGroupPopover.classList.contains('show');
        closeAllPopovers();
        elements.selectGroupPopover.classList.toggle('show', !wasShow);
      }
    } else {
      closeAllPopovers();
      const toolToSet = elements.selectButton.dataset.tool || 'select';
      await window.appBridge.setTool(toolToSet);
    }
  });
  if (elements.selectGroupPopover) {
    elements.selectButton.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      closeAllPopovers();
      elements.selectGroupPopover.classList.add('show');
    });
  }
}
if (elements.selectSubButtons) {
  elements.selectSubButtons.forEach((btn) => {
    if (btn.dataset.subtool) {
      btn.addEventListener('click', async (event) => {
        event.stopPropagation();
        closeAllPopovers();
        await window.appBridge.setTool(btn.dataset.subtool);
      });
    }
  });
}

// 3. Inking Group Split Button
if (elements.inkingGroupBtn) {
  elements.inkingGroupBtn.addEventListener('click', async (event) => {
    console.log('[Renderer] inkingGroupBtn clicked. target:', event.target.tagName, 'activeTool:', appState.activeTool);
    const isIndicator = event.target.closest('.group-indicator');
    const isAlreadyActive = !appState.passThrough && INKING_TOOLS.includes(appState.activeTool);
    if (isIndicator || isAlreadyActive) {
      if (elements.inkingGroupPopover) {
        const wasShow = elements.inkingGroupPopover.classList.contains('show');
        closeAllPopovers();
        elements.inkingGroupPopover.classList.toggle('show', !wasShow);
      }
    } else {
      closeAllPopovers();
      const toolToSet = elements.inkingGroupBtn.dataset.tool || 'pen';
      await window.appBridge.setTool(toolToSet);
    }
  });
  if (elements.inkingGroupPopover) {
    elements.inkingGroupBtn.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      closeAllPopovers();
      elements.inkingGroupPopover.classList.add('show');
    });
  }
}

if (elements.inkingSubButtons) {
  elements.inkingSubButtons.forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.stopPropagation();
      closeAllPopovers();
      const tool = btn.dataset.subtool;
      await window.appBridge.setTool(tool);
    });
  });
}



const spotlightRadiusRange = document.getElementById('spotlightRadiusRange');
const spotlightAlphaRange = document.getElementById('spotlightAlphaRange');
if (spotlightRadiusRange) {
  spotlightRadiusRange.addEventListener('input', () => {
    const radius = Number(spotlightRadiusRange.value);
    const alpha = Number(spotlightAlphaRange ? spotlightAlphaRange.value : 0.75);
    window.appBridge.setSpotlight({ radius, alpha });
  });
}
if (spotlightAlphaRange) {
  spotlightAlphaRange.addEventListener('input', () => {
    const radius = Number(spotlightRadiusRange ? spotlightRadiusRange.value : 150);
    const alpha = Number(spotlightAlphaRange.value);
    window.appBridge.setSpotlight({ radius, alpha });
  });
}

// 4. Shapes Group Split Button
if (elements.shapesGroupBtn) {
  elements.shapesGroupBtn.addEventListener('click', async (event) => {
    const isIndicator = event.target.closest('.group-indicator');
    const isAlreadyActive = !appState.passThrough && appState.activeTool === 'shapes';
    if (isIndicator || isAlreadyActive) {
      if (elements.shapesGroupPopover) {
        const wasShow = elements.shapesGroupPopover.classList.contains('show');
        closeAllPopovers();
        elements.shapesGroupPopover.classList.toggle('show', !wasShow);
      }
    } else {
      closeAllPopovers();
      await window.appBridge.setTool('shapes');
    }
  });
  if (elements.shapesGroupPopover) {
    elements.shapesGroupBtn.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      closeAllPopovers();
      elements.shapesGroupPopover.classList.add('show');
    });
  }
}

if (elements.shapesSubButtons) {
  elements.shapesSubButtons.forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.stopPropagation();
      closeAllPopovers();
      const shape = btn.dataset.subshape;
      await window.appBridge.setTool('shapes');
      if (window.appBridge.setShapeType) {
        await window.appBridge.setShapeType(shape);
      }
    });
  });
}

// 7. Pen Size Button & Popover
if (elements.penSizeBtn) {
  elements.penSizeBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (elements.penSizePopover) {
      const wasShow = elements.penSizePopover.classList.contains('show');
      closeAllPopovers();
      elements.penSizePopover.classList.toggle('show', !wasShow);
    }
  });
  if (elements.penSizePopover) {
    elements.penSizeBtn.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      closeAllPopovers();
      elements.penSizePopover.classList.add('show');
    });
  }
}

if (elements.sizePopoverButtons) {
  elements.sizePopoverButtons.forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.stopPropagation();
      closeAllPopovers();
      const sz = Number(btn.dataset.size);
      await window.appBridge.setWidth(sz);
    });
  });
}

// 10. Whiteboard Button & Popover
if (elements.whiteboardBtn) {
  elements.whiteboardBtn.addEventListener('click', async (event) => {
    event.stopPropagation();
    const isIndicator = event.target.closest('.group-indicator');
    
    if (isIndicator && elements.whiteboardPopover) {
      const wasShow = elements.whiteboardPopover.classList.contains('show');
      closeAllPopovers();
      elements.whiteboardPopover.classList.toggle('show', !wasShow);
      return;
    }

    closeAllPopovers();
    if (appState.backgroundMode && appState.backgroundMode !== 'transparent') {
      await window.appBridge.setBackgroundMode('transparent');
    } else {
      const lastBg = elements.whiteboardBtn.dataset.lastBg || 'whiteboard';
      await window.appBridge.setBackgroundMode(lastBg);
    }
  });
  if (elements.whiteboardPopover) {
    elements.whiteboardBtn.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      closeAllPopovers();
      elements.whiteboardPopover.classList.add('show');
    });
  }
}

if (elements.whiteboardSubButtons) {
  elements.whiteboardSubButtons.forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.stopPropagation();
      closeAllPopovers();
      const bg = btn.dataset.bg;
      if (bg !== 'transparent') elements.whiteboardBtn.dataset.lastBg = bg;
      await window.appBridge.setBackgroundMode(bg);
    });
  });
}

// 12. Inline Color Swatches
if (elements.colorChipBtn) {
  elements.colorChipBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const colorPopover = document.getElementById('inlineColorSwatches');
    if (colorPopover) {
      const wasShow = colorPopover.classList.contains('show');
      closeAllPopovers();
      colorPopover.classList.toggle('show', !wasShow);
    }
  });
}

if (elements.inlineSwatches) {
  elements.inlineSwatches.forEach((swatch) => {
    swatch.addEventListener('click', async (event) => {
      event.stopPropagation();
      const color = swatch.dataset.color;
      if (color) {
        closeAllPopovers();
        await window.appBridge.setColor(color);
      }
    });
  });
}

if (elements.inlineCustomColorPicker) {
  elements.inlineCustomColorPicker.addEventListener('input', async (event) => {
    await window.appBridge.setColor(event.target.value);
  });
  elements.inlineCustomColorPicker.addEventListener('change', async (event) => {
    await window.appBridge.setColor(event.target.value);
  });
}

if (elements.inlineOpacityRange) {
  elements.inlineOpacityRange.addEventListener('input', async (event) => {
    await window.appBridge.setOpacity(Number(event.target.value));
  });
}

document.addEventListener('mousedown', (event) => {
  if (window.DEBUG_REPEN) console.log('[DEBUG] Global mousedown: tag =', event.target.tagName, 'id =', event.target.id, 'class =', event.target.className);
});
document.addEventListener('click', (event) => {
  if (window.DEBUG_REPEN) console.log('[DEBUG] Global click: tag =', event.target.tagName, 'id =', event.target.id, 'class =', event.target.className);
});
