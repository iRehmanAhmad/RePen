const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

let bootstrap = null;
let appState = null;
let scene = { annotations: [] };
let displayBounds = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
let currentStroke = null;
let renderQueued = false;
let currentDevicePixelRatio = window.devicePixelRatio || 1;
let laserPoints = [];
let clickRipples = [];
let selectedIds = [];
let isDraggingSelection = false;
let isResizingSelection = null;
let isDraggingText = null;
let marqueeBox = null;
let dragStartX = 0;
let dragStartY = 0;
let currentMousePos = null;
let magnifierImg = null;
let lastMagnifierUrl = null;
let lastAutoAdvanceTime = 0;
let pageToastTimer = null;
let cleanupScreenshotMode = null;
let lastPresentationSampleAt = 0;
const BOARD_MIN_ZOOM = 0.35;
const BOARD_MAX_ZOOM = 3;

function cancelScreenshotMode(notifyMain = true) {
  if (typeof cleanupScreenshotMode === 'function') {
    cleanupScreenshotMode(notifyMain);
  }
}

function getBaseCursor() {
  if (!appState || appState.passThrough) return 'default';
  if (appState.activeTool === 'select') return 'default';
  if (appState.activeTool === 'text') return 'text';
  if (appState.activeTool === 'eraser') {
    const eraserSvg = encodeURIComponent('<svg width="24" height="24" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M16.998 4.18l-3.154-2.425a2.01 2.01 0 0 0-2.807.365l-8.4 10.897a2.003 2.003 0 0 0 .365 2.803l3.153 2.425a2.01 2.01 0 0 0 2.807-.365l8.401-10.897a2.003 2.003 0 0 0-.365-2.803zm-8.45 12.287l-.537.681a.8.8 0 0 1-.639.31.793.793 0 0 1-.485-.164l-3.153-2.425a.792.792 0 0 1-.303-.53.788.788 0 0 1 .157-.589l.537-.681a.801.801 0 0 1 .64-.311c.124 0 .309.029.485.164l3.154 2.425a.802.802 0 0 1 .144 1.12z" fill="black" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>');
    return `url('data:image/svg+xml;utf8,${eraserSvg}') 0 24, crosshair`;
  }
  return 'crosshair';
}

function clearSelection() {
  selectedIds = [];
  marqueeBox = null;
  isDraggingSelection = false;
  isResizingSelection = null;
  canvas.style.cursor = getBaseCursor();
}

function resetInteractionState(reason) {
  clearSelection();
  currentStroke = null;
  isDraggingText = null;
  dragStartX = 0;
  dragStartY = 0;
  
  // Commit any open text editor
  const openTextarea = document.querySelector('textarea');
  if (openTextarea) {
    openTextarea.blur(); // Triggers the commit logic
  }
}

function showPageToast(msg) {
  const toast = document.getElementById('pageToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  if (pageToastTimer) clearTimeout(pageToastTimer);
  pageToastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function setupBoardNav() {
  const prevBtn = document.getElementById('prevPageButton');
  const nextBtn = document.getElementById('nextPageButton');
  const newBtn = document.getElementById('newBoardButton');
  const saveBtn = document.getElementById('saveSessionButton');
  const loadBtn = document.getElementById('loadSessionButton');
  const exportPdfBtn = document.getElementById('exportPdfButton');
  const panLeftBtn = document.getElementById('boardPanLeftButton');
  const panRightBtn = document.getElementById('boardPanRightButton');
  const zoomOutBtn = document.getElementById('boardZoomOutButton');
  const zoomInBtn = document.getElementById('boardZoomInButton');
  const zoomResetBtn = document.getElementById('boardZoomResetButton');

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.appBridge?.prevPage?.();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.appBridge?.nextPage?.();
    });
  }
  if (newBtn) {
    newBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.appBridge?.newSession?.();
    });
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.appBridge?.saveSession?.();
    });
  }
  if (loadBtn) {
    loadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = loadBtn.getBoundingClientRect();
      window.appBridge?.showLoadMenu?.(rect.left, rect.bottom);
    });
  }
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.appBridge?.exportPdf?.();
    });
  }
  if (panLeftBtn) {
    panLeftBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panBoardByScreen(-window.innerWidth * 0.75);
    });
  }
  if (panRightBtn) {
    panRightBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panBoardByScreen(window.innerWidth * 0.75);
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomBoardBy(0.85);
    });
  }
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomBoardBy(1.18);
    });
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setBoardViewport({ x: 0, zoom: 1 });
    });
  }

  const patternBtns = document.querySelectorAll('.board-pattern-group .pattern-btn');
  patternBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pattern = btn.dataset.pattern;
      if (pattern) {
        window.appBridge?.setBackgroundMode?.(pattern);
      }
    });
  });

  const colorSwatches = document.querySelectorAll('.board-color-group .board-swatch');
  colorSwatches.forEach((swatch) => {
    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      const color = swatch.dataset.boardColor;
      if (color) {
        window.appBridge?.setBoardColor?.(color);
      }
    });
  });

  const customColorPicker = document.getElementById('boardCustomColorPicker');
  if (customColorPicker) {
    customColorPicker.addEventListener('input', (e) => {
      e.stopPropagation();
      window.appBridge?.setBoardColor?.(e.target.value);
    });
    customColorPicker.addEventListener('change', (e) => {
      e.stopPropagation();
      window.appBridge?.setBoardColor?.(e.target.value);
    });
  }

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') {
        return; // Allow native text paste in textarea
      }
      const isBoard = appState && appState.backgroundMode && appState.backgroundMode !== 'transparent';
      if (isBoard || !appState?.passThrough) {
        window.appBridge?.pasteImage?.();
      }
    }
    const isBoard = appState && appState.backgroundMode && appState.backgroundMode !== 'transparent';
    if (!isBoard || document.activeElement?.tagName === 'TEXTAREA') return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '+' || e.key === '=' ) {
        e.preventDefault();
        zoomBoardBy(1.18);
      } else if (e.key === '-') {
        e.preventDefault();
        zoomBoardBy(0.85);
      } else if (e.key === '0') {
        e.preventDefault();
        setBoardViewport({ x: 0, zoom: 1 });
      }
    } else if (e.key === 'ArrowRight' && e.shiftKey) {
      e.preventDefault();
      panBoardByScreen(window.innerWidth * 0.35);
    } else if (e.key === 'ArrowLeft' && e.shiftKey) {
      e.preventDefault();
      panBoardByScreen(-window.innerWidth * 0.35);
    }
  });

  const scrollbar = document.getElementById('boardScrollbar');
  const thumb = document.getElementById('boardScrollThumb');
  if (scrollbar && thumb) {
    scrollbar.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target === thumb) return;
      const trackHeight = scrollbar.clientHeight || 1;
      const ratio = Math.max(0, Math.min(1, e.offsetY / trackHeight));
      const total = typeof appState?.totalPages === 'number' && appState.totalPages > 0 ? appState.totalPages : 1;
      const targetIdx = Math.round(ratio * (total - 1));
      window.appBridge?.setPage?.(targetIdx);
    });

    let isDraggingThumb = false;
    let startY = 0;
    let startTop = 0;
    thumb.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      isDraggingThumb = true;
      startY = e.clientY;
      startTop = parseInt(thumb.style.top || '0', 10);
      thumb.classList.add('active');
      thumb.setPointerCapture(e.pointerId);
    });
    thumb.addEventListener('pointermove', (e) => {
      if (!isDraggingThumb || !appState) return;
      e.stopPropagation();
      const dy = e.clientY - startY;
      const trackHeight = scrollbar.clientHeight || 1;
      const thumbHeight = thumb.clientHeight || 48;
      const maxTop = Math.max(1, trackHeight - thumbHeight);
      const newTop = Math.max(0, Math.min(maxTop, startTop + dy));
      thumb.style.top = `${newTop}px`;
      const total = typeof appState.totalPages === 'number' && appState.totalPages > 0 ? appState.totalPages : 1;
      const targetIdx = Math.round((newTop / maxTop) * (total - 1));
      if (targetIdx !== appState.currentPageIndex) {
        window.appBridge?.setPage?.(targetIdx);
      }
    });
    thumb.addEventListener('pointerup', (e) => {
      if (!isDraggingThumb) return;
      e.stopPropagation();
      isDraggingThumb = false;
      thumb.classList.remove('active');
      thumb.releasePointerCapture(e.pointerId);
      updateBoardNav();
    });
  }

  let lastWheelTime = 0;
  window.addEventListener('wheel', (e) => {
    const isBoard = appState && appState.backgroundMode && appState.backgroundMode !== 'transparent';
    if (!isBoard) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoomBoardBy(e.deltaY < 0 ? 1.08 : 0.92, e.clientX || window.innerWidth / 2);
      return;
    }
    if (e.shiftKey) {
      e.preventDefault();
      panBoardByScreen(e.deltaY || e.deltaX || 0);
      return;
    }
    const now = Date.now();
    if (now - lastWheelTime < 350) return;
    if (e.deltaY > 30) {
      lastWheelTime = now;
      window.appBridge?.nextPage?.();
    } else if (e.deltaY < -30) {
      lastWheelTime = now;
      window.appBridge?.prevPage?.();
    }
  });
}

