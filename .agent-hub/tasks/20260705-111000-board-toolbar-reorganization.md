# Task: Board Toolbar Reorganization & Overlay Navigation

- **Status**: Completed
- **Created**: 2026-07-05
- **Author**: Antigravity
- **Role**: Implementer

## Objective
Reorganize the Whiteboard/Background UI to separate the simple board entry (Whiteboard and Blackboard) in the main toolbar popover from advanced pattern and color customization within the board overlay navigation (`#boardNav`), while restoring full toolbar functionality and adding document export and new session capabilities.

## Requirements
1. The main toolbar popover (`#whiteboardPopover`) should display only Whiteboard and Blackboard options (removing transparent, grid, ruled, and staff options).
2. Once the user is inside a board mode, the main toolbar's whiteboard button icon (`#whiteboardBtn`) changes into a "Transparent Desktop / Return to Desktop" icon, and clicking it returns the user to the transparent screen.
3. When inside a board mode, the top overlay navigation (`#boardNav`) displays board pattern selectors (Plain, Grid, Ruled Lines, Musical Staff), background color swatches, a New Board button (`#newBoardButton`), and an Export PDF button (`#exportPdfButton`).
4. `Ctrl+V` / `Cmd+V` must paste clipboard images reliably across all tool selections and whiteboard backgrounds.

## Implementation Details
- `src/renderer/toolbar.html`: Removed `transparent`, `grid`, `ruled`, and `staff` buttons from `#whiteboardPopover`.
- `src/renderer/toolbar.js`: Updated `#whiteboardBtn` icon rendering in `updateUi()` to show a transparent desktop icon when in board mode. Modified click listener to execute `setBackgroundMode('transparent')` when already in board mode.
- `src/renderer/overlay.html` & `src/renderer/overlay.css`: Fixed an unclosed `</button>` tag (`#pageIndicator`) restoring DOM parsing and event delegation. Added `.board-pattern-group`, `.board-color-group`, `#newBoardButton`, and `#exportPdfButton` inside `#boardNav`. Added `@media print` rule to hide `#boardNav` during PDF printing.
- `src/preload.js` & `main.js`: Added `session:new`, `session:export-pdf`, and `setBoardColor` IPC handlers. Updated `setFocusable` in `main.js` to enable window focusability in board modes (`isBoard`) and added a low-level `before-input-event` listener on overlay and toolbar windows so `Ctrl+V` reliably triggers `pasteClipboardImage()` regardless of tool or mode.
- `src/renderer/overlay.js`: Attached event listeners for pattern buttons, color swatches, new session button, and PDF export button in `setupBoardNav()`.

## Verification
- Automated: `npm test` passed all 5 verification test suites (syntax, DOM IDs, IPC contract, tool state, scene store separation).
- Manual: Verified tool state transitions, visual contrast across different background colors, document PDF printing without navigation UI, and image paste shortcuts.
