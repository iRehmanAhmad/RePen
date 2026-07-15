# RePen

Free Windows screen annotation and presentation overlay.

RePen lets you draw, highlight, write, zoom, and present directly on top of any desktop application. It is built for teaching, demos, tutorials, remote support, and live presentations where you need fast on-screen annotation without leaving your workflow.

<p align="center">
  <a href="https://rehmanahmad.pro/software/repen">
    <img src="https://img.shields.io/badge/Download-Windows%20Build-brightgreen?style=for-the-badge&logo=windows" alt="Download RePen for Windows">
  </a>
  <a href="https://github.com/iRehmanAhmad/RePen/releases">
    <img src="https://img.shields.io/badge/GitHub-Releases-black?style=for-the-badge&logo=github" alt="GitHub Releases">
  </a>
  <a href="https://rehmanahmad.pro/software/repen">
    <img src="https://img.shields.io/badge/Official%20Website-rehmanahmad.pro-blue?style=for-the-badge" alt="RePen website">
  </a>
</p>

## Why RePen

- Draw on top of any app without switching windows.
- Use whiteboard, grid, ruled, and blackboard modes during teaching or demos.
- Present more clearly with spotlight, laser pointer, shapes, text, and magnifier tools.
- Save multi-page sessions and export them as PDF.

## Quick Download

Download the latest build from [rehmanahmad.pro/software/repen](https://rehmanahmad.pro/software/repen).

Windows packages:

- `RePen Setup 1.0.0.exe`: installer build
- `RePen 1.0.0.exe`: portable build

Supported platforms:

- Windows 10
- Windows 11

First-launch note:

- If Windows SmartScreen warns on first launch, choose `More info` then `Run anyway` only if the file was downloaded from the official website or GitHub release page.

Recommended release assets to publish with each version:

- Installer `.exe`
- Portable `.exe`
- SHA256 checksum file
- Short changelog

## Screenshots

Add real launch media in [`docs/screenshots/`](./docs/screenshots/), then replace these placeholders with the final assets:

```md
![RePen toolbar and live annotation](./docs/screenshots/hero-toolbar.png)
![RePen drawing tools demo](./docs/screenshots/drawing-tools.gif)
![RePen board modes](./docs/screenshots/board-modes.png)
![RePen spotlight or magnifier](./docs/screenshots/spotlight-or-magnifier.png)
```

Media plan:

1. `hero-toolbar.png`: show the toolbar and real annotation on top of a desktop app.
2. `drawing-tools.gif`: show pen, highlighter, and laser pointer in a short loop.
3. `board-modes.png`: show whiteboard, grid, ruled, or blackboard backgrounds.
4. `spotlight-or-magnifier.png`: show presentation focus features in action.

## Feature Highlights

- Pen, calligraphy pen, and highlighter tools
- Laser pointer for live presentations
- Text notes directly on the desktop overlay
- Rectangle, circle, line, and freehand arrow tools
- Spotlight and magnifier for audience focus
- Whiteboard, blackboard, ruled, grid, and music staff backgrounds
- Multi-page notebook sessions with save/load support
- PDF export for board sessions

## Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| `Ctrl+Shift+P` | Toggle desktop pass-through mode |
| `Ctrl+Alt+H` | Toggle toolbar visibility |
| `Ctrl+Alt+N` | Start a new notebook board page |
| `Ctrl+Alt+S` | Save notebook drawing session (`.rpen`) |
| `Ctrl+Alt+O` | Open a saved session |
| `Ctrl+Alt+E` | Export the active notebook to PDF |
| `Ctrl+Alt+Left` | Switch to the previous page |
| `Ctrl+Alt+Right` | Switch to the next page or create one |

## Run From Source

Requirements:

- Node.js 22 or newer
- npm
- Windows environment for the packaged app workflow

Install and start:

```bash
npm install
npm start
```

Useful commands:

```bash
npm test
npm run dist
```

Packaging output:

- Windows builds are written to [`dist/`](./dist)

## Project Notes

- Stack: Electron, CommonJS JavaScript, HTML, and CSS
- Main app entry: [`main.js`](./main.js)
- Runtime source: [`src/`](./src)
- QA guide: [`docs/qa-checklist.md`](./docs/qa-checklist.md)
- Architecture notes: [`docs/technical-architecture.md`](./docs/technical-architecture.md)

## Feedback and Support

- Website: [rehmanahmad.pro/software/repen](https://rehmanahmad.pro/software/repen)
- Issues: [github.com/iRehmanAhmad/RePen/issues](https://github.com/iRehmanAhmad/RePen/issues)
- Releases: [github.com/iRehmanAhmad/RePen/releases](https://github.com/iRehmanAhmad/RePen/releases)
- Release template: [`docs/release-template.md`](./docs/release-template.md)

## GitHub About Box To Update Manually

These fields still need to be set in the GitHub repository settings because they do not live in the codebase:

- Description: `Free Windows screen annotation and presentation overlay`
- Website: `https://rehmanahmad.pro/software/repen`
- Topics: `screen-annotation`, `screen-drawing`, `presentation-tool`, `whiteboard`, `windows`, `electron`
