# RePen Release Assets Template

Task ID: `20260712-160500-repen-release-assets-template`

## Goal

Add a ready-to-use screenshot section layout and a reusable release template so RePen can be published faster and more consistently.

## Current Phase

`done`

## Owners

- Planner: `codex`
- Implementer: `codex`
- Reviewer: `codex`

## Constraints

- Preserve unrelated user changes.
- Follow `AGENTS.md` and `.agent-hub/protocol.md`.
- Keep changes scoped to documentation and release assets preparation.

## Context Read

- [x] `AGENTS.md`
- [x] `.agent-hub/protocol.md`
- [x] `docs/technical-architecture.md`
- [x] `docs/qa-checklist.md`
- [x] Relevant source files

## Plan

- [x] Replace the README screenshot placeholder checklist with a production-ready media section.
- [x] Add a dedicated screenshots folder guide.
- [x] Add a reusable release template and checksum instructions.

## Acceptance Checks

- [x] Implementation matches the goal.
- [x] Existing app still starts or failure is explained.
- [x] `npm test` has been run or skipped with reason.
- [x] Manual QA notes are recorded when automated tests are not enough.

## Risks

- Real screenshots and GIF assets still need to be created and dropped into the documented paths.

## Verification

- `npm test` passed on 2026-07-12.
- README reviewed after screenshot section update and release template link addition.
- `docs/release-template.md` and `docs/screenshots/README.md` reviewed for link correctness and release workflow coverage.

## Handoff Notes

- Docs-only change. No runtime behavior files were changed.
- Remaining manual work is to add real image and GIF assets into `docs/screenshots/` and replace the placeholder markdown block with final embeds.