function updateBoardNav() {
  const nav = document.getElementById('boardNav');
  const indicator = document.getElementById('pageIndicator');
  const prevBtn = document.getElementById('prevPageButton');
  const panLeftBtn = document.getElementById('boardPanLeftButton');
  const zoomLabel = document.getElementById('boardZoomLabel');
  if (!nav) return;

  const isBoard = appState && appState.backgroundMode && appState.backgroundMode !== 'transparent';
  if (isBoard) {
    nav.classList.add('show');
  } else {
    nav.classList.remove('show');
  }

  const scrollbar = document.getElementById('boardScrollbar');
  const thumb = document.getElementById('boardScrollThumb');
  if (scrollbar && thumb && appState) {
    if (isBoard) {
      scrollbar.classList.add('show');
      const total = typeof appState.totalPages === 'number' && appState.totalPages > 0 ? appState.totalPages : 1;
      const current = typeof appState.currentPageIndex === 'number' ? appState.currentPageIndex : 0;
      const trackHeight = scrollbar.clientHeight || (window.innerHeight - 160);
      const thumbHeight = Math.max(48, Math.round(trackHeight / Math.max(1, total)));
      thumb.style.height = `${thumbHeight}px`;
      const maxTop = Math.max(0, trackHeight - thumbHeight);
      const top = total <= 1 ? 0 : Math.round((current / (total - 1)) * maxTop);
      thumb.style.top = `${top}px`;
    } else {
      scrollbar.classList.remove('show');
    }
  }

  if (indicator && appState) {
    const current = (typeof appState.currentPageIndex === 'number' ? appState.currentPageIndex : 0) + 1;
    const total = typeof appState.totalPages === 'number' ? appState.totalPages : 1;
    indicator.textContent = `Page ${current} / ${total}`;
  }
  if (prevBtn && appState) {
    const current = typeof appState.currentPageIndex === 'number' ? appState.currentPageIndex : 0;
    prevBtn.disabled = current <= 0;
  }
  if (panLeftBtn && appState) {
    panLeftBtn.disabled = getBoardViewport().x <= 0;
  }
  if (zoomLabel && appState) {
    zoomLabel.textContent = `${Math.round(getBoardViewport().zoom * 100)}%`;
  }

  if (appState) {
    const currentMode = appState.backgroundMode || 'transparent';
    const patternBtns = document.querySelectorAll('.board-pattern-group .pattern-btn');
    patternBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.pattern === currentMode);
    });

    const currentColor = appState.boardColor || (currentMode === 'blackboard' ? '#18181c' : '#ffffff');
    const colorSwatches = document.querySelectorAll('.board-color-group .board-swatch');
    colorSwatches.forEach((swatch) => {
      swatch.classList.toggle('active', swatch.dataset.boardColor.toLowerCase() === currentColor.toLowerCase());
    });
    const customColorPicker = document.getElementById('boardCustomColorPicker');
    if (customColorPicker) {
      customColorPicker.value = currentColor;
    }
  }
}

function updateMagnifierImg() {
  const dispId = bootstrap?.display?.id;
  const url = appState?.magnifierBgUrls?.[dispId] || Object.values(appState?.magnifierBgUrls || {})[0];
  if (url && url !== lastMagnifierUrl) {
    lastMagnifierUrl = url;
    const img = new Image();
    img.onload = () => {
      magnifierImg = img;
      scheduleRender();
    };
    img.src = url;
  } else if (!url) {
    lastMagnifierUrl = null;
    magnifierImg = null;
  }
}

function hexToRgba(hex, alpha) {
  const safeHex = typeof hex === 'string' && hex.trim() ? hex : '#ff5a5f';
  const safeAlpha = typeof alpha === 'number' ? alpha : 1;
  const value = safeHex.replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map((char) => char + char).join('')
    : value.padEnd(6, '0').slice(0, 6);

  const numeric = Number.parseInt(normalized, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

function isBoardMode() {
  return !!(appState && appState.backgroundMode && appState.backgroundMode !== 'transparent');
}

function getBoardViewport() {
  const viewport = appState?.boardViewport || {};
  const x = Number(viewport.x);
  const zoom = Number(viewport.zoom);
  return {
    x: Number.isFinite(x) ? Math.max(0, x) : 0,
    zoom: Number.isFinite(zoom) ? Math.max(BOARD_MIN_ZOOM, Math.min(BOARD_MAX_ZOOM, zoom)) : 1,
  };
}

function getRenderScale() {
  return isBoardMode() ? getBoardViewport().zoom : 1;
}

function screenToWorldLength(value) {
  return value / getRenderScale();
}

function worldToScreenLength(value) {
  return value * getRenderScale();
}

function setBoardViewport(viewport) {
  if (!window.appBridge?.setBoardViewport) return;
  window.appBridge.setBoardViewport(viewport);
}

function panBoardByScreen(screenDelta) {
  const viewport = getBoardViewport();
  setBoardViewport({
    x: Math.max(0, viewport.x + screenToWorldLength(screenDelta)),
    zoom: viewport.zoom,
  });
}

function zoomBoardBy(factor, anchorScreenX = window.innerWidth / 2) {
  const viewport = getBoardViewport();
  const nextZoom = Math.max(BOARD_MIN_ZOOM, Math.min(BOARD_MAX_ZOOM, viewport.zoom * factor));
  const anchorWorldX = viewport.x + (anchorScreenX / viewport.zoom);
  const nextX = Math.max(0, anchorWorldX - (anchorScreenX / nextZoom));
  setBoardViewport({ x: nextX, zoom: nextZoom });
}

function scheduleRender() {
  if (renderQueued) {
    return;
  }
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function resizeCanvas() {
  currentDevicePixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(window.innerWidth * currentDevicePixelRatio));
  const height = Math.max(1, Math.round(window.innerHeight * currentDevicePixelRatio));
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(currentDevicePixelRatio, 0, 0, currentDevicePixelRatio, 0, 0);
  scheduleRender();
}

function globalToLocal(point) {
  if (isBoardMode()) {
    const viewport = getBoardViewport();
    return {
      x: (point.x - displayBounds.x - viewport.x) * viewport.zoom,
      y: (point.y - displayBounds.y) * viewport.zoom,
    };
  }
  return {
    x: point.x - displayBounds.x,
    y: point.y - displayBounds.y,
  };
}

function localToGlobal(point) {
  if (isBoardMode()) {
    const viewport = getBoardViewport();
    return {
      x: (point.x / viewport.zoom) + displayBounds.x + viewport.x,
      y: (point.y / viewport.zoom) + displayBounds.y,
    };
  }
  return {
    x: point.x + displayBounds.x,
    y: point.y + displayBounds.y,
  };
}

function getBrushStyle() {
  if (!appState) {
    return {
      color: '#ff5a5f',
      width: 4,
      opacity: 1,
    };
  }

  if (appState.activeTool === 'highlighter') {
    return {
      color: appState.brushDefaults.highlighter.color,
      width: appState.brushDefaults.highlighter.width,
      opacity: appState.brushDefaults.highlighter.opacity,
    };
  }

  if (appState.activeTool === 'calligraphy') {
    return {
      color: appState.brushDefaults.calligraphy.color,
      width: appState.brushDefaults.calligraphy.width,
      opacity: appState.brushDefaults.calligraphy.opacity || 1,
    };
  }

  if (appState.activeTool === 'eraser') {
    return {
      color: '#ffffff',
      width: appState.brushDefaults.eraser.radius,
      opacity: 0.55,
    };
  }

  return {
    color: appState.brushDefaults.pen.color,
    width: appState.brushDefaults.pen.width,
    opacity: appState.brushDefaults.pen.opacity,
  };
}

function createTextEditor(x, y, existingStroke = null) {
  const brush = getBrushStyle();
  const scale = getRenderScale();
  const textarea = document.createElement('textarea');
  textarea.style.position = 'fixed';

  let left = x;
  let top = y;
  if (existingStroke) {
    const spt = globalToLocal({ x: existingStroke.x, y: existingStroke.y });
    left = spt.x;
    top = spt.y;
    textarea.value = existingStroke.text || '';
    if (existingStroke.width) textarea.style.width = `${worldToScreenLength(existingStroke.width)}px`;
    if (existingStroke.height) textarea.style.height = `${worldToScreenLength(existingStroke.height)}px`;
  } else {
    textarea.style.left = `${left}px`;
    textarea.style.top = `${top}px`;
  }

  const mode = existingStroke?.textMode || appState.textMode || 'plain';
  textarea.style.left = `${left}px`;
  textarea.style.top = `${top}px`;
  textarea.style.color = existingStroke?.color || brush.color;
  const baseFont = existingStroke?.font || 'bold 22px sans-serif';
  textarea.style.font = scale === 1 ? baseFont : baseFont.replace(/(\d+(?:\.\d+)?)px/, (_, size) => `${Number(size) * scale}px`);
  if (mode === 'sticky') {
    textarea.style.background = 'rgba(255, 255, 220, 0.95)';
    textarea.style.border = '2px dashed #666';
    textarea.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    textarea.style.borderRadius = '0px';
    textarea.style.padding = '8px';
  } else {
    textarea.style.background = 'transparent';
    textarea.style.border = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.borderRadius = '0px';
    textarea.style.padding = '0px';
    textarea.style.textShadow = '0 1px 4px rgba(0, 0, 0, 0.8)';
  }
  textarea.style.outline = 'none';
  if (mode === 'sticky') {
    textarea.style.resize = 'both';
    textarea.style.whiteSpace = 'pre-wrap';
    textarea.style.wordWrap = 'break-word';
    textarea.style.overflowWrap = 'break-word';
    textarea.style.minWidth = '180px';
    textarea.style.minHeight = '70px';
  } else {
    textarea.style.resize = 'none';
    textarea.style.whiteSpace = 'pre';
    textarea.style.overflow = 'hidden';
    textarea.style.minWidth = '20px';
    textarea.style.minHeight = '30px';
  }
  textarea.style.zIndex = '99999';
  document.body.appendChild(textarea);
  
  const autoResize = () => {
    if (mode === 'plain') {
      textarea.style.width = '10px';
      textarea.style.height = '10px';
      textarea.style.width = `${textarea.scrollWidth + 2}px`;
      textarea.style.height = `${textarea.scrollHeight + 2}px`;
    }
  };
  textarea.addEventListener('input', autoResize);
  autoResize();
  
  textarea.focus();

  let isJustCreated = true;
  setTimeout(() => {
    isJustCreated = false;
  }, 350);

  textarea.addEventListener('pointerdown', (e) => e.stopPropagation());
  textarea.addEventListener('pointerup', (e) => e.stopPropagation());
  textarea.addEventListener('click', (e) => e.stopPropagation());

  const commit = async () => {
    if (isJustCreated) {
      setTimeout(() => {
        if (textarea.parentNode) textarea.focus();
      }, 10);
      return;
    }
    const text = textarea.value.trim();
    if (existingStroke) {
      if (!text) {
        if (window.appBridge.deleteAnnotations) {
          await window.appBridge.deleteAnnotations([existingStroke.id]);
        }
      } else {
        const updated = {
          ...existingStroke,
          text: text,
          textMode: existingStroke.textMode || appState.textMode || 'plain',
          width: Math.max(20, screenToWorldLength(textarea.offsetWidth)),
          height: Math.max(30, screenToWorldLength(textarea.offsetHeight))
        };
        if (window.appBridge.updateAnnotation) {
          await window.appBridge.updateAnnotation(updated);
        }
      }
    } else if (text) {
      const globalPt = localToGlobal({ x: left, y: top });
      await window.appBridge.addStroke({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tool: 'text',
        textMode: appState.textMode || 'plain',
        color: brush.color,
        font: 'bold 22px sans-serif',
        text: text,
        x: globalPt.x,
        y: globalPt.y,
        width: Math.max(20, screenToWorldLength(textarea.offsetWidth)),
        height: Math.max(30, screenToWorldLength(textarea.offsetHeight))
      });
    }
    if (textarea.parentNode) textarea.parentNode.removeChild(textarea);
  };

  textarea.addEventListener('blur', commit);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.shiftKey))) {
      e.preventDefault();
      isJustCreated = false;
      textarea.blur();
    }
  });
}

