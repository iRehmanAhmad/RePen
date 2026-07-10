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
let clipboardData = null;
let boardZoom = 1.0;
let boardPanX = 0;
let boardPanY = 0;
let isPanningBoard = false;
let boardPanStartX = 0;
let boardPanStartY = 0;
let isSpaceDown = false;

function setBoardZoom(newZoom, centerX, centerY) {
  if (centerX === undefined) centerX = window.innerWidth / 2;
  if (centerY === undefined) centerY = window.innerHeight / 2;
  const localX = (centerX - boardPanX) / boardZoom;
  const localY = (centerY - boardPanY) / boardZoom;
  boardZoom = Math.min(Math.max(newZoom, 0.1), 10.0);
  boardPanX = centerX - localX * boardZoom;
  boardPanY = centerY - localY * boardZoom;
  const zoomText = document.getElementById('zoomLevelText');
  if (zoomText) zoomText.innerText = Math.round(boardZoom * 100) + '%';
  scheduleRender();
}

function resetBoardZoom() {
  boardZoom = 1.0;
  boardPanX = 0;
  boardPanY = 0;
  const zoomText = document.getElementById('zoomLevelText');
  if (zoomText) zoomText.innerText = '100%';
  scheduleRender();
}

let isSnippingMode = false;
let snipStart = null;
let snipCurrent = null;

if (window.appBridge && window.appBridge.onStartSnipMode) {
  window.appBridge.onStartSnipMode(() => {
    isSnippingMode = true;
    document.body.style.cursor = 'crosshair';
    scheduleRender();
  });
}
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
let autoPanRafId = null;

function autoPanLoop() {
  if (!currentStroke || !appState || appState.backgroundMode === 'transparent' || isPanningBoard) {
    autoPanRafId = null;
    return;
  }
  
  const edgeMargin = 50;
  const panSpeed = 10;
  let dx = 0;
  let dy = 0;

  if (currentMousePos && currentMousePos.x > window.innerWidth - edgeMargin) dx = -panSpeed;
  else if (currentMousePos && currentMousePos.x < edgeMargin) dx = panSpeed;
  
  if (currentMousePos && currentMousePos.y > window.innerHeight - edgeMargin) dy = -panSpeed;
  else if (currentMousePos && currentMousePos.y < edgeMargin) dy = panSpeed;

  if (dx !== 0 || dy !== 0) {
    boardPanX += dx;
    boardPanY += dy;
    
    if (currentStroke.tool !== 'shapes' && currentMousePos) {
      const globalPt = localToGlobal(currentMousePos);
      if (currentStroke.points) {
        addPointToStroke(currentStroke, globalPt);
      }
    } else if (currentStroke.tool === 'shapes' && currentMousePos) {
      currentStroke.end = localToGlobal(currentMousePos);
    }
    
    scheduleRender();
  }
  
  autoPanRafId = requestAnimationFrame(autoPanLoop);
}

function clearSelection() {
  selectedIds = [];
  marqueeBox = null;
  isDraggingSelection = false;
  isResizingSelection = null;
  if (appState && appState.activeTool === 'mindmap') {
    canvas.style.cursor = window.hoveredAddButton?.hovered ? 'pointer' : 'default';
  } else {
    canvas.style.cursor = appState && appState.activeTool === 'select' ? 'default' : 'crosshair';
  }
}

function resetInteractionState(reason) {
  clearSelection();
  currentStroke = null;
  isDraggingText = null;
  window.isDraggingMindmapNode = null;
  window.hoveredAddButton = null;
  dragStartX = 0;
  dragStartY = 0;
  
  if (appState && appState.activeTool === 'mindmap') {
    canvas.style.cursor = 'default';
  }
  
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

  const zoomInBtn = document.getElementById('zoomInButton');
  const zoomOutBtn = document.getElementById('zoomOutButton');
  const zoomResetBtn = document.getElementById('zoomResetButton');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setBoardZoom(boardZoom * 1.2);
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setBoardZoom(boardZoom / 1.2);
    });
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetBoardZoom();
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
    if (e.ctrlKey) return; // Prevent page turn when zooming!
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
  const value = hex.replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map((char) => char + char).join('')
    : value.padEnd(6, '0').slice(0, 6);

  const numeric = Number.parseInt(normalized, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  return {
    x: ((point.x - displayBounds.x) * boardZoom) + boardPanX,
    y: ((point.y - displayBounds.y) * boardZoom) + boardPanY,
  };
}

