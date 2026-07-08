# Fix cursor clearing grouped tools

Task ID: `20260708-131843-fix-cursor-clearing-grouped-tools`

## Goal

Make the cursor/pass-through button reliably exit grouped tools such as magnifier, spotlight, and select so the previous grouped tool does not keep affecting the overlay after cursor mode is selected.

## Current Phase

`handoff`

## Owners

- Planner: `codex`
- Implementer: `codex`
- Reviewer: `codex`

## Constraints

- Preserve unrelated user changes.
- Follow `AGENTS.md` and `.agent-hub/protocol.md`.
- Keep changes scoped to cursor/pass-through and grouped tool state.
- The documented `npm run agent` command is not available in the current `package.json`, so this task was recorded manually.

## Context Read

- [x] `AGENTS.md`
- [x] `.agent-hub/protocol.md`
- [x] `docs/technical-architecture.md`
- [x] `docs/qa-checklist.md`
- [x] `main.js`
- [x] `src/renderer/toolbar.js`
- [x] `src/renderer/overlay.js`
- [x] `src/preload.js`
- [x] `scripts/verify-tool-state.js`

## Plan

- [x] Trace cursor button, grouped select/magnifier/spotlight state, and overlay rendering.
- [x] Update pass-through activation so cursor mode clears transient active tools.
- [x] Clear magnifier capture state when entering cursor mode.
- [x] Add regression checks to the existing tool-state verifier.
- [x] Run automated verification.

## Acceptance Checks

- [x] Selecting cursor/pass-through after magnifier sets `activeTool` to `cursor`.
- [x] Cursor/pass-through clears magnifier background state so zoom rendering stops.
- [x] Leaving cursor mode via the cursor button returns to a drawable default instead of keeping `cursor` as a drawing tool.
- [x] `npm test` passes.
- [ ] Manual Electron smoke test: select magnifier, click cursor, confirm zoom disappears and normal desktop cursor behavior returns.

## Risks

- Automated tests do not simulate live Electron overlay rendering. Manual QA should verify actual magnifier/spotlight visuals.
- Existing unrelated worktree modifications and generated Graphify output were left untouched.

## Verification

- `npm test` passed on 2026-07-08.
- Browser rendered validation was attempted through the in-app Browser plugin, but local `file://` navigation for the temporary toolbar harness was blocked by Browser URL policy. No fallback browser route was used because the policy explicitly disallowed working around that blocked action.

## Handoff Notes

- Updated `main.js` so enabling cursor/pass-through sets `activeTool` to `cursor`, clears magnifier interval/background state, and returns to `pen` when leaving cursor mode from the cursor state.
- Hardened `captureMagnifierBackground()` so an in-flight magnifier capture cannot republish zoom background state after cursor/pass-through mode has been enabled.
- Updated `scripts/verify-tool-state.js` with regression checks for cursor clearing and stale magnifier captures.
- Manual QA should still verify the live Electron flow: select magnifier or spotlight, click the cursor button, and confirm the visual effect disappears and the desktop receives normal cursor interactions.
