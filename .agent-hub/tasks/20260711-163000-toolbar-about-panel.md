# Toolbar About Panel

## Status

- phase: verify
- owner: codex

## Intake

User pointed out that the attached settings panel duplicated controls already available in the toolbar, and asked to put an About section there with website and GitHub links.

## Analysis

- The toolbar already exposes common brush, color, export, board, and presentation controls.
- The attached panel had duplicate Brush, Export, and Keys tabs.
- Existing toolbar settings JavaScript references many control IDs, so the visible UI can be simplified while keeping hidden legacy controls to avoid destabilizing reset/settings plumbing.

## Implementation

- Replaced the visible attached settings panel with an About RePen panel.
- Added creator copy, Contact Me link, and GitHub link.
- Updated GitHub to `https://github.com/iRehmanAhmad` and gave both link buttons premium icon badges.
- Reworked the panel for release: professional About tab with version, platform, license, release status, publisher links, plus Customize and Shortcuts tabs.
- Exposed `appVersion` through app state so the panel reflects the Electron package version.
- Added a safe `app:open-external` IPC channel restricted to the approved website/GitHub hosts.
- Kept legacy setting inputs hidden so existing renderer code and DOM contract checks remain stable.

## Verification

- `npm test` passed after the About panel conversion.
- `npm test` passed after updating the GitHub URL and premium link icons.
- `npm test` passed after adding release metadata and Customize/Shortcuts tabs.
