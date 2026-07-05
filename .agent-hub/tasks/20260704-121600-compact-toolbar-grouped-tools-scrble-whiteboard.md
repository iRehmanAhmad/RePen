# Task: Compact Toolbar Reorganization & Scrble Ink Whiteboard Upgrades

## Phase 1: Intake
- **User Goal**: 
  1. Reorganize the toolbar into a compact 12-item layout matching Epic Pen's height by grouping tools into split-buttons/dropdowns.
  2. Implement an Inking Group button (Pen, Highlighter, Laser, Text, Spotlight, Magnifier) with popout sub-menu.
  3. Implement an inline Pen Size button (`●`) showing current line width with a popover for quick size selection.
  4. Implement inline Color Swatches (2x2 grid) at the end of the toolbar for instant 1-click color switching.
  5. Upgrade Whiteboard mode to include Scrble Ink style background patterns (Grid Paper, Ruled Notebook Paper, Whiteboard, Blackboard, Transparent).

## Phase 2: Analysis
- **Toolbar Structure**: Currently `toolbar.html` lists 15 separate tool/action icons vertically. We will restructure `.tool-column` and `.action-column` into a unified, compact toolbar with grouped split buttons.
- **Grouped Tool Logic**: In `toolbar.js`, clicking a grouped button icon activates the last selected sub-tool. Clicking the small corner indicator arrow pops open a floating mini-menu to pick another sub-tool.
- **Whiteboard Backgrounds**: In `overlay.js`, `backgroundMode` rendering currently supports `whiteboard`, `blackboard`, and `grid`. We will add `ruled` (horizontal notebook lines with a margin line) and `staff` (music/Cornell notes), and expose these options in a dedicated Whiteboard paper dropdown on the toolbar.

## Phase 3: Plan
1. **HTML/CSS Restructuring**:
   - Update `src/renderer/toolbar.html` with the 12 compact items: Grip/Orientation, Cursor/Select, Inking Group (with dropdown), Shapes, Eraser, Pen Size Dot (with dropdown), Undo, Clear, Whiteboard Easel (with dropdown), Screenshot, Settings, and Inline Color Swatches.
   - Update `src/renderer/toolbar.css` for grouped split button indicators, floating popover menus, dot size previews, and inline swatch grids.
2. **JavaScript Logic**:
   - Update `src/renderer/toolbar.js` to handle grouped tool switching, size popup selection, whiteboard style switching, and inline color clicks.
   - Update `src/renderer/overlay.js` and `main.js` for `ruled` and `staff` paper modes.
3. **Verification**:
   - Verify clean syntax using `node -c`.
   - Test visual layout and interaction.

## Phase 4: Implementation
- [x] Update `main.js` to add `ruled` and `staff` background modes.
- [x] Update `src/renderer/overlay.js` to render Scrble-style ruled lines and music staff.
- [x] Replace toolbar tool column in `src/renderer/toolbar.html` with compact 12-item grouped structure.
- [x] Update `src/renderer/toolbar.css` with styling for popovers, dot previews, and swatches.
- [x] Update `src/renderer/toolbar.js` with dropdown logic and inline interaction handlers.
- [x] Verify syntax and run tests.

## Phase 5 & 6: Review & Verify
- Checked JavaScript syntax with `node -c` across `main.js`, `src/renderer/overlay.js`, and `src/renderer/toolbar.js` — all passed without syntax errors.
- Checked layout styles for both vertical and horizontal palette orientation.

## Phase 7: Handoff
- **From**: antigravity
- **Type**: handoff
- **TaskId**: 20260704-121600-compact-toolbar-grouped-tools-scrble-whiteboard
- **Message**: Reorganized the Overlay Ink toolbar into a compact 12-item palette matching Epic Pen's height. Inking tools (Pen, Highlight, Laser, Text Note, Spotlight, Magnifier) are grouped into a split button with a popover menu. Pen Size features a live dot preview and popover preset menu. Whiteboard features a popover menu with Scrble Ink upgrades (Ruled paper and Music staff). Inline color swatches allow 1-click color switching without opening panels. Ready for user QA!
