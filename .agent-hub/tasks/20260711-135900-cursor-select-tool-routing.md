# Cursor/select tool routing and broken tools audit

Task ID: `20260711-135900-cursor-select-tool-routing`

## Goal

Answer whether Select & Move should remain as a separate primary tool, then make the toolbar less confusing by routing annotation selection through the cursor control and auditing the drawing/presentation tool paths that users report as unreliable.

## Current Phase

`verify`

## Notes

- Recommendation: keep the internal `select` tool, but do not expose it as a separate primary toolbar button. Users should think of it as cursor/edit mode.
- Preserve the explicit pen/highlighter/calligraphy/shapes/text/eraser tools.
- Keep spotlight and magnifier grouped as view/presentation tools.
- Verify that pointer-driven tools are not disabled by pass-through/mouse-ignore logic.

## Verification

- `npm test` passed.

## Handoff

- The cursor toolbar button now enters the internal `select` tool for annotation move/resize.
- Clicking the cursor button again while already in move mode returns to desktop pass-through.
- The old Select/View group is now a View/Presenter group for overlay visibility, spotlight, and magnifier.
- Static verification now prevents `select` from being reintroduced as a separate view-group primary tool and confirms cursor/pass-through routing.
