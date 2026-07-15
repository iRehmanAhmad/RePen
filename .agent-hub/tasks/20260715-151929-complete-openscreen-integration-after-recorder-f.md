# Complete OpenScreen integration after recorder foundation

Task ID: `20260715-151929-complete-openscreen-integration-after-recorder-f`

## Goal

Deliver the remaining OpenScreen-derived recording setup, hardware validation, editor, effects, captions, export, recovery, and release features in RePen through gated implementation phases.

## Current Phase

`plan`

## Owners

- Planner: `codex`
- Implementer: `antigravity`
- Reviewer: `codex`

## Scope Decision

RePen remains the product, presenter interface, and application owner. OpenScreen is used as a pinned, attributed source of recording/editor concepts and selected implementation modules. We will not launch OpenScreen as a second application, merge unrelated Git histories, or replace RePen's toolbar and annotation workflow with OpenScreen's UI wholesale.

This plan begins after the recorder-foundation corrective pass. It must not repeat completed foundation work unless verification exposes a regression.

## Completed Baseline

The following are treated as implemented inputs to this plan:

- Secure Electron windows, production asset loading, CSP, navigation restrictions, and capture protection.
- Packaged Windows Graphics Capture and cursor helpers derived from OpenScreen, with MIT notices.
- Structured native start, pause, resume, stop, and cancel protocol.
- Display recording foundation plus window-source contracts.
- System-audio, microphone, webcam, cursor, and capability-probe plumbing.
- Recorder crash handling, output validation, partial-file cleanup, and shutdown cleanup.
- Versioned presentation-track metadata, buffered persistence, checkpoints, replay, and DPI-aware coordinates.
- RePen toolbar Record button, elapsed-time HUD, pause, stop, and discard controls.
- Toolbar lifecycle correction keeping the full toolbar visible and recorder controls clickable.
- Windows packaging with native helpers unpacked outside ASAR.
- Current automated baseline: 14 Vitest files / 48 tests plus legacy verification scripts.
- Real display-only native smoke recording successfully starts, stops, and produces a non-empty MP4.

## Constraints

- Preserve unrelated user changes and the current working tree.
- Follow `AGENTS.md`, `.agent-hub/protocol.md`, `docs/technical-architecture.md`, and `docs/qa-checklist.md`.
- Antigravity implements each accepted phase; Codex reviews each gate before the next phase begins.
- Record phase starts, deviations, verification, and handoffs in `.agent-hub/messages.jsonl`.
- Do not claim all OpenScreen features until the final parity and release gates pass.
- Windows x64 is the first supported target. Other platforms are an explicitly optional program.
- Keep RePen usable for presenting while recording and editor work proceeds behind capability/feature boundaries.
- Never silently fall back from native Windows recording to browser `MediaRecorder` in production.
- Do not capture real microphone, webcam, or user screen content in automated agent runs without a scoped manual QA decision.
- Projects and recordings must remain local by default; no analytics, uploads, or model downloads without explicit product approval.

## Delivery Strategy

The remaining work is divided into nine required phases and one optional cross-platform phase. Each phase has an exit gate. A later phase may be prototyped in isolation, but it cannot be declared integrated until all preceding gates pass.

Recommended release slices:

1. Recorder Alpha: Phases 1–3.
2. Editor Alpha: Phases 4–5.
3. Complete Windows Beta: Phases 6–8.
4. Stable Windows Release: Phase 9.
5. Optional multi-platform program: Phase 10.

## Phase 1 — Recorder setup and source selection

Objective: replace hard-coded recording defaults with a complete, understandable recording setup flow.

### Implementation

- [ ] Add a RePen-branded recorder setup surface opened from the existing Record button.
- [ ] Enumerate displays with name, resolution, scale factor, primary status, and thumbnail.
- [ ] Enumerate capturable windows with application name, window title, HWND, bounds, and thumbnail.
- [ ] Refresh sources when displays/windows appear, disappear, move, resize, minimize, or close.
- [ ] Add system-audio toggle with capability state and explanatory unavailable reason.
- [ ] Enumerate microphone devices, choose default or explicit device, expose gain, and show a local level meter.
- [ ] Enumerate webcams and virtual cameras; show a local preview only after user selection.
- [ ] Add cursor mode, countdown, FPS, output resolution, and quality controls.
- [ ] Add destination-folder selection and available-disk-space indication.
- [ ] Persist safe recorder defaults without persisting transient HWNDs or invalid device identifiers.
- [ ] Validate all options in the main process again; renderer values are never trusted directly.
- [ ] Prevent starting when the source disappeared, output path is invalid, disk space is clearly insufficient, or required capability is unavailable.
- [ ] Provide explicit errors rather than silently changing the selected source or device.
- [ ] Keep setup, countdown, toolbar, HUD, dialogs, and webcam preview excluded from capture.

