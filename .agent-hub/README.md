# Agent Hub

The agent hub is a plain-file coordination system for multiple AI coding agents. It is intentionally small: every agent can read Markdown, JSON, and JSONL, so the workflow does not depend on one vendor or one UI.

## Core Files

- `AGENTS.md`: repository-wide behavior rules.
- `.agent-hub/protocol.md`: the collaboration lifecycle and message contract.
- `.agent-hub/roles/`: role briefs for Codex, Antigravity, and generic agents.
- `.agent-hub/tasks/`: one Markdown file per work item.
- `.agent-hub/state/tasks.json`: machine-readable task index.
- `.agent-hub/messages.jsonl`: append-only collaboration log.
- `scripts/agent-hub.js`: tiny local CLI for creating tasks and appending handoffs.

## Quick Start

Create a task:

```powershell
npm run agent -- new "Add shape tools" --goal "Plan and implement rectangle, ellipse, line, and arrow tools." --owner codex --implementer antigravity
```

Record Codex analysis:

```powershell
npm run agent -- note <taskId> --from codex --type analysis --message "Read overlay renderer and toolbar. Shape support touches tool state, pointer handlers, render loop, and undo history."
```

Move to implementation:

```powershell
npm run agent -- phase <taskId> implementation --owner antigravity
```

Show the current brief:

```powershell
npm run agent -- brief <taskId>
```

List tasks:

```powershell
npm run agent -- list
```

## Recommended Loop

1. Codex creates or updates the task brief.
2. Codex records analysis, risks, and acceptance checks.
3. Antigravity implements against the task file.
4. Antigravity records changed files and verification.
5. Codex reviews the diff and records findings or approval.
6. The final owner marks the task as `handoff` or `done`.

The important habit is simple: every agent leaves the next agent enough context to continue without guessing.
