const COLORS = ['#ff5a5f', '#f97316', '#ffe36d', '#00d26a', '#22d3ee', '#3b82f6', '#a855f7', '#ffffff', '#111827'];

const TOOLBAR_SETTINGS_DEFAULTS = {
  brushDefaults: {
    pen: { color: '#ff5a5f', width: 4, opacity: 1 },
    highlighter: { color: '#ffe36d', width: 18, opacity: 0.3 },
    calligraphy: { color: '#ff5a5f', width: 4, opacity: 1 },
    eraser: { radius: 18 },
  },
  exportDefaults: {
    format: 'png',
    quality: 0.9,
    includeBackground: false,
    copyToClipboard: true,
    autoSavePath: '',
  },
  clickHalo: false,
  rememberContentAfterExit: false,
  clearOnMinimize: false,
  startOnLogin: false,
  checkUpdatesOnStartup: false,
  hotkeys: {
    toggleOverlay: 'CommandOrControl+Alt+H',
    togglePassThrough: 'CommandOrControl+Shift+P',
    pen: 'CommandOrControl+Shift+1',
    highlighter: 'CommandOrControl+Shift+2',
    shapes: 'CommandOrControl+Shift+4',
    laser: 'CommandOrControl+Shift+L',
    text: 'CommandOrControl+Shift+T',
    select: 'CommandOrControl+Alt+V',
    eraser: 'CommandOrControl+Shift+3',
    undo: 'CommandOrControl+Shift+Z',
    redo: 'CommandOrControl+Shift+Y',
    clear: 'CommandOrControl+Alt+C',
    openSettings: 'CommandOrControl+Shift+O',
    takeScreenshot: 'CommandOrControl+Shift+S',
  },
};

const TOOLBAR_SETTINGS_ACTIONS = [
  { key: 'toggleOverlay', label: 'Overlay' },
  { key: 'togglePassThrough', label: 'Pass-through' },
  { key: 'pen', label: 'Pen' },
  { key: 'highlighter', label: 'Highlighter' },
  { key: 'shapes', label: 'Shapes' },
  { key: 'laser', label: 'Laser' },
  { key: 'text', label: 'Text' },
  { key: 'select', label: 'Select' },
  { key: 'eraser', label: 'Eraser' },
  { key: 'undo', label: 'Undo' },
  { key: 'redo', label: 'Redo' },
  { key: 'clear', label: 'Clear' },
  { key: 'openSettings', label: 'Settings' },
  { key: 'takeScreenshot', label: 'Screenshot' },
];

const INKING_TOOLS = ['pen', 'highlighter', 'calligraphy', 'laser', 'text'];
const INKING_ICONS = {
  pen: '<path d="M334.857,166.955l-65.516-65.531c-39.469,23.672-126.656,62.688-126.656,62.688c-19.719,8.172-33.938,25.813-37.734,46.813L60.826,416.596l-25.313,25.313c-9.125-0.109-18.281,3.297-25.234,10.25c-13.703,13.688-13.703,35.875,0,49.563c13.688,13.703,35.891,13.703,49.578,0c6.953-6.953,10.359-16.109,10.234-25.219l25.313-25.313l205.688-44.125c21-3.813,38.625-18.031,46.797-37.734c0,0,39.047-87.156,62.734-126.609l-65.531-65.531L334.857,166.955z M269.889,302.127c-15.25,15.25-39.188,16.438-55.813,3.641L63.436,456.408c-1.094-1.484-2.25-2.922-3.578-4.25c-1.344-1.344-2.766-2.5-4.25-3.578l150.641-150.641c-12.813-16.641-11.625-40.563,3.625-55.813c16.578-16.578,43.438-16.578,60.016,0S286.467,285.564,269.889,302.127z"/><path d="M511.998,139.705L372.311,0.002c0,0-29.375,29.375-45.156,45.156s-36.297,11.047-36.297,11.047l-18.953,18.938l66.297,66.297l15.781,15.781l82.875,82.875l18.938-18.938c0,0-4.734-20.516,11.047-36.313C482.639,169.064,511.998,139.705,511.998,139.705z"/>',
  highlighter: '<path d="M463.383,27.507C416.65-18.151,362.832,2.481,342.27,22.056L95.791,237.297c-2.107,1.844-3.379,4.47-3.525,7.275 L51.87,366.91L0,420.834L102.596,490l34.265-35.614l117.468-41.924c2.831-0.205,5.453-1.567,7.244-3.784L468.61,152.441 C498.522,115.418,497.318,60.661,463.383,27.507z M99.772,463.161l-67.845-45.735L60.903,387.3l31.44,32.688l24.478,25.45 L99.772,463.161z M133.943,433.454l-55.607-57.812l-5.697-5.923l34.255-103.742l126.839,131.861L133.943,433.454z M452.637,139.375 l-199.72,247.182L117.495,245.772L355.77,37.701c13.944-14.589,57.664-31.155,92.815,4.206 C474.246,67.722,475.598,110.958,452.637,139.375z"/>',
  calligraphy: '<path d="M10.723,0.04 L9.938,1.883 L14.188,6.133 L16.018,5.36 L10.723,0.04 Z"/><path d="M3.357,6.132 C3.357,6.132 4.297,10.345 0.063,14.579 C0.16,14.677 0.263,14.779 0.365,14.881 L7.129,8.117 C7.039,7.924 6.984,7.711 6.984,7.484 C6.984,6.656 7.656,5.984 8.484,5.984 C9.312,5.984 9.984,6.656 9.984,7.484 C9.984,8.312 9.312,8.984 8.484,8.984 C8.249,8.984 8.029,8.925 7.83,8.828 L1.072,15.588 C1.206,15.722 1.309,15.825 1.461,15.977 C5.71,11.729 9.924,12.685 9.924,12.685 L12.682,6.631 L9.387,3.336 L3.357,6.132 L3.357,6.132 Z"/>',
  laser: '<circle cx="12" cy="12" r="3"/><path fill-rule="evenodd" d="M12 2a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 15a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1zM2 12a1 1 0 0 1 1-1h3a1 1 0 0 1 0 2H3a1 1 0 0 1-1-1zm15 0a1 1 0 0 1 1-1h3a1 1 0 0 1 0 2h-3a1 1 0 0 1-1-1zM4.93 4.93a1 1 0 0 1 1.41 0l2.12 2.12a1 1 0 0 1-1.41 1.42L4.93 6.34a1 1 0 0 1 0-1.41zm10.6 10.6a1 1 0 0 1 1.42 0l2.12 2.12a1 1 0 0 1-1.42 1.42l-2.12-2.12a1 1 0 0 1 0-1.42zM19.07 4.93a1 1 0 0 1 0 1.41l-2.12 2.12a1 1 0 1 1-1.42-1.42l2.12-2.11a1 1 0 0 1 1.42 0zM8.46 15.54a1 1 0 0 1 0 1.41l-2.12 2.12a1 1 0 0 1-1.41-1.42l2.12-2.11a1 1 0 0 1 1.41 0z"/>',
  text: '<path d="M5 4h14a1 1 0 0 1 0 2h-6v13h3a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h3V6H5a1 1 0 0 1 0-2z"/>'
};