function drawStroke(stroke, targetCtx = ctx) {
  const scale = getRenderScale();
  if (stroke.tool === 'text' && stroke.text) {
    const pt = globalToLocal({ x: stroke.x, y: stroke.y });
    targetCtx.save();
    const boxW = worldToScreenLength(stroke.width || 200);
    const boxH = worldToScreenLength(stroke.height || 80);
    const mode = stroke.textMode || appState.textMode || 'plain';
    if (mode === 'sticky') {
      targetCtx.fillStyle = 'rgba(255, 255, 220, 0.95)';
      targetCtx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      targetCtx.shadowBlur = 8;
      targetCtx.shadowOffsetY = 4;
      targetCtx.fillRect(pt.x, pt.y, boxW, boxH);
      targetCtx.shadowColor = 'transparent';
      targetCtx.strokeStyle = '#e0e0b0';
      targetCtx.lineWidth = Math.max(1, scale);
      targetCtx.strokeRect(pt.x, pt.y, boxW, boxH);
    } else {
      targetCtx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      targetCtx.shadowBlur = 5;
      targetCtx.shadowOffsetX = 1;
      targetCtx.shadowOffsetY = 1;
    }

    targetCtx.fillStyle = stroke.color || '#333';
    const font = stroke.font || 'bold 22px sans-serif';
    targetCtx.font = scale === 1 ? font : font.replace(/(\d+(?:\.\d+)?)px/, (_, size) => `${Number(size) * scale}px`);
    targetCtx.textBaseline = 'top';
    const paddingX = (mode === 'sticky' ? 10 : 4) * scale;
    const paddingY = (mode === 'sticky' ? 10 : 4) * scale;
    const maxLineWidth = Math.max(50, boxW - paddingX * 2);
    const rawLines = stroke.text.split('\n');
    let lineY = pt.y + paddingY;
    for (const rawLine of rawLines) {
      if (!rawLine) {
        lineY += 26 * scale;
        continue;
      }
      const words = rawLine.split(' ');
      let currentLine = words[0];
      for (let i = 1; i < words.length; i += 1) {
        const word = words[i];
        const testLine = `${currentLine} ${word}`;
        const metrics = targetCtx.measureText(testLine);
        if (metrics.width > maxLineWidth && currentLine.length > 0) {
          targetCtx.fillText(currentLine, pt.x + paddingX, lineY);
          lineY += 26 * scale;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      targetCtx.fillText(currentLine, pt.x + paddingX, lineY);
      lineY += 26 * scale;
    }
    targetCtx.restore();
    return;
  }

  if (stroke.tool === 'image' && stroke.dataUrl) {
    const pt = globalToLocal({ x: stroke.x, y: stroke.y });
    const w = worldToScreenLength(stroke.width || 400);
    const h = worldToScreenLength(stroke.height || 300);
    if (!stroke._cachedImg || stroke._cachedImgSrc !== stroke.dataUrl) {
      const img = new Image();
      img.src = stroke.dataUrl;
      stroke._cachedImg = img;
      stroke._cachedImgSrc = stroke.dataUrl;
      img.onload = () => scheduleRender();
    }
    targetCtx.save();
    targetCtx.globalAlpha = stroke.opacity || 1;
    if (stroke._cachedImg && stroke._cachedImg.complete) {
      targetCtx.drawImage(stroke._cachedImg, pt.x, pt.y, w, h);
    } else {
      targetCtx.fillStyle = 'rgba(200, 200, 200, 0.3)';
      targetCtx.fillRect(pt.x, pt.y, w, h);
    }
    targetCtx.restore();
    return;
  }

  if (stroke.tool === 'shapes') {
    const pStart = stroke.start ? globalToLocal(stroke.start) : (stroke.points?.[0] ? globalToLocal(stroke.points[0]) : { x: 0, y: 0 });
    const pEnd = stroke.end ? globalToLocal(stroke.end) : (stroke.points?.[stroke.points.length - 1] ? globalToLocal(stroke.points[stroke.points.length - 1]) : pStart);
    const shapeType = stroke.shapeType || 'rectangle';

    targetCtx.save();
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.strokeStyle = hexToRgba(stroke.color || '#ff5a5f', stroke.opacity || 1);
    targetCtx.lineWidth = worldToScreenLength(stroke.width || 4);
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';

    targetCtx.beginPath();
    if (shapeType === 'rectangle') {
      const x = Math.min(pStart.x, pEnd.x);
      const y = Math.min(pStart.y, pEnd.y);
      const w = Math.abs(pEnd.x - pStart.x);
      const h = Math.abs(pEnd.y - pStart.y);
      targetCtx.strokeRect(x, y, w, h);
    } else if (shapeType === 'circle') {
      const cx = (pStart.x + pEnd.x) / 2;
      const cy = (pStart.y + pEnd.y) / 2;
      const rx = Math.abs(pEnd.x - pStart.x) / 2;
      const ry = Math.abs(pEnd.y - pStart.y) / 2;
      targetCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      targetCtx.stroke();
    } else if (shapeType === 'triangle') {
      const topX = (pStart.x + pEnd.x) / 2;
      const topY = Math.min(pStart.y, pEnd.y);
      const bottomY = Math.max(pStart.y, pEnd.y);
      targetCtx.moveTo(topX, topY);
      targetCtx.lineTo(pEnd.x, bottomY);
      targetCtx.lineTo(pStart.x, bottomY);
      targetCtx.closePath();
      targetCtx.stroke();
    } else if (shapeType === 'line') {
      targetCtx.moveTo(pStart.x, pStart.y);
      targetCtx.lineTo(pEnd.x, pEnd.y);
      targetCtx.stroke();
    } else if (shapeType === 'freehand_arrow') {
      const localPts = stroke.points ? stroke.points.map(globalToLocal) : [];
      if (localPts.length >= 2) {
        targetCtx.moveTo(localPts[0].x, localPts[0].y);
        for (let i = 1; i < localPts.length; i++) {
          targetCtx.lineTo(localPts[i].x, localPts[i].y);
        }
        targetCtx.stroke();

        const pLast = localPts[localPts.length - 1];
        const pPrev = localPts[localPts.length - 2];
        const angle = Math.atan2(pLast.y - pPrev.y, pLast.x - pPrev.x);
        const headLen = Math.max(12, worldToScreenLength(stroke.width || 4) * 3);
        targetCtx.beginPath();
        targetCtx.moveTo(pLast.x, pLast.y);
        targetCtx.lineTo(pLast.x - headLen * Math.cos(angle - Math.PI / 6), pLast.y - headLen * Math.sin(angle - Math.PI / 6));
        targetCtx.moveTo(pLast.x, pLast.y);
        targetCtx.lineTo(pLast.x - headLen * Math.cos(angle + Math.PI / 6), pLast.y - headLen * Math.sin(angle + Math.PI / 6));
        targetCtx.stroke();
      } else if (localPts.length === 1) {
        targetCtx.arc(localPts[0].x, localPts[0].y, worldToScreenLength(stroke.width || 4) / 2, 0, Math.PI * 2);
        targetCtx.fill();
      }
    } else if (shapeType === 'arrow') {
      targetCtx.moveTo(pStart.x, pStart.y);
      targetCtx.lineTo(pEnd.x, pEnd.y);
      targetCtx.stroke();

      const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
      const headLen = Math.max(12, worldToScreenLength(stroke.width || 4) * 3);
      targetCtx.beginPath();
      targetCtx.moveTo(pEnd.x, pEnd.y);
      targetCtx.lineTo(pEnd.x - headLen * Math.cos(angle - Math.PI / 6), pEnd.y - headLen * Math.sin(angle - Math.PI / 6));
      targetCtx.moveTo(pEnd.x, pEnd.y);
      targetCtx.lineTo(pEnd.x - headLen * Math.cos(angle + Math.PI / 6), pEnd.y - headLen * Math.sin(angle + Math.PI / 6));
      targetCtx.stroke();
    }
    targetCtx.restore();
    return;
  }

  if (!stroke.points || stroke.points.length === 0) {
    return;
  }

  const points = stroke.points.map(globalToLocal);
  targetCtx.save();
  targetCtx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
  targetCtx.strokeStyle = hexToRgba(stroke.color, stroke.opacity);
  targetCtx.fillStyle = hexToRgba(stroke.color, stroke.opacity);
  targetCtx.lineWidth = worldToScreenLength(stroke.width || 4);
  targetCtx.lineCap = 'round';
  targetCtx.lineJoin = 'round';

  if (stroke.tool === 'calligraphy' || stroke.brushType === 'calligraphy') {
    const angle = typeof stroke.angle === 'number' ? stroke.angle : Math.PI / 4;
    const w = worldToScreenLength(stroke.width || 4);
    const offsetX = Math.cos(angle) * (w / 2);
    const offsetY = -Math.sin(angle) * (w / 2);
    
    // Draw the starting nib stamp
    targetCtx.beginPath();
    targetCtx.moveTo(points[0].x - offsetX, points[0].y - offsetY);
    targetCtx.lineTo(points[0].x + offsetX, points[0].y + offsetY);
    targetCtx.lineWidth = Math.max(1, scale);
    targetCtx.stroke();
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i+1];
      targetCtx.beginPath();
      targetCtx.moveTo(p1.x - offsetX, p1.y - offsetY);
      targetCtx.lineTo(p2.x - offsetX, p2.y - offsetY);
      targetCtx.lineTo(p2.x + offsetX, p2.y + offsetY);
      targetCtx.lineTo(p1.x + offsetX, p1.y + offsetY);
      targetCtx.closePath();
      targetCtx.fill();
    }
    targetCtx.restore();
    return;
  }

  if (points.length === 1) {
    const point = points[0];
    targetCtx.beginPath();
    targetCtx.arc(point.x, point.y, worldToScreenLength(stroke.width || 4) / 2, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.restore();
    return;
  }

  targetCtx.beginPath();
  targetCtx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    targetCtx.lineTo(points[i].x, points[i].y);
  }
  targetCtx.stroke();
  targetCtx.restore();
}

