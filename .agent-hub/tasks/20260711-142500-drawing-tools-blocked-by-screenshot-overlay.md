# Drawing tools blocked by screenshot overlay

Task ID: `20260711-142500-drawing-tools-blocked-by-screenshot-overlay`

## Goal

Fix the live failure where pen, highlighter, shapes, and other canvas tools stop drawing after screenshot/snipping mode or toolbar mode changes.

## Current Phase

`verify`

## Analysis

- All drawing tools share the same canvas pointer path, so simultaneous failure points to input routing.
- The screenshot/snipping overlay is a full-screen DOM layer above the canvas.
- Current screenshot mode cleanup is local to the export handler and is not cancelled when the user switches tools from the toolbar.
- If screenshot mode remains visible, canvas `pointerdown` never reaches the drawing handlers.

## Plan

- Add one central screenshot-mode cleanup hook in `overlay.js`.
- Cancel screenshot mode on active tool or pass-through changes.
- Use the same cleanup for save/copy/close so listeners and DOM state do not leak.
- Add a static regression check.
- Run `npm test`.

## Verification

- `npm test` passed.

## Handoff

- Added reusable screenshot-mode cleanup in `src/renderer/overlay.js`.
- Tool/pass-through changes now cancel screenshot mode, which prevents the screenshot layer from blocking canvas pointer events.
- Kept overlay windows focusable for every active non-pass-through tool in `main.js`; pen/highlighter/shapes were losing input after tool changes because only text/select modes stayed focusable.
- Fixed live renderer crashes from `hexToRgba(undefined, ...)`; malformed or legacy strokes without a color could crash every render after a tool switch, making drawing appear dead.
- Added regression checks in `scripts/verify-tool-state.js`.
- Existing broader screenshot and toolbar edits remain in the working tree; this task only addressed the drawing input blocker.
