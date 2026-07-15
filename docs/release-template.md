# RePen Release Template

Use this template for each GitHub release and website release note.

---

## Title

`RePen v1.0.0`

## Short Summary

Free Windows screen annotation and presentation overlay with improved drawing, presentation, and whiteboard workflows.

## What's New

- Added:
  - Example: improved spotlight controls
  - Example: better board navigation
- Improved:
  - Example: smoother highlighter rendering
  - Example: cleaner settings panel copy
- Fixed:
  - Example: overlay click-through edge cases
  - Example: export alignment issues

## Download

- Portable: `RePen 1.0.0.exe`
- Installer: `RePen Setup 1.0.0.exe`

Website:

- [https://rehmanahmad.pro/software/repen](https://rehmanahmad.pro/software/repen)

## Checksums

Attach a checksum file named like:

- `RePen-1.0.0-SHA256.txt`

Recommended format:

```text
<sha256>  RePen 1.0.0.exe
<sha256>  RePen Setup 1.0.0.exe
```

## Known Notes

- Windows SmartScreen may appear on first launch for unsigned builds.
- Recommend downloading only from the official website or GitHub releases page.

## Assets To Attach

- `RePen 1.0.0.exe`
- `RePen Setup 1.0.0.exe`
- `RePen-1.0.0-SHA256.txt`
- Hero screenshot
- Optional demo GIF

## Checksum Command

Run in PowerShell from the release folder:

```powershell
Get-FileHash ".\RePen 1.0.0.exe" -Algorithm SHA256
Get-FileHash ".\RePen Setup 1.0.0.exe" -Algorithm SHA256
```

## Final Pre-Publish Checklist

- `npm test` passed
- Installer build created
- Portable build created
- Checksums generated
- README links verified
- Website download link updated
- GitHub release notes filled