const SELECT_TOOLS = ['spotlight', 'magnifier'];
const SELECT_ICONS = {
  spotlight: '<path d="M251.79,0c-13.975,0-23.641,13.967-18.717,27.046l69.353,184.234c12.632-7.878,25.889-14.781,39.731-20.637c35.121-14.855,72.414-22.387,110.843-22.387s75.722,7.532,110.843,22.387c13.715,5.801,26.854,12.631,39.379,20.418l71.577-183.803C679.905,14.146,670.234,0,656.163,0H251.79z"/><path d="M878.742,231.201l-183.803,71.577c7.786,12.527,14.616,25.665,20.418,39.379c14.854,35.121,22.387,72.414,22.387,110.843s-7.532,75.722-22.387,110.843c-5.855,13.843-12.76,27.1-20.638,39.731l184.234,69.354C892.033,677.851,906,668.185,906,654.21V249.837C906,235.766,891.854,226.095,878.742,231.201z"/><path d="M563.843,715.357c-35.121,14.854-72.414,22.387-110.843,22.387s-75.722-7.532-110.843-22.387c-13.715-5.802-26.854-12.632-39.379-20.418l-71.577,183.803C226.095,891.854,235.766,906,249.837,906H654.21c13.975,0,23.641-13.967,18.717-27.046L603.574,694.72C590.942,702.598,577.686,709.502,563.843,715.357z"/><path d="M27.258,674.799l183.803-71.577c-7.787-12.526-14.617-25.665-20.418-39.379c-14.854-35.121-22.387-72.414-22.387-110.843s7.532-75.722,22.387-110.843c5.855-13.843,12.759-27.099,20.637-39.731L27.046,233.073C13.967,228.149,0,237.815,0,251.79v404.372C0,670.234,14.146,679.906,27.258,674.799z"/><path d="M712.744,453c0-42.3-10.119-82.234-28.057-117.526c-24.956-49.101-65.061-89.204-114.161-114.161C535.234,203.375,495.3,193.256,453,193.256s-82.234,10.119-117.526,28.057c-49.101,24.957-89.205,65.06-114.161,114.161C203.375,370.766,193.256,410.7,193.256,453s10.119,82.234,28.057,117.526c24.957,49.101,65.06,89.204,114.161,114.161C370.766,702.625,410.7,712.744,453,712.744s82.234-10.119,117.526-28.057c49.101-24.957,89.205-65.061,114.161-114.161C702.625,535.234,712.744,495.3,712.744,453z M453,589c-75.111,0-136-60.889-136-136s60.889-136,136-136s136,60.889,136,136S528.111,589,453,589z"/>',
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
      color: '#ff5a5f',
      width: 4,
      opacity: 1,
    },
    eraser: {
      radius: 18,
    },
  },
  hotkeys: {},
};

