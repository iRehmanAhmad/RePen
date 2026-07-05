# Separate whiteboard and transparent annotations

Task ID: `20260705-104424-separate-whiteboard-and-transparent-annotations`

## Goal

Fix annotation leakage between non-transparent whiteboard pages and transparent desktop overlay, especially when returning to transparent mode or relaunching.

## Current Phase

`handoff`

## Owners

- Planner: `codex`
- Implementer: `codex`
- Reviewer: `codex`

## Constraints

- Preserve unrelated user changes.
- Follow `AGENTS.md` and `.agent-hub/protocol.md`.
- Keep changes scoped to this task unless the task brief is updated.

## Context Read

- [x] `AGENTS.md`
- [x] `.agent-hub/protocol.md`
- [x] `docs/technical-architecture.md`
- [x] `docs/qa-checklist.md`
- [x] Relevant source files: `main.js`, `src/renderer/overlay.js`, `src/renderer/toolbar.js`, `src/preload.js`, and verification scripts.

## Plan

- [x] Trace scene storage for transparent desktop annotations vs whiteboard pages.
- [x] Identify why board annotations can become the active transparent scene.
- [x] Fix the active scene pointer on transparent startup.
- [x] Add a regression verifier for scene-store separation.
- [x] Run automated verification and smoke launch.

## Acceptance Checks

- [x] Implementation matches the goal.
- [x] Existing app still starts or failure is explained.
- [x] `npm test` has been run or skipped with reason.
- [x] Manual QA notes are recorded when automated tests are not enough.

## Risks

- Automated verification checks the state transition code, but not full visual UI behavior. Manual QA should still switch modes and relaunch after board use.

## Verification

- `npm test` passed, including `scripts/verify-scene-store-separation.js`.
- Hidden Electron smoke launch stayed alive for 5 seconds.

## Handoff Notes

- Root cause: `loadState()` could restore the active scene from a non-transparent board page and then force `state.backgroundMode = 'transparent'`, leaving board annotations visible on the normal desktop.
- Fix: after forcing transparent startup, `main.js` now also rebinds `annotations`, `undoStack`, and `redoStack` to `desktopPage`.
- Manual QA: draw on transparent desktop, switch to board/grid and draw different marks, switch back to transparent and confirm only desktop marks show; relaunch after board use and confirm transparent starts with desktop marks only.
