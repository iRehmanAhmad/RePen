# Mind map tool audit and fix plan

Task ID: `20260709-200947-mind-map-tool-audit-and-fix-plan`

## Goal

Audit the current Mind Map tool implementation, identify why it is unreliable, and prepare a detailed correction plan without implementing product code.

## Current Phase

`plan`

## Owners

- Planner: `codex`
- Implementer: `antigravity`
- Reviewer: `codex`

## Constraints

- User requested a check and detailed plan, not implementation.
- Preserve existing user and agent changes in the dirty worktree.
- Follow `AGENTS.md` collaboration protocol.
- Keep future fixes scoped to the Mind Map tool, shared tool-state validation, and direct dependencies needed for verification.

## Context Read

- [x] `src/renderer/toolbar.html`
- [x] `src/renderer/toolbar.js`
- [x] `src/renderer/overlay.js`
- [x] `main.js`
- [x] `src/preload.js`
- [x] `scripts/verify-tool-state.js`
- [x] `package.json`

## Baseline

- `npm test` currently fails in `scripts/verify-tool-state.js`.
- Failure reason: the verifier sees `calligraphy` and `mindmap` in `toolbar.html`, but its hard-coded `knownToolsInMain` list does not include those tools.
- JavaScript syntax, DOM ID, and IPC contract checks pass before the tool-state verifier fails.

## Findings

1. `mindmapBtn` exists in `src/renderer/toolbar.html` and calls `window.appBridge.setTool('mindmap')` in `src/renderer/toolbar.js`.
2. `main.js` accepts `setTool(tool)` without validating against a central tool registry, so `mindmap` can become `state.activeTool`, but the verifier does not know it.
3. The Mind Map implementation is spread across `src/renderer/overlay.js`: creation, node editing, layout, rendering, hover add button, dragging, and persistence calls are all interleaved in one file.
4. Mind map nodes are plain annotation records with `tool: 'mindmap'`, `nodeType`, `parentId`, `x`, `y`, `width`, and `height`. There is no dedicated model/helper layer for tree operations.
5. Mind map creation has an async ordering risk. It calls `addStroke(newNode).then(...)`, then immediately calls `layoutMindmap()` and `createTextEditor()` using the local `scene.annotations`, which may not yet include the newly broadcast node.
6. Child creation through the plus button has the same async scene freshness risk, so layout can miss the newly added node or open an editor against a node that has not been reconciled into renderer state.
7. Drag behavior only starts for central nodes. Main/sub nodes immediately open the text editor on click, so users cannot reposition branches or individual nodes directly.
8. Central-node dragging mutates `scene.annotations` locally during pointermove, then persists the mutated node tree on pointerup. This works optimistically but can conflict with scene broadcasts or undo expectations.
9. `resetInteractionState()` does not clear `window.isDraggingMindmapNode` or `window.hoveredAddButton`, so stale mind map hover/drag state can survive tool changes, pass-through, or board changes.
10. `clearSelection()` defaults cursor to `crosshair` for non-select tools, which is awkward for mind map mode where the expected cursor changes between default, pointer, text/edit, and drag.
11. Text editing is shared with the generic text tool. Mind map editor behavior overloads Tab/Enter, but commit timing uses blur and an `isJustCreated` delay, which can cause missed commits or repeated focus loops.
12. `drawStroke()` truncates mind map text to one line with ellipsis. Longer topic names are not wrapped or reflected in node height, so editing/layout can feel broken even when data saved.
13. `layoutMindmap()` updates node positions one by one via IPC fallback or bulk `updateAnnotations`, but it mutates the same node objects from `scene.annotations` before persistence.
14. Settings normalization currently omits `brushDefaults.calligraphy`, while toolbar/test state now includes calligraphy. This is not a mind map bug directly, but it is part of the same failing tool registry/test baseline.
15. There is no targeted regression coverage for mind map creation, add-child, Tab/Enter, drag, layout, persistence, reset, or export rendering.

## Recommended Direction

- Treat Mind Map as its own interaction mode with a small model/controller layer instead of scattering tree operations through general pointer handlers.
- Keep the annotation storage format if desired, but centralize mind map helpers so creation, layout, dragging, editing, and persistence use the same rules.
- Make automated tests green before and after behavior fixes.

## Implementation Plan

- [ ] Phase 1: Restore the verification baseline.
  - Update `scripts/verify-tool-state.js` so `knownToolsInMain` includes current toolbar tools: `calligraphy` and `mindmap`.
  - Prefer deriving known tools from a shared constant or from actual main/overlay handlers rather than a stale hard-coded list.
  - Run `npm test` and confirm the suite reaches completion.

