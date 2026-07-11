# Graph Report - epic-pen-clone  (2026-07-11)

## Corpus Check
- 54 files · ~42,636 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 748 nodes · 994 edges · 68 communities (65 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b202ce5f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_main.js|main.js]]
- [[_COMMUNITY_settings.js|settings.js]]
- [[_COMMUNITY_agent-hub.js|agent-hub.js]]
- [[_COMMUNITY_overlay.js|overlay.js]]
- [[_COMMUNITY_toolbar.js|toolbar.js]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_Multi-Agent Collaboration Protocol|Multi-Agent Collaboration Protocol]]
- [[_COMMUNITY_Set up multi-agent collaboration system|Set up multi-agent collaboration system]]
- [[_COMMUNITY_Sprint 1 and 2 Features Complete|Sprint 1 and 2 Features Complete]]
- [[_COMMUNITY_Epic Pen UI Redesign|Epic Pen UI Redesign]]
- [[_COMMUNITY_Color Picker and Orientation Toggle|Color Picker and Orientation Toggle]]
- [[_COMMUNITY_compact-ui-and-modern-icons|compact-ui-and-modern-icons]]
- [[_COMMUNITY_refinement-sprint-bugs-and-persistence|refinement-sprint-bugs-and-persistence]]
- [[_COMMUNITY_Responsive Docking and Sidebar Cutoff Fix|Responsive Docking and Sidebar Cutoff Fix]]
- [[_COMMUNITY_Epic Pen scale toolbar and icon audit|Epic Pen scale toolbar and icon audit]]
- [[_COMMUNITY_Audit broken tools and correction plan|Audit broken tools and correction plan]]
- [[_COMMUNITY_{{title}}|{{title}}]]
- [[_COMMUNITY_Screen Annotation App Technical Architecture|Screen Annotation App Technical Architecture]]
- [[_COMMUNITY_verify-ipc-contract.js|verify-ipc-contract.js]]
- [[_COMMUNITY_Overlay Ink — QA Regression & Smoke Test Checklist|Overlay Ink — QA Regression & Smoke Test Checklist]]
- [[_COMMUNITY_verify-dom-ids.js|verify-dom-ids.js]]
- [[_COMMUNITY_verify-tool-state.js|verify-tool-state.js]]
- [[_COMMUNITY_Task Magnifier Background, Enhanced Auto-Shapes, and Highlighter Blending|Task: Magnifier Background, Enhanced Auto-Shapes, and Highlighter Blending]]
- [[_COMMUNITY_Task Compact Toolbar Reorganization & Scrble Ink Whiteboard Upgrades|Task: Compact Toolbar Reorganization & Scrble Ink Whiteboard Upgrades]]
- [[_COMMUNITY_Agent Operating Rules|Agent Operating Rules]]
- [[_COMMUNITY_Task Freehand Auto-Shape Recognition & Instant Reversion Hotkey|Task: Freehand Auto-Shape Recognition & Instant Reversion Hotkey]]
- [[_COMMUNITY_21. Milestone-Based Implementation Plan|21. Milestone-Based Implementation Plan]]
- [[_COMMUNITY_8. Interaction Modes|8. Interaction Modes]]
- [[_COMMUNITY_Task Toolbar Compactness, Sharp Square UI, Redundant Flyout Removal & Interaction Fixes|Task: Toolbar Compactness, Sharp Square UI, Redundant Flyout Removal & Interaction Fixes]]
- [[_COMMUNITY_10. State Management|10. State Management]]
- [[_COMMUNITY_6. Application Layers|6. Application Layers]]
- [[_COMMUNITY_Agent Hub|Agent Hub]]
- [[_COMMUNITY_Antigravity Implementer Role|Antigravity Implementer Role]]
- [[_COMMUNITY_Codex Planner Role|Codex Planner Role]]
- [[_COMMUNITY_4. Technology Decisions|4. Technology Decisions]]
- [[_COMMUNITY_7. Window Architecture|7. Window Architecture]]
- [[_COMMUNITY_9. Canvas and Scene Model|9. Canvas and Scene Model]]
- [[_COMMUNITY_Generic Agent Role|Generic Agent Role]]
- [[_COMMUNITY_11. Input Handling|11. Input Handling]]
- [[_COMMUNITY_12. IPC Design|12. IPC Design]]
- [[_COMMUNITY_13. Persistence Architecture|13. Persistence Architecture]]
- [[_COMMUNITY_14. Export and Capture Architecture|14. Export and Capture Architecture]]
- [[_COMMUNITY_15. Global Shortcuts|15. Global Shortcuts]]
- [[_COMMUNITY_16. Multi-Monitor Architecture|16. Multi-Monitor Architecture]]
- [[_COMMUNITY_17. Performance Strategy|17. Performance Strategy]]
- [[_COMMUNITY_18. Reliability and Recovery|18. Reliability and Recovery]]
- [[_COMMUNITY_22. Key Risks|22. Key Risks]]
- [[_COMMUNITY_3. Scope|3. Scope]]
- [[_COMMUNITY_19. Security Model|19. Security Model]]
- [[_COMMUNITY_preload.js|preload.js]]
- [[_COMMUNITY_graphify|graphify.md]]
- [[_COMMUNITY_graphify|graphify.md]]
- [[_COMMUNITY_Task Scrble-Style Endless Whiteboard Pagination & Notes Saving|Task: Scrble-Style Endless Whiteboard Pagination & Notes Saving]]
- [[_COMMUNITY_Fix broken tools after feature updates|Fix broken tools after feature updates]]
- [[_COMMUNITY_verify-js-syntax.js|verify-js-syntax.js]]
- [[_COMMUNITY_Separate whiteboard and transparent annotations|Separate whiteboard and transparent annotations]]
- [[_COMMUNITY_verify-scene-store-separation.js|verify-scene-store-separation.js]]
- [[_COMMUNITY_Task Board Toolbar Reorganization & Overlay Navigation|Task: Board Toolbar Reorganization & Overlay Navigation]]
- [[_COMMUNITY_Fix toolbar layout overflows|Fix toolbar layout overflows]]
- [[_COMMUNITY_2. Product Objectives|2. Product Objectives]]
- [[_COMMUNITY_Toolbar controls functionality audit and fix plan|Toolbar controls functionality audit and fix plan]]
- [[_COMMUNITY_Fix main icon click drag behavior|Fix main icon click drag behavior]]
- [[_COMMUNITY_Fix cursor clearing grouped tools|Fix cursor clearing grouped tools]]
- [[_COMMUNITY_verify-dialog-routing.js|verify-dialog-routing.js]]
- [[_COMMUNITY_verify-eraser-geometry.js|verify-eraser-geometry.js]]
- [[_COMMUNITY_Compact settings panel|Compact settings panel]]
- [[_COMMUNITY_Toolbar-attached settings|Toolbar-attached settings]]
- [[_COMMUNITY_Prominent pencil icon and tool fixes|Prominent pencil icon and tool fixes]]

