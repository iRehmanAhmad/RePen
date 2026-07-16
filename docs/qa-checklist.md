# RePen — QA Regression & Smoke Test Checklist

Use this structured 7-step manual testing checklist before releasing any new build or completing a sprint.

---

## 1. ✍️ Basic Drawing & Erasing
- [ ] Select **Pen** (`Ctrl+Shift+1`), pick color `#4cc9f0` (blue), and draw a smooth wave across the screen.
- [ ] Select **Highlighter** (`Ctrl+Shift+2`), pick color `#ffe36d` (yellow), and highlight over text/drawings. Verify semi-transparency.
- [ ] Select **Eraser** (`Ctrl+Shift+3`) and drag across a section of the blue wave. Verify the stroke is removed cleanly without leaving artifacts.

## 2. 📝 Text Note Tool
- [ ] Select **Text** (`Ctrl+Shift+T`) and click anywhere on the canvas.
- [ ] Type `"Smoke test note"` into the floating yellow sticky editor and click outside (or press `Ctrl+Enter`) to commit.
- [ ] Verify the text renders cleanly on the screen with word wrap and shadow.

## 3. ✋ Select & Move (Lasso Transformation)
- [ ] Select **Move / Select** (`Ctrl+Shift+V`).
- [ ] Click near or drag across drawings/notes to select them. Verify dashed blue bounding box appears around selected items.
- [ ] Drag the selected bounding box across the screen. Verify all items move smoothly in real time.
- [ ] Press `Ctrl+Z` (Undo). Verify all moved items return to their original coordinates simultaneously (atomic undo).

## 4. 🌐 Background Modes & Click Ripple Halo
- [ ] Press `Ctrl+Shift+B` repeatedly to cycle through **Whiteboard**, **Blackboard**, and **Grid Paper**. Verify canvas background renders instantly.
- [ ] Toggle **Click Halo** (`Ctrl+Shift+H`) ON. Click anywhere on the screen and verify golden expanding pulse rings animate smoothly.

## 5. 🔴 Laser Pointer Presentation Tool
- [ ] Select **Laser Pointer** (`Ctrl+Shift+L`).
- [ ] Wave the cursor across the screen. Verify glowing red comet tail follows the cursor and fades out completely within 350 milliseconds.

## 6. 💾 Settings & Schema Persistence (v2 Schema)
- [ ] Open **Settings** (`Ctrl+Shift+O`).
- [ ] Change **Image Format** to `JPEG`, set **Quality** to `85%`, and check **Include Desktop Background**.
- [ ] Click **Save & Apply** and close the application completely.
- [ ] Re-launch **RePen**. Open Settings and verify all changed values (JPEG, 85%, Include Background) are restored from disk.

## 7. 📸 Screenshot Export Workflow
- [ ] Press `Ctrl+Shift+S` (Take Screenshot).
- [ ] Choose a save destination when prompted.
- [ ] Open the saved file in an image viewer. Verify the output format matches settings (PNG or JPEG) and desktop background is included if configured.

## 8. 🎥 Recorder & Editor Post-Production
- [ ] Select **Record Screen** ON. Verify the recording settings panel opens.
- [ ] Start recording. Verify the floating glassmorphic Recording HUD displays the elapsed time timer correctly.
- [ ] Pause recording. Verify the timer pauses. Resume and verify it advances.
- [ ] Stop recording. Verify it prompts to save the resulting `.repen-project` file.
- [ ] Open the project in the editor. Verify the video, synchronized webcam PiP, and smoothed cursor track play together.
- [ ] Crop, trim, or adjust playback speeds. Verify the playback coordinator updates rates and skips trimmed sections.
- [ ] If a licensed export engine is packaged, trigger export and verify a clean H.264/AAC output MP4. Otherwise verify the editor reports export as unavailable and does not launch a shell command.

## 9. 🤖 Automated Knowledge Graph & Git Verification
- [ ] Run automated tests via `npm test` and verify all DOM IDs, IPC contracts, tool states, and scene store separation (`scripts/verify-scene-store-separation.js`) pass.
- [ ] Commit or push code via `git commit` / `git push`. Verify Git hooks (`.githooks/pre-commit` and `.githooks/pre-push`) automatically trigger `graphify update .` and stage/commit updated `.md` reports (`GRAPH_REPORT.md`, `.agents/rules/graphify.md`).
