import React, { useState, useEffect } from 'react';

// Swatch colors matching the 3x8 palette
const COLORS = [
  '#ff5a5f', '#f97316', '#ffe36d', '#00d26a', '#22d3ee', '#3b82f6', '#a855f7', '#ffffff', '#111827',
  '#e11d48', '#f43f5e', '#fb7185', '#c2410c', '#ea580c', '#d97706', '#eab308', '#fde047', '#0f766e',
  '#16a34a', '#4ade80', '#1d4ed8', '#2563eb', '#06b6d4', '#4338ca', '#7c3aed', '#a78bfa', '#be185d',
  '#db2777', '#f472b6', '#4b5563'
];

interface ToolbarProps {
  onToolSelect?: (tool: string) => void;
  onColorSelect?: (color: string) => void;
}

export const PresenterToolbar: React.FC<ToolbarProps> = ({
  onToolSelect,
  onColorSelect,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [activeTool, setActiveTool] = useState('pen');
  const [selectedColor, setSelectedColor] = useState('#ff5a5f');
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [recordingState, setRecordingState] = useState({ isRecording: false, isPaused: false });
  const [recordingTime, setRecordingTime] = useState('00:00');

  useEffect(() => {
    const bridge = (window as any).appBridge;
    const unsubscribeTimer = bridge?.onRecordingTimerTick
      ? bridge.onRecordingTimerTick((timeStr: string) => {
        setRecordingTime(timeStr);
      })
      : undefined;

    const unsubscribeState = bridge?.onRecordingStateChanged
      ? bridge.onRecordingStateChanged((state: { isRecording: boolean; isPaused: boolean }) => {
        setRecordingState(state);
      })
      : undefined;

    void bridge?.getRecordingState?.().then((state: { isRecording: boolean; isPaused: boolean }) => {
      setRecordingState(state);
    });

    return () => {
      unsubscribeTimer?.();
      unsubscribeState?.();
    };
  }, []);

  const handleToolClick = async (tool: string) => {
    setActiveTool(tool);
    if (onToolSelect) onToolSelect(tool);
    if ((window as any).appBridge?.setTool) {
      await (window as any).appBridge.setTool(tool);
    }
  };

  const handleColorClick = async (color: string) => {
    setSelectedColor(color);
    setShowColorPopover(false);
    if (onColorSelect) onColorSelect(color);
    if ((window as any).appBridge?.setColor) {
      await (window as any).appBridge.setColor(color);
    }
  };

  const toggleOrientation = async () => {
    const next = orientation === 'vertical' ? 'horizontal' : 'vertical';
    setOrientation(next);
    if ((window as any).appBridge?.setToolbarOrientation) {
      await (window as any).appBridge.setToolbarOrientation(next);
    }
  };

  const triggerScreenshot = async () => {
    if ((window as any).appBridge?.takeScreenshot) {
      await (window as any).appBridge.takeScreenshot();
    }
  };

  const startRecord = async () => {
    if ((window as any).appBridge?.startRecording) {
      await (window as any).appBridge.startRecording({
        sourceId: 'display:0',
        sourceType: 'display',
        width: 1920,
        height: 1080,
        fps: 30,
        captureSystemAudio: true,
        captureMic: false,
        webcamEnabled: false,
        captureCursor: true,
        outputPath: '',
      });
    }
  };

  const stopRecord = async () => {
    if ((window as any).appBridge?.stopRecording) {
      await (window as any).appBridge.stopRecording();
    }
  };

  const cancelRecord = async () => {
    if ((window as any).appBridge?.cancelRecording) {
      await (window as any).appBridge.cancelRecording();
    }
  };

  const togglePauseRecord = async () => {
    if (recordingState.isPaused) {
      if ((window as any).appBridge?.resumeRecording) {
        await (window as any).appBridge.resumeRecording();
      }
    } else {
      if ((window as any).appBridge?.pauseRecording) {
        await (window as any).appBridge.pauseRecording();
      }
    }
  };

  return (
    <div 
      className={`app-container ${orientation === 'horizontal' ? 'horizontal' : ''}`}
      onMouseEnter={() => (window as any).appBridge?.setToolbarHover?.(true)}
      onMouseLeave={() => (window as any).appBridge?.setToolbarHover?.(false)}
    >
      {recordingState.isRecording ? (
        <div className="recording-hud">
          <span className="hud-timer">{recordingTime}</span>
          <button className="hud-btn" onClick={togglePauseRecord}>
            {recordingState.isPaused ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            )}
          </button>
          <button className="hud-btn danger" onClick={stopRecord}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M6 6h12v12H6z"/>
            </svg>
          </button>
          <button className="hud-btn" onClick={cancelRecord}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      ) : (
        <nav className={`pen-bar ${collapsed ? 'collapsed' : ''}`}>
          <div className="drag-header">
            <button className="mark-mini" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? '+' : 'RP'}
            </button>
          </div>
          
          {!collapsed && (
            <div className="tool-column">
              <button 
                className={`tool-button icon-tool ${activeTool === 'select' ? 'active' : ''}`}
                onClick={() => handleToolClick('select')}
              >
                Cursor
              </button>
              
              <button 
                className={`tool-button icon-tool ${activeTool === 'pen' ? 'active' : ''}`}
                onClick={() => handleToolClick('pen')}
              >
                Pen
              </button>

              <button 
                className={`tool-button icon-tool ${activeTool === 'highlighter' ? 'active' : ''}`}
                onClick={() => handleToolClick('highlighter')}
              >
                Highlighter
              </button>

              <button 
                className={`tool-button icon-tool ${activeTool === 'eraser' ? 'active' : ''}`}
                onClick={() => handleToolClick('eraser')}
              >
                Eraser
              </button>

              <button className="action-icon-btn" onClick={triggerScreenshot}>
                Screenshot
              </button>

              <button className="tool-button icon-tool" onClick={startRecord}>
                Record
              </button>

              <button className="tool-button icon-tool" onClick={toggleOrientation}>
                Rotate
              </button>

              <div className="grouped-tool-container color-grid-container">
                <button className="color-current-btn" onClick={() => setShowColorPopover(!showColorPopover)}>
                  <span className="current-color-chip" style={{ backgroundColor: selectedColor }}></span>
                </button>
                {showColorPopover && (
                  <div className="grouped-popover">
                    <div className="color-popover-grid">
                      {COLORS.map(color => (
                        <button 
                          key={color} 
                          className={`swatch-btn ${selectedColor === color ? 'active' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => handleColorClick(color)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>
      )}
    </div>
  );
};
