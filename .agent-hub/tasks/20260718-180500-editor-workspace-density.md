# Editor workspace density and preview fit

## Intake

The editor screenshot shows that the inspector forces unnecessary scrolling, the preview is dramatically undersized despite available workspace, and the timeline reads as a collection of controls rather than a direct editing surface.

## Analysis

- Layout renders every simple property as an independent, description-heavy card, exceeding the available inspector height immediately.
- The preview viewport measures a nested padded element. Its dimensions are not guaranteed to be the usable workspace bounds during Electron grid resizes.
- The timeline initially hides the Captions and Effects lanes, making their creation modes discoverable only after selecting a mode. Its two-row toolbar is also visually heavier than the tracks themselves.

## Implementation plan

1. Make the inspector navigation a single-line, icon-first tab rail and reduce card density without removing controls.
2. Measure preview bounds from a stable outer viewport and fit media into its actual content area with a small, consistent gutter.
3. Keep creative lanes available, reduce toolbar height, and present direct manipulation as the primary timeline interaction.
4. Add functional component tests for preview-fit geometry and the new timeline lane availability.

## Verification

- `npm test`
- `npm run build:all`
- `git diff --check`
- Manual Electron QA: resize editor, use all inspector tabs without a tab scrollbar, and verify the preview occupies its available stage.

## Result

- Replaced the default Layout tab's six tall, description-heavy cards with three compact Canvas, Frame, and Backdrop sections. The common controls fit in the inspector without immediate scrolling.
- Made the inspector tab rail icon-first at normal editor widths; its active section heading remains visible below it.
- Changed preview fitting to measure the stable outer workspace in a layout effect and reduced the double padding. A resize now recomputes against the actual available preview area instead of a nested content box.
- Kept Captions and Effects visible as creation lanes at all times. Cut and Speed now use an explicit direct two-click workflow on the Screen lane, with playhead actions retained as alternatives.
- `npm test` passed (49 files, 171 tests), `npm run build:all` passed, and `git diff --check` passed. Existing Electron window discovery did not yield a RePen editor surface for live visual validation.