## God Nodes (most connected - your core abstractions)
1. `broadcastState()` - 26 edges
2. `Screen Annotation App Technical Architecture` - 25 edges
3. `getShortcutActions()` - 18 edges
4. `broadcastScene()` - 14 edges
5. `deepClone()` - 12 edges
6. `Toolbar controls functionality audit and fix plan` - 12 edges
7. `updateTrayMenu()` - 11 edges
8. `Set up multi-agent collaboration system` - 11 edges
9. `Sprint 1 and 2 Features Complete` - 11 edges
10. `Epic Pen UI Redesign` - 11 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (68 total, 3 thin omitted)

### Community 0 - "main.js"
Cohesion: 0.06
Nodes (89): addStroke(), { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, nativeImage, screen, desktopCapturer, clipboard, dialog }, applyHotkeys(), applySettingsPayload(), autoArchiveCurrentSession(), broadcastScene(), broadcastState(), captureMagnifierBackground() (+81 more)

### Community 1 - "settings.js"
Cohesion: 0.12
Nodes (32): ACTIONS, applyDraftToUi(), appState, beginCapture(), buildDraftFromAppState(), clone(), collectDraftFromUi(), DEFAULT_SETTINGS (+24 more)

### Community 2 - "agent-hub.js"
Cohesion: 0.13
Nodes (31): allowedTypes, appendMessage(), commandBrief(), commandHelp(), commandList(), commandNew(), commandNote(), commandPhase() (+23 more)

