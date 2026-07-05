# Fix broken tools after feature updates

Task ID: `20260705-094117-fix-broken-tools-after-feature-updates`

## Goal

Diagnose why toolbar tools stopped working, starting from Graphify hints, and restore tool selection/drawing behavior with verification.

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
- [x] Relevant source files: `main.js`, `src/preload.js`, `src/renderer/toolbar.js`, `src/renderer/toolbar.html`, `src/renderer/overlay.js`, verification scripts, and Graphify report.

## Plan

- [x] Use Graphify report to identify likely toolbar/main/overlay state paths.
- [x] Confirm the live failure with syntax and existing verification commands.
- [x] Fix the toolbar runtime failure and restore missing toolbar element bindings.
- [x] Add verification coverage so renderer syntax and toolbar element registry issues fail `npm test`.
- [x] Run automated verification and short Electron smoke launch.

## Acceptance Checks

- [x] Implementation matches the goal.
- [x] Existing app still starts or failure is explained.
- [x] `npm test` has been run or skipped with reason.
- [x] Manual QA notes are recorded when automated tests are not enough.

## Risks

- No automated UI click test exists for Electron toolbar interactions; manual QA should still test actual tool selection/drawing.
- Hidden smoke launch verifies startup survival, not visual correctness.

## Verification

- `npm test` passed after adding `scripts/verify-js-syntax.js`.
- `node -c src/renderer/toolbar.js`, `node -c src/renderer/overlay.js`, and `node -c main.js` passed.
- Hidden Electron smoke launch stayed alive for 5 seconds.

## Handoff Notes

- Fixed the primary outage: `src/renderer/toolbar.js` had a missing closing brace after `updatePills()`, causing `SyntaxError: Unexpected end of input` and preventing all toolbar JS from loading.
- Registered `penBar`, `orientationBtn`, `collapseBtn`, and `whiteboardPopover` in the toolbar elements map so those recent controls attach handlers.
- Added syntax and element-registry checks to `npm test`.
- Next owner/user should restart RePen and manually try Pen, Highlighter, Shapes, Eraser, Select, Spotlight/Magnifier, Whiteboard popover, orientation toggle, and collapse.
