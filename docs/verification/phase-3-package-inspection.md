# Phase 3 Package Inspection

Date: 2026-07-17

## Package assembly command

```powershell
npm run dist
```

Result: passed on 2026-07-17. The native helper build completed, then Electron Builder created both the unpacked Windows app and these local artifacts:

- `RePen 1.0.0.exe` (portable)
- `RePen Setup 1.0.0.exe` (NSIS installer)

SHA-256 values from that local build:

```text
3047632306DD043115F573F409204DE819E107DACDAF15F3A02E214D42FD99CE  RePen 1.0.0.exe
7316C8F560B02A8FF1D0611B11375D91B496377314CAD0A1DD9A8A806624BB5F  RePen Setup 1.0.0.exe
```

## Inspected package contents

`app.asar` contains:

- `main.js`
- `dist-renderer/editor.html`
- `dist-electron/services/presentationTrack.js`
- `src/preload.js`
- `src/shared/editor/projectFactory.js`
- `src/shared/editor/mediaValidation.js`
- `src/shared/recording/capturePolicy.js`

`app.asar.unpacked` contains:

- `dist-electron/native/bin/win32-x64/wgc-capture.exe`
- `dist-electron/native/bin/win32-x64/cursor-sampler.exe`

## Limits

This is package assembly and content inspection only. The local artifacts are **not signed** according to `Get-AuthenticodeSignature`. This does not prove a real recording opens the editor, and it does not replace installed/portable Windows manual QA, certificate/timestamp validation, or release checksum generation from final signed artifacts.