function drawPreviewStroke(targetCtx = ctx) {
  if (!currentStroke) {
    return;
  }

  drawStroke(currentStroke, targetCtx);
}

function isColorDark(hexColor) {
  if (!hexColor) return false;
  let c = String(hexColor).replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.substr(0, 2), 16) || 0;
  const g = parseInt(c.substr(2, 2), 16) || 0;
  const b = parseInt(c.substr(4, 2), 16) || 0;
  return (r * 0.299 + g * 0.587 + b * 0.114) < 130;
}

function render() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();

  if (appState && appState.backgroundMode && appState.backgroundMode !== 'transparent') {
    ctx.save();
    const bg = appState.boardColor || (appState.backgroundMode === 'blackboard' ? '#18181c' : '#ffffff');
    const isDark = isColorDark(bg);
    const viewport = getBoardViewport();
    const zoom = viewport.zoom;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    if (appState.backgroundMode === 'grid') {
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.18)' : '#e0e0e8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const firstX = Math.floor(viewport.x / 28) * 28;
      for (let worldX = firstX; (worldX - viewport.x) * zoom < width; worldX += 28) {
        const x = (worldX - viewport.x) * zoom;
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      }
      for (let worldY = 0; worldY * zoom < height; worldY += 28) {
        const y = worldY * zoom;
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      ctx.stroke();
    } else if (appState.backgroundMode === 'ruled') {
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.18)' : '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let worldY = 40; worldY * zoom < height; worldY += 32) {
        const y = worldY * zoom;
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      ctx.stroke();
      ctx.strokeStyle = '#f87171';
      ctx.beginPath();
      const marginX = (80 - viewport.x) * zoom;
      ctx.moveTo(marginX, 0); ctx.lineTo(marginX, height);
      ctx.stroke();
    } else if (appState.backgroundMode === 'staff') {
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : '#cbd5e1';
      ctx.lineWidth = 1.5;
      for (let worldY = 60; worldY * zoom < height; worldY += 140) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const sy = (worldY + i * 14) * zoom;
          ctx.moveTo(0, sy); ctx.lineTo(width, sy);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  const highlighterStrokes = [];
  const normalStrokes = [];
  for (const stroke of scene.annotations) {
    if (stroke.tool === 'highlighter' || stroke.origTool === 'highlighter') {
      highlighterStrokes.push(stroke);
    } else {
      normalStrokes.push(stroke);
    }
  }

  for (const stroke of normalStrokes) {
    drawStroke(stroke);
  }

  const isPreviewHighlighter = currentStroke && (currentStroke.tool === 'highlighter' || currentStroke.origTool === 'highlighter');
  if (highlighterStrokes.length > 0 || isPreviewHighlighter) {
    if (!window.hlCanvas) {
      window.hlCanvas = document.createElement('canvas');
      window.hlCtx = window.hlCanvas.getContext('2d');
    }
    if (window.hlCanvas.width !== width || window.hlCanvas.height !== height) {
      window.hlCanvas.width = width;
      window.hlCanvas.height = height;
    } else {
      window.hlCtx.clearRect(0, 0, width, height);
    }
    for (const stroke of highlighterStrokes) {
      const origOpacity = stroke.opacity;
      stroke.opacity = 1;
      drawStroke(stroke, window.hlCtx);
      stroke.opacity = origOpacity;
    }
    if (isPreviewHighlighter) {
      const origOpacity = currentStroke.opacity;
      currentStroke.opacity = 1;
      drawPreviewStroke(window.hlCtx);
      currentStroke.opacity = origOpacity;
    }

    ctx.save();
    const hlAlpha = (highlighterStrokes[0] && highlighterStrokes[0].opacity) || (currentStroke && currentStroke.opacity) || (appState && appState.brushDefaults && appState.brushDefaults.highlighter && appState.brushDefaults.highlighter.opacity) || 0.35;
    ctx.globalAlpha = hlAlpha;
    ctx.drawImage(window.hlCanvas, 0, 0);
    ctx.restore();
  }

  if (currentStroke && !isPreviewHighlighter) {
    drawPreviewStroke();
  }

  if (laserPoints.length > 0) {
    laserPoints = laserPoints.filter((p) => Date.now() - p.time < 350);
    if (laserPoints.length > 0) {
      ctx.save();
      for (let i = 1; i < laserPoints.length; i++) {
        const p1 = globalToLocal(laserPoints[i - 1]);
        const p2 = globalToLocal(laserPoints[i]);
        const age = Date.now() - laserPoints[i].time;
        const alpha = Math.max(0, 1 - age / 350);
        ctx.strokeStyle = `rgba(255, 30, 30, ${alpha})`;
        ctx.lineWidth = 6 * alpha + 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      const head = globalToLocal(laserPoints[laserPoints.length - 1]);
      ctx.fillStyle = '#ff1e1e';
      ctx.beginPath();
      ctx.arc(head.x, head.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      scheduleRender();
    }
  }

  if (clickRipples.length > 0) {
    clickRipples = clickRipples.filter((r) => Date.now() - r.time < 400);
    if (clickRipples.length > 0) {
      ctx.save();
      for (const r of clickRipples) {
        const pt = globalToLocal(r);
        const progress = (Date.now() - r.time) / 400;
        const alpha = Math.max(0, 1 - progress);
        const radius = 10 + progress * 35;
        ctx.strokeStyle = `rgba(255, 230, 50, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 230, 50, ${alpha * 0.3})`;
        ctx.fill();
      }
      ctx.restore();
      scheduleRender();
    }
  }

  if (selectedIds.length > 0) {
    const box = getSelectionBoundingBox(selectedIds);
    if (box) {
      ctx.save();
      ctx.strokeStyle = '#007afd';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(box.minX, box.minY, box.width, box.height);
      ctx.setLineDash([]);
      ctx.fillStyle = '#007afd';
      ctx.fillRect(box.minX - 5, box.minY - 5, 10, 10);
      ctx.fillRect(box.maxX - 5, box.minY - 5, 10, 10);
      ctx.fillRect(box.maxX - 5, box.maxY - 5, 10, 10);
      ctx.fillRect(box.minX - 5, box.maxY - 5, 10, 10);
      ctx.restore();
    }
  }

  if (marqueeBox) {
    ctx.save();
    const x = Math.min(marqueeBox.startX, marqueeBox.currentX);
    const y = Math.min(marqueeBox.startY, marqueeBox.currentY);
    const w = Math.abs(marqueeBox.currentX - marqueeBox.startX);
    const h = Math.abs(marqueeBox.currentY - marqueeBox.startY);
    ctx.fillStyle = 'rgba(0, 122, 253, 0.15)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#007afd';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  if (appState && appState.activeTool === 'spotlight' && currentMousePos) {
    const radius = appState.spotlight?.radius || 150;
    const alpha = appState.spotlight?.alpha || 0.75;
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.arc(currentMousePos.x, currentMousePos.y, radius, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(currentMousePos.x, currentMousePos.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (appState && appState.activeTool === 'magnifier' && currentMousePos) {
    const r = 130;
    const zoom = 2.5;
    ctx.save();
    ctx.beginPath();
    ctx.arc(currentMousePos.x, currentMousePos.y, r, 0, Math.PI * 2);
    ctx.clip();

    if (appState.backgroundMode === 'transparent') {
      if (magnifierImg && magnifierImg.complete && magnifierImg.naturalWidth > 0) {
        ctx.save();
        ctx.translate(currentMousePos.x, currentMousePos.y);
        ctx.scale(zoom, zoom);
        ctx.translate(-currentMousePos.x, -currentMousePos.y);
        ctx.drawImage(magnifierImg, 0, 0, window.innerWidth, window.innerHeight);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(currentMousePos.x, currentMousePos.y);
        ctx.scale(zoom, zoom);
        ctx.translate(-currentMousePos.x, -currentMousePos.y);
        for (const stroke of scene.annotations) {
          drawStroke(stroke);
        }
        ctx.restore();
      }
    } else {
      ctx.fillStyle = appState.boardColor || (appState.backgroundMode === 'blackboard' ? '#18181c' : '#ffffff');
      ctx.fillRect(currentMousePos.x - r, currentMousePos.y - r, r * 2, r * 2);

      ctx.save();
      ctx.translate(currentMousePos.x, currentMousePos.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-currentMousePos.x, -currentMousePos.y);

      for (const stroke of scene.annotations) {
        drawStroke(stroke);
      }
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(currentMousePos.x, currentMousePos.y, r, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#3b82f6';
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.beginPath();
    ctx.moveTo(currentMousePos.x - 15, currentMousePos.y);
    ctx.lineTo(currentMousePos.x + 15, currentMousePos.y);
    ctx.moveTo(currentMousePos.x, currentMousePos.y - 15);
    ctx.lineTo(currentMousePos.x, currentMousePos.y + 15);
    ctx.stroke();
    ctx.restore();
  }

  if (appState && appState.backgroundMode && appState.backgroundMode !== 'transparent') {
    ctx.save();
    const zoneY = height - 40;
    const isHovered = currentMousePos && currentMousePos.y >= zoneY && canDraw();
    ctx.fillStyle = isHovered ? 'rgba(59, 130, 246, 0.15)' : 'rgba(128, 128, 128, 0.05)';
    ctx.fillRect(0, zoneY, width, 40);
    ctx.strokeStyle = isHovered ? '#3b82f6' : 'rgba(128, 128, 128, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, zoneY);
    ctx.lineTo(width, zoneY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = isHovered ? '#3b82f6' : 'rgba(128, 128, 128, 0.4)';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isHovered ? 'Release to Create New Page' : '+ New Page Bottom Zone', width / 2, zoneY + 24);
    ctx.restore();
  }

  ctx.restore();
}

function canDraw() {
  return appState && !appState.passThrough;
}

function getSelectionBoundingBox(ids) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const stroke of scene.annotations) {
    if (ids.includes(stroke.id)) {
      if (stroke.tool === 'text' || stroke.tool === 'image') {
        const pt = globalToLocal({ x: stroke.x, y: stroke.y });
        const boxW = worldToScreenLength(stroke.width || (stroke.tool === 'image' ? 400 : 200));
        const boxH = worldToScreenLength(stroke.height || (stroke.tool === 'image' ? 300 : 80));
        minX = Math.min(minX, pt.x - 4);
        minY = Math.min(minY, pt.y - 4);
        maxX = Math.max(maxX, pt.x + boxW + 4);
        maxY = Math.max(maxY, pt.y + boxH + 4);
      } else if ((stroke.tool === 'shapes' || stroke.shapeType) && stroke.shapeType !== 'freehand_arrow') {
        const pStart = stroke.start ? globalToLocal(stroke.start) : (stroke.points?.[0] ? globalToLocal(stroke.points[0]) : { x: 0, y: 0 });
        const pEnd = stroke.end ? globalToLocal(stroke.end) : (stroke.points?.[stroke.points.length - 1] ? globalToLocal(stroke.points[stroke.points.length - 1]) : pStart);
        minX = Math.min(minX, pStart.x - 10, pEnd.x - 10);
        minY = Math.min(minY, pStart.y - 10, pEnd.y - 10);
        maxX = Math.max(maxX, pStart.x + 10, pEnd.x + 10);
        maxY = Math.max(maxY, pStart.y + 10, pEnd.y + 10);
      } else if (stroke.points) {
        for (const p of stroke.points) {
          const pt = globalToLocal(p);
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }
        minX -= 10; minY -= 10; maxX += 10; maxY += 10;
      }
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function addPointToStroke(stroke, point) {
  const lastPoint = stroke.points[stroke.points.length - 1];
  const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
  if (distance >= 0.75) {
    stroke.points.push(point);
  }
}

function createStrokeFromEvent(event) {
  if (!appState) return null;
  const brush = getBrushStyle();
  const globalPoint = localToGlobal({ x: event.offsetX, y: event.offsetY });

  if (appState.activeTool === 'shapes') {
    if (appState.activeShapeType === 'freehand_arrow') {
      return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tool: 'shapes',
        shapeType: 'freehand_arrow',
        color: brush.color,
        width: brush.width,
        opacity: brush.opacity,
        points: [globalPoint],
      };
    }
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      tool: 'shapes',
      shapeType: appState.activeShapeType || 'rectangle',
      color: brush.color,
      width: brush.width,
      opacity: brush.opacity,
      start: { ...globalPoint },
      end: { ...globalPoint },
    };
  }

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tool: appState.activeTool,
    color: brush.color,
    width: brush.width,
    opacity: brush.opacity,
    points: [globalPoint],
  };
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  const u = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (mag * mag);
  const ix = lineStart.x + u * dx;
  const iy = lineStart.y + u * dy;
  return Math.hypot(point.x - ix, point.y - iy);
}

function simplifyPath(points, epsilon) {
  if (points.length <= 2) return points;
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }
  if (dmax > epsilon) {
    const recResults1 = simplifyPath(points.slice(0, index + 1), epsilon);
    const recResults2 = simplifyPath(points.slice(index), epsilon);
    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  } else {
    return [points[0], points[end]];
  }
}

function recognizeAndSnapShape(stroke) {
  const pts = stroke.points;
  if (!pts || pts.length < 5) return;

  let minX = pts[0].x, maxX = pts[0].x, minY = pts[0].y, maxY = pts[0].y;
  let pathLen = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (i > 0) {
      pathLen += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const diag = Math.hypot(width, height);
  if (diag < 15) return;

  const pStart = pts[0];
  const pEnd = pts[pts.length - 1];
  const endDist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);

  const isClosed = (endDist < 0.3 * diag) || (endDist < 0.25 * pathLen);

  if (isClosed) {
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p.x; cy += p.y; }
    cx /= pts.length;
    cy /= pts.length;

    let avgR = 0;
    const radii = [];
    for (const p of pts) {
      const r = Math.hypot(p.x - cx, p.y - cy);
      radii.push(r);
      avgR += r;
    }
    avgR /= pts.length;

    let variance = 0;
    for (const r of radii) {
      variance += Math.pow(r - avgR, 2);
    }
    const stdDev = Math.sqrt(variance / pts.length);
    const cv = stdDev / (avgR || 1);

    if (cv < 0.25) {
      const aspectRatio = Math.min(width, height) / (Math.max(width, height) || 1);
      const newPoints = [];
      const steps = 60;
      if (aspectRatio > 0.7) {
        const radius = (width + height) / 4;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          newPoints.push({
            x: Math.round(cx + radius * Math.cos(angle)),
            y: Math.round(cy + radius * Math.sin(angle))
          });
        }
      } else {
        const rx = width / 2;
        const ry = height / 2;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          newPoints.push({
            x: Math.round(cx + rx * Math.cos(angle)),
            y: Math.round(cy + ry * Math.sin(angle))
          });
        }
      }
      stroke.points = newPoints;
      return;
    }

    const simplified = simplifyPath(pts, 0.08 * diag);
    if (simplified.length >= 4 && simplified.length <= 6) {
      if (simplified.length === 5) {
        stroke.points = [
          { x: minX, y: minY },
          { x: maxX, y: minY },
          { x: maxX, y: maxY },
          { x: minX, y: maxY },
          { x: minX, y: minY }
        ];
        return;
      }
      if (simplified.length === 4) {
        stroke.points = simplified;
        return;
      }
    }

    stroke.points = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
      { x: minX, y: minY }
    ];
    return;
  }

  const linearity = endDist / (pathLen || 1);
  if (linearity > 0.82) {
    stroke.points = [pStart, pEnd];
    return;
  }
}

function recognizeShape(stroke) {
  if (!stroke || !stroke.points || stroke.points.length < 6) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let totalPathLen = 0;

  for (let i = 0; i < stroke.points.length; i++) {
    const p = stroke.points[i];
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
    if (i > 0) {
      totalPathLen += Math.hypot(p.x - stroke.points[i - 1].x, p.y - stroke.points[i - 1].y);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const diag = Math.hypot(width, height);
  if (diag < 15) {
    return null;
  }

  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];
  const closedDist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);

  const isMagicShape = stroke.tool === 'shapes';

  // Check simple line first: if end-to-end distance is very close to total path length
  const lineThreshold = isMagicShape ? 0.88 : 0.96;
  const lineMinDist = isMagicShape ? 25 : 50;
  if (totalPathLen > 0 && (closedDist / totalPathLen) > lineThreshold && closedDist > lineMinDist) {
    return { shapeType: 'line', start: { ...pStart }, end: { ...pEnd } };
  }

  const isClosed = isMagicShape ? (closedDist < diag * 0.50 || closedDist < 75) : (closedDist < diag * 0.35);

  if (isClosed) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = width / 2;
    const ry = height / 2;
    if (rx < 2 || ry < 2) return null;

    let sumCircleErr = 0;
    let sumRectErr = 0;
    let sumTriErr = 0;

    const vTop = { x: cx, y: minY };
    const vBottomRight = { x: maxX, y: maxY };
    const vBottomLeft = { x: minX, y: maxY };

    function distToSeg(p, a, b) {
      const l2 = Math.hypot(b.x - a.x, b.y - a.y) ** 2;
      if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
      let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
    }

    for (const p of stroke.points) {
      const dx = (p.x - cx) / rx;
      const dy = (p.y - cy) / ry;
      const distFromCenter = Math.hypot(dx, dy);
      sumCircleErr += Math.abs(distFromCenter - 1.0);

      const dLeft = Math.abs(p.x - minX);
      const dRight = Math.abs(p.x - maxX);
      const dTop = Math.abs(p.y - minY);
      const dBottom = Math.abs(p.y - maxY);
      const minEdgeDist = Math.min(dLeft, dRight, dTop, dBottom);
      sumRectErr += minEdgeDist / (diag / 2);

      const d1 = distToSeg(p, vTop, vBottomRight);
      const d2 = distToSeg(p, vBottomRight, vBottomLeft);
      const d3 = distToSeg(p, vBottomLeft, vTop);
      sumTriErr += Math.min(d1, d2, d3) / (diag / 2);
    }

    const avgCircleErr = sumCircleErr / stroke.points.length;
    const avgRectErr = sumRectErr / stroke.points.length;
    const avgTriErr = sumTriErr / stroke.points.length;

    const triThresh = isMagicShape ? 0.35 : 0.20;
    const circleThresh = isMagicShape ? 0.32 : 0.18;
    const rectThresh = isMagicShape ? 0.32 : 0.18;

    if (avgTriErr < triThresh && avgTriErr < avgCircleErr && avgTriErr < avgRectErr) {
      return { shapeType: 'triangle', start: { x: minX, y: minY }, end: { x: maxX, y: maxY } };
    }

    if (avgCircleErr < circleThresh && avgCircleErr <= avgRectErr) {
      const aspect = Math.min(width, height) / Math.max(width, height);
      if (aspect > 0.65) {
        const r = Math.max(rx, ry);
        return { shapeType: 'circle', start: { x: cx - r, y: cy - r }, end: { x: cx + r, y: cy + r } };
      }
      return { shapeType: 'circle', start: { x: minX, y: minY }, end: { x: maxX, y: maxY } };
    }

    if (avgRectErr < rectThresh) {
      return { shapeType: 'rectangle', start: { x: minX, y: minY }, end: { x: maxX, y: maxY } };
    }
  }

  let maxDist = 0;
  let pMax = stroke.points[stroke.points.length - 1];
  let maxIdx = stroke.points.length - 1;
  for (let i = 0; i < stroke.points.length; i++) {
    const p = stroke.points[i];
    const d = Math.hypot(p.x - pStart.x, p.y - pStart.y);
    if (d > maxDist) {
      maxDist = d;
      pMax = p;
      maxIdx = i;
    }
  }

  const lineLen = maxDist;
  if (lineLen < 20) {
    return null;
  }

  let sumLineDist = 0;
  for (const p of stroke.points) {
    const d = Math.abs((pMax.y - pStart.y) * p.x - (pMax.x - pStart.x) * p.y + pMax.x * pStart.y - pMax.y * pStart.x) / lineLen;
    sumLineDist += d;
  }
  const avgLineErr = sumLineDist / stroke.points.length;

  let sumShaftDist = 0;
  let shaftCount = 0;
  for (let i = 0; i <= maxIdx; i++) {
    const p = stroke.points[i];
    const d = Math.abs((pMax.y - pStart.y) * p.x - (pMax.x - pStart.x) * p.y + pMax.x * pStart.y - pMax.y * pStart.x) / lineLen;
    sumShaftDist += d;
    shaftCount++;
  }
  const avgShaftErr = shaftCount > 0 ? sumShaftDist / shaftCount : avgLineErr;

  const arrowThresh = isMagicShape ? 0.30 : 0.15;
  const lineErrThresh = isMagicShape ? 0.28 : 0.15;

  if (avgShaftErr < arrowThresh) {
    let hasBarb = false;
    if (maxIdx < stroke.points.length - 2) {
      for (let i = maxIdx + 1; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        const d = Math.abs((pMax.y - pStart.y) * p.x - (pMax.x - pStart.x) * p.y + pMax.x * pStart.y - pMax.y * pStart.x) / lineLen;
        const distToStart = Math.hypot(p.x - pStart.x, p.y - pStart.y);
        if (d > 5 || distToStart < lineLen - 8) {
          hasBarb = true;
          break;
        }
      }
    }

    if (hasBarb) {
      return { shapeType: 'arrow', start: { ...pStart }, end: { ...pMax } };
    } else if (avgLineErr < lineErrThresh) {
      return { shapeType: 'line', start: { ...pStart }, end: { ...pMax } };
    }
  }

  return null;
}

