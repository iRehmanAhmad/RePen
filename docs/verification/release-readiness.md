# RePen Release-Readiness Gates

Updated: 2026-07-17. This report is a release gate, not a release approval. It separates automated evidence from checks that require a real Windows display, audio device, camera, packaging environment, or signing credential.

## Automated evidence available in this branch

The following is covered by production-module tests and build checks:

| Area | Evidence | Scope and limit |
| --- | --- | --- |
| Recording state and capture policy | Unit coverage for phase transitions, capture roles, source filtering, session recovery, and capability gates | It cannot prove that Windows excludes a window from an actual captured frame. |
| Project safety | Schema normalization, default parity, atomic save, source-media validation, and recovery snapshot coverage | It does not prove that a recording can be finalized by every supported native helper. |
| Editor preview | Timeline math, cut ranges, crop geometry, media synchronization, webcam preview, track visibility, and sidecar-mode handling | It does not prove preview/export pixel parity or long-media performance. |
| Editor resilience | Missing-media recovery, sidecar load error display, bounded draft recovery, save/close behavior, focus styling, and reduced-motion support | It does not replace keyboard, screen-reader, or visual QA. |
| Build integrity | `npm test`, `npm run build:all`, and `git diff --check` | A successful build is not an installer, signing, or hardware test. |

## Capability-bound features

The product must keep these features disabled or unavailable until their prerequisites are present and verified:

| Feature | Current product position | Release requirement |
| --- | --- | --- |
| Audio waveform generation | Unavailable without an approved local audio decoder | Approve and bundle a decoder, record its license/notices, then test representative audio formats. |
| Offline captions | Unavailable without an approved local transcription engine and model | Approve source, license, size, update policy, and privacy behavior; test locally with a known fixture. |
| MP4/GIF composited export | Capability-gated | Package a licensed export/compositor path and prove its output uses the same layer order and geometry as preview. |
| Webcam/system audio/microphone capture | Dependent on the native helper capability probe | Test each enabled device path on Windows; an unavailable probe must never report success. |

## Required manual Windows QA before a release

Run these checks using a non-private test desktop and retain only sanitized notes, screenshots, or frame hashes.

1. At 100% and 150% display scaling, record display/baked mode while drawing, hovering the toolbar, and using the recording HUD. Verify the stroke is present and no RePen control window appears in the raw video.
2. Record selected-window/sidecar mode while drawing. Verify the raw selected-window media contains no RePen window, then verify the sidecar renders once in the editor.
3. Exercise countdown, start, pause, resume, stop, discard, and close. Confirm each command returns to a valid state with no orphan window, duplicate finalization, or stale timer.
4. Finalize short and longer recordings, reopen the resulting project, and verify the immutable source media, project metadata, recovery behavior, trim/crop changes, and save/reopen flow.
5. Where the capability probe enables them, test system audio, microphone, webcam, cursor/click effects, and source selection. Check synchronization after pause/resume.
6. Keyboard-test editor focus order, visible focus, Escape/close behavior, and reduced-motion preference. Perform screen-reader review before declaring accessibility support.
7. Package the app, install it on a clean Windows account or VM, and repeat the basic recording/editor smoke test. Confirm no development-only module path is required.

## Packaging and publication gates

Do not publish a release until all applicable items are complete:

- Installer and portable artifacts build from the reviewed commit.
- Application version, package metadata, notices, and third-party binary/model licenses are checked.
- Code-signing certificate, timestamping, SmartScreen behavior, and update policy are validated where signing is intended.
- SHA-256 checksums are generated from the final artifacts and added to the release notes.
- Diagnostic logs and packaged configuration are inspected for private paths, recordings, thumbnails, device identifiers, or secrets.
- The manual Windows QA above is recorded as passed, failed, or explicitly excluded for capability-gated features.

Local package assembly passed on 2026-07-17 and is recorded in `phase-3-package-inspection.md`. Those local artifacts were unsigned and are not release candidates; rebuild and checksum the final signed artifacts before publication.

## Continuous integration

`.github/workflows/ci.yml` defines a Windows code/build verification job for pushes and pull requests. It installs the locked dependencies, runs `npm test`, and runs `npm run build:all`. The workflow intentionally does not create, sign, upload, or publish release artifacts. Its first remote execution must pass before it can be treated as CI evidence.

## Known open release blockers

1. Capture exclusion has automated policy coverage but still needs real captured-frame proof on the supported Windows configurations.
2. Native capture/finalization, audio, and camera behavior require manual hardware testing.
3. Advanced timeline edits, waveform generation, long-media performance, compositor parity, replay effects, captions, and production export are not complete release claims.
4. Localization, screen-reader validation, CI release packaging automation, code signing, and clean-machine installer validation remain open. The source/build CI workflow is configured but requires a successful remote run.

Until these items are closed with evidence, this branch is suitable for continued development and controlled manual QA only—not a production release.
