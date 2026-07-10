# Settings panel and screenshot save flow plan

Task ID: `20260708-164715-settings-panel-and-screenshot-save-flow-plan`

## Goal

Audit the current settings panel and screenshot/export behavior, then prepare a detailed correction plan without implementing product code.

## Current Phase

`plan`

## Owners

- Planner: `codex`
- Implementer: `antigravity`
- Reviewer: `codex`

## Constraints

- User requested a detailed plan, not implementation.
- Preserve unrelated modified files.
- Follow `AGENTS.md` collaboration protocol.
- Keep the plan scoped to settings UX, settings correctness, screenshot capture, and export save/cancel behavior.

## Context Read

- [x] `main.js`
- [x] `src/preload.js`
- [x] `src/renderer/settings.html`
- [x] `src/renderer/settings.css`
- [x] `src/renderer/settings.js`
- [x] `src/renderer/toolbar.js`
- [x] `src/renderer/toolbar.html`
- [x] `src/renderer/overlay.js`
- [x] `package.json`
- [x] Existing verification scripts

## Baseline

- `npm test` passes on 2026-07-08.
- The screenshot toolbar button starts snip mode through `window.appBridge.startSnipMode()`.
- Snip mode asks the overlay to render a screenshot/export payload after region selection.
- `app:render-export` currently copies to clipboard before asking for a save path when clipboard output is enabled.
- If `autoSavePath` is set, screenshot/export writes automatically without asking the user.

## Findings

1. The settings window is visually heavy for a utility panel. It uses a glass shell, large radii, decorative gradients, nested panels, and multiple card layers in a small floating window.
2. The information architecture is too dense: brush defaults, screenshot/export behavior, and a long hotkey editor all compete on the first screen.
3. Screenshot behavior is not explicit enough. The UI says "Auto-save Directory" and "Auto-copy to Clipboard", but it does not clearly define whether screenshot capture should ask, auto-save, copy only, or cancel cleanly.
4. The current screenshot path does not fully match "after taking a screenshot, ask user to save it or cancel it" because clipboard copy can happen before the native save dialog is accepted.
5. Canceling the save dialog can still leave a clipboard side effect when auto-copy is enabled.
6. Auto-save directory bypasses user confirmation, which conflicts with an always-ask screenshot workflow unless settings expose a deliberate behavior mode.
7. Export and screenshot are treated as one combined preference group. A full export and a quick screenshot may need different defaults.
8. Brush sliders do not show live numeric values for pen width, pen opacity, highlighter width, highlighter opacity, or eraser radius.
9. Hotkey rows are numerous and always visible. This makes the settings panel feel like a hotkey editor with other settings squeezed beside it.
10. Hotkey conflict styling contains mojibake in CSS (`' âš ï¸'`) instead of a clean icon/text treatment.
11. `saveChanges()` assumes `result.failures` exists when `result.ok` is false. A malformed or unexpected error response can break the settings renderer while reporting save failure.
12. The settings window is created at 860x600. Current content density and nested scroll areas make that size feel cramped.
13. The current close flow relies partly on `beforeunload` plus renderer state. It should be made more deterministic so unsaved changes are not hidden accidentally by the main-process close handler.

## Recommended Product Behavior

### Screenshot

- Default screenshot flow should be: user selects area, app captures image, app presents Save / Cancel before any file write or clipboard write.
- Cancel should mean no file write and no clipboard mutation.
- Save should open the native Save dialog or a lightweight preview dialog with a Save As action.
- Copy should be a separate explicit action in the post-capture UI, or a post-save option, not an automatic side effect before confirmation.
- Auto-save should be an opt-in mode named clearly, for example "Save automatically to folder".

### Settings

- Split settings into clear sections:
  - General
  - Tools
  - Screenshot
  - Hotkeys
  - About / Reset
- Make Screenshot a first-class section with behavior controls:
  - After capture: `Ask to save`, `Save automatically`, `Copy only`
  - Include desktop background
  - Format
  - Quality for JPEG/WebP only
  - Default save folder
  - Copy after saving
- Keep hotkeys searchable or grouped instead of always rendering one long list beside primary settings.

## Implementation Plan