let toolbarSettingsDraft = null;
let toolbarSettingsDirty = false;
let toolbarSettingsSaving = false;
let toolbarSettingsCapture = null;
const toolbarHotkeyButtons = new Map();

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
  toolbarSettingsPanel: document.getElementById('toolbarSettingsPanel'),
  toolbarSettingsClose: document.getElementById('toolbarSettingsClose'),
  toolbarSettingsTabs: Array.from(document.querySelectorAll('.toolbar-settings-tab')),
  toolbarSettingsPages: Array.from(document.querySelectorAll('.toolbar-settings-page')),
  toolbarSettingsMessage: document.getElementById('toolbarSettingsMessage'),
  toolbarSettingsActions: document.getElementById('toolbarSettingsActions'),
  toolbarSettingsSave: document.getElementById('toolbarSettingsSave'),
  toolbarSettingsReset: document.getElementById('toolbarSettingsReset'),
  appVersionText: document.getElementById('appVersionText'),

  settingsSaveLocationText: document.getElementById('settingsSaveLocationText'),
  settingsBrowseFolder: document.getElementById('settingsBrowseFolder'),
  prefRememberContent: document.getElementById('prefRememberContent'),
  prefClearOnMinimize: document.getElementById('prefClearOnMinimize'),
  prefCursorHighlight: document.getElementById('prefCursorHighlight'),
  prefStartOnLogin: document.getElementById('prefStartOnLogin'),
  prefCheckUpdates: document.getElementById('prefCheckUpdates'),
  toolbarHotkeyList: document.getElementById('toolbarHotkeyList'),
  tsPenColor: document.getElementById('tsPenColor'),
  tsPenWidth: document.getElementById('tsPenWidth'),
  tsPenWidthVal: document.getElementById('tsPenWidthVal'),
  tsPenOpacity: document.getElementById('tsPenOpacity'),
  tsPenOpacityVal: document.getElementById('tsPenOpacityVal'),
  tsHighlighterColor: document.getElementById('tsHighlighterColor'),
  tsHighlighterWidth: document.getElementById('tsHighlighterWidth'),
  tsHighlighterWidthVal: document.getElementById('tsHighlighterWidthVal'),
  tsHighlighterOpacity: document.getElementById('tsHighlighterOpacity'),
  tsHighlighterOpacityVal: document.getElementById('tsHighlighterOpacityVal'),
  tsEraserRadius: document.getElementById('tsEraserRadius'),
  tsEraserRadiusVal: document.getElementById('tsEraserRadiusVal'),
  tsExportFormat: document.getElementById('tsExportFormat'),
  tsExportQuality: document.getElementById('tsExportQuality'),
  tsExportQualityVal: document.getElementById('tsExportQualityVal'),
  tsExportQualityRow: document.getElementById('tsExportQualityRow'),
  tsExportIncludeBackground: document.getElementById('tsExportIncludeBackground'),
  tsExportCopyToClipboard: document.getElementById('tsExportCopyToClipboard'),
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
  inlineSwatches: Array.from(document.querySelectorAll('.swatch-btn[data-color]')),
  colorPopover: document.getElementById('colorPopover'),
  moreColorsBtn: document.getElementById('moreColorsBtn'),
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
  recordButton: document.getElementById('recordButton'),
  recordingHud: document.getElementById('recordingHud'),
  hudTimer: document.getElementById('hudTimer'),
  hudPauseBtn: document.getElementById('hudPauseBtn'),
  hudStopBtn: document.getElementById('hudStopBtn'),
  hudCancelBtn: document.getElementById('hudCancelBtn'),
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
    elements.togglePassThrough.classList.toggle('active', appState.passThrough || appState.activeTool === 'cursor');
  }
  if (elements.inkingGroupBtn) {
    const isInkingActive = !appState.passThrough && INKING_TOOLS.includes(appState.activeTool);
    elements.inkingGroupBtn.classList.toggle('active', isInkingActive);
    if (INKING_TOOLS.includes(appState.activeTool) && elements.inkingGroupIcon) {
      elements.inkingGroupIcon.innerHTML = INKING_ICONS[appState.activeTool] || INKING_ICONS.pen;
      elements.inkingGroupBtn.dataset.tool = appState.activeTool;
      let viewBox = '0 0 24 24';
      if (appState.activeTool === 'pen') viewBox = '0 0 512 512';
      else if (appState.activeTool === 'highlighter') viewBox = '0 0 1920 1920';
      else if (appState.activeTool === 'calligraphy') viewBox = '0 0 16 16';
      elements.inkingGroupIcon.setAttribute('viewBox', viewBox);
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
      const activeTool = appState.activeTool;
      let viewBox = '0 0 24 24';
      if (activeTool === 'spotlight') viewBox = '0 0 906 906';
      elements.selectGroupIcon.setAttribute('viewBox', viewBox);
      elements.selectGroupIcon.innerHTML = SELECT_ICONS[activeTool] || SELECT_ICONS.spotlight;
      elements.selectButton.dataset.tool = activeTool;
    } else if (elements.selectGroupIcon) {
      elements.selectGroupIcon.setAttribute('viewBox', '0 0 906 906');
      elements.selectGroupIcon.innerHTML = SELECT_ICONS.spotlight;
      elements.selectButton.dataset.tool = 'spotlight';
    }
    if (elements.selectSubButtons) {
      for (const btn of elements.selectSubButtons) {
        btn.classList.toggle('active', btn.dataset.subtool === appState.activeTool);
      }
    }
    const isSpotlight = appState.activeTool === 'spotlight';
    if (elements.selectGroupPopover) {
      elements.selectGroupPopover.classList.toggle('popover-stacked', isSpotlight);
    }
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
    cursor: 'Desktop Cursor',
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
      ? 'Desktop Click-through On (Ctrl+Shift+P)'
      : 'Enable Desktop Click-through (Ctrl+Shift+P)';
    elements.togglePassThrough.setAttribute('aria-label', 'Desktop Cursor');
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
  syncSettingsPanelHeight();
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

function toolbarSettingsClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeToolbarSettings(nextState = {}) {
  return {
    brushDefaults: {
      pen: {
        ...TOOLBAR_SETTINGS_DEFAULTS.brushDefaults.pen,
        ...(((nextState.brushDefaults || {}).pen) || {}),
      },
      highlighter: {
        ...TOOLBAR_SETTINGS_DEFAULTS.brushDefaults.highlighter,
        ...(((nextState.brushDefaults || {}).highlighter) || {}),
      },
      calligraphy: {
        ...TOOLBAR_SETTINGS_DEFAULTS.brushDefaults.calligraphy,
        ...(((nextState.brushDefaults || {}).calligraphy) || {}),
      },
      eraser: {
        ...TOOLBAR_SETTINGS_DEFAULTS.brushDefaults.eraser,
        ...(((nextState.brushDefaults || {}).eraser) || {}),
      },
    },
    exportDefaults: {
      ...TOOLBAR_SETTINGS_DEFAULTS.exportDefaults,
      ...(nextState.exportDefaults || {}),
    },
    hotkeys: {
      ...TOOLBAR_SETTINGS_DEFAULTS.hotkeys,
      ...(nextState.hotkeys || {}),
    },
    clickHalo: Boolean(nextState.clickHalo),
    rememberContentAfterExit: Boolean(nextState.rememberContentAfterExit),
    clearOnMinimize: Boolean(nextState.clearOnMinimize),
    startOnLogin: Boolean(nextState.startOnLogin),
    checkUpdatesOnStartup: Boolean(nextState.checkUpdatesOnStartup),
  };
}

function formatToolbarAccelerator(accelerator) {
  if (!accelerator) return 'Not set';
  return accelerator
    .replaceAll('CommandOrControl', 'Ctrl')
    .replaceAll('Control', 'Ctrl')
    .replaceAll('Super', 'Win')
    .replaceAll('Option', 'Alt');
}

function toolbarKeyFromEvent(event) {
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
  if (codeMap[event.code]) return codeMap[event.code];
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3);
  if (/^Digit[0-9]$/.test(event.code)) return event.code.slice(5);
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(event.code)) return event.code;
  if (/^Numpad[0-9]$/.test(event.code)) return event.code.replace('Numpad', 'Num');
  return null;
}