async function checkAutoAdvance(stroke) {
  if (!appState || !appState.backgroundMode || appState.backgroundMode === 'transparent') return;
  if (!stroke || ['laser', 'select', 'spotlight', 'magnifier'].includes(stroke.tool)) return;

  let hitBottom = false;
  const threshY = window.innerHeight - 110;
  if (stroke.points && stroke.points.length > 0) {
    for (const p of stroke.points) {
      if (globalToLocal(p).y >= threshY) {
        hitBottom = true;
        break;
      }
    }
  } else if (stroke.start || stroke.end) {
    const sy = stroke.start ? globalToLocal(stroke.start).y : 0;
    const ey = stroke.end ? globalToLocal(stroke.end).y : 0;
    if (Math.max(sy, ey) >= threshY) hitBottom = true;
  }

  if (hitBottom && Date.now() - lastAutoAdvanceTime > 1500) {
    lastAutoAdvanceTime = Date.now();
    if (window.appBridge && window.appBridge.nextPage) {
      const nextState = await window.appBridge.nextPage();
      if (nextState && typeof nextState.currentPageIndex === 'number') {
        showPageToast(`Page ${nextState.currentPageIndex + 1} created`);
      } else {
        showPageToast(`New page created`);
      }
    }
  }
}

async function finalizeStroke() {
  if (!currentStroke) {
    return;
  }

  const stroke = currentStroke;
  currentStroke = null;

  if (stroke.tool === 'shapes') {
    if (stroke.shapeType === 'freehand_arrow') {
      if (stroke.points && stroke.points.length >= 2) {
        stroke.start = { ...stroke.points[0] };
        stroke.end = { ...stroke.points[stroke.points.length - 1] };
        await window.appBridge.addStroke(stroke);
        await checkAutoAdvance(stroke);
      }
    } else if (stroke.start && stroke.end && Math.hypot(stroke.end.x - stroke.start.x, stroke.end.y - stroke.start.y) >= 4) {
      await window.appBridge.addStroke(stroke);
      await checkAutoAdvance(stroke);
    }
    return;
  }

  if (stroke.tool === 'eraser') {
    await window.appBridge.erasePath({
      points: stroke.points,
      radius: appState.brushDefaults.eraser.radius,
    });
  } else {
    const recognized = (stroke.tool === 'shapes' || stroke.tool === 'pen' || stroke.tool === 'calligraphy') ? recognizeShape(stroke) : null;
    if (recognized) {
      stroke.isAutoShape = true;
      stroke.origTool = stroke.tool;
      stroke.origPoints = stroke.points ? stroke.points.map(point => ({ x: point.x, y: point.y })) : null;
      stroke.origShapeType = recognized.shapeType;
      stroke.origStart = { ...recognized.start };
      stroke.origEnd = { ...recognized.end };

      stroke.tool = 'shapes';
      stroke.shapeType = recognized.shapeType;
      stroke.start = { ...recognized.start };
      stroke.end = { ...recognized.end };
    }
    await window.appBridge.addStroke(stroke);
    await checkAutoAdvance(stroke);
  }
}

