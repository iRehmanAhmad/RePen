# Task: Freehand Auto-Shape Recognition & Instant Reversion Hotkey

## Phase 1: Intake
- **Goal**: When drawing freehand with the Pen or Highlighter tool, automatically recognize geometric shapes (circle, rectangle, line, arrow) upon stroke completion and convert them into clean, perfect vector shapes.
- **Requirement**: Provide an instant shortcut key (`R`, `Alt+R`, `Ctrl+Shift+R`) that immediately reverts the converted shape back to the original freehand drawn points (and toggles between them).

## Phase 2: Analysis
- **Affected Files**:
  - `src/renderer/overlay.js`: Stroke completion (`finalizeStroke`), shape recognition mathematical evaluation (`recognizeShape`), hotkey listener for toggling auto-shape reversion.
  - `main.js`: `normalizeStroke()` to preserve `isAutoShape`, `origTool`, and `origPoints` when storing annotations in `state.json` and memory; add `revertAutoShape` hotkey to `DEFAULT_STATE.hotkeys`.
  - `src/renderer/settings.js`: Register `revertAutoShape` in `ACTIONS` array for UI configuration.

## Phase 3: Plan
1. **Geometric Shape Recognition (`overlay.js`)**:
   - Implement `recognizeShape(stroke)` evaluating aspect ratio, closure distance, point-to-line error, and circle/rectangle boundary error.
   - On `pointerup` in `finalizeStroke()`, if the stroke is from `pen` or `highlighter` and has sufficient points/length, test for circle, rectangle, line, or arrow.
   - If recognized, attach `isAutoShape: true`, `origTool: stroke.tool`, `origPoints: stroke.points`, and convert to `tool: 'shapes'`, `shapeType: recognized.shapeType`.
2. **Instant Reversion Hotkey (`overlay.js` & `main.js`)**:
   - Add global hotkey `revertAutoShape` (`CommandOrControl+Shift+R`) and direct keyboard shortcut `r` / `R` / `Alt+R` in `overlay.js`.
   - When triggered, find the most recently drawn annotation where `isAutoShape === true`, and toggle its tool between `shapes` and `origTool`, restoring or hiding `points`.
3. **Persistence & Verification**:
   - Update `normalizeStroke()` in `main.js` to preserve auto-shape metadata.
   - Run `node -c` syntax checks across all modified files.

## Phase 5: Review & Verification
- **Code Review**: Verified that `recognizeShape` uses robust geometric bounds (aspect ratio, distance to edge, point variance) without false-triggering on tiny dots or short scribbles. Verified that toggling reverts both visual rendering and stored state cleanly via `origTool`, `origPoints`, `origShapeType`, `origStart`, and `origEnd`.
- **Syntax Check**: Ran `node -c` on `main.js`, `src/preload.js`, `src/renderer/settings.js`, and `src/renderer/overlay.js`. All checks passed.

## Phase 6: Handoff
- `from`: antigravity
- `type`: handoff
- `taskId`: 20260704-093000-auto-shape-recognition
- `message`: Implemented freehand geometric shape recognition (circles, rectangles, lines, arrows) for Pen and Highlighter tools. Added immediate shortcut key (`R` or `C` while drawing, or global hotkey `CommandOrControl+Shift+R`) to toggle back and forth between the recognized perfect shape and the original freehand points. Preserved metadata across Electron IPC and state persistence.

