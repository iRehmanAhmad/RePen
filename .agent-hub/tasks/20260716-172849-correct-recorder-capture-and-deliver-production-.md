# Correct Recorder Capture and Deliver the Production OpenScreen-Style Editor

Task ID: `20260716-172849-correct-recorder-capture-and-deliver-production-`

## Goal

Eliminate RePen control-window contamination from recordings and replace the current basic editor shell with a verified, non-destructive, Windows-first recorder/editor workflow. The result must integrate selected OpenScreen concepts into RePen without claiming features that exist only as controls, mock data, unexecuted code, or unverified prototypes.

## Current Phase

`implementation`

## Owners

- Planner: `codex`
- Implementer: `antigravity`
- Reviewer and gate owner: `codex`
- Manual hardware verifier: `user`, only for explicitly requested screen/audio/camera tests

## Why This Corrective Plan Exists

The previous nine-phase completion claim did not satisfy its gates. Live use exposed failures in countdown/start transitions, toolbar state rendering, stop-to-editor handoff, finalization timeouts, development module paths, and raw TSX loading. The editor now opens, but it is a foundation shell. The latest recording visibly contains the RePen toolbar and recording HUD, proving that capture-exclusion requirements have not passed.

This task supersedes completion claims from the earlier plan. Earlier code may be reused, but earlier checkmarks and handoff messages are not evidence for this task.

## Non-Negotiable Operating Rules

1. Antigravity implements exactly one phase at a time.
2. Before editing a phase, Antigravity records an Agent Hub `implementation` note naming the files it intends to own.
3. After implementation, Antigravity records changed files, deviations, commands run, results, and remaining risks.
4. Codex reviews the phase. Only Codex may record that its exit gate passed.
5. A later phase does not begin until the prior phase passes or the brief explicitly records an approved exception.
6. A checkbox is not completion evidence. Every checked item must point to a test, screenshot, artifact inspection, or manual QA result.
7. `main.js` is the current production entry point used by `npm start` and `package.json.main`. A change made only in `electron/main.ts` does not change the shipped application.
8. When a contract exists in both `main.js` and `electron/main.ts`, either keep both aligned or record why the modular shell remains capability-gated. Do not silently switch entry points.
9. No canned captions, simulated exports, fabricated hardware results, placeholder success responses, or tests that merely reproduce logic inside the test.
10. Do not bundle FFmpeg, a speech model, or other licensed binary/model until its license, source, version, size, update policy, and notices are approved and recorded.
11. Do not capture the user's microphone, webcam, or screen during automated runs. Hardware QA requires a scoped user-approved test.
12. Do not commit recordings, thumbnails containing private desktop content, diagnostic logs with unredacted paths, or model files.
13. Preserve unrelated user changes and never reset the worktree to make a phase easier.
14. Run `git diff --check` before every handoff.
15. If a phase exposes a critical defect in an earlier gate, stop and return to that earlier phase.

## Required Context Before Phase 0

Antigravity must read these files before making changes:

- `AGENTS.md`
- `.agent-hub/protocol.md`
- This task brief in full
- `docs/technical-architecture.md`
- `docs/qa-checklist.md`
- `package.json`
- `main.js`
- `src/preload.js`
- `electron/services/recorder.ts`
- `electron/services/presentationTrack.ts`
- `src/renderer/selector.js`
- `src/renderer/toolbar.js`
- `src/renderer/editor.tsx`
- `src/shared/editor/projectPersistence.ts`
- `src/shared/editor/projectFactory.js`
- Relevant tests under `tests/unit/`

The context-read note must state that `npm start` runs `main.js` and that the editor loads the Vite output from `dist-renderer/editor.html`.

## Definition of the Target Product

RePen remains the application, toolbar, annotation system, project owner, and user-facing brand. OpenScreen is a pinned, attributed source of selected recording/editor ideas and code. This task does not launch OpenScreen as a second application, replace RePen's presenter interface, or merge unrelated repository history.

The completed Windows workflow is:

