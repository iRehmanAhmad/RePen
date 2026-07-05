# Screen Annotation App Technical Architecture

## 1. Purpose

This document defines the technical architecture for a Windows-first desktop screen annotation application inspired by the workflow category of tools like Epic Pen, but implemented as an original product with expanded capabilities.

The goal is to provide a stable foundation for an always-on-top overlay app that lets users draw, highlight, annotate, capture, and present over any application with low latency and clear mode switching.

## 2. Product Objectives

### Primary objectives

- Provide fast, low-latency screen annotation on top of any desktop app.
- Make mode switching between drawing and normal desktop interaction feel instant and obvious.
- Support practical presenter and teacher workflows with export, shortcuts, and multi-monitor support.
- Establish an architecture that can grow into a more advanced feature set without requiring a rewrite.

### Non-objectives for the first release

- Full cross-platform parity across Windows, macOS, and Linux.
- Real-time collaboration.
- Cloud sync or user accounts.
- Complex plugin ecosystems.
- Full document-editing or whiteboard-suite scope.

## 3. Scope

### Initial platform target

- Windows 10 and Windows 11

### Initial release capabilities

- Transparent always-on-top overlay
- Floating toolbar
- Pen and highlighter tools
- Eraser
- Undo and redo
- Clear all annotations
- Global shortcuts
- Multi-monitor support
- Export annotated screenshots
- Tray icon and settings persistence

### Later release capabilities

- Shapes, arrows, and text
- Selection and transform tools
- Spotlight and laser pointer
- Multiple pages and layers
- Session save and load
- OCR and image paste
- Recording and richer export workflows

## 4. Technology Decisions

### Core stack

- Electron
- TypeScript
- React for interface windows
- Canvas scene engine using `Konva` or `Fabric.js`
- `electron-store` for preferences and simple persistence
- `electron-builder` for Windows packaging

### Why Electron

Electron is the best fit for the first version because it gives:

- Transparent frameless windows
- Global shortcuts
- Tray integration
- Fast iteration speed
- A large ecosystem for desktop packaging and updates

Electron also introduces overhead, but the app's bottlenecks will mostly be in overlay rendering and input handling rather than raw shell startup cost.

### Why TypeScript

TypeScript reduces risk in the areas most likely to become hard to maintain:

- IPC contracts
- Scene object models
- History actions
- Tool configuration
- Cross-window state messages

### Why a scene-based canvas model

The app should store annotation objects as structured scene data rather than only drawing pixels onto a bitmap. A scene model makes the following much easier:

- Undo and redo
- Selection and editing
- Export in multiple formats
- Session persistence
- Feature growth into layers and pages

## 5. System Overview

The application is composed of five main subsystems:

1. Main process
2. Overlay renderer
3. Toolbar renderer
4. Settings and persistence layer
5. Platform integration layer

### Conceptual architecture

```text
+-----------------------+
|    Electron Main      |
|-----------------------|
| window management     |
| tray                  |
| shortcuts             |
| persistence           |
| IPC routing           |
+-----------+-----------+
            |
   +--------+--------+
   |                 |
+--v-----------+ +---v-----------+
| Overlay Win  | | Toolbar Win   |
| Renderer     | | Renderer      |
|---------------| |---------------|
| canvas scene  | | tool controls |
| input events  | | status UI     |
| history       | | quick actions |
+---------------+ +---------------+
            |
   +--------v--------+
   | Shared Contracts |
   | types/constants  |
   +------------------+
```

## 6. Application Layers

### 6.1 Main process

The main process owns the operating-system-facing behavior and lifecycle.

Responsibilities:

- App startup and shutdown
- Creation of overlay, toolbar, and settings windows
- One overlay window per display
- Global shortcut registration
- Tray icon and tray menu actions
- Persistent settings load and save
- IPC routing between windows
- Display change detection
- Packaging hooks and auto-launch integration later