### Community 3 - "overlay.js"
Cohesion: 0.11
Nodes (34): bootstrapApp(), canDraw(), canvas, checkAutoAdvance(), clearSelection(), clickRipples, createStrokeFromEvent(), createTextEditor() (+26 more)

### Community 4 - "toolbar.js"
Cohesion: 0.08
Nodes (40): appContainer, appState, closeAllPopovers(), collectToolbarSettingsDraft(), COLORS, currentBrushValue(), elements, ensureActiveSwatch() (+32 more)

### Community 5 - "package.json"
Cohesion: 0.11
Nodes (17): author, description, devDependencies, electron, keywords, license, main, name (+9 more)

### Community 6 - "Multi-Agent Collaboration Protocol"
Cohesion: 0.17
Nodes (11): Antigravity Implementer, Codex Planner, Conflict Rules, Design Goal, Future Agent, Message Contract, Multi-Agent Collaboration Protocol, Quality Bar (+3 more)

### Community 7 - "Set up multi-agent collaboration system"
Cohesion: 0.17
Nodes (11): Acceptance Checks, Constraints, Context Read, Current Phase, Goal, Handoff Notes, Owners, Plan (+3 more)

### Community 8 - "Sprint 1 and 2 Features Complete"
Cohesion: 0.17
Nodes (11): Acceptance Checks, Constraints, Context Read, Current Phase, Goal, Handoff Notes, Owners, Plan (+3 more)

### Community 9 - "Epic Pen UI Redesign"
Cohesion: 0.17
Nodes (11): Acceptance Checks, Constraints, Context Read, Current Phase, Epic Pen UI Redesign, Goal, Handoff Notes, Owners (+3 more)

### Community 10 - "Color Picker and Orientation Toggle"
Cohesion: 0.17
Nodes (11): Acceptance Checks, Color Picker and Orientation Toggle, Constraints, Context Read, Current Phase, Goal, Handoff Notes, Owners (+3 more)

### Community 11 - "compact-ui-and-modern-icons"
Cohesion: 0.17
Nodes (11): Acceptance Checks, compact-ui-and-modern-icons, Constraints, Context Read, Current Phase, Goal, Handoff Notes, Owners (+3 more)

### Community 12 - "refinement-sprint-bugs-and-persistence"
Cohesion: 0.17
Nodes (11): Acceptance Checks, Constraints, Context Read, Current Phase, Goal, Handoff Notes, Owners, Plan (+3 more)

### Community 13 - "Responsive Docking and Sidebar Cutoff Fix"
Cohesion: 0.17
Nodes (11): Acceptance Checks, Constraints, Context Read, Current Phase, Goal, Handoff Notes, Owners, Plan (+3 more)

### Community 14 - "Epic Pen scale toolbar and icon audit"
Cohesion: 0.17
Nodes (11): Acceptance Checks, Constraints, Context Read, Current Phase, Epic Pen scale toolbar and icon audit, Goal, Handoff Notes, Owners (+3 more)

### Community 15 - "Audit broken tools and correction plan"
Cohesion: 0.17
Nodes (11): Acceptance Checks, Audit broken tools and correction plan, Constraints, Context Read, Current Phase, Goal, Handoff Notes, Owners (+3 more)

### Community 16 - "{{title}}"
Cohesion: 0.17
Nodes (11): Acceptance Checks, Constraints, Context Read, Current Phase, Goal, Handoff Notes, Owners, Plan (+3 more)

### Community 17 - "Screen Annotation App Technical Architecture"
Cohesion: 0.13
Nodes (14): 19. Security Model, 1. Purpose, 20.1 Automated Knowledge Graph Sync, 20. Project Structure, 23. Recommended First Implementation Target, 24. Open Decisions, 2. Product Objectives, 5. System Overview (+6 more)

### Community 18 - "verify-ipc-contract.js"
Cohesion: 0.18
Nodes (10): fs, handledChannels, invokedChannels, listenedChannels, mainContent, mainPath, path, preloadContent (+2 more)

