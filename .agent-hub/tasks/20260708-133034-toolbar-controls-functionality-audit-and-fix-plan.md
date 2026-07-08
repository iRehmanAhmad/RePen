# Toolbar controls functionality audit and fix plan

Task ID: `20260708-133034-toolbar-controls-functionality-audit-and-fix-plan`

## Goal

Analyze RePen toolbar and overlay control behavior, identify functionality problems, and prepare a detailed correction plan without implementing code changes.

## Current Phase

`plan`

## Owners

- Planner: `codex`
- Implementer: `antigravity`
- Reviewer: `codex`

## Constraints

- User explicitly requested no implementation for this turn.
- Preserve unrelated user changes.
- Follow `AGENTS.md` and `.agent-hub/protocol.md`.
- Keep future fixes scoped to toolbar/main/overlay interaction correctness unless the brief expands.

## Context Read

- [x] `AGENTS.md`
- [x] `.agent-hub/protocol.md`
- [x] `docs/technical-architecture.md`
- [x] `docs/qa-checklist.md`
- [x] `src/renderer/toolbar.html`
- [x] `src/renderer/toolbar.js`
- [x] `src/renderer/overlay.html`
- [x] `src/renderer/overlay.js`
- [x] `src/preload.js`
- [x] `main.js`
- [x] Relevant verification scripts

## Findings

1. Selection dashed border persists after switching tools because `selectedIds` is local overlay renderer state and `onStateChanged()` does not clear selection when `activeTool` changes away from `select`.
2. Selection/editing transient states are fragmented (`selectedIds`, `marqueeBox`, `isDraggingSelection`, `isResizingSelection`, `isDraggingText`, `currentStroke`) and only partially reset on `pointercancel` or Escape. Tool changes should reset all incompatible transient interaction state.
3. Eraser can feel unreliable because `erasePath()` returns early for paths with fewer than two points, so click/tap erasing does nothing. It also only tests stroke points against eraser path segments, so fast eraser movement can miss stroke segments between sampled points.
4. Eraser selection interaction is undefined: switching to eraser does not clear existing selection outlines, so the UI can show select-mode affordances while another destructive tool is active.
5. Pen/highlighter delayed drawing is likely caused by waiting for main-process IPC persistence until `pointerup`; live preview depends only on renderer `currentStroke`. Tool-switch or stale transient state can cancel preview, and overlay focus/mouse-ignore transitions can make the first pointer after choosing pen feel late.
6. Board controls are split awkwardly: toolbar whiteboard button opens white/black choices only when not already in board mode; once in board mode, it exits to transparent. Switching whiteboard to blackboard depends on the overlay nav, so users can reasonably perceive the toolbar board control as broken.
7. Board mode switching does not clear selection/current gesture state, so a selected object or in-progress gesture can bleed visually across tool/background changes until the next screen click.
8. Static tests pass but do not exercise live pointer flows, mode transitions, or visual state clearing. Add regression coverage for tool transition side effects.

## Plan

- [ ] Phase 1: Create a central overlay interaction reset helper.
  - Add `clearSelection()` and `resetInteractionState(reason)` in `src/renderer/overlay.js`.
  - Clear `selectedIds`, `marqueeBox`, `isDraggingSelection`, `isResizingSelection`, `isDraggingText`, `currentStroke`, and cursor style where appropriate.
  - Call it when `appState.activeTool`, `appState.passThrough`, or `appState.backgroundMode` changes to a mode incompatible with the current transient state.

- [ ] Phase 2: Make tool transitions authoritative.
  - Track previous app state in overlay `onStateChanged()`.
  - If `activeTool` changes away from `select`, clear selected IDs and selection resize/drag state.
  - If switching away from text, commit or cancel open text editor deliberately.
  - If entering cursor/pass-through, clear all draw/edit state.
  - If entering pen/highlighter/eraser/shapes, ensure overlay captures input immediately and no stale selection affordance remains.

- [ ] Phase 3: Fix eraser semantics.
  - Support single-click erasing by treating a one-point eraser path as a small circular erase operation.
  - Improve stroke erasing by checking both stroke points near eraser path and eraser points near stroke segments, preventing missed intersections during fast movement.
  - For shapes/text/images, replace bounding-box-only erasing with shape-aware hit tests where reasonable.
  - Clear selection state when eraser starts or when erased annotations include selected IDs.

- [ ] Phase 4: Fix pen/highlighter responsiveness.
  - On tool selection in `main.js`, broadcast state before or immediately with input-capture changes so renderer state and OS mouse routing are synchronized.
  - In `overlay.js`, verify `currentStroke` is created on the first `pointerdown` after a tool switch.
  - Remove or gate noisy debug console logging in hot pointer paths if it contributes to latency.
  - Consider rendering a dot immediately on `pointerdown` so the user sees instant feedback before movement.

- [ ] Phase 5: Simplify board UX and state transitions.
  - Decide one consistent behavior for the toolbar board button:
    - Option A: click toggles transparent/last-board; indicator/right-click opens board choices.
    - Option B: click always opens board choices, with a dedicated return-to-desktop item.
  - Keep whiteboard/blackboard choices accessible from the toolbar even while already in a board mode.
  - Clear incompatible selection/draw state on `backgroundMode` changes.
  - Ensure switching board patterns preserves annotations and page state exactly once.

- [ ] Phase 6: Add targeted automated regressions.
  - Add a static verifier for overlay tool-change cleanup paths.
  - Add a pure unit-style verifier for eraser hit detection edge cases: one-point eraser, fast crossing movement, thick strokes, shapes, text/image bounding boxes.
  - Add a toolbar/main state verifier that confirms tool changes clear cursor/pass-through and board mode transitions do not leave stale tool state.
  - If practical, add a Playwright/Electron smoke harness for toolbar clicks and overlay pointer sequences.

- [ ] Phase 7: Manual QA pass.
  - Select object, switch to each tool, confirm dashed border disappears without clicking canvas.
  - Pen/highlighter: click tool and draw immediately; first stroke must appear with no lag.
  - Eraser: tap erase, slow drag erase, fast crossing erase, erase text, erase shape.
  - Board: enter whiteboard, draw, switch to blackboard, switch to transparent, switch back; no annotation bleed, no stale selection, no stuck input.
  - Cursor/pass-through: after every grouped tool, cursor restores normal desktop input.

## Acceptance Checks

- [ ] Dashed selection border clears automatically when leaving select mode.
- [ ] Eraser works on click/tap and fast drag paths.
- [ ] Pen/highlighter begin visibly on the first pointerdown after selection.
- [ ] Whiteboard/blackboard controls are discoverable and deterministic in both transparent and board modes.
- [ ] All mode transitions clear incompatible transient state.
- [ ] `npm test` passes with new regression coverage.
- [ ] Manual QA checklist is updated with these interaction regressions.

## Risks

- Pointer routing is split between Electron main process and overlay renderer, so fixes should be made carefully and verified in the live app.
- Existing worktree has unrelated modified files and generated Graphify outputs; implementation should avoid broad refactors.
- Automated tests currently do not exercise real Electron pointer timing or always-on-top window behavior.

## Verification

- `npm test` passed on 2026-07-08 before implementation.

## Handoff Notes

- No implementation has been performed for this task.
- Start with overlay transient state cleanup first; it directly addresses the dashed selection border and reduces secondary confusion for eraser/pen/board modes.
