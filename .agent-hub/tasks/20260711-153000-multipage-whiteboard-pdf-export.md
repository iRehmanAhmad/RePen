# Multipage whiteboard PDF export

Task ID: `20260711-153000-multipage-whiteboard-pdf-export`

## Goal

Fix whiteboard PDF export so a notebook with multiple pages exports every page and does not capture live overlay UI such as the scrollbar or bottom new-page zone.

## Current Phase

`verify`

## Changes

- Replaced live overlay `printToPDF()` export with a dedicated hidden PDF render document.
- Export now calls `syncPageStore()` and renders all stored whiteboard pages from scene data.
- PDF rendering excludes board controls, scrollbars, page toast, screenshot UI, and the bottom new-page zone.
- Added static regression checks to keep PDF export from reverting to live overlay printing.

## Verification

- `npm test` passed.