### Community 19 - "Overlay Ink — QA Regression & Smoke Test Checklist"
Cohesion: 0.20
Nodes (9): 1. ✍️ Basic Drawing & Erasing, 2. 📝 Text Note Tool, 3. ✋ Select & Move (Lasso Transformation), 4. 🌐 Background Modes & Click Ripple Halo, 5. 🔴 Laser Pointer Presentation Tool, 6. 💾 Settings & Schema Persistence (v2 Schema), 7. 📸 Screenshot Export Workflow, 8. 🤖 Automated Knowledge Graph & Git Verification (+1 more)

### Community 20 - "verify-dom-ids.js"
Cohesion: 0.17
Nodes (11): declaredElementKeys, elementsObject, fs, htmlContent, htmlIds, jsContent, jsIds, path (+3 more)

### Community 21 - "verify-tool-state.js"
Cohesion: 0.17
Nodes (11): fs, htmlContent, htmlTools, knownToolsInMain, mainContent, mainPath, overlayContent, overlayPath (+3 more)

### Community 22 - "Task: Magnifier Background, Enhanced Auto-Shapes, and Highlighter Blending"
Cohesion: 0.25
Nodes (7): Phase 1: Intake, Phase 2: Analysis, Phase 3: Plan, Phase 4: Implementation, Phase 5: Review & Verification, Phase 6: Handoff, Task: Magnifier Background, Enhanced Auto-Shapes, and Highlighter Blending

### Community 23 - "Task: Compact Toolbar Reorganization & Scrble Ink Whiteboard Upgrades"
Cohesion: 0.25
Nodes (7): Phase 1: Intake, Phase 2: Analysis, Phase 3: Plan, Phase 4: Implementation, Phase 5 & 6: Review & Verify, Phase 7: Handoff, Task: Compact Toolbar Reorganization & Scrble Ink Whiteboard Upgrades

### Community 24 - "Agent Operating Rules"
Cohesion: 0.25
Nodes (7): Agent Operating Rules, Agent Roles, Collaboration Protocol, Commands, Done Criteria, Project Context, Working Rules

### Community 25 - "Task: Freehand Auto-Shape Recognition & Instant Reversion Hotkey"
Cohesion: 0.29
Nodes (6): Phase 1: Intake, Phase 2: Analysis, Phase 3: Plan, Phase 5: Review & Verification, Phase 6: Handoff, Task: Freehand Auto-Shape Recognition & Instant Reversion Hotkey

### Community 26 - "21. Milestone-Based Implementation Plan"
Cohesion: 0.29
Nodes (7): 21. Milestone-Based Implementation Plan, Milestone 1: Foundation, Milestone 2: Annotation MVP, Milestone 3: Desktop Utility Features, Milestone 4: Export and Capture, Milestone 5: Advanced Annotation, Milestone 6: Differentiating Features

### Community 27 - "8. Interaction Modes"
Cohesion: 0.29
Nodes (7): 8. Interaction Modes, Drawing, Editing, Hidden, Mode transitions, Modes, Passive overlay

### Community 28 - "Task: Toolbar Compactness, Sharp Square UI, Redundant Flyout Removal & Interaction Fixes"
Cohesion: 0.33
Nodes (5): Phase 1: Intake, Phase 2: Analysis, Phase 3: Plan, Phase 4: Implementation, Task: Toolbar Compactness, Sharp Square UI, Redundant Flyout Removal & Interaction Fixes

### Community 29 - "10. State Management"
Cohesion: 0.33
Nodes (6): 10.1 App shell state, 10.2 Tool state, 10.3 Scene state, 10.4 History state, 10.5 Preferences state, 10. State Management

### Community 30 - "6. Application Layers"
Cohesion: 0.33
Nodes (6): 6.1 Main process, 6.2 Overlay renderer, 6.3 Toolbar renderer, 6.4 Settings and persistence layer, 6.5 Platform integration layer, 6. Application Layers

### Community 31 - "Agent Hub"
Cohesion: 0.40
Nodes (4): Agent Hub, Core Files, Quick Start, Recommended Loop

