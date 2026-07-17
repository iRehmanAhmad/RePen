# Phase 1 QA Preparation and Evidence Collection Report

This report documents the manual verification of RePen's capture-exclusion and presentation mode behaviors.

## System & Build Context

| Property | Value (to be filled by tester) |
| --- | --- |
| Commit Hash | |
| Windows Version | |
| Native Helper Version | |
| App version | |

---

## Test Environment 1: Development Build (`npm start`)

### Case 1.1: Baked Display Capture (100% Display Scaling)
- **Display Scaling**: 100%
- **Capture Source Type**: Display/Screen
- **Presentation Mode**: `baked`
- **Recording Timestamp & Duration**: 
- **Sanitized Frame Screenshot or Hash**: 

#### Lifecycle Validation Checklist
- [ ] Countdown displays and ticks down correctly.
- [ ] Recording starts smoothly.
- [ ] Recording can be paused and resumed; HUD timer updates correctly.
- [ ] Recording stops without stale HUD or selector windows.
- [ ] Handoff to editor opens the newly created project.
- [ ] Close / Reopen works and loads project state from `.repen-project`.

#### Verification Checks
- [ ] Project metadata (`.repen-project`) explicitly sets `media.presentationMode` to `"baked"`.
- [ ] Annotations (e.g. pen strokes) are visible in the raw captured video.
- [ ] Editor does NOT replay annotations again (no double-rendered drawings).
- [ ] RePen UI (toolbar, HUD, selector, countdown, settings, dialogs, editor) is completely absent from the raw media.
- [ ] *Documented Restrictions/Limitations during recording (e.g. settings/dialog block)*: 

**Status**: [PENDING / PASS / FAIL]
**Observed Result / Notes**:


---

### Case 1.2: Baked Display Capture (150% Display Scaling)
- **Display Scaling**: 150%
- **Capture Source Type**: Display/Screen
- **Presentation Mode**: `baked`
- **Recording Timestamp & Duration**: 
- **Sanitized Frame Screenshot or Hash**: 

#### Lifecycle Validation Checklist
- [ ] Countdown displays and ticks down correctly.
- [ ] Recording starts smoothly.
- [ ] Recording can be paused and resumed; HUD timer updates correctly.
- [ ] Recording stops without stale HUD or selector windows.
- [ ] Handoff to editor opens the newly created project.
- [ ] Close / Reopen works and loads project state from `.repen-project`.

#### Verification Checks
- [ ] Project metadata (`.repen-project`) explicitly sets `media.presentationMode` to `"baked"`.
- [ ] Annotations (e.g. pen strokes) are visible in the raw captured video.
- [ ] Editor does NOT replay annotations again (no double-rendered drawings).
- [ ] RePen UI (toolbar, HUD, selector, countdown, settings, dialogs, editor) is completely absent from the raw media.
- [ ] *Documented Restrictions/Limitations during recording (e.g. settings/dialog block)*: 

**Status**: [PENDING / PASS / FAIL]
**Observed Result / Notes**:


---

### Case 1.3: Sidecar Selected-Window Capture (100% Display Scaling)
- **Display Scaling**: 100%
- **Capture Source Type**: Selected Window
- **Presentation Mode**: `sidecar`
- **Recording Timestamp & Duration**: 
- **Sanitized Frame Screenshot or Hash**: 

#### Lifecycle Validation Checklist
- [ ] Countdown displays and ticks down correctly.
- [ ] Recording starts smoothly.
- [ ] Recording can be paused and resumed; HUD timer updates correctly.
- [ ] Recording stops without stale HUD or selector windows.
- [ ] Handoff to editor opens the newly created project.
- [ ] Close / Reopen works and loads project state from `.repen-project`.

#### Verification Checks
- [ ] Project metadata (`.repen-project`) explicitly sets `media.presentationMode` to `"sidecar"`.
- [ ] Raw video file contains only the target window (zero RePen UI, zero annotations baked in).
- [ ] Editor plays the annotation replay exactly once.
- [ ] Seeking/pausing in the editor does not duplicate annotations or leave ghost drawings.
- [ ] *Documented Restrictions/Limitations during recording*:

**Status**: [PENDING / PASS / FAIL]
**Observed Result / Notes**:


---

### Case 1.4: Sidecar Selected-Window Capture (150% Display Scaling)
- **Display Scaling**: 150%
- **Capture Source Type**: Selected Window
- **Presentation Mode**: `sidecar`
- **Recording Timestamp & Duration**: 
- **Sanitized Frame Screenshot or Hash**: 

#### Lifecycle Validation Checklist
- [ ] Countdown displays and ticks down correctly.
- [ ] Recording starts smoothly.
- [ ] Recording can be paused and resumed; HUD timer updates correctly.
- [ ] Recording stops without stale HUD or selector windows.
- [ ] Handoff to editor opens the newly created project.
- [ ] Close / Reopen works and loads project state from `.repen-project`.

#### Verification Checks
- [ ] Project metadata (`.repen-project`) explicitly sets `media.presentationMode` to `"sidecar"`.
- [ ] Raw video file contains only the target window (zero RePen UI, zero annotations baked in).
- [ ] Editor plays the annotation replay exactly once.
- [ ] Seeking/pausing in the editor does not duplicate annotations or leave ghost drawings.
- [ ] *Documented Restrictions/Limitations during recording*:

