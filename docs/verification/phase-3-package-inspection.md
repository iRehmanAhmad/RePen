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
1C09B7634ED63AD6A26668EA299E2796F49963CF240025D77CF5F7BF7F9F5423  RePen 1.0.0.exe
71E090EDD12BF7A65CCE1F88E8CAD3B730ED018441152C7755B1818F98A28D94  RePen Setup 1.0.0.exe
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
