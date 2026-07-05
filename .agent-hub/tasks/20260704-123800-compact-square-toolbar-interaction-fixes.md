# Task: Toolbar Compactness, Sharp Square UI, Redundant Flyout Removal & Interaction Fixes

## Phase 1: Intake
- **User Goals**:
  1. **Compact Height & No Rounded Corners**: Make toolbar height compact to match Epic Pen. Remove rounded corners (`border-radius: 0`) from all elements (container, buttons, swatches, popovers).
  2. **Remove Redundant Flyout Panel**: Stop displaying common properties (color palette, stroke thickness, opacity) in the sliding flyout panel since they are now accessible directly on the toolbar.
  3. **Screenshot Saving & Cursor Mode**: Ensure taking a screenshot works smoothly and allows saving, and ensure switching to cursor option works properly without getting stuck.
  4. **Toolbar Click/Draw Protection**: Prevent drawing tools from capturing clicks on or over the toolbar itself, ensuring clicking any tool button in the toolbar always works immediately without drawing on the toolbar.

## Phase 2: Analysis
- **Why toolbar height is tall & has rounded corners**: `toolbar.css` uses `border-radius: 12px`, `padding: 10px`, and `gap: 6px`. In contrast, Epic Pen uses square buttons (`border-radius: 0`) with virtually 0px gap and inline swatches touching each other.
- **Why common properties were shown repeatedly**: The `<aside id="flyoutPanel">` slid out automatically whenever a draw tool was chosen, redundantly displaying Color, Size, and Opacity sections that are already accessible inline on the toolbar.
- **Why screenshot saving / dialogs failed or froze**: `dialog.showSaveDialog` and `showOpenDialog` were called without passing a parent BrowserWindow. As a result, Windows created top-level dialogs at normal z-order, which were covered and blocked by the full-screen `alwaysOnTop` overlay window.
- **Why drawing happened on the toolbar / prevented tool switching**:
  1. `toolbar.css` did not set `pointer-events: none` on `html, body, .app-container`, meaning the entire 350px x 760px transparent window bounds intercepted clicks.
  2. When drawing began, `overlayWindow` (`focusable: true`) gained focus and moved to the top of Windows' z-order stack above `toolbarWindow`, intercepting subsequent clicks meant for toolbar buttons.

## Phase 3: Plan
1. **Sharp Square UI & Ultra-Compact Toolbar (`toolbar.css` & `toolbar.html`)**:
   - Set `border-radius: 0 !important;` on all toolbar containers, buttons, swatches, and popovers.
   - Reduce button padding and gaps (`gap: 2px` or `0px`) to match Epic Pen's height.
   - Completely remove `<aside id="flyoutPanel">` from `toolbar.html` and its toggle logic in `toolbar.js`.
   - Add a `#shapesGroupPopover` attached to the Magic Shapes button for quick shape selection (Rectangle, Circle, Line, Arrow, Triangle).
   - Move opacity slider directly into `#sizeGroupPopover` alongside brush width presets.
2. **Window Click-Through & Z-Order Protection (`toolbar.css` & `main.js`)**:
   - In `toolbar.css`, set `html, body, .app-container { pointer-events: none; }` and `.pen-bar, .grouped-popover { pointer-events: auto; }`.
   - In `main.js`, dynamically set `win.setFocusable(state.activeTool === 'text' && !state.passThrough)` on overlay windows so normal drawing tools never focus the overlay over the toolbar.
   - Attach `win.on('focus')` to overlay windows to call `toolbarWindow.moveTop()` immediately if focused.
3. **Screenshot & Dialog Z-Ordering Fixes (`main.js`)**:
   - In `takeScreenshot`, `saveSession`, `loadSession`, and `select-directory`, pass `helperWin` as the parent window to `dialog.showSaveDialog(helperWin, ...)` and `dialog.showOpenDialog(helperWin, ...)`.
   - Temporarily set `win.setIgnoreMouseEvents(true, { forward: true })` on overlay windows while any native dialog is open.

## Phase 4: Implementation
- [ ] Edit `main.js` to fix dialog parent windows, dialog z-ordering, and overlay `setFocusable` / `moveTop()` rules.
- [ ] Edit `src/renderer/toolbar.html` to remove `#flyoutPanel`, add `#shapesGroupPopover`, and refine tool buttons.
- [ ] Edit `src/renderer/toolbar.css` for 0px border-radius everywhere, ultra-compact spacing, and `pointer-events: none` container transparency.
- [ ] Edit `src/renderer/toolbar.js` to remove flyout logic, add shapes popover logic, and handle inline swatches/opacity.
- [ ] Edit `src/renderer/settings.css` and `src/renderer/overlay.js` for 0px border-radius consistency.
