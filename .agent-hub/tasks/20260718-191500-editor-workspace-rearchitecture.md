# Editor workspace rearchitecture

## Status

verify

## Intake

The user reports that the current RePen editor still wastes most of the preview workspace, shows a poorly fitted composition, leaves the inspector vertically cramped, and presents an oversized, duplicate-control timeline. They want a smarter professional-editor workflow informed by established desktop editors such as CapCut, without copying its visual identity.

## Analysis

- The preview fit hook measures a parent of a nested preview panel, while the panel itself has padding and another preview-panel class. The video is also forced to `object-fit: cover`; this creates misleading fit behaviour and unnecessary cropping.
- The preview contains its own transport controls in addition to the timeline transport, so two UI regions compete to control playback.
- The Layout inspector permits Canvas, Frame, and Background cards to stay open simultaneously. This guarantees a scrollbar in a narrow 340px panel even before a user reaches the other editor tools.
- The timeline reserves Screen, Audio, Captions, and Effects lanes even when there is no editable content. Its toolbar has two tall rows, a persistent explanatory sentence, and oversized controls that crowd out the timeline itself.

## Plan

1. Make the preview stage a distinct measured element, render one correctly aspect-ratio-fitted composition inside it, and use non-destructive media containment by default. Keep preview-only actions compact and separate them from playback.
2. Refactor the timeline toolbar into one responsive command strip: transport, edit modes, and concise contextual actions. Preserve all keyboard-accessible functional callbacks.
3. Make inspector cards a controlled accordion so one Layout section is open at a time. Tighten fields and remove avoidable scrolling at the default width.
4. Change timeline lanes to content-aware visibility, with Screen/Audio as core lanes and Caption/Effects appearing when relevant or when their editing mode is selected.
5. Reduce the default and maximum timeline height without preventing resize; update focused tests and run the full test/build suite.

## Acceptance criteria

- The normal preview is a largest-possible correct composition, not a thumbnail in an arbitrary backdrop or a cropped video.
- The editor has one primary playback transport.
- A default Layout inspector opens without an unnecessary vertical scrollbar.
- The default timeline is compact, but Cut, Speed, Zoom, Caption, media visibility, seek, and resizing keep working.
- `npm test`, `npm run build:all`, and `git diff --check` pass.

## Verification

- `npm test` — passed: 49 files, 171 tests.
- `npm run build:all` — passed: TypeScript, foundation types, Vite renderer, and Electron compilation.
- `git diff --check` — passed.
- Visual desktop QA remains required against a real recording because this environment cannot reliably target the running RePen Electron window.
