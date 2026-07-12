# 20260711-181000 Tray Cursor Settings Polish

## Intake

User reported three release polish issues:

- App icon is not appearing in the Windows tray.
- Cursor should not behave as annotation select/move because it prevents interacting with other apps.
- Settings panel should use app branding where appropriate and remove release-checklist language.

## Analysis

- Tray creation currently loads `src/renderer/icon.svg` through `nativeImage.createFromPath()`, which can be unreliable or visually too subtle for Windows tray rendering.
- The toolbar cursor button currently routes into `setTool('select')`, making cursor behave like annotation selection before click-through.
- Settings header/about copy still says "Release settings", "Release", "Ready for GitHub and website publishing", and "Release profile ready."

## Plan

1. Replace tray image creation with a compact native SVG data URL, explicit sizing, and a fallback to the existing app icon.
2. Change cursor button and tray menu behavior to enable desktop click-through instead of select/move mode.
3. Update settings branding/copy and add a small RePen mark to the settings header.
4. Update verification checks and run `npm test`.

## Verification

- `npm test` passed.
- `git diff --check` passed; Git reported only Windows line-ending normalization warnings.
- Added and visually checked `src/renderer/assets/tray-icon.png` as the primary Windows tray image.

## Handoff

- Tray icon now uses a real, high-contrast PNG asset before falling back to an inline SVG and then the existing app icon.
- Cursor button and tray menu now enable desktop click-through directly instead of entering select/move.
- Leaving the internal `select` tool and shortcut action in place so existing annotation-selection code is not removed unexpectedly.
- Settings panel now has the RePen mark in the header and uses neutral product/version copy instead of release-checklist language.
