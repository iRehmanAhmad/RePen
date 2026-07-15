# RePen GitHub Launch Polish

Task ID: `20260712-154500-repen-github-launch-polish`

## Goal

Improve the public-facing GitHub presentation for RePen so the repository is more launch-ready for early users, contributors, and download traffic.

## Current Phase

`done`

## Owners

- Planner: `codex`
- Implementer: `codex`
- Reviewer: `codex`

## Constraints

- Preserve unrelated user changes.
- Follow `AGENTS.md` and `.agent-hub/protocol.md`.
- Keep changes scoped to repository presentation, metadata, and contribution intake.

## Context Read

- [x] `AGENTS.md`
- [x] `.agent-hub/protocol.md`
- [x] `docs/technical-architecture.md`
- [x] `docs/qa-checklist.md`
- [x] Relevant source files

## Plan

- [x] Rewrite README copy for clearer positioning, download guidance, trust notes, and developer setup.
- [x] Expand `package.json` metadata with repository, homepage, bugs, and stronger keywords.
- [x] Add GitHub issue template config to guide bug reports and feature requests.

## Acceptance Checks

- [x] Implementation matches the goal.
- [x] Existing app still starts or failure is explained.
- [x] `npm test` has been run or skipped with reason.
- [x] Manual QA notes are recorded when automated tests are not enough.

## Risks

- GitHub About box fields like repository description and topics still require a manual update in GitHub settings.
- Screenshots and release checksums still need real assets from the maintainer.

## Verification

- `npm test` passed on 2026-07-12.
- README reviewed after rewrite for download flow, source setup, and support links.
- `package.json` reviewed after metadata updates for homepage, repository, bugs, and keywords.

## Handoff Notes

- Focused on launch-facing docs and metadata only. No runtime behavior files were changed.
- GitHub About box description, website, and topics still need to be set manually in the GitHub web UI.
