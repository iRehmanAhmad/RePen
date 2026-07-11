# Compact settings panel

## Goal

Redesign the settings panel so it feels polished, compact, and consistent with the quiet graphite toolbar without making the window or feature surface bigger.

## Current Phase

handoff

## Owners

- codex: implementation, verification, handoff

## Constraints

- Keep existing settings behavior, IDs, IPC calls, and save/reset/close flow intact.
- Avoid adding new frameworks or large interaction patterns.
- Make hotkeys less visually dominant by separating them from the default settings view.

## Plan

1. Replace the large visual hero with a compact title bar.
2. Add lightweight section tabs for Brushes, Export, and Hotkeys.
3. Convert nested card-heavy panels into compact rows.
4. Add visible slider values for brush controls.
5. Retune colors, spacing, buttons, modal, and conflict states to the quiet graphite style.
6. Run the existing test suite.

## Verification

- `npm test` passed.
- Verified JavaScript syntax, DOM IDs, IPC contracts, tool state alignment, scene-store separation, eraser geometry, and dialog routing.

## Handoff Notes

- Replaced the large settings hero with a compact title bar.
- Added lightweight tabs for Brushes, Export, and Hotkeys so hotkey editing no longer dominates the default view.
- Rebuilt the settings stylesheet around the quiet graphite visual language used by the toolbar.
- Converted brush/export controls into smaller row-based groups with live slider values.
- Reduced the settings window size from 920x780 to 820x640.
- Superseded by `20260711-110922-toolbar-attached-settings.md`: user clarified settings should attach to the toolbar rather than remain a separate window.