- [ ] Phase 2: Define expected Mind Map UX.
  - Click empty canvas with no central node: create central node and immediately edit its text.
  - Click central/main/sub node: select or edit predictably.
  - Double-click or explicit edit action: edit node text.
  - Drag any node: move that node and its descendants.
  - Plus button: add child node, layout, then edit the new child.
  - Tab while editing: add child.
  - Enter while editing a non-central node: add sibling.
  - Escape: cancel/finish editing without leaving stale state.

- [ ] Phase 3: Extract mind map helpers in `overlay.js`.
  - Add helpers such as `getMindmapNodes()`, `findMindmapNodeAtPoint()`, `findMindmapAddButtonAtPoint()`, `getMindmapSubtreeIds()`, `getMindmapCentralNode()`, and `createMindmapNode()`.
  - Keep coordinate conversion in one place and consistently account for `boardZoom`, `boardPanX`, and `boardPanY`.
  - Avoid direct repeated tree scans in pointer handlers where helper functions can make behavior clearer.

- [ ] Phase 4: Fix async add/layout/edit ordering.
  - Change child/central creation flows to await `window.appBridge.addStroke(newNode)`.
  - Update local scene optimistically in one controlled helper or wait for `scene:changed` before layout/edit.
  - Ensure `layoutMindmap()` runs against a scene that includes the new node.
  - Open the text editor after the new node has a stable position.

- [ ] Phase 5: Make dragging complete.
  - Allow dragging central, main, and sub nodes.
  - If a node is dragged, move its full subtree by the same delta.
  - If a node is clicked without movement, open edit mode.
  - Store drag state locally without mutating persisted scene until pointerup, or explicitly mark optimistic mutations and reconcile on scene broadcasts.

- [ ] Phase 6: Clear transient state reliably.
  - Extend `resetInteractionState()` to clear `window.isDraggingMindmapNode`, `window.hoveredAddButton`, mind map cursor state, and pending mind map editor state.
  - Clear mind map hover/drag state when active tool changes away from `mindmap`.
  - Clear stale hover state when scene changes remove a node.

- [ ] Phase 7: Improve node text and layout.
  - Wrap text inside nodes instead of single-line truncation.
  - Measure text and adjust node height before layout.
  - Keep central/main/sub node minimum dimensions stable.
  - Ensure connector curves attach to the visual node bounds after layout.

- [ ] Phase 8: Harden persistence and undo.
  - Persist new nodes, text updates, layout updates, and subtree drag updates as a single logical operation where possible.
  - Confirm undo removes an added node or reverses a move without leaving orphan children.
  - Confirm deleting or erasing a mind map node either deletes the subtree or uses an explicit rule.

- [ ] Phase 9: Add regression tests.
  - Add static verifier coverage for `mindmap` in toolbar, main, overlay handlers, and normalizeStroke.
  - Add pure helper tests for tree traversal, central lookup, child/sibling creation, layout positions, and subtree movement if helpers are exportable or testable.
  - Add verifier checks that `resetInteractionState()` clears mind map-specific state.
  - Add a smoke-style pointer scenario if practical: create central, add child, drag child, edit text.

- [ ] Phase 10: Manual QA.
  - Select Mind Map from toolbar and confirm toolbar active state.
  - Click empty board/desktop and create exactly one central node.
  - Type central topic and commit.
  - Use plus button to add a child; confirm connector and editor placement.
  - Use Tab to add child and Enter to add sibling from editor.
  - Drag central node and confirm entire map moves.
  - Drag child/sub node and confirm its subtree moves.
  - Switch tools mid-hover/mid-drag and confirm no stale plus button or cursor remains.
  - Save/load session and confirm mind map structure persists.
  - Export/screenshot and confirm mind map nodes/connectors render.

## Acceptance Checks

- [ ] `npm test` passes.
- [ ] Mind Map appears in the tool-state verifier and is covered by regression checks.
- [ ] Mind Map mode creates exactly one central node when no central exists.
- [ ] New child/sibling nodes appear in the right place and immediately edit reliably.
- [ ] Node text commits reliably on blur, Enter/Tab flows, and Escape.
- [ ] Any node can be dragged according to the accepted UX.
- [ ] Tool switches clear mind map hover, drag, editor, and cursor state.
- [ ] Layout never loses or overlaps newly created nodes after async scene updates.
- [ ] Session save/load preserves parent-child relationships.

## Risks

- Current logic mutates renderer `scene.annotations` directly, so refactoring must avoid fighting main-process scene broadcasts.
- Mind map behavior shares text editor code with generic text annotations; changes can accidentally affect the text tool.
- Electron pointer capture and overlay mouse routing need live manual QA, not only static tests.

## Verification

- `npm test` was run on 2026-07-09 and failed at `scripts/verify-tool-state.js` because `calligraphy` and `mindmap` are missing from the verifier's known tool list.

## Handoff Notes

- No product implementation was performed for this task.
- Start with the failing verifier so implementation has a green/red feedback loop.
- The most important runtime fixes are async add/layout/edit ordering and clearing mind map-specific transient state on mode changes.