canvas.addEventListener('pointerdown', (event) => {
  if (window.DEBUG_REPEN) console.log('[DEBUG Overlay] pointerdown at screen position:', event.clientX, event.clientY, 'offset:', event.offsetX, event.offsetY, 'activeTool:', appState ? appState.activeTool : 'N/A');
  if (appState && appState.clickHalo) {
    const globalPt = localToGlobal({ x: event.offsetX, y: event.offsetY });
    clickRipples.push({ x: globalPt.x, y: globalPt.y, time: Date.now() });
    scheduleRender();
  }

  if (!canDraw()) {
    return;
  }

  if (appState.activeTool === 'laser' || appState.activeTool === 'spotlight' || appState.activeTool === 'magnifier') {
    return;
  }

  if (appState.activeTool === 'text') {
    const pt = { x: event.offsetX, y: event.offsetY };
    for (let i = scene.annotations.length - 1; i >= 0; i--) {
      const stroke = scene.annotations[i];
      if (stroke.tool === 'text') {
        const spt = globalToLocal({ x: stroke.x, y: stroke.y });
        const w = worldToScreenLength(stroke.width || 200);
        const h = worldToScreenLength(stroke.height || 80);
        if (pt.x >= spt.x && pt.x <= spt.x + w && pt.y >= spt.y && pt.y <= spt.y + h) {
          isDraggingText = {
            stroke: stroke,
            startX: event.offsetX,
            startY: event.offsetY,
            clientX: event.clientX,
            clientY: event.clientY,
            hasMoved: false
          };
          canvas.style.cursor = 'grabbing';
          canvas.setPointerCapture(event.pointerId);
          return;
        }
      }
    }
    createTextEditor(event.clientX, event.clientY);
    return;
  }

  if (appState.activeTool === 'select') {
    const pt = { x: event.offsetX, y: event.offsetY };

    if (selectedIds.length > 0) {
      const box = getSelectionBoundingBox(selectedIds);
      if (box) {
        const handles = [
          { name: 'tl', x: box.minX, y: box.minY },
          { name: 'tr', x: box.maxX, y: box.minY },
          { name: 'br', x: box.maxX, y: box.maxY },
          { name: 'bl', x: box.minX, y: box.maxY }
        ];
        for (const h of handles) {
          if (Math.hypot(pt.x - h.x, pt.y - h.y) <= 12) {
            isResizingSelection = {
              handle: h.name,
              origBox: { ...box },
              origStrokes: JSON.parse(JSON.stringify(scene.annotations.filter((a) => selectedIds.includes(a.id)))),
              startPt: { ...pt }
            };
            canvas.setPointerCapture(event.pointerId);
            scheduleRender();
            return;
          }
        }
      }
    }

    let clickedId = null;
    for (let i = scene.annotations.length - 1; i >= 0; i--) {
      const stroke = scene.annotations[i];
      if (stroke.tool === 'text' || stroke.tool === 'image') {
        const spt = globalToLocal({ x: stroke.x, y: stroke.y });
        const w = worldToScreenLength(stroke.width || (stroke.tool === 'image' ? 400 : 200));
        const h = worldToScreenLength(stroke.height || (stroke.tool === 'image' ? 300 : 80));
        if (pt.x >= spt.x && pt.x <= spt.x + w && pt.y >= spt.y && pt.y <= spt.y + h) {
          clickedId = stroke.id;
          break;
        }
      } else if ((stroke.tool === 'shapes' || stroke.shapeType) && stroke.shapeType !== 'freehand_arrow') {
        const pStart = stroke.start ? globalToLocal(stroke.start) : (stroke.points?.[0] ? globalToLocal(stroke.points[0]) : { x: 0, y: 0 });
        const pEnd = stroke.end ? globalToLocal(stroke.end) : (stroke.points?.[stroke.points.length - 1] ? globalToLocal(stroke.points[stroke.points.length - 1]) : pStart);
        const minX = Math.min(pStart.x, pEnd.x) - 10;
        const maxX = Math.max(pStart.x, pEnd.x) + 10;
        const minY = Math.min(pStart.y, pEnd.y) - 10;
        const maxY = Math.max(pStart.y, pEnd.y) + 10;
        if (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY) {
          clickedId = stroke.id;
          break;
        }
      } else if (stroke.points) {
        for (const p of stroke.points) {
          const spt = globalToLocal(p);
          if (Math.hypot(pt.x - spt.x, pt.y - spt.y) <= 15) {
            clickedId = stroke.id;
            break;
          }
        }
        if (clickedId) break;
      }
    }

    if (clickedId) {
      if (!selectedIds.includes(clickedId)) {
        selectedIds = [clickedId];
      }
      isDraggingSelection = true;
      dragStartX = pt.x;
      dragStartY = pt.y;
      canvas.setPointerCapture(event.pointerId);
      scheduleRender();
    } else {
      selectedIds = [];
      marqueeBox = { startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y };
      canvas.setPointerCapture(event.pointerId);
      scheduleRender();
    }
    return;
  }

  canvas.setPointerCapture(event.pointerId);
  currentStroke = createStrokeFromEvent(event);
  scheduleRender();
});

