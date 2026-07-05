const COLORS = ['#ff5a5f', '#ffe36d', '#00d26a', '#3b82f6', '#ffffff'];

const INKING_TOOLS = ['pen', 'highlighter', 'laser', 'text'];
const INKING_ICONS = {
  pen: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  highlighter: '<path d="m9 11-6 6v3h3l6-6"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  laser: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/>',
  text: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>'
};

const PRESENTATION_TOOLS = ['spotlight', 'magnifier'];
const PRESENTATION_ICONS = {
  spotlight: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  magnifier: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/>'
};

const OVERLAY_ICONS = {
  visible: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  hidden: '<path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.88 4.24A9.3 9.3 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.1 3.24"/><path d="M6.61 6.61C3.75 8.5 2 12 2 12s3 8 10 8a9.4 9.4 0 0 0 5.39-1.61"/>',
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
    eraser: {
      radius: 18,
    },
  },
  hotkeys: {},
};

const elements = {
  penBar: document.getElementById('penBar'),
  orientationBtn: document.getElementById('orientationBtn'),
  collapseBtn: document.getElementById('collapseBtn'),
  togglePassThrough: document.getElementById('togglePassThrough'),
  selectButton: document.getElementById('selectButton'),
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
  presentationGroupBtn: document.getElementById('presentationGroupBtn'),
  presentationGroupIcon: document.getElementById('presentationGroupIcon'),
  presentationGroupPopover: document.getElementById('presentationGroupPopover'),
  presentationSubButtons: Array.from(document.querySelectorAll('#presentationGroupPopover .popover-btn')),
  shapesGroupBtn: document.getElementById('shapesGroupBtn'),
  shapesGroupIcon: document.getElementById('shapesGroupIcon'),
  shapesGroupPopover: document.getElementById('shapesGroupPopover'),
  shapesSubButtons: Array.from(document.querySelectorAll('#shapesGroupPopover .popover-btn')),
  penSizeBtn: document.getElementById('penSizeBtn'),
  penSizePopover: document.getElementById('penSizePopover'),
  sizeDotPreview: document.getElementById('sizeDotPreview'),
  sizePopoverButtons: Array.from(document.querySelectorAll('#penSizePopover .size-btn')),
  whiteboardBtn: document.getElementById('whiteboardBtn'),
  whiteboardPopover: document.getElementById('whiteboardPopover'),
  whiteboardSubButtons: Array.from(document.querySelectorAll('#whiteboardPopover .popover-btn[data-bg]')),
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
  if (appState.activeTool === 'highlighter') {
    return appState.brushDefaults.highlighter;
  }
  if (appState.activeTool === 'eraser') {
    return appState.brushDefaults.eraser;
  }
  return appState.brushDefaults.pen;
}

function updateToolButtons() {
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
    }
    if (elements.inkingSubButtons) {
      for (const btn of elements.inkingSubButtons) {
        btn.classList.toggle('active', btn.dataset.subtool === appState.activeTool);
      }
    }
  }
  if (elements.presentationGroupBtn) {
    const isPresentationActive = !appState.passThrough && PRESENTATION_TOOLS.includes(appState.activeTool);
    elements.presentationGroupBtn.classList.toggle('active', isPresentationActive);
    if (PRESENTATION_TOOLS.includes(appState.activeTool) && elements.presentationGroupIcon) {
      elements.presentationGroupIcon.innerHTML = PRESENTATION_ICONS[appState.activeTool] || PRESENTATION_ICONS.spotlight;
      elements.presentationGroupBtn.dataset.tool = appState.activeTool;
    }
    if (elements.presentationSubButtons) {
      for (const btn of elements.presentationSubButtons) {
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
    elements.whiteboardBtn.title = isBoard ? 'Return to Transparent Desktop' : 'Whiteboard / Digital Paper';
    if (isBoard) {
      elements.whiteboardBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="14" x="3" y="3" rx="2"/><line x1="3" y1="3" x2="21" y2="17"/></svg>`;
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

elements.toolButtons.forEach((button) => {
  button.addEventListener('click', async (event) => {
    if (event.target.closest('.group-indicator')) return;
    await window.appBridge.setTool(button.dataset.tool);
  });
});

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

if (elements.collapseBtn && elements.penBar) {
  elements.collapseBtn.addEventListener('click', () => {
    elements.penBar.classList.toggle('collapsed');
    const isCollapsed = elements.penBar.classList.contains('collapsed');
    elements.collapseBtn.innerHTML = isCollapsed
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14"/></svg>';
    if (elements.flyoutPanel) elements.flyoutPanel.classList.toggle('hidden', isCollapsed);
  });
}

if (elements.orientationBtn) {
  elements.orientationBtn.addEventListener('click', async () => {
    const nextOrientation = appState.toolbarOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    await window.appBridge.setToolbarOrientation(nextOrientation);
  });
}

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

window.appBridge.onStateChanged((nextState) => {
  Object.assign(appState, nextState);
  updateUi();
  ensureActiveSwatch();
});

window.appBridge.getBootstrap().then((bootstrap) => {
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
  if (elements.presentationGroupPopover) elements.presentationGroupPopover.classList.remove('show');
  if (elements.shapesGroupPopover) elements.shapesGroupPopover.classList.remove('show');
  if (elements.penSizePopover) elements.penSizePopover.classList.remove('show');
  if (elements.whiteboardPopover) elements.whiteboardPopover.classList.remove('show');
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
    const isAlreadyActive = !appState.passThrough && appState.activeTool === 'select';
    if (isIndicator || isAlreadyActive) {
      if (elements.selectGroupPopover) {
        const wasShow = elements.selectGroupPopover.classList.contains('show');
        closeAllPopovers();
        elements.selectGroupPopover.classList.toggle('show', !wasShow);
      }
    } else {
      closeAllPopovers();
      await window.appBridge.setTool('select');
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

// 3b. Presentation Group Split Button
if (elements.presentationGroupBtn) {
  elements.presentationGroupBtn.addEventListener('click', async (event) => {
    const isIndicator = event.target.closest('.group-indicator');
    const isAlreadyActive = !appState.passThrough && PRESENTATION_TOOLS.includes(appState.activeTool);
    if (isIndicator || isAlreadyActive) {
      if (elements.presentationGroupPopover) {
        const wasShow = elements.presentationGroupPopover.classList.contains('show');
        closeAllPopovers();
        elements.presentationGroupPopover.classList.toggle('show', !wasShow);
      }
    } else {
      closeAllPopovers();
      const toolToSet = elements.presentationGroupBtn.dataset.tool || 'spotlight';
      await window.appBridge.setTool(toolToSet);
    }
  });
  if (elements.presentationGroupPopover) {
    elements.presentationGroupBtn.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      closeAllPopovers();
      elements.presentationGroupPopover.classList.add('show');
    });
  }
}

if (elements.presentationSubButtons) {
  elements.presentationSubButtons.forEach((btn) => {
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
    if (appState.backgroundMode && appState.backgroundMode !== 'transparent') {
      closeAllPopovers();
      await window.appBridge.setBackgroundMode('transparent');
    } else if (elements.whiteboardPopover) {
      const wasShow = elements.whiteboardPopover.classList.contains('show');
      closeAllPopovers();
      elements.whiteboardPopover.classList.toggle('show', !wasShow);
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
      await window.appBridge.setBackgroundMode(bg);
    });
  });
}

// 12. Inline Color Swatches
if (elements.inlineSwatches) {
  elements.inlineSwatches.forEach((swatch) => {
    swatch.addEventListener('click', async (event) => {
      event.stopPropagation();
      const color = swatch.dataset.color;
      if (color) {
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