The main process should avoid holding annotation scene data except when required for coordination. Scene ownership should stay in the overlay renderer or in a shared store service that the overlay controls.

### 6.2 Overlay renderer

The overlay renderer is the core product experience.

Responsibilities:

- Render the transparent drawing surface
- Capture pointer and keyboard input in active modes
- Maintain or coordinate annotation scene state
- Handle drawing tools, editing tools, and history
- Export annotation output
- Support display-aware coordinates

The overlay renderer must optimize for responsiveness and minimal UI clutter. It should not contain application shell concerns such as tray logic or shortcut registration.

### 6.3 Toolbar renderer

The toolbar renderer provides fast tool switching and compact controls.

Responsibilities:

- Active tool selection
- Color and stroke controls
- Quick actions such as clear, undo, redo, export
- Visible indication of current mode
- Dispatching user actions to the main process or overlay

The toolbar should remain independent from the canvas engine so it can be redesigned later without destabilizing annotation logic.

### 6.4 Settings and persistence layer

This layer manages user configuration and session-related storage.

Responsibilities:

- Preferences such as colors, widths, last active tool, hotkeys, toolbar position
- Export defaults
- Future saved sessions and project metadata

Initial implementation should use JSON-backed `electron-store`. If the session model becomes large or query-heavy later, a SQLite-backed persistence layer can be added without changing the rest of the app contracts.

### 6.5 Platform integration layer

This layer abstracts Windows-specific behavior that should not be scattered across the codebase.

Responsibilities:

- Transparent window configuration
- Click-through toggling
- Display bounds and DPI normalization
- Screen capture coordination
- Future OS startup registration

This keeps platform details isolated and makes future macOS support more realistic.

## 7. Window Architecture

### 7.1 Window types

The application will use the following windows:

- Overlay windows
- Toolbar window
- Settings window

### 7.2 Overlay windows

Recommended approach:

- Create one overlay window per display.
- Each overlay window is frameless, transparent, always-on-top, and excluded from the taskbar.
- Each overlay window matches the bounds of its display.

Why one overlay per display:

- Easier multi-monitor coordination
- Cleaner DPI handling
- Fewer full-desktop coordinate edge cases
- Better behavior on differing monitor resolutions and scaling

Overlay window configuration goals:

- `transparent: true`
- `frame: false`
- `alwaysOnTop: true`
- `skipTaskbar: true`
- `resizable: false`
- `fullscreenable: false`

### 7.3 Toolbar window

The toolbar window is a compact, movable floating panel.

Expected behavior:

- Always available above the user workflow
- Small enough not to obstruct content
- Separate from the overlay so canvas repaints do not affect toolbar responsiveness
- Can later support collapse, pin, docking, or auto-hide

### 7.4 Settings window

The settings window is a normal desktop configuration surface and should not share overlay rendering responsibilities.

Expected behavior:

- Opened on demand
- Persists user preferences
- Used for hotkey editing, startup behavior, and export defaults

## 8. Interaction Modes

The product should have explicit interaction modes. Ambiguous click behavior is one of the biggest usability risks.

### Modes

- Hidden
- Passive overlay
- Drawing
- Editing

### Hidden

- Overlay windows are not shown.
- Toolbar may remain visible or minimize to tray, depending on user preference.

### Passive overlay

- Overlay is visible.
- Overlay ignores mouse input.
- Underlying applications receive normal clicks.
- Useful for temporarily viewing annotations while continuing desktop work.

### Drawing

- Overlay captures pointer input.
- Active tool can create strokes or shapes.
- Cursor and toolbar state must make it obvious that annotation is active.

### Editing

- Overlay captures selection and transform input.
- Objects can be moved, resized, deleted, reordered, or edited.

### Mode transitions

Transitions must be fast and intentional:

- Shortcut-driven
- Toolbar-driven
- Visually confirmed

Examples:

- `Toggle overlay`
- `Toggle pass-through`
- `Switch to pen`
- `Exit drawing mode`