function localToGlobal(point) {
  return {
    x: ((point.x - boardPanX) / boardZoom) + displayBounds.x,
    y: ((point.y - boardPanY) / boardZoom) + displayBounds.y,
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

  const toolToCheck = appState.activeTool === 'shapes' 
    ? (appState.lastInkingTool || 'pen') 
    : appState.activeTool;

  if (toolToCheck === 'highlighter') {
    return {
      color: appState.brushDefaults.highlighter.color,
      width: appState.brushDefaults.highlighter.width,
      opacity: appState.brushDefaults.highlighter.opacity,
    };
  }

  if (toolToCheck === 'calligraphy') {
    return {
      color: appState.brushDefaults.calligraphy.color,
      width: appState.brushDefaults.calligraphy.width,
      opacity: appState.brushDefaults.calligraphy.opacity || 1,
    };
  }

  if (toolToCheck === 'eraser') {
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
window.getCentralNode = (node) => {
  if (node.nodeType === 'central') return node;
  if (node.parentId) {
    const parent = scene.annotations.find(a => a.id === node.parentId);
    if (parent) return window.getCentralNode(parent);
  }
  return node;
};

function createTextEditor(x, y, existingStroke = null) {
  const brush = getBrushStyle();
  const textarea = document.createElement('textarea');
  textarea.style.position = 'fixed';

  let left = x;
  let top = y;
  if (existingStroke) {
    const spt = globalToLocal({ x: existingStroke.x, y: existingStroke.y });
    left = spt.x;
    top = spt.y;
    textarea.value = existingStroke.text || '';
    if (existingStroke.width) textarea.style.width = `${existingStroke.width}px`;
    if (existingStroke.height) textarea.style.height = `${existingStroke.height}px`;
  } else {
    textarea.style.left = `${left}px`;
    textarea.style.top = `${top}px`;
  }

  if (existingStroke?.tool === 'mindmap') {
    const isCentral = existingStroke.nodeType === 'central';
    const isMain = existingStroke.nodeType === 'main';
    
    textarea.style.left = `${left}px`;
    textarea.style.top = `${top}px`;
    textarea.style.background = isCentral ? (existingStroke.color || '#8b5cf6') : (isMain ? '#ffffff' : '#f8f9fa');
    textarea.style.color = isCentral ? '#ffffff' : '#1e293b';
    const fontSize = Math.max(10, Math.round((isCentral ? 16 : 14) * boardZoom));
    textarea.style.font = `bold ${fontSize}px sans-serif`;
    
    textarea.style.border = isCentral ? 'none' : `${(isMain ? 3 : 1) * boardZoom}px solid ${existingStroke.color || '#333'}`;
    textarea.style.borderRadius = `${(isCentral ? 25 : 8) * boardZoom}px`;
    textarea.style.padding = `${isCentral ? 10 : 8}px`; // approximate vertical centering
    textarea.style.textAlign = 'center';
    textarea.style.boxShadow = 'none';
    textarea.style.textShadow = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.overflow = 'hidden';
    textarea.style.whiteSpace = 'pre-wrap';
    textarea.style.wordWrap = 'break-word';
  } else {
    const mode = existingStroke?.textMode || appState.textMode || 'plain';
    textarea.style.left = `${left}px`;
    textarea.style.top = `${top}px`;
    textarea.style.color = existingStroke?.color || brush.color;
    textarea.style.font = existingStroke?.font || 'bold 22px sans-serif';
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

  let committed = false;
  const commit = async () => {
    if (committed) return;
    if (isJustCreated) {
      setTimeout(() => {
        if (textarea.parentNode) textarea.focus();
      }, 10);
      return;
    }
    committed = true;
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
          width: Math.max(20, textarea.offsetWidth),
          height: Math.max(30, textarea.offsetHeight)
        };
        if (window.appBridge.updateAnnotation) {
          await window.appBridge.updateAnnotation(updated);
        }
        if (updated.tool === 'mindmap') {
          const central = window.getCentralNode(updated);
          if (central) window.layoutMindmap(central.id);
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
        width: Math.max(20, textarea.offsetWidth),
        height: Math.max(30, textarea.offsetHeight)
      });
    }
    if (textarea.parentNode) textarea.parentNode.removeChild(textarea);
  };

  textarea.addEventListener('blur', commit);
  textarea.addEventListener('keydown', async (e) => {
    if (existingStroke?.tool === 'mindmap' && !e.shiftKey) {
      if (e.key === 'Tab') {
        e.preventDefault();
        isJustCreated = false;
        await commit();
        
        const childType = existingStroke.nodeType === 'central' ? 'main' : 'sub';
        const COLORS = ['#ff5a5f', '#ffe36d', '#00d26a', '#3b82f6', '#ffffff'];
        const newColor = childType === 'main' 
            ? COLORS[scene.annotations.filter(a => a.tool === 'mindmap' && a.nodeType === 'main').length % COLORS.length] 
            : existingStroke.color;

        const newNode = createMindmapNode({
          nodeType: childType,
          parentId: existingStroke.id,
          text: 'New Topic',
          color: newColor,
          side: existingStroke.side, // Inherit side from parent
          x: existingStroke.x,
          y: existingStroke.y
        });
        
        // Wait for it to be added and let the pipeline focus the editor
        window.addMindmapNode(newNode, { focusEditor: true });
        return;
      }
      
      if (e.key === 'Enter') {
        if (existingStroke.nodeType !== 'central' && existingStroke.parentId) {
          e.preventDefault();
          isJustCreated = false;
          await commit();
          
          const parentNode = scene.annotations.find(a => a.id === existingStroke.parentId);
          if (parentNode) {
            const newNode = createMindmapNode({
              nodeType: existingStroke.nodeType,
              parentId: parentNode.id,
              text: 'New Topic',
              color: existingStroke.color,
              side: existingStroke.side, // Inherit side
              x: existingStroke.x,
              y: existingStroke.y
            });
            
            window.addMindmapNode(newNode, { focusEditor: true });
            return;
          }
        }
      }
    }

    if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.shiftKey || existingStroke?.tool !== 'mindmap'))) {
      e.preventDefault();
      isJustCreated = false;
      textarea.blur();
    }
  });
}

// --- Mind Map Helpers ---
function getMindmapNodes() {
  return scene.annotations.filter(a => a.tool === 'mindmap');
}

function getMindmapCentralNode() {
  return scene.annotations.find(a => a.tool === 'mindmap' && a.nodeType === 'central');
}

function mindmapNodeToScreenRect(node) {
  const pt = globalToLocal({ x: node.x, y: node.y });
  return {
    x: pt.x,
    y: pt.y,
    w: (node.width || 120) * boardZoom,
    h: (node.height || 40) * boardZoom
  };
}

function findMindmapNodeAtPoint(x, y) {
  const nodes = getMindmapNodes();
  for (let i = nodes.length - 1; i >= 0; i--) {
    const rect = mindmapNodeToScreenRect(nodes[i]);
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
      return nodes[i];
    }
  }
  return null;
}

function findMindmapAddButtonAtPoint(x, y) {
  const nodes = getMindmapNodes();
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const rect = mindmapNodeToScreenRect(node);
    
    // Stable screen-pixel radius for hit target
    const btnRadius = 14; 
    
    // Check right handle (Central or Right child)
    if (node.nodeType === 'central' || node.side === 'right' || (!node.side && node.nodeType !== 'central')) {
      const btnXRight = rect.x + rect.w + 15 * boardZoom;
      const btnYRight = rect.y + rect.h / 2;
      const dxRight = x - btnXRight;
      const dyRight = y - btnYRight;
      if (Math.hypot(dxRight, dyRight) <= btnRadius) {
        return { node, side: 'right' };
      }
    }
    
    // Check left handle (Central or Left child)
    if (node.nodeType === 'central' || node.side === 'left') {
      const btnXLeft = rect.x - 15 * boardZoom;
      const btnYLeft = rect.y + rect.h / 2;
      const dxLeft = x - btnXLeft;
      const dyLeft = y - btnYLeft;
      if (Math.hypot(dxLeft, dyLeft) <= btnRadius) {
        return { node, side: 'left' };
      }
    }
  }
  return null;
}

function getMindmapSubtreeIds(rootId) {
  const nodes = getMindmapNodes();
  const subtreeIds = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const node of nodes) {
      if (!subtreeIds.has(node.id) && subtreeIds.has(node.parentId)) {
        subtreeIds.add(node.id);
        added = true;
      }
    }
  }
  return Array.from(subtreeIds);
}

function createMindmapNode(opts) {
  return {
    id: Date.now() + '-' + Math.random().toString(16).slice(2),
    tool: 'mindmap',
    nodeType: opts.nodeType || 'sub',
    parentId: opts.parentId || null,
    side: opts.side || null,
    text: opts.text || '',
    x: opts.x || 0,
    y: opts.y || 0,
    width: opts.width || 120,
    height: opts.height || 40,
    color: opts.color || '#ff5a5f',
    widthRatio: opts.widthRatio || 2,
    opacity: opts.opacity || 1
  };
}