- [ ] Phase 1: Fix the screenshot/export contract.
  - Add a screenshot behavior setting to `DEFAULT_STATE.exportDefaults`, for example `screenshotAction: 'ask'`.
  - Normalize the new field in `normalizeExportDefaults()`.
  - Mirror the field in `src/renderer/settings.js` defaults and form collection.
  - Keep backward compatibility by treating missing values as `ask`.

- [ ] Phase 2: Separate capture from final output side effects.
  - Change `app:render-export` so it decodes the buffer but does not copy to clipboard before the user confirms.
  - For screenshot action `ask`, show confirmation after image creation.
  - Ensure Cancel resolves `false` and performs no write or clipboard action.
  - Ensure Save writes only after a chosen path exists.
  - Ensure Copy writes only when the user explicitly chose copy or when an opt-in post-save copy setting applies.

- [ ] Phase 3: Decide the post-capture UI.
  - Minimum acceptable fix: after capture, show a native Save dialog; cancel performs no side effects.
  - Better fix: create a small preview/confirmation window with image preview and actions: Save As, Copy, Retake, Cancel.
  - Keep the preview always-on-top but route overlay mouse events safely, like existing modal dialogs.

- [ ] Phase 4: Redesign settings information architecture.
  - Replace the two-column all-at-once layout with a compact sidebar or tabs.
  - Put Screenshot settings on their own page/section.
  - Move Hotkeys to a dedicated section with grouping and optional search/filter.
  - Remove decorative radial backgrounds and reduce nested card styling.
  - Use smaller radii and denser spacing suitable for a Windows utility overlay.

- [ ] Phase 5: Improve settings controls.
  - Add live value labels for all range inputs.
  - Convert screenshot behavior to segmented/radio controls.
  - Disable default folder controls unless auto-save is selected.
  - Disable quality when PNG is selected and make the disabled state visually obvious.
  - Add clear success/error messages for save, reset, hotkey conflict, and path selection.

- [ ] Phase 6: Harden settings logic.
  - Guard `result.failures` in `saveChanges()`.
  - Add a single `setDirtyFromInput()` or `updateDraftField()` helper to reduce repeated logic.
  - Make close/unsaved handling deterministic through an explicit IPC close request instead of relying on `beforeunload`.
  - Fix the hotkey conflict mojibake and use an accessible conflict label.

- [ ] Phase 7: Add regression tests.
  - Extend DOM ID verification to include `settings.js` against `settings.html`.
  - Add a verifier for screenshot behavior defaults and normalization.
  - Add a static verifier that `app:render-export` does not call `clipboard.writeImage()` before the save/cancel branch for ask mode.
  - Add a verifier for settings save failure handling when `failures` is missing.
  - Keep `npm test` green.

- [ ] Phase 8: Manual QA.
  - Open settings at 860x600 and a smaller resized window; verify no clipped text or unusable scroll traps.
  - Change every brush default, save, close, reopen, and confirm persistence.
  - Create duplicate hotkeys and verify save is blocked with a clear conflict state.
  - Take screenshot, click Cancel, confirm no file is written and clipboard is unchanged.
  - Take screenshot, click Save, confirm expected format/path and image contents.
  - Test auto-save mode separately and confirm no prompt appears only when explicitly selected.
  - Test include-background on and off.

## Acceptance Checks

- [ ] Settings panel feels like a usable utility panel rather than a decorative landing page.
- [ ] Screenshot behavior is explicit in settings.
- [ ] Default screenshot flow asks after capture whether to save or cancel.
- [ ] Cancel has no file or clipboard side effects.
- [ ] Auto-save exists only as an intentional opt-in behavior.
- [ ] Hotkey conflicts and settings save failures are understandable and recoverable.
- [ ] `npm test` passes with new regression coverage.
- [ ] Manual QA evidence is recorded in the task handoff.

## Verification

- `npm test` passed on 2026-07-08 after the audit.

## Handoff Notes

- No product implementation was performed in this task.
- Start implementation with the screenshot side-effect ordering, because it directly affects the user's save/cancel requirement.
- Then redesign the settings panel around the screenshot behavior so the UI explains the new flow clearly.
