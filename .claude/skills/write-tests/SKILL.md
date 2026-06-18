---
name: write-tests
description: >-
  Write or strengthen automated tests for this challenge — backend PHPUnit
  (SQLite :memory:) and frontend Vitest/Vue Test Utils. Use when adding a feature
  or closing a coverage gap. Never use the live TVmaze API.
---

# Write tests

## Backend (PHPUnit)
- Location: `tests/Feature` (HTTP/endpoints) and `tests/Unit` (services such as
  the normalizer). Runs on SQLite `:memory:` (`phpunit.xml`); use
  `RefreshDatabase`.
- **TVmaze:** always `Http::fake()` — never the live API. Include success
  payloads for `/shows` and `/search/shows` plus a failure (timeout/500) case.
- Cover: normalization + HTML-stripping, the 100 cap, null/`[]` defaulting, 502
  (uncached), and each endpoint's success / 422 / 409 / 404 paths, cascade
  delete, ordering, and `withCount` counts.
- Run: `php artisan test --filter=<Focus>` then `php artisan test`.

## Frontend (Vitest + Vue Test Utils) — from Phase 5
- Install (Phase 5): `npm install -D vitest @vue/test-utils jsdom`; add a `test`
  script. Reset Pinia per test (`setActivePinia(createPinia())`).
- **Mock the API** (`services/api.js` / `fetch`) — no real network, no live
  TVmaze.
- Cover: store actions (search/clear, loading/error, list CRUD, add/remove
  favorite, count sync) and component states (loading/empty/error, image
  placeholder, duplicate-name display, delete confirmation, ~300 ms debounce,
  stale-response discard).
- Run: `npm run test`.

Keep tests deterministic and behavior-focused. Fix failing tests; do not commit
unless instructed.
