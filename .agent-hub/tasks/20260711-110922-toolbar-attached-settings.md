# Toolbar-attached settings

## Goal

Overhaul settings so they open as a compact panel attached to the toolbar instead of as a separate large window.

## Current Phase

handoff

## Owners

- codex: implementation, verification, handoff

## Constraints

- Keep the panel compact and visually tied to the toolbar.
- Preserve existing settings persistence IPC.
- Route toolbar button, tray menu, and settings hotkey into the toolbar-attached panel.
- Avoid making the settings panel a large standalone application surface.

## Plan

1. Add a compact tabbed settings panel inside `toolbar.html`.
2. Style it as a toolbar-attached graphite drawer/popover.
3. Add toolbar renderer logic for tabs, brush/export draft editing, hotkey editing, save/reset/close.
4. Route existing `settings:open` behavior to the toolbar panel instead of the standalone window.
5. Run the existing test suite.

## Verification

- `npm test` passed.
- Verified JavaScript syntax, DOM IDs, IPC contracts, tool state alignment, scene-store separation, eraser geometry, and dialog routing.

## Handoff Notes

- Added a compact `toolbarSettingsPanel` inside the toolbar renderer with Brush, Export, and Keys tabs.
- Settings button now opens/closes the attached panel instead of opening a separate settings window.
- Existing `settings:open` paths now send `toolbar:open-settings` to the toolbar window, so tray/hotkey settings entry points attach to the toolbar as well.
- The attached panel uses the existing settings persistence IPC (`settings:get`, `settings:save`, `settings:reset`) and supports compact hotkey editing.