### Community 32 - "Antigravity Implementer Role"
Cohesion: 0.40
Nodes (4): Antigravity Implementer Role, Before Editing, Handoff Back To Codex, Implementation Rules

### Community 33 - "Codex Planner Role"
Cohesion: 0.40
Nodes (4): Before Planning, Codex Planner Role, Planning Output, Review Output

### Community 34 - "4. Technology Decisions"
Cohesion: 0.40
Nodes (5): 4. Technology Decisions, Core stack, Why a scene-based canvas model, Why Electron, Why TypeScript

### Community 35 - "7. Window Architecture"
Cohesion: 0.40
Nodes (5): 7.1 Window types, 7.2 Overlay windows, 7.3 Toolbar window, 7.4 Settings window, 7. Window Architecture

### Community 36 - "9. Canvas and Scene Model"
Cohesion: 0.40
Nodes (5): 9.1 Scene-based approach, 9.2 Core entity types, 9.3 Shared annotation object shape, 9.4 Pages and layers, 9. Canvas and Scene Model

### Community 37 - "Generic Agent Role"
Cohesion: 0.50
Nodes (3): Entry Checklist, Generic Agent Role, Rule Of Thumb

### Community 38 - "11. Input Handling"
Cohesion: 0.50
Nodes (4): 11. Input Handling, Input routing rule, Keyboard input requirements, Pointer input requirements

### Community 39 - "12. IPC Design"
Cohesion: 0.50
Nodes (4): 12. IPC Design, Example channels, IPC principles, Security posture

### Community 40 - "13. Persistence Architecture"
Cohesion: 0.50
Nodes (4): 13.1 Preferences, 13.2 Saved sessions, 13.3 Versioning, 13. Persistence Architecture

### Community 41 - "14. Export and Capture Architecture"
Cohesion: 0.50
Nodes (4): 14. Export and Capture Architecture, Export pipeline, Important concerns, Initial export targets

### Community 42 - "15. Global Shortcuts"
Cohesion: 0.50
Nodes (4): 15. Global Shortcuts, Required first-release shortcuts, Shortcut architecture, UX requirement

### Community 43 - "16. Multi-Monitor Architecture"
Cohesion: 0.50
Nodes (4): 16. Multi-Monitor Architecture, Behavior options, Edge cases, Principles

### Community 44 - "17. Performance Strategy"
Cohesion: 0.50
Nodes (4): 17. Performance Strategy, Future optimization options, Performance targets, Tactics

### Community 45 - "18. Reliability and Recovery"
Cohesion: 0.50
Nodes (4): 18. Reliability and Recovery, Logging, Recovery expectations, Startup expectations

### Community 46 - "22. Key Risks"
Cohesion: 0.50
Nodes (4): 22. Key Risks, Product risks, Risk mitigation, Technical risks

### Community 47 - "3. Scope"
Cohesion: 0.50
Nodes (4): 3. Scope, Initial platform target, Initial release capabilities, Later release capabilities

### Community 48 - "19. Security Model"
Cohesion: 0.20
Nodes (9): Analysis, Constraints, Current Phase, Goal, Handoff Notes, Owners, Plan, Quiet toolbar redesign (+1 more)

### Community 52 - "Task: Scrble-Style Endless Whiteboard Pagination & Notes Saving"
Cohesion: 0.50
Nodes (3): Implementation Checklist, Phase History, Task: Scrble-Style Endless Whiteboard Pagination & Notes Saving

### Community 53 - "Fix broken tools after feature updates"
Cohesion: 0.17
Nodes (11): Acceptance Checks, Constraints, Context Read, Current Phase, Fix broken tools after feature updates, Goal, Handoff Notes, Owners (+3 more)

### Community 54 - "verify-js-syntax.js"
Cohesion: 0.25
Nodes (6): files, fs, path, rootDir, { spawnSync }, syntaxRoots

### Community 55 - "Separate whiteboard and transparent annotations"
Cohesion: 0.17
Nodes (11): Acceptance Checks, Constraints, Context Read, Current Phase, Goal, Handoff Notes, Owners, Plan (+3 more)

### Community 56 - "verify-scene-store-separation.js"
Cohesion: 0.29
Nodes (6): fs, loadStateMatch, mainContent, mainPath, path, setBackgroundModeMatch

