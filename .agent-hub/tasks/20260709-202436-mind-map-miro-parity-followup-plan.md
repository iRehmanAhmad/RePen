# Mind map Miro-parity follow-up audit and plan

Task ID: `20260709-202436-mind-map-miro-parity-followup-plan`

## Goal

Re-audit the implemented Mind Map tool after user changes, compare it with the Miro-style behavior requested by the user, and prepare the next detailed implementation plan without changing product code.

## Current Phase

`plan`

## Owners

- Planner: `codex`
- Implementer: `antigravity`
- Reviewer: `codex`

## Constraints

- User requested another check and a detailed plan.
- Preserve existing modified files.
- Do not implement product code in this pass.
- Align the next work with Miro-like mind map behavior: parent node launch, plus child creation, node rename, drag/rearrange branches, auto layout, and polished visual controls.

## Context Read

- [x] `src/renderer/toolbar.html`
- [x] `src/renderer/toolbar.js`
- [x] `src/renderer/overlay.js`
- [x] `main.js`
- [x] `scripts/verify-tool-state.js`
- [x] Previous plan: `20260709-200947-mind-map-tool-audit-and-fix-plan.md`
- [x] Miro mind map reference page: `https://miro.com/mind-map/`

## Baseline

- `npm test` passes on 2026-07-09 after the user's implementation.
- `scripts/verify-tool-state.js` now recognizes `calligraphy` and `mindmap`.
- Mind map helpers now exist in `src/renderer/overlay.js`.
- Mind map-specific reset now clears `window.isDraggingMindmapNode` and `window.hoveredAddButton`.
- Subtree drag logic now exists.

## Reference Behavior From Miro

Miro's public mind map page describes:

- Starting from a default parent/central node.
- Double-clicking the central node to rename it.
- Clicking plus icons on either side of nodes to create child nodes.
- Dragging and repositioning branches freely.
- Auto Layout keeping the map aligned as nodes move or new nodes are created.
- Custom colors, images, fonts, shapes, and polished presentation/export options.
- Infinite canvas behavior for maps that grow without tight bounds.

## Current Findings

1. Test baseline is now green, so the remaining problem is product behavior rather than syntax/IPC wiring.
2. The new hit-test helpers use `node.x * boardZoom + boardPanX` and `node.y * boardZoom + boardPanY`, but rendering uses `globalToLocal({ x: node.x, y: node.y })`. This ignores `displayBounds` and can make hover/click/plus detection miss visible nodes, especially with non-zero display bounds or multi-monitor positioning.
3. Mind map creation still uses optimistic `scene.annotations.push(newNode)` before `window.appBridge.addStroke(newNode)`. Because `scene:changed` later replaces `scene`, this can create flicker, duplicate-like transient behavior, or layout based on objects not yet acknowledged by main.
4. Plus-button child creation still opens `createTextEditor(event.clientX, event.clientY, newNode)`, using the click location instead of the final laid-out node position. If layout moves the child, the editor can appear away from the new node.
5. Tab and Enter creation inside `createTextEditor()` still build raw node objects rather than using `createMindmapNode()`, so defaults and behavior are inconsistent between mouse and keyboard creation.
6. Keyboard child/sibling creation still calls `createTextEditor(0, 0, newNode)`, which can place the editor at the wrong screen location until the next render/layout cycle.
7. `layoutMindmap()` still mutates node objects from `scene.annotations` directly, then persists the mutated list. This makes undo/reconciliation fragile and complicates live scene updates.
8. Auto layout is one-sided: all children are placed to the right. Miro-style maps need plus handles and branch growth on both sides of the central node, or at least a deliberate one-sided design with clear expectations.
9. No explicit selection state exists for mind map nodes. The tool jumps from hover to drag/edit, but does not show a selected node with controls, styling, or keyboard actions.
10. No double-click rename path exists for mind map nodes. Current click-without-drag opens the editor after pointerup, which can feel accidental and conflicts with drag initiation.
11. The plus affordance is only drawn while hovering/near a node, and only on the right side. Miro-style behavior expects clear plus controls on either side of nodes.
12. Text rendering still truncates to one line with ellipsis; node text does not wrap and node height does not grow to fit content.
13. Node editing uses the generic text editor with transparent styling, not an in-node editor that matches the node shape. This feels unlike Miro.
14. Branch drag currently moves a subtree but does not reparent when dropped near another node. Miro-like rearrangement usually supports branch repositioning and structure changes.
15. There are no targeted automated tests for mind map hit testing, helper coordinate conversion, child creation, editor placement, subtree drag, or layout.
16. Settings normalization still omits `brushDefaults.calligraphy`; this is adjacent technical debt from the same tool group and should be cleaned up while tool-state work is active.

## Recommended Product Target

Build Mind Map as a lightweight board object mode:

- Mind Map mode starts a map with one central node.
- Node click selects; double-click edits.
- Selected/hovered node shows plus handles.
- Plus handles create a child on the chosen side and immediately focus an in-node editor.
- Tab creates child; Enter creates sibling; Shift+Enter inserts newline.
- Dragging a node moves its branch; dropping near another node can reparent in a later phase.
- Auto Layout keeps branches readable and avoids overlap.
- Text wraps inside nodes, and nodes resize to fit reasonable content.

## Next Implementation Plan

