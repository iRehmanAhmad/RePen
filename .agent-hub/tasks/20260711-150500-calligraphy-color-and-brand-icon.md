# Calligraphy color and brand icon polish

Task ID: `20260711-150500-calligraphy-color-and-brand-icon`

## Goal

Fix calligraphy switching to red unexpectedly and improve the main pencil icon contrast on the dark toolbar background.

## Current Phase

`verify`

## Changes

- Add calligraphy brush defaults aligned with the regular pen color.
- Carry the current ink color into calligraphy when switching tools.
- Recolor the toolbar brand pencil and tray/window icon to a brighter ivory/cyan palette.
- Add regression checks for calligraphy color behavior.

## Verification

- `npm test` passed.