1. Press Record in RePen.
2. Select a valid display/window, audio devices, webcam, cursor behavior, quality, countdown, and destination.
3. Record while RePen annotations and presenter effects remain usable.
4. Keep RePen control surfaces out of captured media.
5. Pause, resume, discard, or stop without stale windows or orphan helpers.
6. Finalize media without data loss.
7. Create a versioned `.repen-project` and open it in the editor.
8. Preview raw media plus RePen presentation data with deterministic layer order.
9. Edit non-destructively.
10. Generate captions locally when the optional transcription capability is installed.
11. Export MP4/GIF only through a packaged and licensed export capability.
12. Reopen the project and obtain the same preview/export result.

## Capture Policy Decision

The application must distinguish control UI from presentation content.

### Always excluded from capture

- Toolbar and recording HUD
- Recorder selector/setup
- Countdown
- Settings and dialogs
- Editor
- Diagnostic and recovery windows
- Webcam preview controls

### Presentation content

- Pen/highlighter/shapes/text/laser/spotlight/board content is presentation content, not control UI.
- During the corrective alpha, display capture may use `baked` presentation mode: presentation content is visible in raw display media, while controls remain excluded.
- Selected-window capture must use `sidecar` presentation mode because RePen overlay content is normally outside the selected application window.
- Every recording project must record `presentationMode: "baked" | "sidecar"` so preview/export never renders annotations twice.
- Clean-raw display capture may become the default only after presentation-track preview and export pass Phase 6 golden tests.

This policy prevents the current toolbar/HUD contamination without temporarily making annotations disappear from ordinary display recordings.

## Global Architecture Decisions

### Authoritative process boundaries

- `main.js`: shipped Electron window lifecycle and IPC orchestration.
- `electron/services/recorder.ts`: native helper protocol, validation, diagnostics, finalization, recovery.
- `electron/services/presentationTrack.ts`: timestamped RePen presentation sidecar.
- Renderer pages: UI only; never trust renderer paths, sources, device IDs, or phase transitions.
- Shared editor modules: typed project, timeline, geometry, and compositor logic.

### Authoritative state

- Main process owns recording phase, session ID, selected source identity, output paths, helper ownership, and expected prior phase.
- Renderer mirrors state through events and may request transitions; it does not invent success.
- Editor owns project-local undo/redo transactions and dirty state.
- Source media is immutable after successful finalization.

### Required recording phases

`idle`, `selecting`, `countdown`, `starting`, `recording`, `paused`, `finalizing`, `completed`, `failed`, and `recovering`.

Every command must eventually include:

- `sessionId`
- `commandId`
- `expectedPhase`
- validated payload

Duplicate or stale commands must return an explicit, non-destructive error.

### Required compositor order

1. Background/wallpaper
2. Framed and cropped screen/window media
3. Webcam media
4. Zoom/focus/layout transforms
5. Imported editor annotations and redaction
6. RePen presentation sidecar when `presentationMode === "sidecar"`
7. Cursor and click effects
8. Captions
9. Safe-area/debug overlays in preview only, never export

Preview and export must use the same geometry functions and layer-order definition.

## Phase 0 — Baseline, Feature Inventory, and Truthful Gates

### Objective

Create a trustworthy baseline before further feature work and remove tests/documentation that falsely imply parity.

### Implementation tasks

- [x] Record current branch, commit, dirty files, Node/npm/Electron versions, Windows version, display scaling, and native helper paths.
- [x] Create `docs/verification/openscreen-corrective-baseline.md` without private desktop paths or content.
- [x] Inventory every recorder/editor control and map it to one of: real and verified, real but unverified, capability-gated, placeholder, or dead code.
- [x] Inventory dual implementations in `main.js` and `electron/main.ts`.
- [x] Identify unused modules and prototype-only code; do not delete them in this phase unless deletion is necessary to prevent execution.
- [x] Add a machine-readable feature-capability object returned by main, including recorder, selected-window, system audio, microphone, webcam, presentation replay, captions, MP4 export, and GIF export.
- [x] Make the editor hide or disable unavailable features with a reason. A visible enabled button is a product promise.
- [x] Review existing tests for locally fabricated implementations. Replace misleading tests with assertions against production modules or mark the feature gate open.
- [x] Add a release-blocker list to the verification report.

### Expected files

- `.agent-hub/tasks/<this-task>.md`
- `.agent-hub/messages.jsonl`
- `docs/verification/openscreen-corrective-baseline.md`
- `main.js`
- `src/preload.js`
- `src/renderer/editor.tsx`
- `tests/unit/phaseCompletionAudit.test.ts`
- Any test whose name currently overstates completion