- [ ] Phase 1: Fix coordinate consistency first.
  - Replace manual hit-test math in `findMindmapNodeAtPoint()` and `findMindmapAddButtonAtPoint()` with `globalToLocal()` or a shared `mindmapNodeToScreenRect(node)` helper.
  - Ensure rendering, hovering, clicking, dragging, and plus buttons use the same coordinate conversion.
  - Add a regression verifier that fails if mind map hit tests bypass `globalToLocal()`/shared conversion.

- [ ] Phase 2: Replace optimistic scene mutation with a reliable create pipeline.
  - Add `async addMindmapNode(node, { layout, edit })`.
  - Do not directly `scene.annotations.push(newNode)` in pointer handlers.
  - Either await main-process `addStroke()` and then update local scene from the returned/broadcast state, or update through a single controlled optimistic helper that deduplicates on `scene:changed`.
  - Open the editor only after the node's final screen rect is known.

- [ ] Phase 3: Unify mouse and keyboard creation.
  - Make Tab, Enter, plus-button, and empty-canvas creation all call `createMindmapNode()` and the same `addMindmapNode()` flow.
  - Remove raw duplicate node construction inside `createTextEditor()`.
  - Ensure child/sibling color, size, node type, parent ID, and side are assigned consistently.

- [ ] Phase 4: Implement Miro-like interaction states.
  - Add `selectedMindmapNodeId`.
  - Click selects a node.
  - Double-click opens rename.
  - Drag threshold starts branch drag.
  - Escape exits edit/selection cleanly.
  - Delete removes selected node using the accepted subtree/orphan policy.
  - Tool switch clears selected/hovered/drag/edit state.

- [ ] Phase 5: Add visible node controls.
  - Draw plus handles on selected/hovered nodes.
  - For central nodes, draw left and right plus handles.
  - For child nodes, at least draw the outward plus handle; optionally draw both directions for rebalancing.
  - Use a stable hit target independent of zoom so controls remain usable.
  - Add cursor states: default, pointer on handle, grab on node, grabbing during drag, text while editing.

- [ ] Phase 6: Upgrade layout.
  - Store `side: 'left' | 'right'` for first-level branches.
  - Layout left branches to the left and right branches to the right of the central node.
  - Keep branch color inherited from first-level branch.
  - Avoid overlap using subtree height calculation per side.
  - Add an `autoLayoutMindmap(centralId)` command that can be called after creation/edit/drag.

- [ ] Phase 7: Improve node text and editing.
  - Add text wrapping in `drawStroke()` for mind map nodes.
  - Measure text lines and adjust node height before layout.
  - Use an in-node editor styled like the node, not the generic transparent text editor.
  - Shift+Enter should insert a newline; Enter should commit or create sibling depending on mode.

- [ ] Phase 8: Define branch drag behavior.
  - Phase 8A: Drag moves a node and its subtree without immediately auto-layout snapping it back.
  - Phase 8B: Add optional reparenting when dropped near another node.
  - Phase 8C: Add "Auto layout" action to clean up after free dragging.
  - Record the chosen behavior in QA docs so users and agents know what to expect.

- [ ] Phase 9: Improve visual design toward Miro.
  - Central node: larger, bold filled pill.
  - First-level branches: colored outlines and connector lines.
  - Child nodes: lighter cards/pills inheriting branch color.
  - Smooth curved connectors with consistent attachment points.
  - Selection outline and small inline action buttons.
  - Avoid over-decorating; keep it fast and readable as an overlay tool.

- [ ] Phase 10: Add targeted tests.
  - Mind map coordinate conversion verifier.
  - Helper tests for subtree IDs and side-aware layout.
  - Static check that all node creation paths call the shared factory.
  - Static check that reset clears selected/hovered/drag state.
  - Add QA checklist entries for Miro-style flows.

- [ ] Phase 11: Manual QA.
  - Create map from empty canvas.
  - Double-click rename central node.
  - Add child from plus handle.
  - Add child with Tab and sibling with Enter.
  - Drag central node, first-level branch, and sub-node.
  - Switch tools while hovering/dragging/editing.
  - Zoom/pan board, then click nodes and plus handles.
  - Test on non-primary monitor if possible.
  - Save/load and export/screenshot.

## Acceptance Checks

- [ ] `npm test` passes.
- [ ] Node hit testing matches visual rendering at zoom, pan, and non-zero display bounds.
- [ ] Every node creation path uses the same factory and persistence pipeline.
- [ ] Editor opens exactly on the node being edited.
- [ ] Click, double-click, drag, Tab, Enter, Escape, and Delete have predictable behavior.
- [ ] Plus handles are visible and usable like a real mind map tool.
- [ ] Branches can grow left/right around the central node.
- [ ] Text wraps and nodes resize cleanly.
- [ ] Dragging branches does not corrupt parent-child relationships.
- [ ] Manual QA evidence is recorded.

## Verification

- `npm test` passed on 2026-07-09 after the user's implementation.
- No live Electron manual QA was performed in this audit pass.

## Handoff Notes

- Start with coordinate consistency. If hit testing is wrong, every higher-level Miro-like interaction will feel broken.
- Then unify all node creation paths. The current mouse and keyboard creation paths still diverge.
- The Miro target should be built as interaction states and model helpers, not by adding more special cases inside pointer handlers.