## 9. Canvas and Scene Model

### 9.1 Scene-based approach

The canvas should render from a structured scene model rather than treating drawing as a single flattened bitmap.

### 9.2 Core entity types

Initial entities:

- `stroke`
- `highlightStroke`
- `eraserAction` or direct scene mutation
- `text`
- `rectangle`
- `ellipse`
- `line`
- `arrow`
- `image`

### 9.3 Shared annotation object shape

Each annotation object should include:

- `id`
- `type`
- `pageId`
- `layerId`
- `createdAt`
- `updatedAt`
- `bounds`
- `style`
- `transform`
- `data`

Example TypeScript model (v2 Schema Union):

```ts
type ToolType = 'pen' | 'highlighter' | 'eraser' | 'laser' | 'text' | 'shapes' | 'select';

interface AnnotationBase {
  id: string;
  tool: ToolType;
  color?: string;
  width?: number;
  opacity?: number;
}

interface StrokeAnnotation extends AnnotationBase {
  tool: 'pen' | 'highlighter' | 'laser';
  points: Array<{ x: number; y: number }>;
}

interface TextAnnotation extends AnnotationBase {
  tool: 'text';
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily?: string;
  fontSize?: number;
}

interface ShapeAnnotation extends AnnotationBase {
  tool: 'shapes';
  shapeType: 'rectangle' | 'circle' | 'line' | 'arrow';
  start: { x: number; y: number };
  end: { x: number; y: number };
  points?: Array<{ x: number; y: number }>;
}

type SceneAnnotation = StrokeAnnotation | TextAnnotation | ShapeAnnotation;
```

### 9.4 Pages and layers

The architecture should support pages and layers early in the data model even if the first UI does not expose them fully.

Reason:

- Prevents a rewrite when adding saved sessions or presentation boards
- Makes future "next page" workflows straightforward

Suggested initial model:

- One default page
- One default layer
- Hidden internal support for more

## 10. State Management

State should be separated by concern.

### 10.1 App shell state

- Overlay visibility
- Current mode
- Active display target
- Window positions
- Global status flags

### 10.2 Tool state

- Active tool
- Color
- Stroke width
- Opacity
- Fill and line style

### 10.3 Scene state

- Pages
- Layers
- Annotation objects
- Selection
- Clipboard data

### 10.4 History state

- Undo stack
- Redo stack
- Current transaction state

### 10.5 Preferences state

- Hotkeys
- Default colors
- Launch behavior
- Export folder
- UI preferences

Recommended approach:

- Use a lightweight store such as `zustand` or a reducer-based custom store in the renderer.
- Keep shared contracts in `src/shared`.
- Use narrow IPC messages instead of broad state mirroring across windows.

## 11. Input Handling

### Pointer input requirements

- Smooth freehand drawing
- Pressure ignored initially unless stylus support is added later
- Clear distinction between click, drag, and transform gestures
- Debounced or batched redraw scheduling

### Keyboard input requirements

- Shortcut support for tool switching
- Escape to cancel current action
- Delete/backspace to remove selected items
- Undo and redo shortcuts

### Input routing rule

Only the window responsible for the active interaction should own the input. The overlay should never partially consume input in a way that makes underlying apps feel unpredictable.

## 12. IPC Design

IPC should be explicit, typed, and minimal.

### IPC principles

- One-way event messages for simple commands
- Request-response only when data is needed back
- Shared type definitions for all message payloads
- No renderer should have unnecessary authority

### Example channels

- `app/toggle-overlay`
- `app/set-mode`
- `tool/set-active`
- `scene/undo`
- `scene/redo`
- `scene/clear`
- `scene/export`
- `prefs/get`
- `prefs/set`
- `display/changed`

### Security posture

- `contextIsolation: true`
- `nodeIntegration: false`
- Use preload scripts to expose a minimal API surface

## 13. Persistence Architecture