### Tests

- [ ] Unit tests for source normalization, stale-source rejection, option bounds, output-path validation, and default migration.
- [ ] Renderer tests for capability states, selection changes, disabled Start conditions, and error display.
- [ ] Electron tests for selector open/close, source refresh, countdown cancel, and capture exclusion flags.

### Exit gate

- A user can deliberately choose a display or window, audio inputs, webcam, cursor, resolution/FPS, countdown, and destination.
- Starting never depends on hard-coded `screen:primary:0` from the renderer.
- Disappearing sources and unavailable devices produce actionable errors without corrupting recorder state.

## Phase 2 — Hardware recording validation and resilience

Objective: prove the native recorder works under real Windows conditions before expanding the editor.

### Validation matrix

- [ ] Display capture at 1080p/30, 1080p/60, 1440p, and one available 4K case.
- [ ] Selected-window capture while moving, resizing, minimizing, restoring, and closing the source.
- [ ] System-audio only, microphone only, mixed audio, muted audio, and endpoint change during recording.
- [ ] Built-in webcam, USB webcam if available, virtual camera if available, and webcam unplug/reconnect.
- [ ] Cursor shown/hidden and cursor-helper failure behavior.
- [ ] Countdown start, pause/resume, stop/finalize, discard, repeated recordings, and app quit during every state.
- [ ] Non-ASCII output path, long path, read-only destination, low disk, and existing-file collision.
- [ ] Single monitor, multiple monitors, mixed DPI, monitor hot-plug, sleep/wake, and lock/unlock.
- [ ] Ten-minute A/V sync check at beginning, middle, and end.
- [ ] Thirty-minute memory/CPU/GPU/dropped-frame soak.

### Implementation corrections allowed in this phase

- [ ] Add bounded device-recovery logic and endpoint-change notifications.
- [ ] Add incremental session manifests for crash recovery.
- [ ] Add finalization progress and timeout escalation without deleting a potentially valid recording prematurely.
- [ ] Preserve partial media for recovery when finalization fails; distinguish discard from failure cleanup.
- [ ] Add redacted local diagnostics for helper protocol, device selections, timing, dropped frames, and finalization.

### Exit gate

- Display and selected-window recordings produce valid H.264/AAC MP4 files for supported audio/webcam combinations.
- Ten-minute drift is below one video frame or a documented, reviewed tolerance.
- Thirty-minute recording shows no unbounded memory growth.
- No critical start/stop/discard/close, toolbar-input, data-loss, or helper-orphan defect remains.

## Phase 3 — Recording session UX and recovery

Objective: make recording safe and predictable for teachers and presenters.

### Implementation

- [ ] Define one authoritative state machine: idle, selecting, countdown, starting, recording, paused, finalizing, completed, failed, and recovering.
- [ ] Include a session ID and expected prior phase in every recorder command to reject double clicks and stale renderers.
- [ ] Add restart as an explicit discard-current/start-new operation.
- [ ] Add customizable start/stop, pause/resume, and cancel shortcuts with conflict reporting.
- [ ] Show audio activity, selected source, elapsed time, dropped-frame warning, and remaining-space warning without cluttering the RePen toolbar.
- [ ] Restore exact pre-recording tool, pass-through, overlay visibility, and board state after stop/discard/failure.
- [ ] On restart, detect incomplete session manifests and offer Recover, Reveal, or Discard.
- [ ] Keep source media immutable once successfully finalized.
- [ ] Add recent recordings with Reveal in Explorer and Open in Editor actions.
- [ ] Make app/tray/window close behavior explicit in every recorder state.

### Exit gate

- Repeated start/pause/resume/stop/discard/restart flows cannot create overlapping helpers or stale HUD state.
- An interrupted recording can be recovered or safely discarded after restart.
- Presenter input behavior before and after recording is identical except for intentional user changes.

## Phase 4 — Editor and project foundation

Objective: open a recording in a stable RePen editor without yet promising all visual effects.

### Architecture

- [ ] Use the existing React/Vite editor entry and split state into media, timeline, playback, project, presentation track, effects, captions, export, and dirty/recovery domains.
- [ ] Define typed editor commands and undoable transactions rather than one mutable monolithic store.
- [ ] Keep the native recording service separate from editor media decode/export services.
- [ ] Use `.repen-project` as the RePen-owned project format with schema versioning and migrations.
- [ ] Support importing pinned OpenScreen `.openscreen` projects through a migration adapter, not by making them the native format.

