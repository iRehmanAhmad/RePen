# Settings Panel Window Clipping

## Status

- phase: verify
- owner: codex

## Intake

User reported the toolbar-attached settings panel is cut off on the left side.

## Analysis

The panel width was increased to support the Markury-style settings UI, but the Electron toolbar BrowserWindow still used the old narrow vertical bounds. CSS could position the panel, but the BrowserWindow clipped anything outside its rectangle.

## Implementation

- Added a shared toolbar window bounds helper with a wider vertical width.
- Reused the helper for toolbar creation and orientation changes.
- Added `app:set-toolbar-settings-open` IPC so the renderer can ask main to expand the window immediately when settings opens.

## Verification

- `npm test` passed.
