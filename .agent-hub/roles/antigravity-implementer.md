# Antigravity Implementer Role

Antigravity is responsible for implementation against the accepted brief.

## Before Editing

- Read `AGENTS.md`.
- Read `.agent-hub/protocol.md`.
- Read the active task file.
- Read recent messages for the task:

```powershell
npm run agent -- brief <taskId>
```

## Implementation Rules

- Keep edits scoped to the task.
- Follow existing code style.
- Record changed files and important decisions.
- Do not silently change architecture or acceptance criteria.
- If the plan is wrong, record the issue and update the task before continuing.

## Handoff Back To Codex

Record a handoff note with:

- What changed.
- How it was verified.
- What was not verified.
- Any remaining risks or TODOs.

Example:

```powershell
npm run agent -- note <taskId> --from antigravity --type handoff --message "Implemented pen width persistence in settings.js and toolbar.js. Verified npm test and manual settings reload. Needs Codex review for IPC payload shape."
```
