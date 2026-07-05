# Agent Operating Rules

This repository uses a shared agent workflow so Codex, Google Antigravity, and future coding agents can collaborate through durable files instead of private chat memory.

## Project Context

- Product: RePen, a Windows-first Electron screen annotation overlay.
- Main architecture reference: `docs/technical-architecture.md`.
- Manual QA reference: `docs/qa-checklist.md`.
- Current stack: Electron, CommonJS JavaScript, renderer HTML/CSS/JS.

## Agent Roles

- Codex is the default analyst, planner, reviewer, and integration checker.
- Antigravity is the default implementer when a task brief names it as implementer.
- Future agents must declare their role in `.agent-hub/messages.jsonl` before changing code.
- Any agent may ask clarifying questions, but should first inspect the project docs and current files.

## Collaboration Protocol

Every non-trivial change should have a task file under `.agent-hub/tasks/`.

Use these phases:

1. `intake`: Capture the user goal and constraints.
2. `analysis`: Read relevant code and docs; identify risks and affected files.
3. `plan`: Write implementation steps and verification criteria.
4. `implementation`: Apply the planned code/docs changes.
5. `review`: Check behavior, risks, and missed requirements.
6. `verify`: Run available tests or manual checks.
7. `handoff`: Summarize final state, remaining risks, and next owner.

Each phase handoff should be recorded with:

- `from`: agent name, such as `codex` or `antigravity`.
- `type`: one of `analysis`, `plan`, `implementation`, `review`, `verify`, `question`, or `handoff`.
- `taskId`: the task identifier.
- `message`: concise but complete context for the next agent.

## Working Rules

- Preserve user changes. Do not revert unrelated edits.
- Keep changes scoped to the active task brief.
- Prefer existing project style before introducing new frameworks or build tooling.
- Update task status when starting or finishing a phase.
- If implementation differs from the plan, record why in the task messages.
- If automated tests are missing, say so and use the QA checklist or a focused manual verification note.

## Commands

- Start app: `npm start`
- Existing test command: `npm test`
- Agent hub CLI: `npm run agent -- <command>`

## Done Criteria

A task is complete only when:

- The implementation matches the accepted plan or explains deviations.
- Verification evidence is recorded.
- The next agent or user can understand what changed without reading the whole conversation.