### Implementation

- [ ] Open the newly completed recording directly in the editor or return to presenter based on user preference.
- [ ] Add video preview, play/pause, seek, frame step, duration, volume, and keyboard navigation.
- [ ] Add timeline zoom, playhead, snapping, trim handles, waveform, and track visibility/lock controls.
- [ ] Load the RePen presentation sidecar and render annotations/spotlight/laser at arbitrary timestamps.
- [ ] Add new/open/save/save-as, recent projects, unsaved-change confirmation, and project close.
- [ ] Store relative media paths when possible and provide missing-media relink.
- [ ] Save atomically and maintain bounded autosave/recovery snapshots.
- [ ] Preserve original recordings and imported media without destructive edits.
- [ ] Add project migrations and fixtures for every schema version introduced.

### Exit gate

- A recording opens, plays, seeks, trims, saves, closes, reopens, relinks moved media, and recovers an interrupted project save.
- RePen presentation content remains synchronized through seeking and pause/resume regions.
- Original media is unchanged by editing.

## Phase 5 — Visual editing and compositor parity

Objective: implement OpenScreen’s core visual editing features with matching preview and export geometry.

### Layout and background

- [ ] Crop and source framing.
- [ ] Aspect ratios: source, 16:9, 9:16, 1:1, and selected additional presets.
- [ ] Output resolution, padding, border radius, shadow, and safe-area guides.
- [ ] Solid, gradient, bundled wallpaper, and custom-image backgrounds.

### Motion and focus

- [ ] Manual zoom regions with timing, depth, focus point, easing, and overlap rules.
- [ ] Automatic zoom suggestions based on cursor/activity with user review before applying.
- [ ] Cursor-follow and auto-focus behavior with bounds clamping.
- [ ] Global and per-effect motion blur with reduced-motion preview option.

### Cursor and click effects

- [ ] Cursor theme, scale, smoothing, visibility regions, and editable path.
- [ ] Click visualization and Windows click-bounce behavior.
- [ ] End-to-end cursor/click test in the packaged app before declaring parity.

### Webcam and annotations

- [ ] Webcam PiP position, size, mirror, masks, border, shadow, crop, and layout presets.
- [ ] Webcam timing alignment and independent visibility/trim controls.
- [ ] Text, image, figure/arrow, blur/redaction, and highlight annotations.
- [ ] Text animation presets and per-item start/end timing.
- [ ] Layer ordering among background, source, webcam, OpenScreen effects, RePen presentation track, cursor, and captions.

### Tests

- [ ] Reducer/history tests for every item type and timeline operation.
- [ ] Coordinate tests across crop, zoom, aspect ratio, and mixed-DPI presentation tracks.
- [ ] Golden-frame tests for representative layer combinations and timestamps.

### Exit gate

- Every exposed visual feature survives save/reopen and renders consistently in preview and reference frames.
- Selected-window recordings correctly composite RePen presentation content even when it was not present in the raw window capture.

## Phase 6 — Offline captions

Objective: add OpenScreen-style local transcription without introducing hidden network behavior.

### Product decision required before implementation

- [ ] Choose bundled model versus explicit optional local model download.
- [ ] Record installer/download size, languages, minimum RAM, and license implications.

### Implementation

- [ ] Extract/resample voice audio to mono 16 kHz with leading-silence and no-audio handling.
- [ ] Run transcription in an isolated worker/process so editor playback remains responsive.
- [ ] Show progress, cancel, retry, model-missing, unsupported-language, and out-of-memory states.
- [ ] Convert transcript segments into editable caption timeline items.
- [ ] Edit text, split/merge segments, adjust timing, and apply caption style presets.
- [ ] Persist captions in `.repen-project` and render identically in preview/export.
- [ ] Prove transcription works with network disabled after required assets are installed.
- [ ] Do not retain source audio outside the project without user intent.

### Exit gate

- A supported recording produces editable timed captions offline.
- Caption generation is cancellable and does not freeze or corrupt the editor project.
- Preview/export caption timing and line wrapping match reference frames.

## Phase 7 — MP4/GIF export pipeline

Objective: render all combined layers into reliable shareable output.

### Implementation