canvas.addEventListener('pointermove', (event) => {
  currentMousePos = { x: event.offsetX, y: event.offsetY };
  const sampleTime = Date.now();
  if (appState && (appState.activeTool === 'spotlight' || appState.activeTool === 'magnifier')) {
    if (appState.activeTool === 'spotlight' && sampleTime - lastPresentationSampleAt >= 33) {
      lastPresentationSampleAt = sampleTime;
      const globalPt = localToGlobal(currentMousePos);
      window.appBridge.recordPresentationSample?.({
        type: 'spotlight',
        active: true,
        x: globalPt.x,
        y: globalPt.y,
        radius: appState.spotlight?.radius || 150,
        alpha: appState.spotlight?.alpha || 0.75,
      });
    }
    scheduleRender();
  }

  if (appState && appState.activeTool === 'laser') {
    const globalPt = localToGlobal({ x: event.offsetX, y: event.offsetY });
    laserPoints.push({ x: globalPt.x, y: globalPt.y, time: Date.now() });
    if (sampleTime - lastPresentationSampleAt >= 16) {
      lastPresentationSampleAt = sampleTime;
      window.appBridge.recordPresentationSample?.({ type: 'laser', x: globalPt.x, y: globalPt.y });
    }
    scheduleRender();
    return;
  }

  if (marqueeBox) {
    marqueeBox.currentX = event.offsetX;
    marqueeBox.currentY = event.offsetY;
    scheduleRender();
    return;
  }

  if (isResizingSelection && selectedIds.length > 0) {
    const dx = event.offsetX - isResizingSelection.startPt.x;
    const dy = event.offsetY - isResizingSelection.startPt.y;
    const box = isResizingSelection.origBox;
    const handle = isResizingSelection.handle;

    let anchor = { x: box.minX, y: box.minY };
    let movingCorner = { x: box.maxX, y: box.maxY };
    if (handle === 'tl') { anchor = { x: box.maxX, y: box.maxY }; movingCorner = { x: box.minX, y: box.minY }; }
    else if (handle === 'tr') { anchor = { x: box.minX, y: box.maxY }; movingCorner = { x: box.maxX, y: box.minY }; }
    else if (handle === 'bl') { anchor = { x: box.maxX, y: box.minY }; movingCorner = { x: box.minX, y: box.maxY }; }

    const origW = movingCorner.x - anchor.x;
    const origH = movingCorner.y - anchor.y;
    if (Math.abs(origW) < 1 || Math.abs(origH) < 1) return;

    let scaleX = (origW + dx) / origW;
    let scaleY = (origH + dy) / origH;
    if (Math.abs(scaleX) < 0.1) scaleX = 0.1 * Math.sign(scaleX || 1);
    if (Math.abs(scaleY) < 0.1) scaleY = 0.1 * Math.sign(scaleY || 1);

    const gAnchor = localToGlobal(anchor);

    for (const stroke of scene.annotations) {
      if (selectedIds.includes(stroke.id)) {
        const orig = isResizingSelection.origStrokes.find((a) => a.id === stroke.id);
        if (!orig) continue;
        if (stroke.tool === 'text' || stroke.tool === 'image') {
          stroke.x = gAnchor.x + (orig.x - gAnchor.x) * scaleX;
          stroke.y = gAnchor.y + (orig.y - gAnchor.y) * scaleY;
          stroke.width = Math.max(50, Math.round((orig.width || (stroke.tool === 'image' ? 400 : 200)) * Math.abs(scaleX)));
          stroke.height = Math.max(30, Math.round((orig.height || (stroke.tool === 'image' ? 300 : 80)) * Math.abs(scaleY)));
        } else if (stroke.tool === 'shapes' || stroke.shapeType) {
          if (orig.start) stroke.start = { x: gAnchor.x + (orig.start.x - gAnchor.x) * scaleX, y: gAnchor.y + (orig.start.y - gAnchor.y) * scaleY };
          if (orig.end) stroke.end = { x: gAnchor.x + (orig.end.x - gAnchor.x) * scaleX, y: gAnchor.y + (orig.end.y - gAnchor.y) * scaleY };
          if (orig.points) stroke.points = orig.points.map((p) => ({ x: gAnchor.x + (p.x - gAnchor.x) * scaleX, y: gAnchor.y + (p.y - gAnchor.y) * scaleY }));
        } else if (orig.points) {
          stroke.points = orig.points.map((p) => ({
            x: gAnchor.x + (p.x - gAnchor.x) * scaleX,
            y: gAnchor.y + (p.y - gAnchor.y) * scaleY
          }));
        }
      }
    }
    scheduleRender();
    return;
  }

  if (isDraggingSelection && selectedIds.length > 0) {
    const dx = screenToWorldLength(event.offsetX - dragStartX);
    const dy = screenToWorldLength(event.offsetY - dragStartY);
    for (const stroke of scene.annotations) {
      if (selectedIds.includes(stroke.id)) {
        if (stroke.tool === 'text' || stroke.tool === 'image') {
          stroke.x += dx;
          stroke.y += dy;
        } else if (stroke.tool === 'shapes' || stroke.shapeType) {
          if (stroke.start) { stroke.start.x += dx; stroke.start.y += dy; }
          if (stroke.end) { stroke.end.x += dx; stroke.end.y += dy; }
          if (stroke.points) {
            for (const p of stroke.points) { p.x += dx; p.y += dy; }
          }
        } else if (stroke.points) {
          for (const p of stroke.points) {
            p.x += dx;
            p.y += dy;
          }
        }
      }
    }
    dragStartX = event.offsetX;
    dragStartY = event.offsetY;
    scheduleRender();
    return;
  }

  if (isDraggingText) {
    const screenDx = event.offsetX - isDraggingText.startX;
    const screenDy = event.offsetY - isDraggingText.startY;
    const dx = screenToWorldLength(screenDx);
    const dy = screenToWorldLength(screenDy);
    if (Math.hypot(screenDx, screenDy) > 3 || isDraggingText.hasMoved) {
      isDraggingText.hasMoved = true;
      isDraggingText.stroke.x += dx;
      isDraggingText.stroke.y += dy;
      isDraggingText.startX = event.offsetX;
      isDraggingText.startY = event.offsetY;
      canvas.style.cursor = 'grabbing';
      scheduleRender();
    }
    return;
  }

  if (!currentStroke) {
    if (appState && !isDraggingSelection && !isResizingSelection && !marqueeBox && (appState.activeTool === 'text' || appState.activeTool === 'select')) {
      let overText = false;
      for (const stroke of scene.annotations) {
        if (stroke.tool === 'text' || stroke.tool === 'image') {
          const spt = globalToLocal({ x: stroke.x, y: stroke.y });
          const w = worldToScreenLength(stroke.width || (stroke.tool === 'image' ? 400 : 200));
          const h = worldToScreenLength(stroke.height || (stroke.tool === 'image' ? 300 : 80));
          if (event.offsetX >= spt.x && event.offsetX <= spt.x + w && event.offsetY >= spt.y && event.offsetY <= spt.y + h) {
            overText = true;
            break;
          }
        }
      }
      canvas.style.cursor = overText ? 'grab' : getBaseCursor();
    }
    return;
  }

  if (currentStroke.tool === 'shapes') {
    if (currentStroke.shapeType === 'freehand_arrow') {
      const globalPoint = localToGlobal({ x: event.offsetX, y: event.offsetY });
      addPointToStroke(currentStroke, globalPoint);
      scheduleRender();
      return;
    }
    currentStroke.end = localToGlobal({ x: event.offsetX, y: event.offsetY });
    scheduleRender();
    return;
  }

  const globalPoint = localToGlobal({ x: event.offsetX, y: event.offsetY });
  addPointToStroke(currentStroke, globalPoint);
  scheduleRender();
});

canvas.addEventListener('pointerup', async (event) => {
  if (isResizingSelection) {
    isResizingSelection = null;
    const updatedStrokes = scene.annotations.filter((stroke) => selectedIds.includes(stroke.id));
    if (updatedStrokes.length > 0) {
      if (window.appBridge.updateAnnotations) {
        await window.appBridge.updateAnnotations(updatedStrokes);
      } else {
        for (const stroke of updatedStrokes) {
          await window.appBridge.updateAnnotation(stroke);
        }
      }
    }
    scheduleRender();
    return;
  }

  if (isResizingSelection) { return; }

  if (marqueeBox) {
    const minX = Math.min(marqueeBox.startX, marqueeBox.currentX);
    const maxX = Math.max(marqueeBox.startX, marqueeBox.currentX);
    const minY = Math.min(marqueeBox.startY, marqueeBox.currentY);
    const maxY = Math.max(marqueeBox.startY, marqueeBox.currentY);
    marqueeBox = null;

    const newSelected = [];
    if (Math.hypot(maxX - minX, maxY - minY) > 5) {
      for (const stroke of scene.annotations) {
        let box = null;
        if (stroke.tool === 'text' || stroke.tool === 'image') {
          const pt = globalToLocal({ x: stroke.x, y: stroke.y });
          box = {
            minX: pt.x,
            minY: pt.y,
            maxX: pt.x + worldToScreenLength(stroke.width || (stroke.tool === 'image' ? 400 : 200)),
            maxY: pt.y + worldToScreenLength(stroke.height || (stroke.tool === 'image' ? 300 : 80))
          };
        } else if ((stroke.tool === 'shapes' || stroke.shapeType) && stroke.shapeType !== 'freehand_arrow') {
          const pStart = stroke.start ? globalToLocal(stroke.start) : (stroke.points?.[0] ? globalToLocal(stroke.points[0]) : { x: 0, y: 0 });
          const pEnd = stroke.end ? globalToLocal(stroke.end) : (stroke.points?.[stroke.points.length - 1] ? globalToLocal(stroke.points[stroke.points.length - 1]) : pStart);
          box = { minX: Math.min(pStart.x, pEnd.x), minY: Math.min(pStart.y, pEnd.y), maxX: Math.max(pStart.x, pEnd.x), maxY: Math.max(pStart.y, pEnd.y) };
        } else if (stroke.points && stroke.points.length > 0) {
          let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
          for (const p of stroke.points) {
            const pt = globalToLocal(p);
            if (pt.x < sMinX) sMinX = pt.x;
            if (pt.x > sMaxX) sMaxX = pt.x;
            if (pt.y < sMinY) sMinY = pt.y;
            if (pt.y > sMaxY) sMaxY = pt.y;
          }
          box = { minX: sMinX, minY: sMinY, maxX: sMaxX, maxY: sMaxY };
        }
        if (box && !(box.maxX < minX || box.minX > maxX || box.maxY < minY || box.minY > maxY)) {
          newSelected.push(stroke.id);
        }
      }
      selectedIds = newSelected;
    }
    scheduleRender();
    return;
  }

  if (isDraggingSelection) {
    isDraggingSelection = false;
    const updatedStrokes = scene.annotations.filter((stroke) => selectedIds.includes(stroke.id));
    if (updatedStrokes.length > 0) {
      if (window.appBridge.updateAnnotations) {
        await window.appBridge.updateAnnotations(updatedStrokes);
      } else {
        for (const stroke of updatedStrokes) {
          await window.appBridge.updateAnnotation(stroke);
        }
      }
    }
    scheduleRender();
    return;
  }

  if (isDraggingText) {
    const dragObj = isDraggingText;
    isDraggingText = null;
    canvas.style.cursor = getBaseCursor();
    if (dragObj.hasMoved) {
      if (window.appBridge.updateAnnotation) {
        await window.appBridge.updateAnnotation(dragObj.stroke);
      }
      scheduleRender();
    } else {
      createTextEditor(dragObj.clientX, dragObj.clientY, dragObj.stroke);
    }
    return;
  }

  if (!currentStroke) {
    if (appState && appState.backgroundMode && appState.backgroundMode !== 'transparent') {
      if (event.offsetY >= window.innerHeight - 110 && Date.now() - lastAutoAdvanceTime > 1500) {
        lastAutoAdvanceTime = Date.now();
        if (window.appBridge && window.appBridge.nextPage) {
          const nextState = await window.appBridge.nextPage();
          if (nextState && typeof nextState.currentPageIndex === 'number') {
            showPageToast(`Page ${nextState.currentPageIndex + 1} created`);
          } else {
            showPageToast(`New page created`);
          }
        }
      }
    }
    return;
  }

  try {
    await finalizeStroke(event);
  } finally {
    scheduleRender();
  }
});

