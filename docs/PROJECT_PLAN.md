# Project Plan

> **Status:** Planning. Everything below describes *planned* work unless marked
> done. No application features are implemented yet.

## Objective

Build a Laravel 13 + Vue 3 application that lets a user browse and search
television shows (sourced from TVmaze through a Laravel API) and organize them
into favorite lists. All interactions occur through JavaScript without
full-page reloads.

## Required functionality

1. Browse an initial unfiltered list of shows.
2. Search shows automatically while typing.
3. Display results in a responsive grid.
4. Perform all actions via JavaScript (no full-page reloads).

## Extra-credit favorites functionality

5. Create multiple favorite lists.
6. Save a show to one or more lists.
7. View favorite lists alphabetically.
8. Show the number of saved shows per list.
9. View a list's favorites ordered by most recently modified.
10. Remove individual favorites.
11. Delete entire favorite lists.

## In scope

- A Laravel internal API that proxies and **normalizes** TVmaze responses.
- HTML stripping of TVmaze summaries into plain text.
- SQLite persistence for favorite lists and favorites (snapshot of show data).
- A Vue 3 (Composition API) single-page interface: local component state for
  isolated concerns, composables for reusable behavior, and Pinia for shared
  application state.
- Short-lived caching of successful normalized TVmaze results.
- Backend tests (PHPUnit) and frontend tests (Vitest + Vue Test Utils).
- Responsive, reasonably accessible UI with Tailwind CSS 4.

## Out of scope

- Authentication / authorization (assumed handled by a parent application).
- Vue directly calling TVmaze (Laravel is the only TVmaze caller).
- Pagination / infinite scroll (results capped at 100 — see API contract).
- TypeScript, Vue Router, Docker. (Pinia is in scope for shared state.)
- User accounts, sharing lists between users, real-time updates.
- A globally shared/normalized `shows` table (favorites store snapshots).

## Phased implementation plan

Phases are ordered but small and reviewable. No time estimates.

### Phase 1 — Documentation & API contract  ✅ (this step)
Establish scope, architecture, API contract, database design, and decisions.
- **Definition of done:** All `docs/` files exist, are internally consistent,
  and the README reflects current (scaffold-only) status.

### Phase 2 — TVmaze backend integration
Add a `TvMaze` service (Laravel HTTP client), a normalizer, HTML stripping, the
`GET /api/shows` endpoint, an API Resource, caching, and 502 failure handling.
- **Definition of done:** `GET /api/shows` and `GET /api/shows?search=` return
  normalized data capped at 100; upstream failure returns a controlled 502;
  backend tests cover normalization and failure paths.

### Phase 3 — Favorites database & backend API
Add migrations and models for `favorite_lists` and `favorites`, plus the
favorites/lists endpoints, Form Requests, and Resources.
- **Definition of done:** All favorites endpoints behave per the API contract
  (uniqueness, cascade delete, ordering, counts); covered by feature tests.

### Phase 4 — Vue search interface
Build the search/browse UI: a `useShows` composable, an API service, a search
input with ~300 ms debounce and `AbortController`, and a responsive grid.
- **Definition of done:** Initial list loads; typing searches without reloads;
  stale responses are discarded; loading/empty/error states render.

### Phase 5 — Vue favorites interface
Build list management and saving: composables, components for creating lists,
saving a show to multiple lists, viewing/removing favorites, deleting lists.
- **Definition of done:** All favorites user stories work end to end through the
  API; lists show counts; favorites order by most recently modified.

### Phase 6 — Backend & frontend testing
Round out PHPUnit coverage; install and configure Vitest + Vue Test Utils; add
component/composable tests.
- **Definition of done:** `php artisan test` and `npm test` pass; key flows and
  edge cases (duplicates, failures, stale requests) are covered.

### Phase 7 — Accessibility & responsive review
Keyboard navigation, focus states, labels/alt text, responsive breakpoints.
- **Definition of done:** Grid and controls are usable on small and large
  screens; interactive elements are keyboard-accessible and labeled.

### Phase 8 — Final documentation & submission cleanup
Expand the README into a submission-ready document; verify setup from a clean
clone; finalize decisions and AI workflow notes.
- **Definition of done:** A fresh clone can be set up and run from the README;
  docs match the implementation; no stale "planned" claims remain.

## Testing plan

- **Backend (PHPUnit):** unit tests for the normalizer and HTML stripping;
  feature tests for each endpoint, including validation errors, duplicate-list
  and duplicate-favorite handling, not-found, cascade delete, ordering, counts,
  and the TVmaze-unavailable 502 path (HTTP client faked — no live calls).
- **Frontend (Vitest + Vue Test Utils):** composable logic (debounce, abort,
  state transitions) and component rendering (grid, list management) with the
  API service mocked.
- **Manual verification:** run the app, exercise each user story, confirm no
  full-page reloads.

## Final verification checklist

- [ ] `composer install` and `npm install` succeed from a clean clone.
- [ ] `php artisan migrate` creates the schema in SQLite.
- [ ] `php artisan test` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` succeeds.
- [ ] Initial show list and search work in the browser.
- [ ] Favorite lists: create, save-to-multiple, view, count, remove, delete.
- [ ] TVmaze outage produces a controlled 502 and a friendly UI message.
- [ ] Docs match the implementation; README setup verified.

## Potential risks

- **TVmaze shape drift / inconsistent fields:** mitigated by a single
  normalization layer and `null` defaults for optional fields.
- **TVmaze rate limiting or downtime:** mitigated by short-lived caching of
  successes and a controlled 502 (failures are not cached).
- **SQLite case-insensitive uniqueness:** mitigated with a stored
  `normalized_name` column and a unique index (see database design).
- **Stale search responses (race conditions):** mitigated with `AbortController`
  and debounce on the frontend.
- **Scope creep into pagination/auth/state libraries:** explicitly out of scope.

## Tracking checklist

- [x] Phase 1 — Documentation & API contract
- [ ] Phase 2 — TVmaze backend integration
- [ ] Phase 3 — Favorites database & backend API
- [ ] Phase 4 — Vue search interface
- [ ] Phase 5 — Vue favorites interface
- [ ] Phase 6 — Backend & frontend testing
- [ ] Phase 7 — Accessibility & responsive review
- [ ] Phase 8 — Final documentation & submission cleanup
