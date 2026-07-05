# Multi-Agent Collaboration Protocol

## Design Goal

Let Codex, Antigravity, and future models collaborate asynchronously on the same codebase by writing durable task briefs and short structured messages.

The protocol is file-first because it works across desktop apps, terminals, IDE agents, and hosted agents.

## Roles

### Codex Planner

- Understand the repo.
- Decompose work.
- Write acceptance criteria.
- Identify affected files and risks.
- Review implementation and verification evidence.

### Antigravity Implementer

- Read the active task brief.
- Implement the planned changes.
- Record deviations, changed files, and verification output.
- Hand back to Codex for review when behavior or architecture risk is non-trivial.

### Future Agent

- Read `AGENTS.md`, this protocol, and the active task file.
- Declare its role with a `note` before changing files.
- Follow the same phase and handoff contract.

## Task Lifecycle

| Phase | Owner | Output |
| --- | --- | --- |
| `intake` | Any | User goal, constraints, unknowns |
| `analysis` | Codex | Relevant files, architecture notes, risks |
| `plan` | Codex | Step-by-step implementation plan and acceptance checks |
| `implementation` | Antigravity or assigned agent | Code changes and changed-files summary |
| `review` | Codex or reviewer | Findings, requested fixes, or approval |
| `verify` | Implementer or reviewer | Test/manual verification evidence |
| `handoff` | Current owner | Final state and next owner |
| `done` | Final owner | Task completed with no required follow-up |

## Message Contract

Messages are stored in `.agent-hub/messages.jsonl`. Each line is one JSON object:

```json
{
  "timestamp": "2026-07-03T17:00:00.000Z",
  "taskId": "20260703-170000-add-shape-tools",
  "from": "codex",
  "type": "plan",
  "message": "Implement shapes in overlay pointer handlers, add toolbar controls, then verify undo and clear behavior."
}
```

Allowed `type` values:

- `analysis`
- `plan`
- `implementation`
- `review`
- `verify`
- `question`
- `handoff`
- `status`

## Required Brief Sections

Each task file should keep these headings:

- Goal
- Current Phase
- Owners
- Constraints
- Context Read
- Plan
- Acceptance Checks
- Risks
- Verification
- Handoff Notes

## Conflict Rules

- Newest user instruction wins.
- Active task brief beats older messages.
- Code and docs in the repo beat agent memory.
- If two agents disagree, Codex should summarize the disagreement and propose the smallest reversible next step.

## Quality Bar

- The next agent must know what to do next.
- Risky assumptions must be explicit.
- Verification must be concrete: command output, manual QA step, screenshot note, or reason why verification was not possible.