### Automated verification

- `npm test`
- `npm run build:all`
- `git diff --check`
- Capability tests proving unavailable features cannot return success
- Static assertion that `package.json.main` and `npm start` use the reviewed entry point

### Exit gate

- A single table accurately describes what works now.
- No enabled UI control points to a mock or unreachable implementation.
- Baseline commands pass.
- Codex signs off before Phase 1.

## Phase 1 — Capture Exclusion and Source-Content Correctness

### Objective

Ensure control UI never appears in recorded media while presentation content follows the explicit baked/sidecar policy.

### Implementation tasks

- [ ] Create one central capture-policy module rather than scattered `setContentProtection` calls.
- [ ] Register every RePen window by role: overlay, toolbar, selector, countdown, settings, editor, dialog helper, recovery, webcam preview.
- [ ] Apply Windows capture exclusion to every control role before the window can become visible.
- [ ] Reapply capture policy after window recreation, display topology changes, renderer reload, and editor open/close.
- [ ] Verify exclusion on both development and packaged helpers; do not assume Electron behavior matches native WGC behavior.
- [ ] Add `presentationMode` to recording options, session manifest, presentation-track header, and `.repen-project` media metadata.
- [ ] For display+baked mode, keep only presentation overlay content visible to capture; exclude toolbar/HUD and every non-presentation window.
- [ ] For selected-window+sidecar mode, confirm raw selected-window media contains neither controls nor overlay; preview later replays the sidecar.
- [ ] Prevent the recording source picker from selecting RePen control windows.
- [ ] Ensure source thumbnails do not expose selector/countdown/editor windows.
- [ ] Keep the toolbar clickable and visible locally while excluded from capture.
- [ ] Add a visible diagnostic capture-policy status available only in diagnostics, not in recordings.

### Required tests

- Unit tests for role-to-policy mapping.
- Window construction tests that every control window receives protection before `show()`.
- Source-filter tests excluding RePen-owned windows.
- Project/schema migration tests for `presentationMode`.
- Packaged inspection proving the capture-policy code and native helper are present.

### Required manual QA

With explicit user approval, make a short synthetic test recording containing a non-private test pattern:

1. Display+baked: draw one stroke; move/hover toolbar; use HUD; verify stroke appears and toolbar/HUD do not.
2. Selected-window+sidecar: record a test window; draw one stroke; verify raw selected-window media has no RePen UI.
3. Open selector, countdown, settings, and a dialog during permitted scenarios; verify none appear in output.
4. Repeat at 100% and 150% scaling.

Record sanitized screenshots or frame hashes in `docs/verification/phase-1-capture-exclusion.md`.

### Exit gate

- Zero RePen control pixels appear in reference recordings.
- Intended presentation content appears exactly once according to mode.
- Toolbar remains visible and clickable locally.
- Codex reviews actual captured frames, not only window flags.

## Phase 2 — Recorder State Machine, Finalization, and Recovery

### Objective

Make recorder transitions deterministic and safe for short and long recordings.

### Implementation tasks

- [ ] Create one explicit transition table and transition function in production code.
- [ ] Add session and command identity to start, pause, resume, stop, discard, and restart.
- [ ] Reject double-clicks, stale renderers, commands for old sessions, and overlapping helpers.
- [ ] Move countdown scheduling to main or a dedicated service; do not let a hidden selector own a critical timer.
- [ ] Define countdown cancellation and source-disappearance behavior.
- [ ] Make `starting` cancellable without corrupting the helper protocol.
- [ ] Keep HUD state derived exclusively from authoritative recording state.
- [ ] Show `finalizing` with progress: file growth, elapsed finalization time, and a non-destructive message.
- [ ] Retain the current 30-second inactivity timeout with a hard bound, but add tests against timeout shortening.
- [ ] On finalization failure, distinguish valid completed media, recoverable interrupted media, and invalid output.
- [ ] Never present an interrupted file as completed without container validation.
- [ ] Persist session manifest atomically and update it through recording/finalizing/interrupted/completed states.
- [ ] On startup, scan manifests and offer Recover, Reveal, or Discard.
- [ ] Ensure quit during selecting/countdown/starting/recording/paused/finalizing awaits bounded cleanup.
- [ ] Ensure helper crash restores exact presenter state and preserves recoverable output.
- [ ] Add recent recordings with Open in Editor and Reveal in Explorer.

