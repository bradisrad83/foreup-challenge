# Implementation Log

A lightweight, append-only record of meaningful implementation milestones for the
foreUP TV-show + favorites challenge — completed build-plan phases and
user-facing features.

- It records **meaningful milestones, not every small code change**.
- It **complements Git history** (the authoritative record of every change)
  rather than replacing it.
- It supports review of the project's implementation and its AI-assisted
  workflow.
- Entries are normally added by the `/feature-handoff` command after
  verification, when a phase or feature reaches **Complete** or **Complete with
  follow-up**.
- Entries must be **accurate enough to compare directly against the
  repository**: factual claims must be grounded in code, Git, documentation, and
  actual command output; promotional or inflated language is not allowed; and
  "implemented" and "tested" must reflect inspected code and executed
  verification rather than planned behavior.

Entries appear in chronological order (newest at the bottom).

## Entry template

```markdown
## YYYY-MM-DD — Feature or phase name

**Build-plan phase:**  
**Status:** Complete | Complete with follow-up  
**Commit:** Pending or commit hash  

### Summary

A concise description of the completed behavior.

### Key files

- Relevant files or directories

### Decisions and alignment

- Important architectural, API, or database decisions followed
- Any approved deviation or documentation update

### Verification

- Commands actually run in this handoff, with their real results.
- Behavior coverage:
  - **Verified** — covered by an automated test or explicitly performed manual verification.
  - **Not verified** — implementation may exist, but no test or manual verification covered it.
  - **Not applicable** — not relevant to this feature or phase.
- Known limitations, failed checks, or scenarios not covered by automated tests.

### AI workflow

- Agents used
- Skills or commands used
- Important human decisions or review checkpoints

### Follow-ups

- None, or a short list of remaining non-blocking work
```

---

<!-- Append milestone entries below. -->

## 2026-06-18 — TVmaze backend search API

**Build-plan phase:** Phase 1 — TVmaze backend search API
**Status:** Complete with follow-up
**Commit:** Pending

### Summary

`GET /api/shows` returns a normalized list of shows (capped at 100): the initial
unfiltered list (TVmaze `/shows?page=0`) when no `search` is given, or search
results (TVmaze `/search/shows?q=`, each `show` unwrapped) when a non-empty
`search` is provided. All TVmaze access is confined to `app/Services/TvMaze/`:
`TvMazeClient` is the sole HTTP caller (config-driven host, request timeout,
success-only ~5-minute caching, controlled failure) and `ShowNormalizer`
converts both upstream shapes into one shape, strips HTML from summaries,
defaults missing optional values to `null`/`[]`, and skips malformed search
items. A thin `ShowController` injects the client and maps upstream failure to a
controlled 502; validation is via the `ShowIndexRequest` Form Request and the
output shape is owned by `ShowResource`. No persistence (Phase 2).

### Key files

- `app/Services/TvMaze/TvMazeClient.php`, `app/Services/TvMaze/ShowNormalizer.php`,
  `app/Services/TvMaze/TvMazeException.php`
- `app/Http/Controllers/Api/ShowController.php`,
  `app/Http/Requests/ShowIndexRequest.php`, `app/Http/Resources/ShowResource.php`
- `routes/api.php`, `app/Providers/AppServiceProvider.php`,
  `config/services.php`, `.env.example`
- `tests/Feature/ShowIndexTest.php`, `tests/Unit/ShowNormalizerTest.php`

### Decisions and alignment

- TVmaze isolated as the sole caller in `app/Services/TvMaze/`; host read from
  `config('services.tvmaze.base_url')`, user input confined to `q`/`page` (no
  host injection) — ARCHITECTURE.md, CLAUDE.md security rules.