- [ ] Establish and document final compositor order.
- [ ] Stream decode and encode; use bounded frame/audio queues rather than holding the complete project in memory.
- [ ] Apply trim and speed changes while maintaining audio/video synchronization.
- [ ] Export MP4 using supported H.264/AAC presets.
- [ ] Export GIF with size, FPS, quality, and loop controls.
- [ ] Support all editor aspect ratios/resolutions without stretching or clipping.
- [ ] Render background, source framing, webcam, zoom/effects, OpenScreen annotations, RePen presentation track, cursor/clicks, and captions.
- [ ] Add export progress, ETA, cancel, retry, output collision handling, and partial-file cleanup.
- [ ] Keep source media and project valid if export crashes or is canceled.
- [ ] Detect unsupported GPU/WebCodecs paths and provide a documented supported fallback or explicit error.

### Validation

- [ ] Decode exported files and assert streams, codecs, dimensions, duration, and frame-count tolerance.
- [ ] Compare golden frames at selected timestamps.
- [ ] Verify audio sync after trims, speed changes, pauses, and long exports.
- [ ] Measure 1080p and 4K export memory, CPU/GPU, and throughput.

### Exit gate

- MP4 and GIF exports reproduce editor geometry/timing for every supported layer.
- Cancellation/failure never damages source media or leaves misleading completed output.
- Long/4K exports stay within documented resource limits.

## Phase 8 — Product completeness

Objective: integrate the editor/recorder into RePen as a coherent, accessible product.

### Implementation

- [ ] Merge presenter-global, recorder-global, and editor-local command registries with conflict detection.
- [ ] Add settings migration and Reset to Defaults for all new recorder/editor options.
- [ ] Add keyboard focus order, accessible names, visible focus, screen-reader state announcements, and reduced motion.
- [ ] Ensure recording states are not communicated by color alone.
- [ ] Add first-run guidance separating Present, Record, and Edit workflows.
- [ ] Add contextual help and clear advanced-control disclosure.
- [ ] Add localization architecture and port selected OpenScreen locales only when RePen-specific strings have equivalent coverage.
- [ ] Validate RTL, CJK fallback, long-label expansion, scaling, and toolbar/editor overflow.
- [ ] Add local redacted diagnostic bundle export behind explicit user action.
- [ ] Document privacy, offline behavior, model assets, third-party notices, known limitations, and recovery.

### Exit gate

- Core present/record/edit/export flows are keyboard operable and screen-reader understandable.
- Supported locales pass smoke tests without broken layouts.
- A new user can distinguish fast presentation recording from post-production editing.

## Phase 9 — Windows release hardening

Objective: ship a supportable Windows release rather than a development integration.

### Engineering

- [ ] Add CI for static checks, unit tests, renderer tests, Electron E2E, native build/smoke, packaging inspection, project migrations, and export validation.
- [ ] Pin MSVC/CMake/Ninja/Electron/Node build requirements and verify clean-machine reproducibility.
- [ ] Produce signed NSIS and portable artifacts, checksums, SBOM, OpenScreen MIT notices, and release notes.
- [ ] Validate unpacked native helpers and all worker/model/renderer assets in installed and portable builds.
- [ ] Add updater only after signature, rollback, staged rollout, and interrupted-update behavior are designed and tested.

### Platform matrix

- [ ] Windows 10 and Windows 11.
- [ ] 100%, 125%, 150%, and 200% scaling.
- [ ] Single/multiple monitors, mixed DPI, 1080p/1440p/4K, and monitor hot-plug.
- [ ] Common microphones, audio endpoints, webcams, virtual cameras, and no-device systems.
- [ ] Sleep/wake, lock/unlock, GPU reset, protected content, and source-process crashes.
- [ ] Non-ASCII/long paths, low disk, read-only paths, app crash, power interruption simulation, and project recovery.

### Rollout

- [ ] Internal dogfood.
- [ ] Opt-in alpha with recorder and editor feature flags.
- [ ] Beta after project/export compatibility stabilizes.
- [ ] Stable only after critical capture, data-loss, security, and overlay-input issues are zero.
- [ ] Maintain a tested rollback and project-backup path through alpha/beta.

### Exit gate

- Release checklist and platform matrix pass.
- No critical data-loss, capture, export, security, accessibility, or toolbar/input defect remains.
- Installer/portable builds are signed, attributable, reproducible, and recoverable.

## Phase 10 — Optional cross-platform program

This is excluded from the first Windows release. It begins only if the user explicitly expands scope beyond RePen's Windows-first positioning.

- [ ] macOS ScreenCaptureKit helper, audio behavior, permissions, cursor accessibility, signing, and notarization.
- [ ] Linux PipeWire capture, desktop-environment overlay behavior, packaging, and documented cursor limitations.
- [ ] RePen overlay/click-through/multi-display parity per platform.
- [ ] Platform-specific native helper, editor, export, project, and recovery matrices.
- [ ] DMG/AppImage/DEB/PACMAN or separately approved packaging targets.