### Required tests

- Transition-table tests for every valid and invalid edge.
- Duplicate-command and stale-session tests.
- Countdown close/start regression.
- Helper start error with selector restoration.
- Pause/resume/stop/discard idempotency.
- Finalization progress for growing and stalled files using fake time/files.
- Shutdown tests for every phase.
- Recovery-manifest tests including malformed and non-ASCII paths.
- Native protocol tests requiring structured completion markers and matching output paths.

### Required manual QA

- Short recording under 10 seconds.
- Recording longer than 5 minutes.
- Pause/resume multiple times.
- Stop while audio/webcam are disabled, then with each enabled after approval.
- Close source window, quit app, and simulate helper failure.
- Verify no orphan `wgc-capture.exe` remains.

### Exit gate

- No critical start/stop/discard/close defect remains.
- Long finalization completes or produces an explicit recoverable state.
- Repeated commands cannot create overlapping helpers.
- Recovery evidence is recorded.

## Phase 3 — Project Creation, Media Validation, and Editor Boot Reliability

### Objective

Guarantee every successfully finalized recording opens as a valid, non-destructive project in development and packaged builds.

### Implementation tasks

- [ ] Consolidate `projectFactory.js` and TypeScript project normalization so their defaults cannot silently diverge.
- [ ] Prefer a generated/shared schema artifact over handwritten duplication; if duplication remains, add parity tests for every default field.
- [ ] Write `.repen-project` atomically next to the recording or in an explicitly selected project location.
- [ ] Include schema version, media paths, duration, presentation mode, presentation sidecar, optional webcam media, source metadata, and timing origin.
- [ ] Store relative media paths when project and media share a stable root; otherwise store normalized absolute paths.
- [ ] Validate media existence, non-zero size, readable container metadata, and duration before editor launch.
- [ ] Add missing-media state with Relink, Reveal, and Remove actions.
- [ ] Make editor load errors visible inside the editor, not only the terminal.
- [ ] Keep `npm start` building the Vite editor and verify a clean checkout has no stale dependency on old `dist-renderer` content.
- [ ] Verify packaged ASAR paths for editor HTML, hashed assets, preload, project factory, and native helpers.
- [ ] Ensure opening an editor hides presenter control windows without changing persisted overlay settings, then restores exact visibility on close.
- [ ] Define editor-close behavior for dirty projects.

### Required tests

- Project factory/TypeScript normalization parity.
- Atomic write interruption.
- Relative/absolute path normalization and non-ASCII paths.
- Missing-media and relink tests.
- Fresh-build editor asset test that parses hashed references and asserts files exist.
- Electron test that Stop opens a non-white editor with project title and video metadata.
- Existing-editor test loading a second recording through the preload bridge.

### Exit gate

- `npm start`, unpacked package, NSIS install, and portable build all open the same project correctly.
- No white editor, native menu leakage, raw TSX loading, or missing runtime module occurs.
- Original MP4 remains unchanged.

## Phase 4 — Production Playback and Timeline Foundation

### Objective

Replace the basic preview shell with a usable, testable editing workspace.

### Implementation tasks

- [ ] Break `editor.tsx` into domains/components: project shell, media player, timeline, inspector, command registry, dialogs, and status/error surfaces.
- [ ] Keep domain state in typed reducers/stores; do not add more unrelated mutable state to the monolith.
- [ ] Implement video play/pause, seek, frame step, volume, mute, playback rate, and current/duration display.
- [ ] Implement a time ruler, playhead, horizontal scroll, zoom-to-fit, adjustable timeline zoom, and keyboard navigation.
- [ ] Add screen, webcam, presentation, effects, captions, and audio track rows with visibility/lock state.
- [ ] Generate or lazily cache a bounded waveform without loading an entire long recording into memory.
- [ ] Add trim-in/out handles, split-at-playhead, delete/ripple policy, snapping, and undoable transactions.
- [ ] Define behavior for overlapping trims and speed regions.
- [ ] Save and reopen all timeline edits.
- [ ] Add autosave/recovery snapshots with a bounded retention policy.
- [ ] Add visible save state, dirty indicator, save errors, and unsaved-close choices.
- [ ] Keep playback responsive for a 30-minute test file.