function toolbarEventToAccelerator(event) {
  const modifiers = [];
  if (event.ctrlKey || event.metaKey) modifiers.push('CommandOrControl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  const key = toolbarKeyFromEvent(event);
  if (!key || ['Shift', 'Control', 'Alt', 'Meta', 'Command', 'CommandOrControl'].includes(key)) return null;
  return [...modifiers, key].join('+');
}

function setToolbarSettingsMessage(message, kind = 'info') {
  if (!elements.toolbarSettingsMessage) return;
  elements.toolbarSettingsMessage.textContent = message;
  elements.toolbarSettingsMessage.dataset.kind = kind;
}

function setToolbarSettingsDirty(isDirty = true) {
  toolbarSettingsDirty = isDirty;
  if (isDirty) {
    setToolbarSettingsMessage('Unsaved changes.', 'info');
  }
}

function updateToolbarSettingsValueLabels() {
  if (!toolbarSettingsDraft) return;
  if (elements.tsPenWidthVal) elements.tsPenWidthVal.textContent = `${elements.tsPenWidth.value}px`;
  if (elements.tsPenOpacityVal) elements.tsPenOpacityVal.textContent = `${Math.round(Number(elements.tsPenOpacity.value) * 100)}%`;
  if (elements.tsHighlighterWidthVal) elements.tsHighlighterWidthVal.textContent = `${elements.tsHighlighterWidth.value}px`;
  if (elements.tsHighlighterOpacityVal) elements.tsHighlighterOpacityVal.textContent = `${Math.round(Number(elements.tsHighlighterOpacity.value) * 100)}%`;
  if (elements.tsEraserRadiusVal) elements.tsEraserRadiusVal.textContent = `${elements.tsEraserRadius.value}px`;
  if (elements.tsExportQualityVal) elements.tsExportQualityVal.textContent = `${Math.round(Number(elements.tsExportQuality.value) * 100)}%`;
  if (elements.tsExportQualityRow) {
    elements.tsExportQualityRow.style.display = elements.tsExportFormat.value === 'png' ? 'none' : 'grid';
  }
}

function updateGeneralSettingsControls() {
  if (!toolbarSettingsDraft) return;
  const copyToClipboard = elements.tsExportCopyToClipboard ? elements.tsExportCopyToClipboard.checked : toolbarSettingsDraft.exportDefaults.copyToClipboard;
  const folderMode = !copyToClipboard;
  if (elements.settingsSaveLocationText) {
    elements.settingsSaveLocationText.textContent = toolbarSettingsDraft.exportDefaults.autoSavePath || 'Choose folder when saving';
  }
  if (elements.settingsBrowseFolder) {
    elements.settingsBrowseFolder.disabled = !folderMode;
  }
}

function renderToolbarSettingsForm() {
  if (!toolbarSettingsDraft) return;
  if (elements.appVersionText) {
    elements.appVersionText.textContent = `v${appState.appVersion || '1.0.0'}`;
  }
  elements.tsPenColor.value = toolbarSettingsDraft.brushDefaults.pen.color;
  elements.tsPenWidth.value = String(toolbarSettingsDraft.brushDefaults.pen.width);
  elements.tsPenOpacity.value = String(toolbarSettingsDraft.brushDefaults.pen.opacity);
  elements.tsHighlighterColor.value = toolbarSettingsDraft.brushDefaults.highlighter.color;
  elements.tsHighlighterWidth.value = String(toolbarSettingsDraft.brushDefaults.highlighter.width);
  elements.tsHighlighterOpacity.value = String(toolbarSettingsDraft.brushDefaults.highlighter.opacity);
  elements.tsEraserRadius.value = String(toolbarSettingsDraft.brushDefaults.eraser.radius);
  elements.tsExportFormat.value = toolbarSettingsDraft.exportDefaults.format || 'png';
  elements.tsExportQuality.value = String(toolbarSettingsDraft.exportDefaults.quality || 0.9);
  elements.tsExportIncludeBackground.checked = Boolean(toolbarSettingsDraft.exportDefaults.includeBackground);
  elements.tsExportCopyToClipboard.checked = Boolean(toolbarSettingsDraft.exportDefaults.copyToClipboard);
  if (elements.prefRememberContent) elements.prefRememberContent.checked = Boolean(toolbarSettingsDraft.rememberContentAfterExit);
  if (elements.prefClearOnMinimize) elements.prefClearOnMinimize.checked = Boolean(toolbarSettingsDraft.clearOnMinimize);
  if (elements.prefCursorHighlight) elements.prefCursorHighlight.checked = Boolean(toolbarSettingsDraft.clickHalo);
  if (elements.prefStartOnLogin) elements.prefStartOnLogin.checked = Boolean(toolbarSettingsDraft.startOnLogin);
  if (elements.prefCheckUpdates) elements.prefCheckUpdates.checked = Boolean(toolbarSettingsDraft.checkUpdatesOnStartup);
  updateToolbarSettingsValueLabels();
  updateGeneralSettingsControls();
  renderToolbarHotkeys();
}

function collectToolbarSettingsDraft() {
  toolbarSettingsDraft.brushDefaults.pen.color = elements.tsPenColor.value;
  toolbarSettingsDraft.brushDefaults.pen.width = Number(elements.tsPenWidth.value);
  toolbarSettingsDraft.brushDefaults.pen.opacity = Number(elements.tsPenOpacity.value);
  toolbarSettingsDraft.brushDefaults.highlighter.color = elements.tsHighlighterColor.value;
  toolbarSettingsDraft.brushDefaults.highlighter.width = Number(elements.tsHighlighterWidth.value);
  toolbarSettingsDraft.brushDefaults.highlighter.opacity = Number(elements.tsHighlighterOpacity.value);
  toolbarSettingsDraft.brushDefaults.eraser.radius = Number(elements.tsEraserRadius.value);
  toolbarSettingsDraft.exportDefaults.format = elements.tsExportFormat.value;
  toolbarSettingsDraft.exportDefaults.quality = Number(elements.tsExportQuality.value);
  toolbarSettingsDraft.exportDefaults.includeBackground = elements.tsExportIncludeBackground.checked;
  toolbarSettingsDraft.exportDefaults.copyToClipboard = elements.tsExportCopyToClipboard.checked;
  toolbarSettingsDraft.clickHalo = Boolean(elements.prefCursorHighlight?.checked);
  toolbarSettingsDraft.rememberContentAfterExit = Boolean(elements.prefRememberContent?.checked);
  toolbarSettingsDraft.clearOnMinimize = Boolean(elements.prefClearOnMinimize?.checked);
  toolbarSettingsDraft.startOnLogin = Boolean(elements.prefStartOnLogin?.checked);
  toolbarSettingsDraft.checkUpdatesOnStartup = Boolean(elements.prefCheckUpdates?.checked);
}

function getToolbarHotkeyConflicts() {
  const counts = new Map();
  for (const accelerator of Object.values(toolbarSettingsDraft?.hotkeys || {})) {
    if (!accelerator) continue;
    const normalized = accelerator.toLowerCase();
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }
  const conflicts = new Set();
  for (const [key, accelerator] of Object.entries(toolbarSettingsDraft?.hotkeys || {})) {
    if (accelerator && counts.get(accelerator.toLowerCase()) > 1) conflicts.add(key);
  }
  return conflicts;
}

function updateToolbarHotkeyButton(actionKey) {
  const button = toolbarHotkeyButtons.get(actionKey);
  if (!button || !toolbarSettingsDraft) return;
  button.textContent = toolbarSettingsCapture === actionKey
    ? 'Press keys...'
    : formatToolbarAccelerator(toolbarSettingsDraft.hotkeys[actionKey]);
  button.classList.toggle('capturing', toolbarSettingsCapture === actionKey);
  const conflicts = getToolbarHotkeyConflicts();
  button.classList.toggle('conflict', conflicts.has(actionKey));
}

function renderToolbarHotkeys() {
  if (!elements.toolbarHotkeyList || !toolbarSettingsDraft) return;
  elements.toolbarHotkeyList.innerHTML = '';
  toolbarHotkeyButtons.clear();
  for (const action of TOOLBAR_SETTINGS_ACTIONS) {
    const row = document.createElement('div');
    row.className = 'toolbar-hotkey-row';
    const title = document.createElement('div');
    title.className = 'toolbar-hotkey-title';
    title.textContent = action.label;
    const captureButton = document.createElement('button');
    captureButton.type = 'button';
    captureButton.className = 'toolbar-hotkey-capture';
    captureButton.addEventListener('click', () => {
      toolbarSettingsCapture = action.key;
      setToolbarSettingsMessage('Press shortcut. Esc cancels, Backspace clears.', 'info');
      updateToolbarHotkeyButton(action.key);
    });
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'toolbar-hotkey-clear';
    clearButton.textContent = 'x';
    clearButton.title = 'Clear shortcut';
    clearButton.addEventListener('click', () => {
      toolbarSettingsDraft.hotkeys[action.key] = '';
      toolbarSettingsCapture = null;
      setToolbarSettingsDirty(true);
      updateToolbarHotkeyButton(action.key);
    });
    row.appendChild(title);
    row.appendChild(captureButton);
    row.appendChild(clearButton);
    elements.toolbarHotkeyList.appendChild(row);
    toolbarHotkeyButtons.set(action.key, captureButton);
    updateToolbarHotkeyButton(action.key);
  }
}

function activateToolbarSettingsTab(tabName) {
  const nextTab = tabName || 'about';
  for (const tab of elements.toolbarSettingsTabs) {
    tab.classList.toggle('active', tab.dataset.settingsTab === nextTab);
  }
  for (const page of elements.toolbarSettingsPages) {
    page.classList.toggle('active', page.dataset.settingsPage === nextTab);
  }
  elements.toolbarSettingsPanel?.classList.toggle('about-active', nextTab === 'about' || nextTab === 'help');
  if (!toolbarSettingsDirty) {
    const messages = {
      general: 'General preferences ready.',
      customize: 'Customize defaults, then save.',
      hotkeys: 'Edit shortcuts, then save.',
      about: 'Product information.',
      help: 'Help and support links.',
    };
    setToolbarSettingsMessage(messages[nextTab] || 'Ready.', 'info');
  }
}

async function loadToolbarSettingsDraft() {
  const payload = await window.appBridge.getSettings();
  toolbarSettingsDraft = normalizeToolbarSettings((payload && payload.appState) || appState);
  toolbarSettingsDirty = false;
  toolbarSettingsCapture = null;
  renderToolbarSettingsForm();
  const activeTab = elements.toolbarSettingsTabs.find((tab) => tab.classList.contains('active'))?.dataset.settingsTab || 'general';
  activateToolbarSettingsTab(activeTab);
}

function syncSettingsPanelHeight() {
  if (!elements.toolbarSettingsPanel || !elements.toolbarSettingsPanel.classList.contains('open')) return;
  const appContainer = document.getElementById('appContainer');
  if (elements.penBar && appContainer) {
    const isHorizontal = appContainer.classList.contains('horizontal');
    if (!isHorizontal) {
      const barHeight = elements.penBar.offsetHeight;
      elements.toolbarSettingsPanel.style.height = `${barHeight - 8}px`;
    } else {
      elements.toolbarSettingsPanel.style.height = '';
    }
  }
}

async function openToolbarSettingsPanel() {
  if (!elements.toolbarSettingsPanel) return;
  closeAllPopovers();
  await loadToolbarSettingsDraft();
  elements.toolbarSettingsPanel.classList.add('open');
  elements.toolbarSettingsPanel.setAttribute('aria-hidden', 'false');
  syncSettingsPanelHeight();
  elements.settingsButton?.classList.add('active');
  await window.appBridge.setToolbarSettingsOpen?.(true);
  window.appBridge.setToolbarHover(true);
}

function closeToolbarSettingsPanel() {
  if (!elements.toolbarSettingsPanel) return;
  elements.toolbarSettingsPanel.classList.remove('open');
  elements.toolbarSettingsPanel.setAttribute('aria-hidden', 'true');
  elements.settingsButton?.classList.remove('active');
  toolbarSettingsCapture = null;
}

async function saveToolbarSettings() {
  if (!toolbarSettingsDraft || toolbarSettingsSaving) return;
  collectToolbarSettingsDraft();
  if (getToolbarHotkeyConflicts().size > 0) {
    setToolbarSettingsMessage('Resolve duplicate hotkeys first.', 'error');
    renderToolbarHotkeys();
    return;
  }
  toolbarSettingsSaving = true;
  elements.toolbarSettingsSave.disabled = true;
  setToolbarSettingsMessage('Saving...', 'info');
  const result = await window.appBridge.saveSettings(toolbarSettingsClone(toolbarSettingsDraft));
  toolbarSettingsSaving = false;
  elements.toolbarSettingsSave.disabled = false;
  if (!result.ok) {
    const failed = (result.failures || []).map((entry) => formatToolbarAccelerator(entry.accelerator)).join(', ');
    setToolbarSettingsMessage(`Could not register: ${failed}`, 'error');
    await loadToolbarSettingsDraft();
    return;
  }
  toolbarSettingsDirty = false;
  setToolbarSettingsMessage('Saved.', 'success');
}

async function resetToolbarSettings() {
  const result = await window.appBridge.resetSettings();
  if (!result.ok) {
    setToolbarSettingsMessage('Reset failed.', 'error');
    return;
  }
  await loadToolbarSettingsDraft();
  setToolbarSettingsMessage('Defaults restored.', 'success');
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
    await window.appBridge.setPassThrough(true);
  });
}

