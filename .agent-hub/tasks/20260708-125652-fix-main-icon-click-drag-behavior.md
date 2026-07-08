# Fix main icon click drag behavior

Task ID: `20260708-125652-fix-main-icon-click-drag-behavior`

## Goal

Make a single click on the toolbar main icon minimize or expand the toolbar, while click-and-drag on the same icon moves the toolbar without also minimizing afterward.

## Current Phase

`handoff`

## Owners

- Planner: `codex`
- Implementer: `codex`
- Reviewer: `codex`

## Constraints

- Preserve unrelated user changes.
- Follow `AGENTS.md` and `.agent-hub/protocol.md`.
- Keep changes scoped to the toolbar main icon interaction.
- The documented `npm run agent` command is not available in the current `package.json`, so this task was recorded manually.

## Context Read

- [x] `AGENTS.md`
- [x] `.agent-hub/protocol.md`
- [x] `docs/technical-architecture.md`
- [x] `docs/qa-checklist.md`
- [x] `src/renderer/toolbar.html`
- [x] `src/renderer/toolbar.js`
- [x] `src/renderer/toolbar.css`
- [x] `src/preload.js`
- [x] `main.js`

## Plan

- [x] Identify why the main icon drag also triggers minimize.
- [x] Remove the duplicate immediate click toggle path on `#collapseBtn`.
- [x] Replace mouse-only drag logic with pointer handling that decides click vs drag by movement threshold.
- [x] Preserve collapse/expand on a simple click and `app:move-toolbar` repositioning on drag.
- [x] Run automated verification.

## Acceptance Checks

- [x] Single click on the main icon toggles toolbar collapsed state.
- [x] Click-and-drag on the main icon sends toolbar movement and does not toggle collapsed state on release.
- [x] Existing app contracts remain valid under `npm test`.
- [ ] Manual Electron smoke test: click the main icon once, then drag it and confirm no minimize occurs after drag.

## Risks

- Automated tests do not simulate a real pointer drag in the Electron window. Manual QA should verify actual desktop behavior.
- The worktree already contained unrelated modified files and generated Graphify output; those were left untouched.

## Verification

- `npm test` passed on 2026-07-08.

## Handoff Notes

- Updated `src/renderer/toolbar.js` so `#collapseBtn` has one pointer-based interaction path.
- The handler records pointer down, starts moving only after a 5px threshold, and toggles collapse only when the pointer is released without crossing that threshold.
- Next owner should run a quick manual app smoke test for the main icon: click once to collapse/expand, then drag to reposition and confirm the toolbar remains in its current expanded/collapsed state.
