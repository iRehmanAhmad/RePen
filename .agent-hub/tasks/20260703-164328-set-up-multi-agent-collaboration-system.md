# Set up multi-agent collaboration system

Task ID: `20260703-164328-set-up-multi-agent-collaboration-system`

## Goal

Create a durable workflow where Codex plans and reviews, Antigravity implements, and future agents can coordinate through shared task briefs and messages.

## Current Phase

`done`

## Owners

- Planner: `codex`
- Implementer: `antigravity`
- Reviewer: `codex`

## Constraints

- Preserve unrelated user changes.
- Follow `AGENTS.md` and `.agent-hub/protocol.md`.
- Keep changes scoped to this task unless the task brief is updated.

## Context Read

- [x] Codex manual customization surfaces
- [x] `docs/technical-architecture.md`
- [x] `docs/qa-checklist.md`
- [x] `package.json`
- [x] Current project file layout

## Plan

- [x] Add durable repository instructions in `AGENTS.md`.
- [x] Add an agent hub protocol with phases, message contract, and conflict rules.
- [x] Add role briefs for Codex, Antigravity, and generic future agents.
- [x] Add a reusable task template and task state store.
- [x] Add a small CLI for creating tasks, recording notes, changing phases, listing work, and printing briefs.
- [x] Wire the CLI into `package.json`.

## Acceptance Checks

- [x] Implementation matches the goal.
- [x] Agent hub files are plain Markdown, JSON, and JSONL so future agents can use them.
- [x] `npm run agent -- help` works.
- [x] `npm test` has been run.

## Risks

- This is coordination infrastructure, not a live autonomous scheduler. Agents still need to be launched by their host tools unless a later task adds automation or MCP/app integration.
- The existing test command is a placeholder, so verification is limited to CLI smoke checks.

## Verification

- `npm run agent -- help` printed command usage successfully.
- `npm test` completed and printed `No automated tests yet`.

## Handoff Notes

- System scaffold is ready. For future work, create a task with `npm run agent -- new "Title" --goal "Goal"` and have Codex produce the analysis/plan before Antigravity implements.