canvas.addEventListener('pointercancel', () => {
  currentStroke = null;
  isDraggingSelection = false;
  isResizingSelection = null;
  isDraggingText = null;
  marqueeBox = null;
  scheduleRender();
});

canvas.addEventListener('dblclick', (event) => {
  if (!canDraw()) return;
  const pt = { x: event.offsetX, y: event.offsetY };
  for (let i = scene.annotations.length - 1; i >= 0; i--) {
    const stroke = scene.annotations[i];
    if (stroke.tool === 'text') {
      const spt = globalToLocal({ x: stroke.x, y: stroke.y });
      const w = worldToScreenLength(stroke.width || 200);
      const h = worldToScreenLength(stroke.height || 80);
      if (pt.x >= spt.x && pt.x <= spt.x + w && pt.y >= spt.y && pt.y <= spt.y + h) {
        createTextEditor(event.clientX, event.clientY, stroke);
        break;
      }
    }
  }
});

window.addEventListener('keydown', async (event) => {
  if (event.key === 'Escape') {
    currentStroke = null;
    scheduleRender();
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIds.length > 0 && (!document.activeElement || document.activeElement.tagName !== 'TEXTAREA')) {
    event.preventDefault();
    await window.appBridge.deleteAnnotations(selectedIds);
    selectedIds = [];
    scheduleRender();
  }

  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z') {
    await window.appBridge.undo();
  }

  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'y') {
    await window.appBridge.redo();
  }

  if ((event.key.toLowerCase() === 'r' || event.key.toLowerCase() === 'c') && (!document.activeElement || document.activeElement.tagName !== 'TEXTAREA')) {
    event.preventDefault();
    await window.appBridge.revertAutoShape();
  }
});

async function bootstrapApp() {
  bootstrap = await window.appBridge.getBootstrap();
  appState = bootstrap.appState;
  canvas.style.cursor = getBaseCursor();
  scene = bootstrap.scene;
  displayBounds = bootstrap.display?.bounds || displayBounds;
  resizeCanvas();
  setupBoardNav();
  updateBoardNav();

  window.appBridge.onStateChanged((nextState) => {
    const prevTool = appState ? appState.activeTool : null;
    const prevPassThrough = appState ? appState.passThrough : false;
    const prevBackgroundMode = appState ? appState.backgroundMode : 'transparent';
    
    if (prevTool === 'spotlight' && nextState.activeTool !== 'spotlight' && currentMousePos) {
      const globalPt = localToGlobal(currentMousePos);
      window.appBridge.recordPresentationSample?.({ type: 'spotlight', active: false, x: globalPt.x, y: globalPt.y });
    }

    appState = nextState;
    canvas.style.cursor = getBaseCursor();
    updateMagnifierImg();
    updateBoardNav();
    
    // Clear transient state if switching away from select or text
    if (prevTool === 'select' && appState.activeTool !== 'select') {
      clearSelection();
    }
    if (prevTool === 'text' && appState.activeTool !== 'text') {
      const openTextarea = document.querySelector('textarea');
      if (openTextarea) openTextarea.blur();
    }
    
    // Reset all interaction state if switching to pass-through or a new board mode
    if (appState.passThrough && !prevPassThrough) {
      resetInteractionState('pass-through enabled');
    }
    if (appState.backgroundMode !== prevBackgroundMode) {
      resetInteractionState('background mode changed');
    }

    if (currentStroke && currentStroke.tool !== appState.activeTool) {
      currentStroke = null;
    }

    if (prevTool !== appState.activeTool || prevPassThrough !== appState.passThrough) {
      cancelScreenshotMode(true);
    }
    
    scheduleRender();
  });

  window.appBridge.onSceneChanged((nextScene) => {
    scene = nextScene;
    
    if (selectedIds.length > 0) {
      const existingIds = new Set(scene.annotations.map(a => a.id));
      const previousCount = selectedIds.length;
      selectedIds = selectedIds.filter(id => existingIds.has(id));
      if (selectedIds.length < previousCount) {
        clearSelection();
      }
    }

    updateBoardNav();
    scheduleRender();
  });

  if (window.appBridge.onRequestExport) {
    window.appBridge.onRequestExport(async (payload) => {
      cancelScreenshotMode(false);

      const { bgDataUrl, format = 'png', quality = 0.9, width, height, autoSavePath, includeBackground } = payload;
      
      const screenshotOverlay = document.getElementById('screenshotOverlay');
      const screenshotCanvas = document.getElementById('screenshotCanvas');
      const screenshotSelection = document.getElementById('screenshotSelection');
      const screenshotToolbar = document.getElementById('screenshotToolbar');
      
      const scaleFactor = window.devicePixelRatio || 1;
      const sWidth = Math.round(window.innerWidth * scaleFactor);
      const sHeight = Math.round(window.innerHeight * scaleFactor);
      screenshotCanvas.width = sWidth;
      screenshotCanvas.height = sHeight;
      const sCtx = screenshotCanvas.getContext('2d');
      
      if (bgDataUrl) {
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            sCtx.drawImage(img, 0, 0, sWidth, sHeight, 0, 0, sWidth, sHeight);
            resolve();
          };
          img.onerror = resolve;
          img.src = bgDataUrl;
        });
      } else if (appState && appState.backgroundMode && appState.backgroundMode !== 'transparent') {
        const bg = appState.boardColor || (appState.backgroundMode === 'blackboard' ? '#18181c' : '#ffffff');
        sCtx.fillStyle = bg;
        sCtx.fillRect(0, 0, sWidth, sHeight);
      }
      
      if (canvas) {
        sCtx.drawImage(canvas, 0, 0, sWidth, sHeight);
      }
      
      screenshotOverlay.style.display = 'block';
      screenshotOverlay.classList.remove('selecting');
      screenshotSelection.style.display = 'none';
      screenshotToolbar.style.display = 'none';
      
      let startX = 0, startY = 0, isDragging = false;
      let rect = { x: 0, y: 0, w: 0, h: 0 };
      
      const onPointerDown = (e) => {
        if (e.target.closest('.screenshot-toolbar')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        rect = { x: startX, y: startY, w: 0, h: 0 };
        screenshotOverlay.classList.add('selecting');
        screenshotSelection.style.display = 'block';
        screenshotToolbar.style.display = 'none';
        updateSelectionUI();
      };
      
      const onPointerMove = (e) => {
        if (!isDragging) return;
        rect.x = Math.min(startX, e.clientX);
        rect.y = Math.min(startY, e.clientY);
        rect.w = Math.abs(e.clientX - startX);
        rect.h = Math.abs(e.clientY - startY);
        updateSelectionUI();
      };
      
      const onPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        if (rect.w > 10 && rect.h > 10) {
          screenshotToolbar.style.display = 'flex';
          let tbBottom = -40;
          if (rect.y + rect.h + 40 > window.innerHeight) {
            tbBottom = 5;
          }
          screenshotToolbar.style.bottom = tbBottom + 'px';
        } else {
          screenshotSelection.style.display = 'none';
          screenshotOverlay.classList.remove('selecting');
        }
      };
      
      const updateSelectionUI = () => {
        screenshotSelection.style.left = rect.x + 'px';
        screenshotSelection.style.top = rect.y + 'px';
        screenshotSelection.style.width = rect.w + 'px';
        screenshotSelection.style.height = rect.h + 'px';
      };
      
      const cleanupListeners = () => {
        screenshotOverlay.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      };
      
      const cleanup = (notifyMain = true) => {
        screenshotOverlay.style.display = 'none';
        screenshotOverlay.classList.remove('selecting');
        screenshotSelection.style.display = 'none';
        screenshotToolbar.style.display = 'none';
        cleanupListeners();
        if (cleanupScreenshotMode === cleanup) {
          cleanupScreenshotMode = null;
        }
        if (notifyMain) {
          window.appBridge.renderExport({ dataUrl: null });
        }
      };
      cleanupScreenshotMode = cleanup;
      
      const exportCrop = (copy) => {
        const sourceCanvas = includeBackground ? screenshotCanvas : canvas;
        const scaleX = sourceCanvas.width / window.innerWidth;
        const scaleY = sourceCanvas.height / window.innerHeight;
        
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = Math.round(rect.w * scaleX);
        cropCanvas.height = Math.round(rect.h * scaleY);
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.drawImage(
          sourceCanvas,
          rect.x * scaleX,
          rect.y * scaleY,
          rect.w * scaleX,
          rect.h * scaleY,
          0,
          0,
          cropCanvas.width,
          cropCanvas.height
        );
        
        let mimeType = 'image/png';
        if (format === 'jpeg' || format === 'jpg') mimeType = 'image/jpeg';
        else if (format === 'webp') mimeType = 'image/webp';
        
        const dataUrl = cropCanvas.toDataURL(mimeType, quality);
        window.appBridge.renderExport({
          dataUrl,
          format,
          copyOnly: copy,
          copyToClipboard: copy,
          autoSavePath: copy ? null : autoSavePath
        });
        
        cleanup(false);
      };
      
      screenshotOverlay.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      
      document.getElementById('screenshotSaveBtn').onclick = () => exportCrop(false);
      document.getElementById('screenshotCopyBtn').onclick = () => exportCrop(true);
      document.getElementById('screenshotCloseBtn').onclick = () => cleanup(true);
    });
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('pointerleave', () => {
    if (currentStroke) {
      scheduleRender();
    }
  });
}

bootstrapApp().then(() => {
  updateMagnifierImg();
}).catch((error) => {
  console.error('Failed to bootstrap overlay:', error);
});
