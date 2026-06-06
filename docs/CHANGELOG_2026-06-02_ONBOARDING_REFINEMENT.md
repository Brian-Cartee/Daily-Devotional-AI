# Changelog — 2026-06-02 Onboarding Refinement

## Fixed

- Stopped purple "Why we built this" auto-open behavior in native shell with server-side HTML blocker.
- Fixed clipped home welcome line after first threshold completion.

## Changed

- Reworked threshold onboarding to a calmer sequence:
  - arrival
  - promise
  - mode selection
  - optional name
  - stillness
  - entry
- Added mode-aware copy and carryover continuity on return visits.
- Added mode-aware first-session rhythm card and notification language.
- Added accessibility improvements:
  - focus rings on key controls
  - larger tap targets
  - better aria labeling and tabpanel wiring
  - reduced-motion handling for onboarding/stillness animations
- Added subtle mode-aware visual atmosphere treatment on threshold hero/rhythm card.
- Tuned micro-interactions by mode (timing and pulse pacing).

## Cleanup

- Retired legacy overlay onboarding auto-show path to prevent old copy regressions.
- Removed duplicate `SCROLL_TO_EXPLORE_KEY` import in home page.