### Required shortcuts

- Space: play/pause
- Left/Right: small seek
- Shift+Left/Right: frame step
- Home/End: timeline bounds
- Ctrl+S: save
- Ctrl+Z/Ctrl+Y: undo/redo
- Delete: remove selected timeline item after focus-safe handling

### Required tests

- Reducer and undo/redo tests for every timeline command.
- Time conversion, snapping, trim, split, and speed tests.
- Playback coordinator tests after seeks and rate changes.
- Autosave recovery and dirty-close tests.
- Long-media bounded-memory test or documented benchmark harness.
- Accessibility tests for keyboard focus and labels.

### Exit gate

- A user can play, seek, frame-step, trim, split, undo, save, close, and reopen.
- Timeline state is deterministic and project-backed.
- No feature in this phase depends on export being available.

## Phase 5 — Shared Layout and Visual Compositor

### Objective

Build one geometry/compositing model used by preview and later export.

### Implementation tasks

- [ ] Define typed scene inputs and outputs independent of React.
- [ ] Implement aspect ratios: source, 16:9, 9:16, 1:1, 4:3, and 21:9.
- [ ] Implement crop with clamped normalized coordinates.
- [ ] Implement output resolution, source padding, border radius, shadow, and safe area.
- [ ] Implement solid, gradient, bundled wallpaper, and custom-image backgrounds.
- [ ] Define color management and alpha behavior.
- [ ] Ensure transformations are DPI-independent and stable across odd dimensions.
- [ ] Render with a shared compositor API; React preview must not duplicate geometry formulas.
- [ ] Persist every property and support undo/redo.
- [ ] Add preview quality modes without changing final geometry.
- [ ] Ensure control/safe-area overlays cannot appear in export frames.

### Required tests

- Pure geometry tests for every aspect ratio and crop edge.
- Mixed-DPI coordinate tests.
- Golden PNG frames for representative layouts.
- Save/reopen parity for all settings.
- Preview reference-frame comparison at fixed timestamps.

### Exit gate

- Every layout control visibly changes the preview, persists, and matches golden frames.
- No decorative control remains disconnected from production state.

## Phase 6 — Presentation Replay, Cursor, Zoom, Webcam, and Annotations

### Objective

Deliver the core OpenScreen-style visual editing features with explicit timing and deterministic layer order.

### Presentation sidecar

- [ ] Validate schema/version/timing origin on load.
- [ ] Replay pen, highlighter, shapes, text, board changes, laser, and spotlight at arbitrary seeks.
- [ ] Handle pause/resume regions and checkpoint seeking.
- [ ] Render sidecar only when `presentationMode === "sidecar"`.
- [ ] Provide a diagnostic warning if a sidecar is missing or incompatible.

### Cursor and clicks

- [ ] Load cursor telemetry and map through crop/layout transforms.
- [ ] Implement theme, size, smoothing, visibility regions, editable path, clipping, motion blur, and click visualization.
- [ ] Define interpolation across pauses and cuts.

### Zoom and focus

- [ ] Manual zoom regions with time, depth/scale, focus point, easing, and overlap rules.
- [ ] Cursor-follow and auto-focus with bounds clamping.
- [ ] Automatic zoom suggestions must be reviewable and never silently inserted.
- [ ] Reduced-motion preview option.

### Webcam

- [ ] Synchronize webcam timing to the same recording clock.
- [ ] Position, size, crop, mirror, masks, border, shadow, and visibility regions.
- [ ] Support no-webcam, PiP, vertical stack, and dual-frame layouts.
- [ ] Show a clear missing-webcam-media state.

### Editor annotations

- [ ] Timed text, image, figure/arrow, highlight, blur, and mosaic/redaction.
- [ ] Editable start/end, position, size, style, animation, and z-order.
- [ ] Redaction must affect exported pixels, not only preview CSS.

### Required tests

- Presentation replay tests at exact timestamps and after random seeks.
- Baked-mode no-double-render assertion.
- Cursor/zoom/crop coordinate tests.
- Webcam timing and layout golden frames.
- Annotation reducer/history and layer-order tests.
- Packaged playback test using synthetic fixtures.

### Exit gate

- Every exposed effect changes preview, survives save/reopen, supports undo/redo, and matches golden frames.
- Sidecar content is synchronized and never duplicated.

