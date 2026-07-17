# RePen OpenScreen Corrective Baseline

This is an implementation baseline, not a parity claim. “Real and verified” means the production path has automated evidence and does not require unperformed screen, camera, or audio hardware QA. No recorder feature has passed the manual capture-exclusion gate yet.

## Environment

- Branch and baseline commit: `main` at `fe9e992`.
- Worktree at baseline: dirty (9 paths); existing user and earlier-agent changes were preserved.
- Operating system: Windows 11, build 26200.
- Display scaling: 150% (DPI 144).
- Node.js: v24.16.0; npm: 11.13.0; Electron: v42.5.0.
- Native helper candidates present: `third_party/openscreen/wgc-capture/build/wgc-capture.exe` and `dist-electron/native/bin/win32-x64/wgc-capture.exe`.

Presence of a helper file is not evidence that a system can record. The production `app:get-capabilities` handler runs the native probe and fails closed when it cannot verify a capability.

## Feature and control inventory

| Area | Feature | Current status | Evidence or limitation |
| --- | --- | --- | --- |
| Recorder setup | Screen/window picker, output destination, and recording options | Real but unverified | Selector unit coverage exists; native recording and capture content require manual QA. |
| Recorder setup | System audio, microphone, webcam | Capability-gated | Exposed only after the native helper reports the specific device capability. |
| Recorder setup | Start/stop/finalization | Real but unverified | Production native protocol exists; short/long recording and recovery gates are Phase 2. |
| Presenter | Pens, highlighter, spotlight, magnifier, and boards | Real but unverified | Presenter unit coverage exists; their presence in recordings and interaction during recording require Phase 1 QA. |
| Editor | Project opening, save, undo/redo, basic layout/effect controls | Real but unverified | Unit/state coverage exists; production editor is still a foundation and has not passed full workflow QA. |
| Editor | Presentation-track replay | Capability-gated | The production editor does not yet replay the presentation sidecar deterministically. |
| Editor | Caption split/merge controls | Real but unverified | Timeline-editing controls exist, but automatic captions are unavailable. |
| Editor | Offline transcription | Capability-gated | No approved local engine or model is bundled. |
| Editor | MP4/GIF export | Capability-gated | Direct export IPC and editor controls are disabled until the licensed compositor/export pipeline is packaged and verified. |
| Editor | Diagnostics export and settings reset | Real but unverified | Production IPC exists; redaction and user-facing QA remain required. |

## Dual implementation audit

- `main.js` is the authoritative entry point for `npm start` and `package.json.main`.
- `electron/main.ts` builds the modular shell used by `npm run start:new`; it is not the shipped `npm start` path.
- The two entry points share the same user-facing capability mapping through `src/shared/recording/appCapabilities.js`.
- They are not otherwise fully aligned: recording/editor/export orchestration in the modular shell is a separate implementation and must not be used as evidence for `main.js` behavior.

## Release blockers

1. RePen toolbar, HUD, and other control windows can appear in captured media. Phase 1 must introduce role-based capture policy and inspect actual captured frames.
2. Recording state/finalization/recovery requires the Phase 2 transition and hardware test matrix.
3. Project media validation and editor boot require the Phase 3 package/build matrix.
4. Presentation replay, captions, and composited MP4/GIF export are capability-gated; no feature is represented as complete while its engine, license, or verification is missing.

## Baseline verification

On 2026-07-17, `npm test` completed with 24 test files and 86 tests passing, and `npm run build:all` completed successfully. Those checks prove compilation and existing automated behavior only; they do not satisfy any manual capture, audio, camera, export, or release gate.
