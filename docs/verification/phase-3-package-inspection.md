# Phase 3 Package Inspection

Date: 2026-07-17

## Command

```powershell
npx --no-install electron-builder --win --dir
```

Result: passed. The unpacked Windows application was written to `dist/win-unpacked`.

## Inspected package contents

`app.asar` contains:

- `dist-renderer/editor.html`
- `src/preload.js`
- `src/shared/editor/projectFactory.js`
- `src/shared/editor/mediaValidation.js`
- `src/shared/recording/capturePolicy.js`

`app.asar.unpacked` contains:

- `dist-electron/native/bin/win32-x64/wgc-capture.exe`
- `dist-electron/native/bin/win32-x64/cursor-sampler.exe`

## Limits

This is package-content inspection only. It does not prove a real recording opens the editor, and it does not replace installed/portable Windows manual QA.
