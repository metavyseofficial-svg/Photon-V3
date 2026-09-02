# Photon study depth update

## User-facing changes
- Add a Revision workspace with chapter completion dates, automatic spaced-repetition dates (1, 3, 7, 15, 30, 60, 90, 120, 150, 180 days by default), custom intervals, editing/resetting, and due-state actions.
- Show Today’s Revisions on Home, grouped by subject, with one-tap completion that advances the schedule.
- Add browser-local notification permission and due-revision notifications without blocking the app.
- Replace resource-only counters with individual item tracking for every resource type, while preserving existing numeric progress and legacy data.
- Expand friend sync from aggregates to a permission-scoped full study payload, including visible subjects, chapters, resource items, revisions, plans, history, and all current summary stats; make it drillable in the existing Friends view.

## Implementation
- Extend the existing `StudyState`, `Chapter`, and `Resource` types with completion dates, revision entries, and stable resource items; migrate legacy resources into numbered items.
- Extend the existing store actions for chapter completion/reset/date editing, revision interval editing/completion, and resource-item toggles. Continue local persistence and debounce the full sanitized shared payload to the existing cloud snapshot.
- Add one additive database migration for the snapshot JSON payload, preserving RLS/grants and realtime behavior.
- Create the `/revision` route and add it to the existing AppShell navigation. Update Home, chapter detail, resource rows, and Friends using current components/tokens.
- Validate with typecheck/build diagnostics and browser checks for Home, Revision, resource item toggles, and friend detail rendering.

## Technical notes
- Keep friends view-only and share only subjects the owner has not marked hidden; existing follow-based policies remain the permission boundary.
- Use the browser Notification API only after an explicit user action, and treat unsupported/denied permission as a non-blocking UI state.
- Keep all existing routes, local storage keys, styling, and legacy snapshots compatible.