### Community 57 - "Task: Board Toolbar Reorganization & Overlay Navigation"
Cohesion: 0.33
Nodes (5): Implementation Details, Objective, Requirements, Task: Board Toolbar Reorganization & Overlay Navigation, Verification

### Community 58 - "Fix toolbar layout overflows"
Cohesion: 0.20
Nodes (9): Acceptance Checks, Constraints, Context Read, Current Phase, Fix toolbar layout overflows, Goal, Owners, Plan (+1 more)

### Community 59 - "2. Product Objectives"
Cohesion: 0.22
Nodes (8): Automated Tests, Changes Made, 🎨 CSS & Vector Aesthetics, ⚙️ JavaScript Interaction & Hover Click-Through, Manual Verification, Verification Results, ✨ Visual Upgrades (Header & Active Selection Highlights), Walkthrough — Toolbar Layout & Premium Aesthetics

### Community 60 - "Toolbar controls functionality audit and fix plan"
Cohesion: 0.15
Nodes (12): Acceptance Checks, Constraints, Context Read, Current Phase, Findings, Goal, Handoff Notes, Owners (+4 more)

### Community 61 - "Fix main icon click drag behavior"
Cohesion: 0.17
Nodes (11): Acceptance Checks, Constraints, Context Read, Current Phase, Fix main icon click drag behavior, Goal, Handoff Notes, Owners (+3 more)

### Community 62 - "Fix cursor clearing grouped tools"
Cohesion: 0.17
Nodes (11): Acceptance Checks, Constraints, Context Read, Current Phase, Fix cursor clearing grouped tools, Goal, Handoff Notes, Owners (+3 more)

### Community 63 - "verify-dialog-routing.js"
Cohesion: 0.40
Nodes (4): fs, mainContent, mainPath, path

### Community 64 - "verify-eraser-geometry.js"
Cohesion: 0.40
Nodes (4): fs, mainContent, mainPath, path

### Community 65 - "Compact settings panel"
Cohesion: 0.22
Nodes (8): Compact settings panel, Constraints, Current Phase, Goal, Handoff Notes, Owners, Plan, Verification

### Community 66 - "Toolbar-attached settings"
Cohesion: 0.22
Nodes (8): Constraints, Current Phase, Goal, Handoff Notes, Owners, Plan, Toolbar-attached settings, Verification

### Community 67 - "Prominent pencil icon and tool fixes"
Cohesion: 0.22
Nodes (8): Constraints, Current Phase, Goal, Handoff Notes, Owners, Plan, Prominent pencil icon and tool fixes, Verification

## Knowledge Gaps
- **441 isolated node(s):** `{ app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, nativeImage, screen, desktopCapturer, clipboard, dialog }`, `fs`, `path`, `{ pathToFileURL }`, `DEFAULT_STATE` (+436 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Screen Annotation App Technical Architecture` connect `Screen Annotation App Technical Architecture` to `4. Technology Decisions`, `7. Window Architecture`, `9. Canvas and Scene Model`, `11. Input Handling`, `12. IPC Design`, `13. Persistence Architecture`, `14. Export and Capture Architecture`, `15. Global Shortcuts`, `16. Multi-Monitor Architecture`, `17. Performance Strategy`, `18. Reliability and Recovery`, `22. Key Risks`, `3. Scope`, `21. Milestone-Based Implementation Plan`, `8. Interaction Modes`, `10. State Management`, `6. Application Layers`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `8. Interaction Modes` connect `8. Interaction Modes` to `Screen Annotation App Technical Architecture`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `21. Milestone-Based Implementation Plan` connect `21. Milestone-Based Implementation Plan` to `Screen Annotation App Technical Architecture`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `{ app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, nativeImage, screen, desktopCapturer, clipboard, dialog }`, `fs`, `path` to the rest of the system?**
  _441 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.js` be split into smaller, more focused modules?**
  _Cohesion score 0.055482456140350876 - nodes in this community are weakly interconnected._
- **Should `settings.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11932773109243698 - nodes in this community are weakly interconnected._
- **Should `agent-hub.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13306451612903225 - nodes in this community are weakly interconnected._