## Phase 7 — Offline Captions as an Optional Capability

### Objective

Implement real local transcription without network behavior or fake captions.

### Product decision gate

Before code changes, record:

- Selected engine and exact version
- Model(s), languages, license, download source, checksum
- Bundled versus optional-download decision
- Installer/download size
- Minimum RAM/CPU expectations
- Offline and update behavior
- Uninstall/cache cleanup behavior

Without this decision, captions remain disabled with an honest reason.

### Implementation tasks

- [ ] Extract/resample voice audio to mono 16 kHz in an isolated process.
- [ ] Detect no-audio and leading silence.
- [ ] Run transcription outside the editor renderer.
- [ ] Implement progress, cancel, retry, model missing, unsupported language, and out-of-memory states.
- [ ] Convert real segments to editable caption timeline items.
- [ ] Edit text, split/merge, retime, style, position, and line wrapping.
- [ ] Persist captions and render through the shared compositor.
- [ ] Verify network-disabled operation after assets are installed.
- [ ] Do not retain extracted audio outside explicit project/cache policy.

### Required tests

- Deterministic short fixture transcription with the real engine.
- No-audio, cancel, missing-model, and worker-crash tests.
- Caption split/merge/retime history tests.
- Line-wrap golden frames.
- Network-disabled packaged test.

### Exit gate

- A real supported recording produces editable timed captions offline.
- There are no canned strings or simulated segments.
- Preview timing passes reference frames.

## Phase 8 — Licensed MP4/GIF Export and Preview Parity

### Objective

Export the complete compositor safely and reproducibly.

### Product decision gate

Record the exact export engine build, codecs, license configuration, source URL, checksum, notices, redistribution policy, and update process. If FFmpeg is selected, document LGPL/GPL implications of the chosen build. Export remains disabled until the executable is packaged and verified.

### Implementation tasks

- [ ] Resolve only the packaged executable or an explicitly configured absolute development path.
- [ ] Never invoke export with `shell: true` or a command string.
- [ ] Generate argv from validated typed options.
- [ ] Use a streaming/bounded pipeline; never hold the full video in memory.
- [ ] Apply trims, splits, speed changes, audio timing, and the Phase 5/6 compositor.
- [ ] Export MP4 with supported H.264/AAC presets.
- [ ] Export GIF with size, FPS, quality, palette, and loop settings.
- [ ] Implement progress, ETA, cancel, retry, collision handling, and partial-output cleanup.
- [ ] Preserve project/source media on every failure.
- [ ] Use temporary output plus atomic completion rename.
- [ ] Detect unsupported hardware paths and use a documented supported fallback or explicit error.
- [ ] Include required notices in installed and portable artifacts.

### Required validation

- Decode every exported fixture and assert streams, codecs, dimensions, duration, and frame count tolerance.
- Compare exported golden frames to preview golden frames.
- Check A/V sync after trim, speed, pause, and a 10-minute export.
- Check MP4 and GIF cancellation leaves no misleading completed file.
- Measure 1080p and one 4K export for memory and throughput.
- Validate paths with spaces, Unicode, and shell metacharacters.

### Exit gate

- MP4 and GIF reproduce preview geometry/timing for every supported layer.
- Export does not use a shell.
- Package contains the approved executable and notices.
- Long export remains within documented limits.

## Phase 9 — Product UX, Accessibility, Diagnostics, and Windows Release Gate

### Objective

Turn the integrated recorder/editor into a supportable RePen release.

### Implementation tasks

- [ ] Merge presenter, recorder, and editor command registries with conflict detection.
- [ ] Add keyboard focus order, visible focus, accessible names, and screen-reader announcements.
- [ ] Ensure state is never communicated by color alone.
- [ ] Add reduced-motion support.
- [ ] Add first-run guidance that distinguishes Present, Record, and Edit.
- [ ] Add contextual help and capability explanations.
- [ ] Add settings migration and Reset to Defaults for every new setting.
- [ ] Add localization architecture; do not claim locale support without RePen-specific string coverage.
- [ ] Test RTL, CJK fallback, long labels, and scaling.
- [ ] Keep diagnostics local, bounded, redacted, and user-exported only.
- [ ] Document privacy, offline behavior, optional model assets, export engine, recovery, known limitations, and OpenScreen attribution.
- [ ] Add CI gates for tests, builds, native helper, packaging inspection, project migrations, golden frames, and export validation.
- [ ] Produce signed NSIS and portable artifacts, checksums, SBOM, notices, and release notes.
- [ ] Do not add auto-update until signing, rollback, and staged rollout are designed.