**Status**: [PENDING / PASS / FAIL]
**Observed Result / Notes**:


---

## Test Environment 2: Packaged Build (NSIS or Portable)

### Case 2.1: Baked Display Capture (100% Display Scaling)
- **Display Scaling**: 100%
- **Capture Source Type**: Display/Screen
- **Presentation Mode**: `baked`
- **Recording Timestamp & Duration**: 
- **Sanitized Frame Screenshot or Hash**: 

#### Lifecycle Validation Checklist
- [ ] Countdown displays and ticks down correctly.
- [ ] Recording starts smoothly.
- [ ] Recording can be paused and resumed; HUD timer updates correctly.
- [ ] Recording stops without stale HUD or selector windows.
- [ ] Handoff to editor opens the newly created project.
- [ ] Close / Reopen works and loads project state from `.repen-project`.

#### Verification Checks
- [ ] Project metadata (`.repen-project`) explicitly sets `media.presentationMode` to `"baked"`.
- [ ] Annotations (e.g. pen strokes) are visible in the raw captured video.
- [ ] Editor does NOT replay annotations again.
- [ ] RePen UI (toolbar, HUD, selector, countdown, settings, dialogs, editor) is completely absent from the raw media.
- [ ] *Documented Restrictions/Limitations during recording*:

**Status**: [PENDING / PASS / FAIL]
**Observed Result / Notes**:


---

### Case 2.2: Baked Display Capture (150% Display Scaling)
- **Display Scaling**: 150%
- **Capture Source Type**: Display/Screen
- **Presentation Mode**: `baked`
- **Recording Timestamp & Duration**: 
- **Sanitized Frame Screenshot or Hash**: 

#### Lifecycle Validation Checklist
- [ ] Countdown displays and ticks down correctly.
- [ ] Recording starts smoothly.
- [ ] Recording can be paused and resumed; HUD timer updates correctly.
- [ ] Recording stops without stale HUD or selector windows.
- [ ] Handoff to editor opens the newly created project.
- [ ] Close / Reopen works and loads project state from `.repen-project`.

#### Verification Checks
- [ ] Project metadata (`.repen-project`) explicitly sets `media.presentationMode` to `"baked"`.
- [ ] Annotations (e.g. pen strokes) are visible in the raw captured video.
- [ ] Editor does NOT replay annotations again.
- [ ] RePen UI (toolbar, HUD, selector, countdown, settings, dialogs, editor) is completely absent from the raw media.
- [ ] *Documented Restrictions/Limitations during recording*:

**Status**: [PENDING / PASS / FAIL]
**Observed Result / Notes**:


---

### Case 2.3: Sidecar Selected-Window Capture (100% Display Scaling)
- **Display Scaling**: 100%
- **Capture Source Type**: Selected Window
- **Presentation Mode**: `sidecar`
- **Recording Timestamp & Duration**: 
- **Sanitized Frame Screenshot or Hash**: 

#### Lifecycle Validation Checklist
- [ ] Countdown displays and ticks down correctly.
- [ ] Recording starts smoothly.
- [ ] Recording can be paused and resumed; HUD timer updates correctly.
- [ ] Recording stops without stale HUD or selector windows.
- [ ] Handoff to editor opens the newly created project.
- [ ] Close / Reopen works and loads project state from `.repen-project`.

#### Verification Checks
- [ ] Project metadata (`.repen-project`) explicitly sets `media.presentationMode` to `"sidecar"`.
- [ ] Raw video file contains only the target window (zero RePen UI, zero annotations baked in).
- [ ] Editor plays the annotation replay exactly once.
- [ ] Seeking/pausing in the editor does not duplicate annotations or leave ghost drawings.
- [ ] *Documented Restrictions/Limitations during recording*:

**Status**: [PENDING / PASS / FAIL]
**Observed Result / Notes**:


---

### Case 2.4: Sidecar Selected-Window Capture (150% Display Scaling)
- **Display Scaling**: 150%
- **Capture Source Type**: Selected Window
- **Presentation Mode**: `sidecar`
- **Recording Timestamp & Duration**: 
- **Sanitized Frame Screenshot or Hash**: 

#### Lifecycle Validation Checklist
- [ ] Countdown displays and ticks down correctly.
- [ ] Recording starts smoothly.
- [ ] Recording can be paused and resumed; HUD timer updates correctly.
- [ ] Recording stops without stale HUD or selector windows.
- [ ] Handoff to editor opens the newly created project.
- [ ] Close / Reopen works and loads project state from `.repen-project`.

#### Verification Checks
- [ ] Project metadata (`.repen-project`) explicitly sets `media.presentationMode` to `"sidecar"`.
- [ ] Raw video file contains only the target window (zero RePen UI, zero annotations baked in).
- [ ] Editor plays the annotation replay exactly once.
- [ ] Seeking/pausing in the editor does not duplicate annotations or leave ghost drawings.
- [ ] *Documented Restrictions/Limitations during recording*:

**Status**: [PENDING / PASS / FAIL]
**Observed Result / Notes**:
