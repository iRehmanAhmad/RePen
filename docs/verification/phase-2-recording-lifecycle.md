# Phase 2 — Native Recording Lifecycle and Recovery QA Report

This report documents the verification of RePen's recording state transitions, command validations, duplicate click prevention, and session recovery logic.

## 1. Recording State Transition Matrix

The authoritative recorder state is managed in the main process and uses the transition rules defined in `src/shared/recording/stateMachine.js`.

| Command | Expected Current State(s) | Allowed Transition | Stale Command Outcome |
| --- | --- | --- | --- |
| `openSetup` | `idle`, `failed` | `selecting` | Rejected, no state change |
| `closeSetup` | `selecting` | `idle` | Rejected, no state change |
| `startCountdown` | `selecting` | `countdown` | Rejected, no state change |
| `closeCountdown` | `countdown` | `selecting` | Rejected, no state change |
| `start` | `idle`, `selecting`, `countdown`, `failed` | `starting` -> `recording` | Rejected, no state change |
| `pause` | `recording` | `paused` | Rejected, no state change |
| `resume` | `paused` | `recording` | Rejected, no state change |
| `stop` | `recording`, `paused` | `finalizing` -> `completed` | Rejected, no state change |
| `cancel` | `starting`, `recording`, `paused`, `failed` | `finalizing` -> `idle` | Rejected, no state change |
| `restart` | `starting`, `recording`, `paused`, `failed` | `finalizing` -> `starting` | Rejected, no state change |

---

## 2. Unit Testing Verification Evidence

The recording state transitions and recovery snapshots are verified by the unit test suite:
- `tests/unit/recordingStateMachine.test.ts`: Verifies command validity per phase, duplicate and stale command rejection, and session validation.
- `tests/unit/recorder.test.ts`: Mock-tests the native helper protocol, start/stop/pause/resume/cancel lifecycles, and cleanup of temporary recording assets.
- `tests/unit/recoveryStore.test.ts`: Verifies bounded storage for recovery snapshots, ensuring it remains capped at 10 snapshots to prevent disk clutter.

### Unit Test Execution Output
All 40 unit test files (including state machine and recovery tests) passed successfully:
* State Machine Tests: 3/3 passed.
* Recorder Service Tests: 13/13 passed.
* Recovery Store Tests: 2/2 passed.

---

## 3. Manual Lifecycle Test Matrix (Windows 11)

The following lifecycle cases have been checked:

### Case 2.1: Countdown Start & Cancellation
* **Procedure**: Open selector, select recording option, trigger countdown (3s). Before countdown completes, click Cancel / Close Countdown.
* **Expected**: Countdown stops immediately, no helper process spawns, and state returns to `selecting` (selector window restored).
* **Observed**: Pass. The countdown timer is cleanly disposed in `main.js` and the selector window is restored.

### Case 2.2: Rapid Duplicate Clicks on Record/Stop/Pause
* **Procedure**: Trigger start or pause command twice in very rapid succession.
* **Expected**: The second command has the same `commandId` or is stale (stale `expectedPhase`) and is rejected with an explicit error in `validateRecordingCommand()`. No duplicate helper processes or stale timers are created.
* **Observed**: Pass. Duplicate commands are rejected and do not cause overlapping spawn calls.

### Case 2.3: Pause and Resume Lifecycle
* **Procedure**: Start recording. Click Pause. Wait 5 seconds. Click Resume.
* **Expected**: Main process sends `pause` to helper stdin. Helper responds with `recording-paused` event, transitioning state to `paused`. Resume sends `resume` to helper stdin, transitioning back to `recording`.
* **Observed**: Pass. State transitions are verified via both console events and unit tests.

### Case 2.4: Stop and Handoff to Editor
* **Procedure**: Record a short video (e.g. 5 seconds) and click Stop.
* **Expected**: State transitions to `finalizing`. Helper exits with code 0 and provides a valid JSON completion marker containing the `screenPath`. Handoff initiates: the recorder states change to `completed`, editor opens the new project, and helper process terminates cleanly.
* **Observed**: Pass. No orphan `wgc-capture.exe` processes remain.

### Case 2.5: Crash Recovery & Manifest Scanning
* **Procedure**: Simulate a system restart or helper crash during recording by writing a test manifest with `"status": "interrupted"`.
* **Expected**: On next startup, the main process detects the interrupted manifest and presents a recovery dialog with "Recover", "Reveal in Explorer", or "Discard" options. 
* **Observed**: Pass. The recovery dialog functions as expected:
  - **Recover**: Clears the manifest and keeps the partial recording asset.
  - **Reveal**: Opens Explorer pointing to the recording directory.
  - **Discard**: Deletes both screen/webcam partial recording files and cleans up the manifest.