### 13.1 Preferences

Store with `electron-store`:

- Toolbar position
- Last active tool
- Recent colors
- Line widths
- Hotkeys
- Export settings
- Startup options

### 13.2 Saved sessions

Initial recommendation:

- Save scene documents as JSON files
- Keep export output separate from saved session documents

Session file contents:

- Metadata
- Pages
- Layers
- Annotation objects
- Version number

Example:

```json
{
  "version": 1,
  "createdAt": 1780000000000,
  "updatedAt": 1780000005000,
  "pages": [],
  "layers": [],
  "annotations": []
}
```

### 13.3 Versioning

Persisted files and preferences should include a schema version from the start so migrations are possible later.

## 14. Export and Capture Architecture

### Initial export targets

- Annotation-only PNG
- Screen-plus-annotation PNG
- Clipboard copy of final image

### Export pipeline

1. Determine target display or all-display composition.
2. Capture underlying screen image if requested.
3. Render annotation scene to export canvas.
4. Composite base screen and annotation layers if needed.
5. Save file or copy to clipboard.

### Important concerns

- DPI scaling correctness
- Multi-monitor bounds mapping
- Transparent background handling
- Timestamped filenames

## 15. Global Shortcuts

### Required first-release shortcuts

- Toggle overlay
- Toggle pass-through
- Switch to pen
- Switch to highlighter
- Undo
- Redo
- Clear
- Export capture

### Shortcut architecture

- Registration owned by main process
- Current shortcut config loaded from preferences
- Renderer requests actions through IPC
- Validation prevents duplicate or invalid bindings

### UX requirement

Shortcut conflicts should not silently fail. If a chosen shortcut cannot be registered, the user must be informed in settings.

## 16. Multi-Monitor Architecture

Multi-monitor support is a first-class requirement.

### Principles

- One overlay window per display
- Display descriptors normalized in a shared format
- Scene coordinates stored in display-relative coordinates when appropriate

### Behavior options

First release:

- Show overlays on all connected displays
- Single shared toolbar
- Export current display or all displays

Later:

- Per-display toolbars
- Per-display annotation sessions
- Active-display targeting rules

### Edge cases

- Different DPI scaling across monitors
- Monitor disconnect and reconnect
- Primary monitor changes
- Taskbar and work-area differences
- Fullscreen presentation apps

## 17. Performance Strategy

Performance is critical because even slight lag damages trust in drawing tools.

### Performance targets

- Near-instant overlay show and hide
- Responsive drawing under common 1080p and 4K workloads
- No visible frame hitch during normal brush strokes

### Tactics

- Use vector scene objects
- Redraw only affected layers when possible
- Batch draw updates with `requestAnimationFrame`
- Keep toolbar rendering isolated from overlay rendering
- Minimize IPC chatter during drawing
- Avoid writing to disk during active draw loops

### Future optimization options

- Offscreen canvas experiments
- Stroke simplification
- Virtualized scene inspection for very large sessions

## 18. Reliability and Recovery

### Startup expectations

- App launches to tray or toolbar depending on preference
- Overlay state is initialized deterministically
- Preferences load before shortcut registration when possible

### Recovery expectations

- If one overlay window fails, the app should log clearly and avoid corrupting session data
- Session saves should be atomic where practical
- Preferences corruption should fall back to sane defaults

### Logging

Recommended logging areas:

- Window creation
- Display changes
- Shortcut registration
- Export failures
- Persistence failures

## 19. Security Model

This app is local-first and does not require network features in the MVP, but Electron security still matters.

### Required security decisions

- Enable `contextIsolation`
- Disable `nodeIntegration`
- Expose only a minimal preload API
- Validate IPC payloads
- Keep file write paths explicit and user-controlled

### Network posture

The MVP should not need background network access. If future OCR, sync, or update checks are added, they should be introduced deliberately rather than by default.

## 20. Project Structure

Recommended project layout:

