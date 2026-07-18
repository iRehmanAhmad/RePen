# Editor playback and workspace upgrade

## Intake

The editor still feels basic and key interactions do not work. A source review confirmed the visual preview owns different media/canvas refs from the playback state, leaving playback, metadata, volume, frame stepping, and annotation rendering disconnected.

## Plan

1. Connect preview media and canvas elements to the playback state owner.
2. Give the preview useful empty/loading/error states and a compact, intentional control surface.
3. Improve timeline interaction feedback and contextual creation affordances after playback is reliable.
4. Add runtime tests for media-ref wiring and user-visible workspace states.

## Verification

- npm test
- npm run build:all
- git diff --check
- manual Electron playback and workspace QA

## Result

Connected the mounted preview videos and annotation canvas to the shared playback state. The visible preview now receives play, pause, seek, frame-step, volume, metadata, webcam sync, and annotation rendering actions. Added preview empty state, mode-specific timeline guidance, keyboard mode switching, and reusable inspector card styling. Automated checks passed; an existing running Electron instance prevented launching a second editor instance for visual desktop validation.