### Windows matrix

- Windows 10 and Windows 11
- 100%, 125%, 150%, and 200% scaling
- Single and multiple monitors
- Mixed DPI
- 1080p, 1440p, and one 4K case
- Display and selected-window capture
- System audio, microphone, webcam, and no-device systems
- Sleep/wake, lock/unlock, monitor hot-plug, source crash
- Unicode/long paths, low disk, read-only paths, interrupted finalization
- Installed and portable builds

### Rollout gate

1. Internal dogfood
2. Opt-in alpha
3. Beta after project/export compatibility stabilizes
4. Stable only with zero critical capture, data-loss, security, export, A/V sync, or toolbar/input defects

### Exit gate

- Release checklist and platform matrix pass with evidence.
- Installer and portable builds contain all required assets/notices.
- No critical open defect remains.
- Codex records the stable-release decision; passing unit tests alone cannot do so.

## Cross-Phase Test and Evidence Policy

Every phase handoff must include:

- Exact files changed
- Exact commands run and exit codes
- Test counts
- Build/package result
- Manual cases run and environment
- Screenshots/frame hashes where visual behavior matters
- Known failures and skipped cases
- Whether source media and user settings were preserved
- Updated feature-capability table

Minimum commands unless the phase explains why one is irrelevant:

```powershell
npm test
npm run build:all
npx --no-install electron-builder --win --dir
git diff --check
```

When native C++ changes:

```powershell
npm run native:build
```

When packaging/licensing changes, inspect `app.asar`, `app.asar.unpacked`, resources, notices, executable hashes, and both NSIS/portable artifacts.

## Forbidden Completion Shortcuts

The following do not satisfy any phase:

- TypeScript compilation without runtime tests
- A button or tab that is not wired to production behavior
- A unit test that declares its own fake implementation and tests that fake
- A hard-coded transcript
- Returning success without executing the capability
- Generating an FFmpeg command without executing and validating output
- Setting `setContentProtection(true)` without inspecting captured frames
- Testing only `electron/main.ts` while shipping `main.js`
- Testing only `npm start` while packaging different assets
- Testing only a short recording for a long-finalization requirement
- Checking in a screenshot of private desktop content as evidence

## Final Acceptance Checklist

- [ ] Control windows never appear in capture.
- [ ] Presentation content follows baked/sidecar policy and appears exactly once.
- [ ] Source selection and device options are validated in main.
- [ ] State machine rejects stale and duplicate commands.
- [ ] Short and long recordings finalize safely.
- [ ] Interrupted sessions are recoverable or explicitly discardable.
- [ ] Stop creates a valid project and opens a non-white editor in development and packages.
- [ ] Timeline playback, seek, trim, split, save, reopen, and autosave recovery work.
- [ ] Layout and effects share preview/export geometry.
- [ ] Presentation track, cursor, zoom, webcam, annotations, and captions are synchronized.
- [ ] Captions are real, offline, optional, and licensed.
- [ ] MP4/GIF exports are real, licensed, validated, and shell-free.
- [ ] Keyboard/accessibility/localization gates pass.
- [ ] Windows/platform/package matrices pass.
- [ ] OpenScreen attribution and all third-party notices are present.
- [ ] No critical capture, data-loss, security, export, A/V sync, or toolbar/input defect remains.

## Immediate Next Action

Antigravity begins only Phase 0. It must first record a context-read and file-ownership note. It must not change capture behavior, redesign the editor, add captions, or add an export binary during Phase 0. Codex reviews the baseline and truthful capability table before authorizing Phase 1.

## Verification of This Plan

Planning only. Codex inspected the production entry point, recorder/editor files, current tests, technical architecture, QA checklist, and the user's latest captured editor frame. No product code is authorized by the creation of this brief itself.

## Handoff Notes

- Antigravity owns implementation after explicit phase authorization.
- Codex owns phase review and gate decisions.
- The user will be needed for short sanitized screen-capture checks and later microphone/webcam/A/V tests.
- The previous broad phase claims are historical context, not accepted evidence.