window.addMindmapNode = async function(node, options = {}) {
  const { focusEditor = true } = options;
  await window.appBridge.addStroke(node);
  
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const reconciledNode = scene.annotations.find(a => a.id === node.id);
      if (reconciledNode || attempts > 30) {
        if (reconciledNode) {
          const central = getMindmapCentralNode();
          if (central) window.layoutMindmap(central.id);
          
          if (focusEditor) {
            const finalNode = scene.annotations.find(a => a.id === node.id);
            if (finalNode) {
              const rect = mindmapNodeToScreenRect(finalNode);
              createTextEditor(rect.x, rect.y, finalNode);
            }
          }
        }
        resolve(reconciledNode);
      } else {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  });
};
window.layoutMindmap = async function(centralNodeId) {
  const nodes = scene.annotations.filter(a => a.tool === 'mindmap');
  const nodeMap = new Map();
  nodes.forEach(n => nodeMap.set(n.id, n));
  
  const central = nodeMap.get(centralNodeId);
  if (!central) return;
  
  const HORIZONTAL_SPACING = 80;
  const VERTICAL_SPACING = 20;
  
  const updatedNodes = [];
  
  // Phase 7: Text measurement and pre-layout dimension update
  ctx.save();
  for (const node of nodes) {
    const isCentral = node.nodeType === 'central';
    const baseFontSize = isCentral ? 16 : 14;
    ctx.font = `bold ${baseFontSize}px sans-serif`;
    
    const lines = (node.text || ' ').split('\n');
    let maxLineWidth = 0;
    for (const line of lines) {
      maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
    }
    
    const minW = isCentral ? 140 : 100;
    const paddingX = isCentral ? 40 : 20;
    const newWidth = Math.max(minW, maxLineWidth + paddingX * 2);
    const newHeight = Math.max(isCentral ? 50 : 40, lines.length * (baseFontSize * 1.5) + (isCentral ? 20 : 16));
    
    if (node.width !== newWidth || node.height !== newHeight) {
      node.width = newWidth;
      node.height = newHeight;
      updatedNodes.push(node);
    }
  }
  ctx.restore();

  function getChildren(parentId, side = null) {
    let children = nodes.filter(n => n.parentId === parentId).sort((a, b) => a.y - b.y);
    if (side && parentId === centralNodeId) {
      children = children.filter(n => n.side === side || (!n.side && side === 'right'));
    }
    return children;
  }
  
  const heights = new Map();
  function calcHeight(nodeId, side = null) {
    const children = getChildren(nodeId, side);
    const node = nodeMap.get(nodeId);
    const minHeight = (node.height || 40) + VERTICAL_SPACING;
    if (children.length === 0) {
      heights.set(nodeId, minHeight);
      return minHeight;
    }
    let total = 0;
    for (const child of children) {
      total += calcHeight(child.id);
    }
    const finalHeight = Math.max(total, minHeight);
    heights.set(nodeId, finalHeight);
    return finalHeight;
  }
  
  calcHeight(centralNodeId, 'right');
  const rightHeight = heights.get(centralNodeId);
  heights.delete(centralNodeId);
  calcHeight(centralNodeId, 'left');
  const leftHeight = heights.get(centralNodeId);
  
  function positionNode(nodeId, startX, centerY, direction = 1) {
    const node = nodeMap.get(nodeId);
    const nodeHeight = node.height || 40;
    const nodeWidth = node.width || 120;
    
    const newY = centerY - nodeHeight / 2;
    const newX = direction === 1 ? startX : startX - nodeWidth;
    
    if (node.x !== newX || node.y !== newY) {
      node.x = newX;
      node.y = newY;
      if (!updatedNodes.includes(node)) updatedNodes.push(node);
    }
    
    const children = getChildren(nodeId, nodeId === centralNodeId ? (direction === 1 ? 'right' : 'left') : null);
    if (children.length > 0) {
      const childStartX = direction === 1 
        ? newX + nodeWidth + HORIZONTAL_SPACING 
        : newX - HORIZONTAL_SPACING;
      
      let totalChildrenHeight = 0;
      for (const child of children) {
        totalChildrenHeight += heights.get(child.id);
      }
      
      let currentY = centerY - totalChildrenHeight / 2;
      
      for (const child of children) {
        const childHeight = heights.get(child.id);
        const childCenterY = currentY + childHeight / 2;
        positionNode(child.id, childStartX, childCenterY, direction);
        currentY += childHeight;
      }
    }
  }
  
  const centralCenterY = central.y + (central.height || 40) / 2;
  positionNode(centralNodeId, central.x, centralCenterY, 1);
  positionNode(centralNodeId, central.x, centralCenterY, -1);
  
  if (updatedNodes.length > 0) {
    if (window.appBridge.updateAnnotations) {
      await window.appBridge.updateAnnotations(updatedNodes);
    } else if (window.appBridge.updateAnnotation) {
      for (const node of updatedNodes) {
        await window.appBridge.updateAnnotation(node);
      }
    }
    scheduleRender();
  }
};

