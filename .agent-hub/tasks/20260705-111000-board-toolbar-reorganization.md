# Task: Board Toolbar Reorganization & Overlay Navigation

- **Status**: Completed
- **Created**: 2026-07-05
- **Author**: Antigravity
- **Role**: Implementer

## Objective
Reorganize the Whiteboard/Background UI to separate the simple board entry (Whiteboard and Blackboard) in the main toolbar popover from advanced pattern and color customization within the board overlay navigation (`#boardNav`).

## Requirements
1. The main toolbar popover (`#whiteboardPopover`) should display only Whiteboard and Blackboard options (removing transparent, grid, ruled, and staff options).
2. Once the user is inside a board mode, the main toolbar's whiteboard button icon (`#whiteboardBtn`) changes into a "Transparent Desktop / Return to Desktop" icon, and clicking it returns the user to the transparent screen.
3. When inside a board mode, the top overlay navigation (`#boardNav`) displays board pattern selectors (Plain, Grid, Ruled Lines, Musical Staff) and background color swatches (White, Black, Chalkboard Green, Legal Pad Cream, Dark Navy, and Custom Color Picker).

## Implementation Details
- `src/renderer/toolbar.html`: Removed `transparent`, `grid`, `ruled`, and `staff` buttons from `#whiteboardPopover`.
- `src/renderer/toolbar.js`: Updated `#whiteboardBtn` icon rendering in `updateUi()` to show a transparent desktop icon when in board mode. Modified click listener to execute `setBackgroundMode('transparent')` when already in board mode.
- `src/renderer/overlay.html` & `src/renderer/overlay.css`: Added `.board-pattern-group` and `.board-color-group` with custom styling inside `#boardNav`.
- `src/preload.js` & `main.js`: Added `setBoardColor` IPC handler (`app:set-board-color`) and updated `state.boardColor` handling.
- `src/renderer/overlay.js`: Attached event listeners for pattern buttons and color swatches in `setupBoardNav()`. Added `isColorDark()` helper to dynamically adjust grid/ruled/staff line contrast based on `appState.boardColor` during rendering and export.

## Verification
- Automated: `npm test` passed all 5 verification test suites (syntax, DOM IDs, IPC contract, tool state, scene store separation).
- Manual: Verified tool state transitions and visual contrast across different background colors and line patterns.
