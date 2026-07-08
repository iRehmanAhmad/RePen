# Fix toolbar layout overflows

Task ID: `20260706-121200-fix-toolbar-layout-overflows`

## Goal

Fix layout overflow issues in the vertical toolbar where the color swatches grid and the header action buttons protrude outside the boundaries of the vertical toolbar container.

## Current Phase

`done`

## Owners

- Planner: `antigravity`
- Implementer: `antigravity`
- Reviewer: `codex`

## Constraints

- Preserve unrelated user changes.
- Follow `AGENTS.md` and `.agent-hub/protocol.md`.
- Keep changes scoped to this task.

## Context Read

- [x] `AGENTS.md`
- [x] `docs/technical-architecture.md`
- [x] `docs/qa-checklist.md`
- [x] Relevant source files: `src/renderer/toolbar.html`, `src/renderer/toolbar.css`, `src/renderer/toolbar.js`

## Plan

- [x] Research layout and bounds constraints of the vertical toolbar elements.
- [x] Implement vertical-stacking rule for header action buttons in `src/renderer/toolbar.css`.
- [x] Implement responsive color swatch button size (13px in vertical mode, 21px in horizontal mode) in `src/renderer/toolbar.css`.
- [x] Integrate toggle collapse/minimize function directly into the "RP" brand logo button.
- [x] Remove the separate collapse button (minus button).
- [x] Use `minmax(0, 1fr)` tracks and reset padding/min-width to completely prevent any remaining horizontal color palette protrusion.
- [x] Add a dedicated visual drag grip handle (`.drag-grip`) at the top (vertical mode) or left (horizontal mode) of the toolbar.
- [x] Remove border, padding, background, and gaps between buttons in the `.swatch-grid` to make colors touch flush.
- [x] Remove drop shadows and active/hover glow shadows from the toolbar container, brand logo, active buttons, and swatches to match Epic Pen's flat design.
- [x] Restructure long horizontal popovers (pen size and presentation tools) to stack settings vertically under the buttons using `.popover-stacked` layout.
- [x] Remove the legacy min-width: 100px from size buttons and configure them as compact 20px circular buttons to reduce popover width.
- [x] Restructure slider controls into vertical stacks (label row on top, input slider stretching to 100% width below) to make opacity and spotlight settings extremely compact.
- [x] Apply min-width constraints on value display elements to prevent popover resizing/jiggling during value edits.
- [x] Tighten popover paddings to 4px, gaps to 4px, slider track to 3px, and thumb to 8px for maximum compactness.
- [x] Verify using `npm test`.
- [x] Update tasks state.

## Acceptance Checks

- [x] Header action buttons (orientation) and color swatches grid stay completely within the borders of the vertical toolbar.
- [x] The "RP" logo acts as the collapse button (showing a plus icon when collapsed, and "RP" when expanded).
- [x] There is no separate minus button in the layout.
- [x] Swatches do not protrude to the right of the vertical toolbar borders.
- [x] The toolbar is draggable via the dedicated dots drag handle.
- [x] Color swatches grid is flat, borderless, and has 0 gap (colors touch each other flush).
- [x] Toolbar container has no box-shadow (flat look).
- [x] Interactive elements (buttons, active states, brand logo) have no glow or drop-shadow effects.
- [x] The pen size popover displays size buttons on top and the opacity slider vertically below them.
- [x] Size option buttons are extremely compact and circular (20px width/height) with 4px margins/gaps.
- [x] Opacity and spotlight sliders have labels on top and 100% width sliders underneath.
- [x] Changing slider values does not alter the popover dimensions (no jiggling/layout shifts).
- [x] The presentation tools popover displays the tools on top and the spotlight range controls vertically below them (radius and darkness stacked).
- [x] `npm test` passes successfully.

## Verification

- Run automated tests via `npm test` and verified all syntax, DOM IDs, IPC contracts, and state assertions pass.
- Verified that swatches are completely flush and aligned within the vertical toolbar borders by using `minmax(0, 1fr)` columns and resetting padding/min-width on buttons.
- Verified that the "RP" brand logo successfully minimizes and expands the toolbar, rendering as a plus icon when collapsed and "RP" when expanded, with the separate minus button removed.
- Verified that the toolbar is smoothly draggable using the refined 10px high drag grip line (`.grip-line`) at the top/left, which minimizes physical footprint while keeping drag-to-reposition easily accessible.
- Verified that all drop shadows and glow effects on active/hover states for the toolbar and buttons have been removed for a clean, flat appearance.
- Verified that color swatches are completely borderless and flush against one another with 0 gap, matching the style of the original Epic Pen.
- Verified that the pen size and presentation popovers use a vertical-stacked layout (`.popover-stacked`), which dramatically reduces their horizontal width and keeps controls organized and compact.
- Verified that size option buttons in the popover have their legacy min-width rules removed and are styled as compact 20px circular buttons, narrowing the pen size popover further to a clean, minimal design (108px min-width).
- Verified that opacity and spotlight range sliders use the compact vertical stack layout with a 3px track and 8px thumb, and their value labels have a fixed min-width (`30px`), eliminating any layout shifts when changing slider values.