function drawStroke(stroke, targetCtx = ctx) {
  if (stroke.tool === 'mindmap') {
    const pt = globalToLocal({ x: stroke.x, y: stroke.y });
    targetCtx.save();
    const boxW = (stroke.width || 120) * boardZoom;
    const boxH = (stroke.height || 40) * boardZoom;
    
    if (stroke.parentId) {
      const parentNode = scene.annotations.find(a => a.id === stroke.parentId);
      if (parentNode) {
        const parentPt = globalToLocal({ x: parentNode.x, y: parentNode.y });
        const parentBoxW = (parentNode.width || 120) * boardZoom;
        const parentBoxH = (parentNode.height || 40) * boardZoom;
        
        targetCtx.beginPath();
        const isLeft = stroke.side === 'left';
        const startX = isLeft ? parentPt.x : parentPt.x + parentBoxW;
        const startY = parentPt.y + parentBoxH / 2;
        const endX = isLeft ? pt.x + boxW : pt.x;
        const endY = pt.y + boxH / 2;
        targetCtx.moveTo(startX, startY);
        const curveOffset = isLeft ? -40 * boardZoom : 40 * boardZoom;
        targetCtx.bezierCurveTo(startX + curveOffset, startY, endX - curveOffset, endY, endX, endY);
        targetCtx.strokeStyle = stroke.color || '#333';
        targetCtx.lineWidth = 2 * boardZoom;
        targetCtx.stroke();
      }
    }
    
    const isCentral = stroke.nodeType === 'central';
    const isMain = stroke.nodeType === 'main';
    
    targetCtx.fillStyle = isCentral ? (stroke.color || '#8b5cf6') : (isMain ? '#ffffff' : '#f8f9fa');
    targetCtx.strokeStyle = isCentral ? 'transparent' : (stroke.color || '#333');
    targetCtx.lineWidth = (isMain ? 3 : 1) * boardZoom;
    
    // Draw Node Body
    if (targetCtx.roundRect) {
      targetCtx.beginPath();
      targetCtx.roundRect(pt.x, pt.y, boxW, boxH, (isCentral ? 25 : 8) * boardZoom);
      targetCtx.fill();
      if (!isCentral) targetCtx.stroke();
    } else {
      targetCtx.fillRect(pt.x, pt.y, boxW, boxH);
      if (!isCentral) targetCtx.strokeRect(pt.x, pt.y, boxW, boxH);
    }
    
    // Draw Plus Handles if selected or hovered
    if (window.selectedMindmapNodeId === stroke.id || window.hoveredAddButton?.nodeId === stroke.id) {
      const btnRadius = 14;
      targetCtx.fillStyle = '#ffffff';
      targetCtx.strokeStyle = '#e2e8f0';
      targetCtx.lineWidth = 1;
      
      const drawPlus = (x, y, hovered) => {
        targetCtx.beginPath();
        targetCtx.arc(x, y, btnRadius, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.stroke();
        
        targetCtx.beginPath();
        targetCtx.strokeStyle = hovered ? '#2563eb' : '#64748b';
        targetCtx.lineWidth = 2;
        targetCtx.moveTo(x - 5, y);
        targetCtx.lineTo(x + 5, y);
        targetCtx.moveTo(x, y - 5);
        targetCtx.lineTo(x, y + 5);
        targetCtx.stroke();
      };
      
      if (isCentral || stroke.side === 'right' || !stroke.side) {
        const rightHovered = window.hoveredAddButton?.nodeId === stroke.id && window.hoveredAddButton?.side === 'right';
        drawPlus(pt.x + boxW + 15 * boardZoom, pt.y + boxH / 2, rightHovered);
      }
      
      if (isCentral || stroke.side === 'left') {
        const leftHovered = window.hoveredAddButton?.nodeId === stroke.id && window.hoveredAddButton?.side === 'left';
        drawPlus(pt.x - 15 * boardZoom, pt.y + boxH / 2, leftHovered);
      }
    }
    
    targetCtx.fillStyle = isCentral ? '#ffffff' : '#1e293b';
    const fontSize = Math.max(10, Math.round((isCentral ? 16 : 14) * boardZoom));
    targetCtx.font = `bold ${fontSize}px sans-serif`;
    targetCtx.textBaseline = 'middle';
    targetCtx.textAlign = 'center';
    
    const lines = (stroke.text || '').split('\n');
    const lineHeight = fontSize * 1.5;
    const startYText = pt.y + boxH / 2 - ((lines.length - 1) * lineHeight) / 2;
    
    for (let i = 0; i < lines.length; i++) {
      targetCtx.fillText(lines[i], pt.x + boxW / 2, startYText + i * lineHeight);
    }
    
    targetCtx.restore();
    return;
  }

  if (stroke.tool === 'text' && stroke.text) {
    const pt = globalToLocal({ x: stroke.x, y: stroke.y });
    targetCtx.save();
    const boxW = (stroke.width || 200) * boardZoom;
    const boxH = (stroke.height || 80) * boardZoom;
    const mode = stroke.textMode || appState.textMode || 'plain';
    if (mode === 'sticky') {
      targetCtx.fillStyle = 'rgba(255, 255, 220, 0.95)';
      targetCtx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      targetCtx.shadowBlur = 8;
      targetCtx.shadowOffsetY = 4;
      targetCtx.fillRect(pt.x, pt.y, boxW, boxH);
      targetCtx.shadowColor = 'transparent';
      targetCtx.strokeStyle = '#e0e0b0';
      targetCtx.lineWidth = 1;
      targetCtx.strokeRect(pt.x, pt.y, boxW, boxH);
    } else {
      targetCtx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      targetCtx.shadowBlur = 5;
      targetCtx.shadowOffsetX = 1;
      targetCtx.shadowOffsetY = 1;
    }

    targetCtx.fillStyle = stroke.color || '#333';
    const fontSize = Math.max(10, Math.round(22 * boardZoom));
    targetCtx.font = stroke.font ? stroke.font.replace(/\d+px/, `${fontSize}px`) : `bold ${fontSize}px sans-serif`;
    targetCtx.textBaseline = 'top';
    const paddingX = mode === 'sticky' ? 10 : 4;
    const paddingY = mode === 'sticky' ? 10 : 4;
    const maxLineWidth = Math.max(50, boxW - paddingX * 2);
    const rawLines = stroke.text.split('\n');
    let lineY = pt.y + paddingY;
    for (const rawLine of rawLines) {
      if (!rawLine) {
        lineY += 26;
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
          lineY += 26;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      targetCtx.fillText(currentLine, pt.x + paddingX, lineY);
      lineY += 26;
    }
    targetCtx.restore();
    return;
  }

  if (stroke.tool === 'image' && stroke.dataUrl) {
    const pt = globalToLocal({ x: stroke.x, y: stroke.y });
    const w = (stroke.width || 400) * boardZoom;
    const h = (stroke.height || 300) * boardZoom;
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
    targetCtx.globalAlpha = stroke.opacity || 1;
    targetCtx.strokeStyle = stroke.color || '#000';
    targetCtx.lineWidth = Math.max(1, (stroke.width || 4) * boardZoom);
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';

    targetCtx.beginPath();
    
    // Support calligraphy shapes
    if (stroke.brushType === 'calligraphy') {
      const pts = [];
      if (shapeType === 'rectangle') {
        const x = Math.min(pStart.x, pEnd.x);
        const y = Math.min(pStart.y, pEnd.y);
        const w = Math.abs(pEnd.x - pStart.x);
        const h = Math.abs(pEnd.y - pStart.y);
        pts.push({x: x, y: y}, {x: x+w, y: y}, {x: x+w, y: y+h}, {x: x, y: y+h}, {x: x, y: y});
      } else if (shapeType === 'circle') {
        const cx = (pStart.x + pEnd.x) / 2;
        const cy = (pStart.y + pEnd.y) / 2;
        const rx = Math.abs(pEnd.x - pStart.x) / 2;
        const ry = Math.abs(pEnd.y - pStart.y) / 2;
        const numPts = 60;
        for (let i = 0; i <= numPts; i++) {
          const t = (i / numPts) * Math.PI * 2;
          pts.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
        }
      } else if (shapeType === 'triangle') {
        const topX = (pStart.x + pEnd.x) / 2;
        const topY = Math.min(pStart.y, pEnd.y);
        const bottomY = Math.max(pStart.y, pEnd.y);
        pts.push({x: topX, y: topY}, {x: pEnd.x, y: bottomY}, {x: pStart.x, y: bottomY}, {x: topX, y: topY});
      } else if (shapeType === 'line') {
        pts.push({x: pStart.x, y: pStart.y}, {x: pEnd.x, y: pEnd.y});
      } else if (shapeType === 'arrow') {
        pts.push({x: pStart.x, y: pStart.y}, {x: pEnd.x, y: pEnd.y});
        const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
        const headLen = Math.max(12, (stroke.width || 4) * 3 * boardZoom);
        pts.push(
          {x: pEnd.x - headLen * Math.cos(angle - Math.PI / 6), y: pEnd.y - headLen * Math.sin(angle - Math.PI / 6)},
          {x: pEnd.x, y: pEnd.y},
          {x: pEnd.x - headLen * Math.cos(angle + Math.PI / 6), y: pEnd.y - headLen * Math.sin(angle + Math.PI / 6)}
        );
      }
      
      targetCtx.fillStyle = stroke.color || '#000';
      const angle = typeof stroke.angle === 'number' ? stroke.angle : Math.PI / 4;
      const bw = Math.max(1, (stroke.width || 4) * boardZoom);
      const offsetX = Math.cos(angle) * (bw / 2);
      const offsetY = -Math.sin(angle) * (bw / 2);
      
      if (pts.length > 0) {
        targetCtx.moveTo(pts[0].x - offsetX, pts[0].y - offsetY);
        targetCtx.lineTo(pts[0].x + offsetX, pts[0].y + offsetY);
        targetCtx.lineWidth = 1;
        targetCtx.stroke();
        
        for (let i = 0; i < pts.length - 1; i++) {
          const p1 = pts[i];
          const p2 = pts[i+1];
          targetCtx.beginPath();
          targetCtx.moveTo(p1.x - offsetX, p1.y - offsetY);
          targetCtx.lineTo(p2.x - offsetX, p2.y - offsetY);
          targetCtx.lineTo(p2.x + offsetX, p2.y + offsetY);
          targetCtx.lineTo(p1.x + offsetX, p1.y + offsetY);
          targetCtx.closePath();
          targetCtx.fill();
        }
      }
      targetCtx.restore();
      return;
    }

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
    } else if (shapeType === 'arrow') {
      targetCtx.moveTo(pStart.x, pStart.y);
      targetCtx.lineTo(pEnd.x, pEnd.y);
      targetCtx.stroke();

      const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
      const headLen = Math.max(12, (stroke.width || 4) * 3 * boardZoom);
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
  const style = getBrushStyle();
  targetCtx.save();
  targetCtx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
  targetCtx.globalAlpha = stroke.opacity || 1;
  targetCtx.strokeStyle = stroke.color || '#000';
  targetCtx.fillStyle = stroke.color || '#000';
  targetCtx.lineWidth = Math.max(1, (stroke.width || style.width) * boardZoom);
  targetCtx.lineCap = 'round';
  targetCtx.lineJoin = 'round';

  if (stroke.tool === 'calligraphy') {
    const angle = typeof stroke.angle === 'number' ? stroke.angle : Math.PI / 4;
    const w = Math.max(1, (stroke.width || style.width) * boardZoom);
    const offsetX = Math.cos(angle) * (w / 2);
    const offsetY = -Math.sin(angle) * (w / 2);
    
    // Draw the starting nib stamp
    targetCtx.beginPath();
    targetCtx.moveTo(points[0].x - offsetX, points[0].y - offsetY);
    targetCtx.lineTo(points[0].x + offsetX, points[0].y + offsetY);
    targetCtx.lineWidth = 1;
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
  } else {
    if (points.length === 1) {
      targetCtx.beginPath();
      targetCtx.arc(points[0].x, points[0].y, (stroke.width || style.width) * boardZoom / 2, 0, Math.PI * 2);
      targetCtx.fill();
    } else {
      targetCtx.beginPath();
      targetCtx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        targetCtx.lineTo(points[i].x, points[i].y);
      }
      targetCtx.stroke();
    }
  }
  
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
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.translate(boardPanX, boardPanY);
    ctx.scale(boardZoom, boardZoom);

    const startX = Math.floor((-boardPanX / boardZoom) / 28) * 28;
    const startY = Math.floor((-boardPanY / boardZoom) / 28) * 28;
    const endX = (-boardPanX + width) / boardZoom;
    const endY = (-boardPanY + height) / boardZoom;

    if (appState.backgroundMode === 'grid') {
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.18)' : '#e0e0e8';
      ctx.lineWidth = 1 / boardZoom;
      ctx.beginPath();
      for (let x = startX; x <= endX; x += 28) {
        ctx.moveTo(x, startY); ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += 28) {
        ctx.moveTo(startX, y); ctx.lineTo(endX, y);
      }
      ctx.stroke();
    } else if (appState.backgroundMode === 'ruled') {
      const rStartY = Math.floor((-boardPanY / boardZoom) / 32) * 32;
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.18)' : '#e2e8f0';
      ctx.lineWidth = 1 / boardZoom;
      ctx.beginPath();
      for (let y = rStartY; y <= endY; y += 32) {
        if (y < 40) continue;
        ctx.moveTo(startX, y); ctx.lineTo(endX, y);
      }
      ctx.stroke();
      ctx.strokeStyle = '#f87171';
      ctx.beginPath();
      ctx.moveTo(80, startY); ctx.lineTo(80, endY);
      ctx.stroke();
    } else if (appState.backgroundMode === 'staff') {
      const sStartY = Math.floor((-boardPanY / boardZoom) / 140) * 140;
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : '#cbd5e1';
      ctx.lineWidth = 1.5 / boardZoom;
      for (let y = sStartY; y <= endY; y += 140) {
        if (y < 60) continue;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const sy = y + i * 14;
          ctx.moveTo(startX, sy); ctx.lineTo(endX, sy);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  const highlighterStrokes = [];
  const normalStrokes = [];
  for (const stroke of scene.annotations) {
    if (stroke.tool === 'highlighter' || stroke.origTool === 'highlighter' || stroke.brushType === 'highlighter') {
      highlighterStrokes.push(stroke);
    } else {
      normalStrokes.push(stroke);
    }
  }

  for (const stroke of normalStrokes) {
    drawStroke(stroke);
  }

  const isPreviewHighlighter = currentStroke && (currentStroke.tool === 'highlighter' || currentStroke.origTool === 'highlighter' || currentStroke.brushType === 'highlighter');
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
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.arc(currentMousePos.x, currentMousePos.y, 150, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(currentMousePos.x, currentMousePos.y, 150, 0, Math.PI * 2);
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
        ctx.drawImage(magnifierImg, 0, 0, canvas.width, canvas.height);
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

  if (isSnippingMode) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    if (snipStart && snipCurrent) {
      const sx = Math.min(snipStart.x, snipCurrent.x);
      const sy = Math.min(snipStart.y, snipCurrent.y);
      const sw = Math.abs(snipStart.x - snipCurrent.x);
      const sh = Math.abs(snipStart.y - snipCurrent.y);
      ctx.rect(sx, sy, sw, sh);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill('evenodd');
    
    if (snipStart && snipCurrent) {
      const sx = Math.min(snipStart.x, snipCurrent.x);
      const sy = Math.min(snipStart.y, snipCurrent.y);
      const sw = Math.abs(snipStart.x - snipCurrent.x);
      const sh = Math.abs(snipStart.y - snipCurrent.y);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  if (appState && appState.activeTool === 'mindmap' && window.hoveredAddButton) {
    const parentNode = scene.annotations.find(a => a.id === window.hoveredAddButton.nodeId);
    if (parentNode) {
      const pt = globalToLocal({ x: parentNode.x, y: parentNode.y });
      const boxW = (parentNode.width || 120) * boardZoom;
      const boxH = (parentNode.height || 40) * boardZoom;
      
      const btnX = pt.x + boxW + 15 * boardZoom;
      const btnY = pt.y + boxH / 2;
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(btnX, btnY, 10 * boardZoom, 0, Math.PI * 2);
      ctx.fillStyle = window.hoveredAddButton.hovered ? '#3b82f6' : '#fff';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2 * boardZoom;
      ctx.stroke();
      
      ctx.fillStyle = window.hoveredAddButton.hovered ? '#fff' : '#3b82f6';
      ctx.font = `bold ${14 * boardZoom}px sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText('+', btnX, btnY + 1 * boardZoom);
      ctx.restore();
    }
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
        minX = Math.min(minX, pt.x - 4);
        minY = Math.min(minY, pt.y - 4);
        maxX = Math.max(maxX, pt.x + (stroke.width || (stroke.tool === 'image' ? 400 : 200)) + 4);
        maxY = Math.max(maxY, pt.y + (stroke.height || (stroke.tool === 'image' ? 300 : 80)) + 4);
      } else if (stroke.tool === 'shapes' || stroke.shapeType) {
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
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      tool: 'shapes',
      shapeType: appState.activeShapeType || 'rectangle',
      brushType: appState.lastInkingTool || 'pen',
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
  const lineThreshold = 0.88;
  const lineMinDist = 25;

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

    const triThresh = 0.35;
    const circleThresh = 0.32;
    const rectThresh = 0.32;

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

  const arrowThresh = 0.30;
  const lineErrThresh = 0.28;

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

async function finalizeStroke() {
  if (!currentStroke) {
    return;
  }

  const stroke = currentStroke;
  currentStroke = null;

  if (stroke.tool === 'shapes') {
    if (stroke.start && stroke.end && Math.hypot(stroke.end.x - stroke.start.x, stroke.end.y - stroke.start.y) >= 4) {
      await window.appBridge.addStroke(stroke);
    }
    return;
  }

  if (stroke.tool === 'eraser') {
    await window.appBridge.erasePath({
      points: stroke.points,
      radius: appState.brushDefaults.eraser.radius,
    });
  } else {
    const recognized = (stroke.tool === 'shapes' || stroke.tool === 'pen' || stroke.tool === 'calligraphy' || stroke.tool === 'highlighter') ? recognizeShape(stroke) : null;
    if (recognized) {
      stroke.isAutoShape = true;
      stroke.origTool = stroke.tool;
      stroke.brushType = stroke.tool; // Preserve the original tool as the brushType
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
  }
}

canvas.addEventListener('pointerdown', (event) => {
  currentMousePos = { x: event.offsetX, y: event.offsetY };
  
  if (isSnippingMode) {
    snipStart = { x: event.offsetX, y: event.offsetY };
    snipCurrent = { ...snipStart };
    return;
  }

  if (appState && appState.backgroundMode && appState.backgroundMode !== 'transparent') {
    if (event.button === 1 || (event.button === 0 && isSpaceDown)) {
      isPanningBoard = true;
      boardPanStartX = event.offsetX - boardPanX;
      boardPanStartY = event.offsetY - boardPanY;
      canvas.style.cursor = 'grabbing';
      return;
    }
  }

  if (window.DEBUG_REPEN) console.log('[DEBUG Overlay] pointerdown at screen position:', event.clientX, event.clientY, 'offset:', event.offsetX, event.offsetY, 'activeTool:', appState ? appState.activeTool : 'N/A');
  if (appState && appState.clickHalo) {
    const globalPt = localToGlobal({ x: event.offsetX, y: event.offsetY });
    clickRipples.push({ ...globalPt, time: Date.now() });
    scheduleRender();
  }

  if (!canDraw()) {
    return;
  }

  if (appState && appState.backgroundMode !== 'transparent') {
    if (!autoPanRafId) {
      autoPanRafId = requestAnimationFrame(autoPanLoop);
    }
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
        const w = stroke.width || 200;
        const h = stroke.height || 80;
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
  if (appState.activeTool === 'mindmap') {
    const pt = { x: event.offsetX, y: event.offsetY };
    const globalPt = localToGlobal(pt);

    if (window.hoveredAddButton?.hovered) {
      const parentNode = getMindmapNodes().find(a => a.id === window.hoveredAddButton.nodeId);
      if (parentNode) {
        const childType = parentNode.nodeType === 'central' ? 'main' : 'sub';
        const side = window.hoveredAddButton.side;
        
        const COLORS = ['#ff5a5f', '#ffe36d', '#00d26a', '#3b82f6', '#ffffff'];
        const newColor = childType === 'main' 
            ? COLORS[getMindmapNodes().filter(a => a.nodeType === 'main').length % COLORS.length] 
            : parentNode.color;

        const newNode = createMindmapNode({
          nodeType: childType,
          parentId: parentNode.id,
          side: side,
          text: 'New Topic',
          color: newColor,
          x: parentNode.x,
          y: parentNode.y
        });

        window.addMindmapNode(newNode, { focusEditor: true });
        return;
      }
    }

    const clickedNode = findMindmapNodeAtPoint(event.offsetX, event.offsetY);
    if (clickedNode) {
      window.isDraggingMindmapNode = {
        nodeId: clickedNode.id,
        startX: event.offsetX,
        startY: event.offsetY,
        origX: clickedNode.x,
        origY: clickedNode.y,
        hasMoved: false,
        clientX: event.clientX,
        clientY: event.clientY,
        subtreeIds: getMindmapSubtreeIds(clickedNode.id),
        origSubtreeCoords: getMindmapSubtreeIds(clickedNode.id).map(id => {
          const n = getMindmapNodes().find(a => a.id === id);
          return { id, x: n.x, y: n.y };
        })
      };
      canvas.style.cursor = 'grabbing';
      canvas.setPointerCapture(event.pointerId);
      return;
    } else {
      window.selectedMindmapNodeId = null;
      scheduleRender();
    }

    const isCentralExist = getMindmapCentralNode();
    if (!isCentralExist) {
      const newNode = createMindmapNode({
        nodeType: 'central',
        text: 'Central Topic',
        color: '#8b5cf6',
        x: globalPt.x - 75,
        y: globalPt.y - 25,
        width: 150,
        height: 50
      });
      scene.annotations.push(newNode); // Optimistic
      window.appBridge.addStroke(newNode).then(() => {
        window.layoutMindmap(newNode.id);
        createTextEditor(event.clientX, event.clientY, newNode);
      });
    }
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
        const w = stroke.width || (stroke.tool === 'image' ? 400 : 200);
        const h = stroke.height || (stroke.tool === 'image' ? 300 : 80);
        if (pt.x >= spt.x && pt.x <= spt.x + w && pt.y >= spt.y && pt.y <= spt.y + h) {
          clickedId = stroke.id;
          break;
        }
      } else if (stroke.tool === 'shapes' || stroke.shapeType) {
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
  if (isSnippingMode && snipStart) {
    snipCurrent = { x: event.offsetX, y: event.offsetY };
    scheduleRender();
    return;
  }

  if (isPanningBoard) {
    boardPanX = event.offsetX - boardPanStartX;
    boardPanY = event.offsetY - boardPanStartY;
    scheduleRender();
    return;
  }

  currentMousePos = { x: event.offsetX, y: event.offsetY };
  if (appState && (appState.activeTool === 'spotlight' || appState.activeTool === 'magnifier')) {
    scheduleRender();
  }

  if (appState && appState.activeTool === 'laser') {
    const globalPt = localToGlobal({ x: event.offsetX, y: event.offsetY });
    laserPoints.push({ x: globalPt.x, y: globalPt.y, time: Date.now() });
    scheduleRender();
    return;
  }

  if (marqueeBox) {
    marqueeBox.currentX = event.offsetX;
    marqueeBox.currentY = event.offsetY;
    scheduleRender();
    return;
  }

  if (appState && appState.activeTool === 'mindmap') {
    if (window.isDraggingMindmapNode) {
      const state = window.isDraggingMindmapNode;
      const dx = event.offsetX - state.startX;
      const dy = event.offsetY - state.startY;
      if (Math.hypot(dx, dy) > 3) state.hasMoved = true;
      
      const deltaX = dx / boardZoom;
      const deltaY = dy / boardZoom;
      
      for (const orig of state.origSubtreeCoords) {
        const node = scene.annotations.find(a => a.id === orig.id);
        if (node) {
          node.x = orig.x + deltaX;
          node.y = orig.y + deltaY;
        }
      }
      
      scheduleRender();
      return;
    }
    
    let foundHover = null;
    const hoverBtn = findMindmapAddButtonAtPoint(event.offsetX, event.offsetY);
    if (hoverBtn) {
      foundHover = { nodeId: hoverBtn.node.id, side: hoverBtn.side, hovered: true };
    } else {
      const hoverNode = findMindmapNodeAtPoint(event.offsetX, event.offsetY);
      if (hoverNode) {
        foundHover = { nodeId: hoverNode.id, hovered: false };
      }
    }
    
    if (window.hoveredAddButton?.nodeId !== foundHover?.nodeId || window.hoveredAddButton?.hovered !== foundHover?.hovered || window.hoveredAddButton?.side !== foundHover?.side) {
      window.hoveredAddButton = foundHover;
      canvas.style.cursor = foundHover?.hovered ? 'pointer' : 'default';
      scheduleRender();
    }
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
    const dx = event.offsetX - dragStartX;
    const dy = event.offsetY - dragStartY;
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
    const dx = event.offsetX - isDraggingText.startX;
    const dy = event.offsetY - isDraggingText.startY;
    if (Math.hypot(dx, dy) > 3 || isDraggingText.hasMoved) {
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
          const w = stroke.width || (stroke.tool === 'image' ? 400 : 200);
          const h = stroke.height || (stroke.tool === 'image' ? 300 : 80);
          if (event.offsetX >= spt.x && event.offsetX <= spt.x + w && event.offsetY >= spt.y && event.offsetY <= spt.y + h) {
            overText = true;
            break;
          }
        }
      }
      canvas.style.cursor = overText ? 'grab' : (appState && appState.activeTool === 'select' ? 'default' : 'text');
    }
    return;
  }

  if (currentStroke.tool === 'shapes') {
    currentStroke.end = localToGlobal({ x: event.offsetX, y: event.offsetY });
    scheduleRender();
    return;
  }

  const globalPoint = localToGlobal({ x: event.offsetX, y: event.offsetY });
  addPointToStroke(currentStroke, globalPoint);
  scheduleRender();
});

canvas.addEventListener('pointerup', async (event) => {
  if (isPanningBoard) {
    isPanningBoard = false;
    canvas.style.cursor = isSpaceDown ? 'grab' : (appState && appState.activeTool === 'select' ? 'default' : 'crosshair');
    return;
  }

  if (isSnippingMode && snipStart) {
    snipCurrent = { x: event.offsetX, y: event.offsetY };
    const rect = {
      x: Math.min(snipStart.x, snipCurrent.x),
      y: Math.min(snipStart.y, snipCurrent.y),
      width: Math.abs(snipStart.x - snipCurrent.x),
      height: Math.abs(snipStart.y - snipCurrent.y)
    };
    isSnippingMode = false;
    snipStart = null;
    snipCurrent = null;
    document.body.style.cursor = '';
    scheduleRender();
    
    if (rect.width > 5 && rect.height > 5) {
      setTimeout(() => {
        window.appBridge.takeScreenshot(rect);
      }, 50);
    }
    return;
  }
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
          box = { minX: pt.x, minY: pt.y, maxX: pt.x + (stroke.width || (stroke.tool === 'image' ? 400 : 200)), maxY: pt.y + (stroke.height || (stroke.tool === 'image' ? 300 : 80)) };
        } else if (stroke.tool === 'shapes' || stroke.shapeType) {
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
    canvas.style.cursor = 'grab';
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

  if (window.isDraggingMindmapNode) {
    const dragObj = window.isDraggingMindmapNode;
    window.isDraggingMindmapNode = null;
    canvas.style.cursor = window.hoveredAddButton?.hovered ? 'pointer' : 'default';
    if (dragObj.hasMoved) {
      const updatedStrokes = dragObj.subtreeIds.map(id => scene.annotations.find(a => a.id === id)).filter(Boolean);
      
      if (updatedStrokes.length > 0 && window.appBridge.updateAnnotations) {
        await window.appBridge.updateAnnotations(updatedStrokes);
      } else if (window.appBridge.updateAnnotation) {
        for (const stroke of updatedStrokes) {
          await window.appBridge.updateAnnotation(stroke);
        }
      }
      scheduleRender();
    } else {
      window.selectedMindmapNodeId = dragObj.nodeId;
      scheduleRender();
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
    if (autoPanRafId) {
      cancelAnimationFrame(autoPanRafId);
      autoPanRafId = null;
    }
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
  window.isDraggingMindmapNode = null;
  marqueeBox = null;
  if (autoPanRafId) {
    cancelAnimationFrame(autoPanRafId);
    autoPanRafId = null;
  }
  scheduleRender();
});

canvas.addEventListener('dblclick', (event) => {
  if (!canDraw()) return;
  const pt = { x: event.offsetX, y: event.offsetY };
  
  if (appState?.activeTool === 'mindmap') {
    const clickedNode = findMindmapNodeAtPoint(event.offsetX, event.offsetY);
    if (clickedNode) {
      const rect = mindmapNodeToScreenRect(clickedNode);
      createTextEditor(rect.x, rect.y, clickedNode);
      return;
    }
  }
  
  for (let i = scene.annotations.length - 1; i >= 0; i--) {
    const stroke = scene.annotations[i];
    if (stroke.tool === 'text') {
      const spt = globalToLocal({ x: stroke.x, y: stroke.y });
      const w = stroke.width || 200;
      const h = stroke.height || 80;
      if (pt.x >= spt.x && pt.x <= spt.x + w && pt.y >= spt.y && pt.y <= spt.y + h) {
        createTextEditor(event.clientX, event.clientY, stroke);
        break;
      }
    }
  }
});

window.addEventListener('keydown', async (event) => {
  if (event.key === 'Escape') {
    if (isSnippingMode) {
      isSnippingMode = false;
      snipStart = null;
      snipCurrent = null;
      document.body.style.cursor = '';
      scheduleRender();
      return;
    }
    currentStroke = null;
    scheduleRender();
  }
  
  if ((event.key === 'Delete' || event.key === 'Backspace') && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
    if (appState?.activeTool === 'mindmap' && window.selectedMindmapNodeId) {
      const subtreeIds = getMindmapSubtreeIds(window.selectedMindmapNodeId);
      if (subtreeIds.length > 0 && window.appBridge.deleteAnnotations) {
        await window.appBridge.deleteAnnotations(subtreeIds);
        window.selectedMindmapNodeId = null;
        scheduleRender();
      }
    }
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

  if (event.code === 'Space' && (!document.activeElement || document.activeElement.tagName !== 'TEXTAREA')) {
    if (appState && appState.backgroundMode && appState.backgroundMode !== 'transparent') {
      isSpaceDown = true;
      canvas.style.cursor = 'grab';
    }
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'Space') {
    isSpaceDown = false;
    if (!isPanningBoard) {
      canvas.style.cursor = appState && appState.activeTool === 'select' ? 'default' : 'crosshair';
    }
  }
});

canvas.addEventListener('wheel', (event) => {
  if (!appState || !appState.backgroundMode || appState.backgroundMode === 'transparent') return;
  
  if (event.ctrlKey) {
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    setBoardZoom(boardZoom * zoomFactor, event.offsetX, event.offsetY);
  } else if (event.shiftKey) {
    event.preventDefault();
    boardPanX -= event.deltaY; // Shift+Wheel is usually horizontal scroll mapping to deltaY
    scheduleRender();
  } else if (event.deltaX !== 0) {
    boardPanX -= event.deltaX; // Native horizontal scroll (trackpad)
    scheduleRender();
  }
}, { passive: false });

async function bootstrapApp() {
  bootstrap = await window.appBridge.getBootstrap();
  appState = bootstrap.appState;
  scene = bootstrap.scene;
  displayBounds = bootstrap.display?.bounds || displayBounds;
  resizeCanvas();
  setupBoardNav();
  updateBoardNav();



  if (window.appBridge.onTriggerMindmapAutoLayout) {
    window.appBridge.onTriggerMindmapAutoLayout(() => {
      const central = getMindmapCentralNode();
      if (central) {
        window.layoutMindmap(central.id);
      }
    });
  }

  window.appBridge.onStateChanged((nextState) => {
    const prevTool = appState ? appState.activeTool : null;
    const prevPassThrough = appState ? appState.passThrough : false;
    const prevBackgroundMode = appState ? appState.backgroundMode : 'transparent';
    
    appState = nextState;
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
      if (appState.backgroundMode === 'transparent') {
        resetBoardZoom();
      }
    }

    if (currentStroke && currentStroke.tool !== appState.activeTool) {
      currentStroke = null;
      scheduleRender();
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
      const { bgDataUrl, format = 'png', quality = 0.9, width, height, copyToClipboard, autoSavePath } = payload;
      
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = width || window.innerWidth;
      exportCanvas.height = height || window.innerHeight;
      const exportCtx = exportCanvas.getContext('2d');
      
      if (bgDataUrl) {
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            exportCtx.drawImage(img, 0, 0, exportCanvas.width, exportCanvas.height);
            resolve();
          };
          img.onerror = resolve;
          img.src = bgDataUrl;
        });
      } else if (appState && appState.backgroundMode && appState.backgroundMode !== 'transparent') {
        const bg = appState.boardColor || (appState.backgroundMode === 'blackboard' ? '#18181c' : '#ffffff');
        exportCtx.fillStyle = bg;
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      }
      
      if (canvas) {
        exportCtx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);
      }
      
      let finalCanvas = exportCanvas;
      if (payload.rect && payload.rect.width > 0 && payload.rect.height > 0) {
        const { rect } = payload;
        finalCanvas = document.createElement('canvas');
        finalCanvas.width = rect.width;
        finalCanvas.height = rect.height;
        const cropCtx = finalCanvas.getContext('2d');
        cropCtx.drawImage(exportCanvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
      }
      
      let mimeType = 'image/png';
      if (format === 'jpeg' || format === 'jpg') mimeType = 'image/jpeg';
      else if (format === 'webp') mimeType = 'image/webp';
      
      const dataUrl = finalCanvas.toDataURL(mimeType, quality);
      window.appBridge.renderExport({
        dataUrl,
        format,
        copyToClipboard,
        autoSavePath
      });
    });
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('pointerleave', () => {
    if (currentStroke) {
      scheduleRender();
    }
  });
}

window.getPdfPageCount = () => {
  const allPages = typeof appState !== 'undefined' ? appState.pages : window.appState.pages;
  return allPages ? allPages.length : 0;
};

window.generatePdfImageForPage = async (pageIndex) => {
  const originalZoom = boardZoom;
  const originalPanX = boardPanX;
  const originalPanY = boardPanY;
  const allPages = typeof appState !== 'undefined' ? appState.pages : window.appState.pages;
  const page = allPages[pageIndex];
  
  if (!page) return null;

  try {
    const strokes = page.annotations || [];
    if (strokes.length === 0) {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png', 1.0);
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const stroke of strokes) {
      if (stroke.points) {
        for (const p of stroke.points) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
      }
      if (stroke.start) {
        if (stroke.start.x < minX) minX = stroke.start.x;
        if (stroke.start.y < minY) minY = stroke.start.y;
        if (stroke.start.x > maxX) maxX = stroke.start.x;
        if (stroke.start.y > maxY) maxY = stroke.start.y;
      }
      if (stroke.end) {
        if (stroke.end.x < minX) minX = stroke.end.x;
        if (stroke.end.y < minY) minY = stroke.end.y;
        if (stroke.end.x > maxX) maxX = stroke.end.x;
        if (stroke.end.y > maxY) maxY = stroke.end.y;
      }
      if (stroke.tool === 'text' || stroke.tool === 'image' || stroke.tool === 'mindmap') {
        const x = stroke.x || 0;
        const y = stroke.y || 0;
        const w = stroke.width || 100;
        const h = stroke.height || 100;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x + w > maxX) maxX = x + w;
        if (y + h > maxY) maxY = y + h;
      }
    }
    
    const padding = 100;
    let width = 1920;
    let height = 1080;
    
    if (minX !== Infinity && maxX !== -Infinity && minY !== Infinity && maxY !== -Infinity) {
      width = Math.max(800, maxX - minX + padding * 2);
      height = Math.max(600, maxY - minY + padding * 2);
      boardZoom = 1;
      boardPanX = -(minX - padding);
      boardPanY = -(minY - padding);
    } else {
      boardZoom = 1;
      boardPanX = 0;
      boardPanY = 0;
    }
    
    if (width > 8000) {
      const ratio = 8000 / width;
      width = 8000;
      height = Math.max(600, height * ratio);
      boardZoom = ratio;
    }
    if (height > 8000) {
      const ratio = 8000 / height;
      height = 8000;
      width = Math.max(800, width * ratio);
      boardZoom = boardZoom * ratio;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (const stroke of strokes) {
      drawStroke(stroke, ctx);
    }
    
    return canvas.toDataURL('image/png', 1.0);
  } finally {
    boardZoom = originalZoom;
    boardPanX = originalPanX;
    boardPanY = originalPanY;
  }
};

bootstrapApp().then(() => {
  updateMagnifierImg();
}).catch((error) => {
  console.error('Failed to bootstrap overlay:', error);
});