- `{ "data": [...] }` collection shape and normalized fields per API_CONTRACT.md.
- Cap at 100 (DECISIONS #15); success-only caching at 300s within the documented
  ~5–10 min range (DECISIONS #18); controlled 502 on timeout/non-2xx/transport
  failure, never cached (DECISIONS #19); summaries HTML-stripped to plain text.
- No API/DB contract changes; no documentation updates required.

### Verification

Commands actually run in this handoff:

- `php artisan test` → passed: 53 tests, 104 assertions.
- `./vendor/bin/pint --test` → passed.
- No live TVmaze: all 29 feature-test methods use `Http::fake()` (29 occurrences
  confirmed by grep); unit tests are pure (no HTTP). Backend runs on SQLite
  `:memory:` (`phpunit.xml`).

Behavior coverage:

- **Verified** — initial unfiltered list; search routing and `q` forwarding;
  `{ "data": [...] }` shape for both paths; both upstream shapes normalize to the
  same shape; results capped at 100 on both paths; missing optional values →
  `null` and genres → `[]`; summary HTML stripping (tags, entities, whitespace,
  null/empty/tags-only → null); upstream failure → controlled 502 with
  `{ "message": ... }` and not cached (proven via `Http::sequence` 503→200);
  no-match → `{ "data": [] }` 200; empty/whitespace query → initial list; invalid
  `search` length (256 chars) → 422; success caching and per-query cache keys;
  no internal-detail leakage in the 502 body; malformed search item skipped.
- **Not verified** — exact cache TTL value (300s constant; no assertion reads it;
  low risk); valid `search` length boundary (255 chars) is not asserted (only the
  invalid 256 case is); upstream 200-with-null body fallback (`?? []`).
- **Not applicable** — database persistence, casts, relationships (Phase 2);
  frontend/Vue behavior (Phases 3–5).

Known limitations / not covered by automated tests: streaming-only shows
(`webChannel` but no `network`) normalize to `network: null` — consistent with
the documented contract but untested; tests do not call
`Http::preventStrayRequests()`, so isolation against an accidental live call
relies on each test faking the exact endpoints it uses.

### AI workflow

- Agents: `backend-engineer` (Sonnet) — implementation and initial tests.
- Skills: `read-project-docs`, `implement-laravel-feature`, `consume-tvmaze-api`,
  `write-tests`.
- Commands: `/review-feature` (two passes — first flagged a Pint failure, an
  unguarded malformed-search-item 500 risk, and a magic-number; re-review
  confirmed all fixes), then `/feature-handoff`.
- Human checkpoints: developer directed the three fixes (Pint, `MAX_RESULTS`
  reuse, malformed-item guard + regression test) and explicitly deferred the
  non-blocking items; the main session independently re-ran the suite and Pint at
  each gate.

### Follow-ups

- Add a `255`-char (valid boundary) assertion for the `search` rule.
- Add `Http::preventStrayRequests()` in the feature test setup as a hard
  guarantee against accidental live calls.
- Consider a `webChannel` fallback for `network` when a show has no broadcast
  network.
- Minor `ShowResource` field-access consistency and a separate `connectTimeout`
  were considered and intentionally deferred.

Status justification: every Phase 1 acceptance criterion is Verified by a named
passing test, and the full suite and Pint pass; the remaining unverified items
are non-critical and listed above as explicit follow-ups, so the build-plan
definition of done for Phase 1 is satisfied — hence **Complete with follow-up**
rather than **Complete**.

---

## 2026-06-18 — Favorites database and backend API

**Build-plan phase:** Phase 2 — Favorites database and backend API
**Status:** Complete with follow-up
**Commit:** Pending

### Summary

Implements the favorite-list and favorite persistence API (six endpoints) on
SQLite. Two migrations and two Eloquent models (`FavoriteList`, `Favorite`) with
a `hasMany`/`belongsTo` relationship and casts; two factories; two Form Requests;
two API Resources; two thin controllers; six routes. Case-insensitive list-name
uniqueness is enforced via a `normalized_name` column (a `normalizeName()` helper
→ a friendly Form Request 422 → a DB unique-index backstop). Favorites carry a
composite unique `(favorite_list_id, external_id)`, cascade on list deletion, and
store a snapshot of the normalized show. Lists are ordered by `name` asc with a
`withCount('favorites')` count; a list's favorites are ordered by `updated_at`
desc. 404 messages are scoped: unknown list → "Favorite list not found." (route
`missing()` callback), unknown or foreign favorite → "Favorite not found."
(controller, resolved scoped to the list), and any other unmatched `/api/*`
route → a generic "Not found." (global fallback in `bootstrap/app.php`).

### Key files

- `database/migrations/2026_06_18_000001_create_favorite_lists_table.php`,
  `database/migrations/2026_06_18_000002_create_favorites_table.php`
- `app/Models/FavoriteList.php`, `app/Models/Favorite.php`
- `app/Http/Controllers/Api/FavoriteListController.php`,
  `app/Http/Controllers/Api/FavoriteController.php`
- `app/Http/Requests/StoreFavoriteListRequest.php`,
  `app/Http/Requests/StoreFavoriteRequest.php`
- `app/Http/Resources/FavoriteListResource.php`,
  `app/Http/Resources/FavoriteResource.php`
- `database/factories/FavoriteListFactory.php`,
  `database/factories/FavoriteFactory.php`
- `routes/api.php` (6 routes + `missing()` callbacks), `bootstrap/app.php`
  (generic `api/*` 404 fallback)
- `tests/Feature/FavoriteListTest.php`, `tests/Feature/FavoriteTest.php`,
  `tests/Feature/ApiNotFoundTest.php`, `tests/Unit/FavoriteListNormalizationTest.php`

### Decisions and alignment

- Schema, `normalized_name` unique index, composite unique
  `(favorite_list_id, external_id)`, cascade FK, and casts (genres/metadata →
  array, premiered/ended → date, rating → float) match `DATABASE_DESIGN.md`.
- All six endpoints, JSON shapes, and status codes (200/201/204/409/422/404)
  match `API_CONTRACT.md`. Favorite snapshots per DECISIONS #8; no auth per #9.
- 404-message scoping refines behavior **within** the contract (the contract
  specifies the list-not-found message and leaves the favorite 404 generic), so
  no contract/documentation changes were required.
- Resolves `/review-feature` Finding 1 (a global, list-specific `api/*` 404
  handler was too broad) and Finding 2 (favorite 404 reused the list message).

### Verification

Commands actually run in this handoff:

- `php artisan test` → passed: 111 tests, 253 assertions.
- `./vendor/bin/pint --test` → passed.
- No live TVmaze: Phase 2 tests make no external calls (pure persistence on
  SQLite `:memory:` with `RefreshDatabase`); a grep over the four Phase 2 test
  files found zero TVmaze references. Phase 1 tests still use `Http::fake()`.

Behavior coverage:

- **Verified** — list index (name-asc ordering, `favorites_count`, empty →
  `{ "data": [] }`); list create 201; missing/empty/whitespace name → 422;
  case-insensitive duplicate name → 422 with `errors.name` (exact, cased, and
  whitespace-collapsed variants); show one list with favorites ordered
  `updated_at` desc; unknown list → 404 "Favorite list not found."; list delete
  204 + cascade; favorite create 201 snapshot + persistence; missing
  `external_id`/`name` → 422; duplicate `external_id` in a list → 409; same
  `external_id` across different lists allowed; favorite delete 204; unknown
  favorite and foreign favorite → 404 "Favorite not found."; unknown list on a
  favorite route → 404 "Favorite list not found."; unmatched `/api/*` route → 404
  generic "Not found."; casts (genres/metadata arrays, rating float, date-only
  serialization); `normalized_name` not exposed in responses.
- **Not verified** — the duplicate-favorite **DB race backstop**
  (`UniqueConstraintViolationException` catch in `FavoriteController::store`);
  only the `exists()` pre-check path is exercised. It is defensive and hard to
  trigger deterministically.
- **Not applicable** — TVmaze/HTTP behavior (Phase 1); any Vue/frontend behavior
  (Phases 3–5).

Known limitations / not covered: the race backstop above; `external_id` accepts
non-positive integers (no `min:1`); response timestamps serialize with
microseconds (`...000000Z`) — still valid ISO-8601, contract-compliant in spirit.

### AI workflow

- Agents: `backend-engineer` (Sonnet) — implementation and initial tests.
- Skills: `read-project-docs`, `implement-laravel-feature`, `write-tests`.
- Commands: `/review-feature` (flagged the global-404 breadth and message reuse),
  a main-session scoped-404 fix per developer direction, then `/feature-handoff`.
- Human checkpoints: developer chose to **scope** the 404 handler (rather than
  accept it), specified the exact messages/behavior, and deferred the
  non-blocking race-backstop test; the developer also caught and the main session
  removed two sync-collision duplicate files before review; the main session
  re-ran the suite and Pint at each gate.

### Follow-ups

- Add a test (or document why impractical) for the `UniqueConstraintViolationException`
  race backstop in `FavoriteController::store`.
- Consider `min:1` on `external_id` in `StoreFavoriteRequest`.
- Optionally normalize timestamp serialization to drop microseconds if byte-exact
  contract output is desired.

Status justification: every Phase 2 acceptance criterion is Verified by a named
passing test, and the full suite (111 tests) and Pint pass; the only unverified
item is a defensive race backstop, which is non-critical and listed as an
explicit follow-up, so the build-plan definition of done for Phase 2 is satisfied
— hence **Complete with follow-up** rather than **Complete**.

---

## 2026-06-18 — Vue search interface

**Build-plan phase:** Phase 3 — Vue search interface
**Status:** Complete with follow-up
**Commit:** Pending

### Summary

The first frontend phase: a standalone Vue 3 SPA mounted into the existing
minimal Blade shell, consuming only `GET /api/shows`. Pinia is registered in
`resources/js/app.js`; a native-`fetch` wrapper (`services/api.js`) is the single
boundary to the Laravel API; a `shows` Pinia store owns query/results/loading/
error and provides `AbortController` stale-response protection; a `useDebounce`
composable debounces the search input (~300 ms). Seven components render the
header/search, the responsive card grid (with loading skeletons), and shared
empty/error states. Behaviour: initial unfiltered fetch on mount, debounced
title search, loading/empty/error states, plain-text summaries, lazy-loaded
images with a missing-image placeholder, and a defensive ≤100 results cap.

### Key files

- `resources/js/app.js` (Pinia registration), `resources/js/App.vue`
- `resources/js/services/api.js`, `resources/js/stores/shows.js`,
  `resources/js/composables/useDebounce.js`
- `resources/js/components/layout/AppHeader.vue`
- `resources/js/components/shows/{SearchInput,ShowGrid,ShowCard,ShowCardSkeleton}.vue`
- `resources/js/components/shared/{EmptyState,ErrorAlert}.vue`
- `package.json` / `package-lock.json` (adds `pinia ^3.0.4`)

### Decisions and alignment

- Native `fetch` + `AbortController`, no Axios (DECISIONS #21); no Vue Router
  (#12); no Inertia (#20); single `shows` Pinia store with transient input state
  kept local (#11); minimal Blade shell / single mount (#22/#23).
- Summaries rendered via text interpolation only — no `v-html` on API data
  (confirmed by grep). Frontend calls only `/api/*`; no TVmaze reference in
  `resources/`. Folder structure matches `ARCHITECTURE.md`.
- No API or database contract involvement. Pinia is the first frontend
  dependency, justified by #11 and the BUILD_PLAN Phase 3 scope.

### Verification

Commands actually run in this handoff:

- `npm run build` → passed (77.05 kB / 30.22 kB gzip).
- `php artisan test` → passed: 111 tests, 253 assertions (confirms no backend
  regression; a temporary `config/services.php` edit used to force a 502 for the
  error-state check was reverted — `git diff` on that file is empty).
- Headless `curl`: app shell serves `<div id="app">` + `@vite`; `GET /api/shows`
  → 200 with 100 shows (cap) and an `image_url` field.
- `grep`: frontend uses one centralized `fetch` to `/api/*`; no `tvmaze`, no
  `v-html` (safety comments only).

Manual browser verification (developer-driven, against the running app at the
Herd URL; main session forced a 502 by temporarily pointing the TVmaze base URL
at a dead host, then reverted):

- **Verified (manual):** initial list loads without a full-page reload; typing
  searches automatically (debounced, single request after a pause); stale
  responses are discarded (earlier requests observed cancelled, no stale flash);
  empty state renders for a no-match query; **error state** renders the friendly
  red alert on a forced 502 (`curl` confirmed the controlled `{"message": ...}`
  body); responsive grid, missing-image placeholder, and lazy-loaded images;
  summaries display as plain text.
- **Verified (command):** production build passes.
- **Not applicable (this phase):** automated frontend tests — Vitest is installed
  in BUILD_PLAN Phase 5; no `npm run test` exists yet.

Known limitations: the behavioral criteria are verified by **manual browser
observation**, which is a point-in-time check, not an automated regression guard.
No automated frontend tests exist until Phase 5.

### AI workflow

- Agents: `frontend-engineer` (Sonnet) — implementation.
- Skills: `read-project-docs`, `implement-vue-feature`.
- Commands: `/review-feature` (twice — first flagged a redundant clear-fetch, an
  error-state empty grid, and minor duplication; all fixed and confirmed on
  re-review), then `/feature-handoff` (this; an initial run correctly held the
  phase at Incomplete pending behavioral evidence).
- Human checkpoints: developer ran the app in the browser and confirmed all six
  behavioral criteria (including the forced-502 error state), and directed the
  show-detail-modal and genre-filter scope decisions (recorded in DECISIONS #24
  and the new docs/BACKLOG.md, committed separately).

### Follow-ups

- Phase 5: add Vitest + Vue Test Utils coverage that automates these behaviors —
  store (search/clear, loading/error/empty, stale-response discard, 100 cap),
  `useDebounce` (fake timers), and component states (loading/empty/error,
  placeholder, plain-text summary, clear button).

Status justification: every Phase 3 acceptance criterion is Verified — the
production build by command, and all behavioral criteria by explicitly performed
manual browser verification (including the failure path via a forced 502). The
only outstanding item is automated frontend test coverage, which BUILD_PLAN
defers to Phase 5 and is recorded as an explicit follow-up; the Phase 3
definition of done is satisfied — hence **Complete with follow-up** rather than
**Complete**.

---

## 2026-06-19 — Vue favorites interface

**Build-plan phase:** Phase 4 — Vue favorites interface
**Status:** Complete with follow-up
**Commit:** Pending

### Summary

Adds the favorites UI to the Phase 3 SPA, consuming the Phase 2 favorite-list
API. A second (and final) `favoriteLists` Pinia store owns the list index,
counts, the selected list and its favorites, and create/add/remove/delete
mutations. The screen is a state-driven Browse / My Lists tab swap (full-width
grid in Browse; full-width lists view in My Lists). My Lists shows lists as pills
with counts + an inline create form, and a selected-list detail (favorites in
`updated_at` desc order, remove buttons, delete-with-confirm). Each show card has
a heart that opens an add-to-list dialog: it saves to one or more lists with one
POST per list, reports a per-list outcome (including 409 duplicates), and can
create a new list inline (auto-selecting it). `services/api.js` was extended with
the six favorite endpoints and sends a CSRF token on mutating requests; the Blade
shell exposes the token via a meta tag.

### Key files

- `resources/js/stores/favoriteLists.js`
- `resources/js/services/api.js` (favorite endpoints + CSRF on mutations)
- `resources/js/App.vue`, `resources/js/components/layout/AppHeader.vue`,
  `resources/js/components/layout/FavoritesPanel.vue`
- `resources/js/components/favorites/{FavoriteListForm,FavoriteListDetails,FavoriteListSelector,RemoveFavoriteButton}.vue`
- `resources/js/components/shared/{AppDialog,ConfirmDialog}.vue`
- `resources/js/components/shows/ShowCard.vue`, `resources/views/app.blade.php`

### Decisions and alignment

- Two Pinia stores only — `shows` + `favoriteLists` (DECISIONS #11).
- Saving to multiple lists issues one POST per selected list via `Promise.all`,
  with per-list 409 handling and no batch endpoint (DECISIONS #16).
- 422 duplicate-name surfaced inline; CSRF token sent on mutations (Laravel's
  `/api` group is stateless and does not enforce CSRF, so this is defensive).
- No Vue Router / no Inertia; browse vs. favorites is state-driven on one screen
  (#12/#20/#23). Summaries/names rendered as text — no `v-html`. Reuses
  `services/api.js`; transient UI state kept local to components.
- No backend, API-contract, or database changes this phase.
- Layout note: the initial two-column (right sidebar) layout was replaced, on
  developer preference, with a full-width Browse / My Lists tab layout. A
  multi-root `v-show` bug (the grid stayed visible behind My Lists) was found via
  a developer screenshot and fixed by wrapping the grid in a single element.

### Verification

Commands actually run in this handoff:

- `npm run build` → passed (113.96 kB / 40.73 kB gzip).
- `php artisan test` → passed: 111 tests, 253 assertions (no backend regression;
  the favorites API the UI consumes is green).
- Live API walkthrough via `curl` against the running app (with cleanup of the
  test data) confirmed the contract end-to-end: create 201 → case-insensitive
  duplicate 422 with `errors.name` → add favorite 201 → duplicate favorite 409 →
  get list with synced count 200 → remove 204 → delete 204 → list index 200.
- `grep`: frontend calls only `/api/*`; no `tvmaze`, no `v-html`, no debug
  statements. No frontend automated tests exist yet (Vitest is Phase 5), so none
  call the live service.

Manual browser verification performed by the developer against the running app
(reported "all good" to an explicit 7-point checklist):

- **Verified (manual):** lists display alphabetically with counts; a
  case-insensitive duplicate name shows the inline 422 message with no reload;
  selecting a list shows its favorites most-recently-modified first; saving a
  show to multiple lists at once reports per-list outcomes including a 409
  "already in" for a duplicate; the inline "create a list" path in the add dialog
  creates and auto-selects the list (and opens directly when there are no lists);
  removing a favorite updates the UI and decrements the count without a reload;
  deleting a list goes through the confirmation dialog and returns to the index;
  no full-page reloads occur.
- **Verified (command/API):** the favorites endpoints (status codes, shapes,
  ordering, counts, cascade) via the live curl walk and the backend suite.
- **Verified (build):** production build passes.
- **Not applicable (this phase):** automated frontend tests — Vitest is installed
  in BUILD_PLAN Phase 5; no `npm run test` exists yet.

Known limitations / non-blocking findings (from `/review-feature`): dialog
initial focus lands on the close button and the inline-create input may not
autofocus on the empty state (minor a11y); no body-scroll lock while a modal is
open; one `FavoriteListSelector`/`AppDialog` instance mounts per show card (~100
— fine at the 100-cap scale, but an app-level dialog would be leaner); an unused
`selectedListCount` getter remains in the store. The behavioral criteria are
confirmed by manual browser verification, not automated tests (point-in-time, not
a regression guard).

### AI workflow

- Agents: `frontend-engineer` (Sonnet) — implementation.
- Skills: `read-project-docs`, `implement-vue-feature`.
- Commands: `/review-feature` (findings: manual-verification gap, dialog focus +
  body-scroll-lock polish, unused getter), then `/feature-handoff` (this; an
  initial run correctly held the phase at Incomplete pending behavioral evidence).
- Human checkpoints: developer chose the Tabs layout over the sidebar, caught the
  multi-root `v-show` bug via a screenshot, directed the inline-create
  enhancement (and backlogged a favorited-indicator and a favorites grid),
  migrated the dev database, and ran the 7-point browser verification.

### Follow-ups

- Phase 5: Vitest + Vue Test Utils coverage for the `favoriteLists` store
  (create/add/remove/delete, count sync, per-list 409, stale-response guard) and
  components (selector incl. inline create, dialog focus/Escape, delete confirm),
  plus a regression test that the grid is hidden when My Lists is active.
- Minor polish (non-blocking): dialog initial-focus / body-scroll-lock; remove
  the unused `selectedListCount` getter; consider an app-level add-to-list dialog
  instead of one per card.
- Backlog (separate): favorited indicator on cards (needs a small
  `GET /api/favorites/ids` endpoint + contract update); favorites detail as a
  responsive grid (Phase 6).

Status justification: every material Phase 4 acceptance criterion is Verified —
the production build by command, the favorites API by the backend suite and a
live curl walk, and all UI behaviors (create, duplicate-422, ordering, multi-list
add with per-list 409, inline create, remove, delete-with-confirm, no reloads) by
explicitly performed manual browser verification. The only outstanding work is
automated frontend test coverage, which BUILD_PLAN defers to Phase 5 and which is
recorded as an explicit follow-up; the Phase 4 definition of done is satisfied —
hence **Complete with follow-up** rather than **Complete**.
