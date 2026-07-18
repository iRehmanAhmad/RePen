# Editor overhaul corrections

## Intake

Correct the remaining verified editor defects after the visual overhaul: broken trim/speed resizing, fabricated audio waveform UI, inability to create the first effects/captions clip from timeline modes, unsafe persisted timeline height, and source-text based overhaul tests.

## Plan

1. Pass a measured timeline canvas element to resize calculations and test zoom-aware drag math.
2. Replace the synthetic waveform with an explicit unavailable state.
3. Keep effects and captions tracks available while their matching creation mode is active.
4. Clamp saved timeline height against the live viewport bound.
5. Replace source scanning tests with component/runtime assertions.

## Verification

- npm test
- npm run build:all
- git diff --check
- Record remaining manual Electron visual QA separately.

## Result

Implemented the five scoped corrections. Automated verification passes; real Electron visual and interaction QA remains required for monitor scaling and native media workflows.