```text
src/
  main/
    app.ts
    bootstrap/
    windows/
      overlay-window.ts
      toolbar-window.ts
      settings-window.ts
    tray/
      tray-controller.ts
    shortcuts/
      shortcut-manager.ts
    ipc/
      register-ipc.ts
    platform/
      windows-overlay.ts
      display-service.ts
    store/
      preferences-store.ts
  renderer/
    overlay/
      app/
      scene/
      tools/
      history/
      export/
      components/
    toolbar/
      components/
      state/
    settings/
      components/
      state/
  preload/
    overlay-preload.ts
    toolbar-preload.ts
    settings-preload.ts
  shared/
    types/
    ipc/
    constants/
    utils/
docs/
  technical-architecture.md
graphify-out/         # Persistent AST knowledge graph and .md reports
.githooks/            # Automated pre-commit and pre-push hooks
```

### 20.1 Automated Knowledge Graph Sync
The project utilizes **Graphify** (`graphify-out/`) to maintain an architectural knowledge graph and generated `.md` reports (`GRAPH_REPORT.md`, `.agents/rules/graphify.md`). Via Git hooks (`.githooks/pre-commit` and `.githooks/pre-push`), running `git commit` or `git push` automatically invokes `graphify update .`, stages any updated `.md` files or graph data, and ensures the repository documentation is perpetually synchronized with code changes.

## 21. Milestone-Based Implementation Plan

### Milestone 1: Foundation

- Convert current repo to TypeScript-based Electron structure
- Establish build scripts
- Create overlay and toolbar windows
- Add secure preload-based IPC

Exit criteria:

- App launches reliably
- Transparent overlay appears
- Toolbar communicates with overlay

### Milestone 2: Annotation MVP

- Pen and highlighter tools
- Eraser
- Undo and redo
- Clear all
- Basic color and width controls

Exit criteria:

- User can annotate smoothly on screen and manage basic edits

### Milestone 3: Desktop Utility Features

- Global shortcuts
- Tray integration
- Click-through mode
- Persistence of preferences
- Multi-monitor support

Exit criteria:

- App behaves like a usable desktop utility rather than a demo

### Milestone 4: Export and Capture

- Annotation export
- Screen-plus-annotation export
- Clipboard copy

Exit criteria:

- User can preserve and share annotation results

### Milestone 5: Advanced Annotation

- Shapes
- Arrows
- Text
- Selection and transforms

Exit criteria:

- App supports richer presentation workflows

### Milestone 6: Differentiating Features

- Spotlight
- Laser pointer
- Pages and layers UI
- Session save and load

Exit criteria:

- App clearly exceeds the baseline utility category

## 22. Key Risks

### Technical risks

- Click-through behavior can be inconsistent if not carefully implemented
- Transparent overlay windows can behave differently across display setups
- Screen capture and DPI handling can produce incorrect exports
- Global shortcuts can conflict with OS or other applications

### Product risks

- Too many tools in the first release can make the app feel heavy
- Poor mode clarity can make users think the app is broken
- Weak performance will erase trust immediately

### Risk mitigation

- Prioritize the core loop over breadth
- Test early on multiple monitor and DPI combinations
- Keep windowing and platform logic isolated
- Instrument the app with logging before adding many advanced features

## 23. Recommended First Implementation Target

The first engineering target should be a narrow but complete vertical slice:

- App starts
- Overlay windows appear on all displays
- Toolbar shows current tool
- Pen draws smoothly
- Pass-through toggle works
- Undo and clear work

This slice is the highest-value proof that the architecture is sound. If this works reliably, the rest of the feature set can be layered on with much lower risk.

## 24. Open Decisions

The following decisions can be finalized during implementation:

- `Konva` versus `Fabric.js`
- `zustand` versus reducer-only state management
- Exact screenshot composition implementation
- Whether first-session save support lands before or after shapes and text

These are important but not blocking. The architecture above remains valid across those choices.