if (elements.screenshotButton) {
  elements.screenshotButton.addEventListener('click', async () => {
    await window.appBridge.takeScreenshot();
  });
}

if (elements.settingsButton) {
  elements.settingsButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    if (elements.toolbarSettingsPanel?.classList.contains('open')) {
      closeToolbarSettingsPanel();
    } else {
      await openToolbarSettingsPanel();
    }
  });
}

let preRecordingPassThrough = false;
let isRecording = false;
let isPaused = false;

if (elements.recordButton) {
  elements.recordButton.addEventListener('click', async () => {
    console.log('[Renderer] recordButton clicked');
    closeAllPopovers();
    window.appBridge.openRecordingSetup().catch((err) => {
      console.error('Failed to open recording setup:', err);
      alert('Unable to open recording setup.');
    });
  });
}

async function proceedToRecord(settings) {
  elements.recordingHud.style.display = 'flex';
  elements.hudTimer.textContent = '00:00';
  
  isRecording = true;
  isPaused = false;
  
  const width = settings.resolution === '1080p' ? 1920 : 1280;
  const height = settings.resolution === '1080p' ? 1080 : 720;

  const result = await window.appBridge.startRecording({
    sourceId: 'screen:0',
    sourceType: settings.sourceType,
    width,
    height,
    fps: parseInt(settings.fps),
    captureSystemAudio: settings.systemAudio,
    captureMic: settings.mic,
    webcamEnabled: settings.webcam,
    captureCursor: settings.cursorMode === 'system',
    outputPath: '',
  });

  if (!result.success) {
    alert(`Recording failed to start: ${result.error}`);
    restoreToolbarUI();
  }
}

