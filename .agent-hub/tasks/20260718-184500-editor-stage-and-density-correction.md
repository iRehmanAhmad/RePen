# Editor stage and density correction

## Intake

The current editor screenshot remains unacceptable: a large compositor backdrop contains a tiny screen video, Layout still exposes a scrollbar at rest, and the timeline can retain an oversized persisted height with empty vertical space and its own scrollbars.

## Root causes

- The screen media layer relies on a collection of inherited inline styles and is not explicitly pinned to the compositor viewport.
- The Layout tab renders all property sections open in a short inspector workspace.
- Timeline height persistence permits up to 55% of the viewport, while track rows and toolbar spacing are too tall for a compact editing workspace.

## Implementation

1. Pin the screen media container and video to the compositor viewport; retain crop behavior while ensuring a default recording fills the composition.
2. Convert Layout property groups to compact disclosure cards, leaving Canvas open by default and keeping Frame/Backdrop discoverable without forcing a scrollbar.
3. Clamp the timeline to a compact 250–340px range, reduce track/ruler/header geometry, and eliminate vertical timeline scrolling for the supported lanes.
4. Verify type checks, unit tests, production builds, and whitespace checks.

## Result

- The screen media container is explicitly inset to the compositor viewport and the recording video is positioned, minimum-sized, and cover-fitted within it. The backdrop no longer displays around a tiny native-sized recording when padding is zero.
- Layout now uses keyboard-accessible disclosure cards: Canvas opens by default; Frame and Backdrop remain one-click controls rather than forcing a scrollbar on the initial inspector view.
- Persisted timeline height is clamped to 250–340px with a 280px default. Headers, ruler, and tracks are compacted and the vertical track scroller is removed.
- Updated layout-bound tests for the compact timeline policy. `npm test` passed (49 files, 171 tests), `npm run build:all` passed, and `git diff --check` passed.