## Cross-Phase Test Policy

Every implementation phase must provide:

- Automated tests for pure logic, schemas, migrations, and state machines.
- Renderer tests for user-visible states and invalid-action handling.
- Electron tests for IPC authorization, window lifecycle, capture exclusion, and shutdown.
- Native executable tests for protocol and failure behavior when native code changes.
- Packaged-artifact inspection whenever paths, assets, native helpers, workers, or models change.
- Focused manual QA evidence for hardware, capture contents, A/V sync, accessibility, and visual quality.
- `npm test`, relevant build commands, and `git diff --check` before handoff.

No phase passes solely because TypeScript compiles.

## Feature Parity Definition

“All OpenScreen features” for the Windows release means the following work in RePen, save/reopen correctly, and export consistently:

- Display and selected-window recording.
- System audio, microphone, webcam, cursor, pause/resume, stop, discard, recovery.
- Source/device/countdown/quality/destination setup.
- Timeline playback, trim, seek, snapping, waveform, and project persistence.
- Layout, crop, backgrounds, padding, radius, shadow, and aspect ratios.
- Manual/automatic zoom and focus effects.
- Cursor themes/path/smoothing/click effects.
- Webcam layout and editing.
- Text, figures/arrows, image, blur/redaction, and timed annotations.
- RePen presentation-track replay and export.
- Offline captions.
- MP4 and GIF export.
- Shortcuts, recovery, accessibility, localization framework, attribution, and Windows packaging.

Features that cannot be supported safely must be capability-gated and documented; silently omitting them does not count as parity.

## Principal Risks

| Risk | Severity | Required mitigation |
| --- | --- | --- |
| Hardware capture looks complete but fails on real devices | Critical | Phase 2 blocks editor expansion; maintain device/error matrix and real evidence |
| Selected-window recordings omit RePen visuals | Critical | Use presentation-track compositor in preview and export; golden tests |
| A/V or webcam drift | Critical | One timing origin, long-run sync tests, explicit tolerance |
| Project or source-media loss | Critical | Immutable media, atomic saves, autosave/recovery, migration fixtures |
| Editor/import becomes an unmaintainable OpenScreen fork | High | RePen-owned domains/contracts; import selectively; refactor after parity |
| Preview/export mismatch | Critical | Shared compositor math plus golden-frame/export decode tests |
| Long recordings/exports exhaust memory | Critical | Streaming disk IO, bounded queues, soak/performance gates |
| Toolbar/controls leak into capture or become click-through | High | Central capture-exclusion/input policy plus packaged E2E |
| Offline captions inflate install or fail on modest hardware | High | Explicit model decision, size/RAM disclosure, isolated worker, cancel/retry |
| Later phases destabilize presenter workflow | High | Preserve compact RePen entry points and regression suite at every gate |
| Licensing/attribution is incomplete | High | Pinned provenance, MIT notices, SBOM, packaged inspection |
| “All features” is claimed too early | High | Use the parity definition and phase exit gates in this brief |

## Acceptance Checks

- [ ] Each required phase passed its exit gate with recorded evidence.
- [ ] RePen remains usable as a low-friction presenter without opening the editor.
- [ ] Recorder source/device controls are complete and capability-aware.
- [ ] Real hardware recording and long-run resilience pass the Windows matrix.
- [ ] Project save/reopen/relink/recovery is non-destructive.
- [ ] Presentation track, editor effects, captions, and exports match preview timing/geometry.
- [ ] Installed and portable packages contain all required helpers/assets/notices.
- [ ] No critical security, data-loss, capture, export, A/V sync, or input-routing defect remains.
- [ ] OpenScreen attribution and adapted-source provenance are complete.
- [ ] Remaining platform limitations are explicitly documented.

## Immediate Next Action

After user approval, begin only Phase 1. Before changing code, Antigravity must record an implementation note naming the recorder setup/source-selection files it will own. Codex reviews the Phase 1 implementation and verification evidence before Phase 2 begins.

Do not begin with the editor, captions, or exporter. The next release risk is incomplete source/device selection and unverified real hardware behavior.

## Verification

Planning-only task created on 2026-07-15. The plan is based on the current corrected recorder foundation and the previous full integration audit. No product code was changed by this planning task.

## Handoff Notes

- First owner: Antigravity for Phase 1 implementation after user approval.
- First review gate: Codex verifies option contracts, source/device UI, IPC validation, capture exclusion, tests, and packaged behavior.
- Manual participation will be required in Phase 2 for microphone, webcam, A/V sync, multi-monitor, and long-duration testing.
- The overall task stays in `plan` until implementation is explicitly approved.
