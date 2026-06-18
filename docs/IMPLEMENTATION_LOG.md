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