function restoreToolbarUI() {
  isRecording = false;
  isPaused = false;
  elements.recordingHud.style.display = 'none';
}

if (elements.hudPauseBtn) {
  elements.hudPauseBtn.addEventListener('click', async () => {
    if (!isRecording) return;
    if (isPaused) {
      await window.appBridge.resumeRecording();
      isPaused = false;
      elements.hudPauseBtn.title = 'Pause Recording';
      elements.hudPauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      `;
    } else {
      await window.appBridge.pauseRecording();
      isPaused = true;
      elements.hudPauseBtn.title = 'Resume Recording';
      elements.hudPauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
    }
  });
}

if (elements.hudStopBtn) {
  elements.hudStopBtn.addEventListener('click', async () => {
    if (!isRecording) return;
    elements.hudStopBtn.disabled = true;
    const result = await window.appBridge.stopRecording();
    elements.hudStopBtn.disabled = false;
    
    if (result.success) {
      console.log(`Recording saved to: ${result.outputPath}`);
    } else {
      alert(`Failed to save recording: ${result.error}`);
    }
    restoreToolbarUI();
  });
}

if (elements.hudCancelBtn) {
  elements.hudCancelBtn.addEventListener('click', async () => {
    if (!isRecording) return;
    if (confirm('Are you sure you want to discard this recording?')) {
      await window.appBridge.cancelRecording();
      restoreToolbarUI();
    }
  });
}

window.appBridge.onRecordingTimerTick((timeStr) => {
  if (elements.hudTimer) {
    elements.hudTimer.textContent = timeStr;
  }
});

if (elements.toolbarSettingsClose) {
  elements.toolbarSettingsClose.addEventListener('click', closeToolbarSettingsPanel);
}

if (elements.toolbarSettingsTabs) {
  elements.toolbarSettingsTabs.forEach((tab) => {
    tab.addEventListener('click', () => activateToolbarSettingsTab(tab.dataset.settingsTab));
  });
}

[
  elements.tsPenWidth,
  elements.tsPenOpacity,
  elements.tsHighlighterWidth,
  elements.tsHighlighterOpacity,
  elements.tsEraserRadius,
  elements.tsExportQuality,
].forEach((input) => {
  input?.addEventListener('input', () => {
    updateToolbarSettingsValueLabels();
    setToolbarSettingsDirty(true);
  });
});

[
  elements.tsPenColor,
  elements.tsHighlighterColor,
  elements.tsExportFormat,
  elements.tsExportIncludeBackground,
  elements.tsExportCopyToClipboard,
  elements.prefRememberContent,
  elements.prefClearOnMinimize,
  elements.prefCursorHighlight,
  elements.prefStartOnLogin,
  elements.prefCheckUpdates,
].forEach((input) => {
  input?.addEventListener('input', () => {
    updateToolbarSettingsValueLabels();
    setToolbarSettingsDirty(true);
  });
  input?.addEventListener('change', () => {
    updateToolbarSettingsValueLabels();
    setToolbarSettingsDirty(true);
  });
});

if (elements.toolbarSettingsSave) {
  elements.toolbarSettingsSave.addEventListener('click', saveToolbarSettings);
}

if (elements.toolbarSettingsReset) {
  elements.toolbarSettingsReset.addEventListener('click', resetToolbarSettings);
}

document.querySelectorAll('[data-external-link]').forEach((button) => {
  button.addEventListener('click', async () => {
    const url = button.dataset.externalLink;
    if (url) {
      await window.appBridge.openExternal?.(url);
    }
  });
});

if (elements.tsExportCopyToClipboard) {
  elements.tsExportCopyToClipboard.addEventListener('change', () => {
    if (!toolbarSettingsDraft) return;
    toolbarSettingsDraft.exportDefaults.copyToClipboard = elements.tsExportCopyToClipboard.checked;
    updateGeneralSettingsControls();
    setToolbarSettingsDirty(true);
  });
}

if (elements.settingsBrowseFolder) {
  elements.settingsBrowseFolder.addEventListener('click', async () => {
    if (!toolbarSettingsDraft) return;
    const selected = await window.appBridge.selectDirectory?.();
    if (selected) {
      toolbarSettingsDraft.exportDefaults.autoSavePath = selected;
      toolbarSettingsDraft.exportDefaults.copyToClipboard = false;
      if (elements.tsExportCopyToClipboard) elements.tsExportCopyToClipboard.checked = false;
      updateGeneralSettingsControls();
      setToolbarSettingsDirty(true);
    }
  });
}

window.appBridge.onToolbarSettingsOpen?.(() => {
  openToolbarSettingsPanel();
});

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
  const interactiveElements = Array.from(document.querySelectorAll('.pen-bar, .recording-hud, .grouped-popover, #inlineColorSwatches, .toolbar-settings-panel, .modal-overlay, .mark-mini, .collapse-btn'));
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
    if (isCollapsed && appState.clearOnMinimize) {
      window.appBridge.clearScene?.();
    }
    elements.collapseBtn.classList.toggle('is-minimized', isCollapsed);
    elements.collapseBtn.title = isCollapsed ? 'Expand toolbar / Drag' : 'Minimize toolbar / Drag';
    elements.collapseBtn.setAttribute('aria-label', isCollapsed ? 'Expand toolbar' : 'Minimize toolbar');
    if (elements.flyoutPanel) elements.flyoutPanel.classList.toggle('hidden', isCollapsed);
    setTimeout(syncSettingsPanelHeight, 50);
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
  if (toolbarSettingsCapture) {
    event.preventDefault();
    event.stopPropagation();
    const actionKey = toolbarSettingsCapture;
    if (event.key === 'Escape') {
      toolbarSettingsCapture = null;
      setToolbarSettingsMessage('Shortcut capture cancelled.', 'info');
      updateToolbarHotkeyButton(actionKey);
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      toolbarSettingsDraft.hotkeys[actionKey] = '';
      toolbarSettingsCapture = null;
      setToolbarSettingsDirty(true);
      updateToolbarHotkeyButton(actionKey);
      return;
    }
    const accelerator = toolbarEventToAccelerator(event);
    if (!accelerator) return;
    toolbarSettingsDraft.hotkeys[actionKey] = accelerator;
    toolbarSettingsCapture = null;
    setToolbarSettingsDirty(true);
    setToolbarSettingsMessage(`Captured ${formatToolbarAccelerator(accelerator)}.`, 'success');
    updateToolbarHotkeyButton(actionKey);
    return;
  }

  if (event.key === 'Escape') {
    if (elements.toolbarSettingsPanel?.classList.contains('open')) {
      closeToolbarSettingsPanel();
      return;
    }
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
  if (elements.colorPopover) elements.colorPopover.classList.remove('show');
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.grouped-tool-container') && !event.target.closest('.toolbar-settings-panel') && !event.target.closest('#settingsButton')) {
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
      const toolToSet = elements.selectButton.dataset.tool || 'spotlight';
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
if (elements.moreColorsBtn) {
  elements.moreColorsBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (elements.colorPopover) {
      const wasShow = elements.colorPopover.classList.contains('show');
      closeAllPopovers();
      elements.colorPopover.classList.toggle('show', !wasShow);
    }
  });
}

if (elements.colorChipBtn) {
  elements.colorChipBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    elements.inlineCustomColorPicker?.click();
  });
}

if (elements.inlineSwatches) {
  elements.inlineSwatches.forEach((swatch) => {
    swatch.addEventListener('click', async (event) => {
      event.stopPropagation();
      const color = swatch.dataset.color;
      if (color) {
        await window.appBridge.setColor(color);
      }
      if (swatch.closest('#colorPopover')) {
        closeAllPopovers();
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
    closeAllPopovers();
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
