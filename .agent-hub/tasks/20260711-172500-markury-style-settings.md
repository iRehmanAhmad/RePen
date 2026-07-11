# Markury-Style Settings Extraction

## Status

- phase: verify
- owner: codex

## Intake

User provided Markury settings screenshots and asked to extract the settings RePen can use.

## Implementation

- Added a Markury-inspired tab structure: General, Customize, Shortcuts, About, Help.
- General contains screenshot storage, save location, include background, remember content, clear on minimize, cursor highlight, start on login, and update-check preference.
- Customize keeps RePen brush and screenshot export defaults.
- Help contains User Guide, FAQ, Contact Support, and License-style cards.
- Persisted new app preferences in main state and settings save/reset flow.
- Implemented clear annotations when the toolbar is minimized.
- Preserved existing shortcuts/about/release behavior.

## Verification

- `npm test` passed.
