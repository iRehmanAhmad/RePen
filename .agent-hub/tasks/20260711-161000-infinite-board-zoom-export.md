# Infinite Board Pan, Zoom, and Wide PDF Export

## Status

- phase: verify
- owner: codex

## Intake

User wants the whiteboard to support drawing indefinitely to the right, zooming in and out, and PDF export that includes the full drawn width for every page.

## Analysis

- Board annotations already use global coordinate storage.
- The visible board currently maps global coordinates directly to screen coordinates, so there is no board camera/viewport.
- PDF export renders all pages through a hidden document, but each page currently uses the display width, which truncates drawings that live beyond the visible screen.

## Plan

1. Add persisted board viewport state with horizontal pan and zoom.
2. Expose a renderer IPC method for changing that viewport.
3. Add compact board navigation controls for left/right pan, zoom out/in, and reset.
4. Update overlay coordinate transforms, rendering, selection movement, and background patterns to respect board pan/zoom.
5. Expand each PDF page SVG width based on that page's annotation extents.
6. Add static regression checks and run the existing test command.

## Verification

- `npm test` passed.

## Handoff

Implemented a compact board viewport system. The board can be panned horizontally to the right and zoomed in/out from the board toolbar, Ctrl+wheel, Ctrl+plus/minus, Ctrl+0, and Shift+wheel/Shift+arrow. Annotation rendering, hit testing, moving, and text/image sizing now respect board pan and zoom. PDF export computes each page's right-side annotation extent and expands the SVG viewBox before printing, so wide drawings are included instead of clipped.
