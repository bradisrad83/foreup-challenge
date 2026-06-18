---
name: write-tests
description: >-
  Canonical procedure for writing or strengthening automated tests on this
  challenge — Laravel PHPUnit (Feature/Unit, SQLite :memory:) and Vue
  Vitest/Vue Test Utils + Pinia. Use when adding a feature, closing a coverage
  gap, or adding a bug-fix regression test. Never call the live TVmaze API.
---

# Write tests

The canonical test **procedure**. The **policy** and quality rules live in
`docs/TESTING_STRATEGY.md`. Project-specific scenarios live in
`docs/BUILD_PLAN.md` (phase acceptance criteria) and `docs/API_CONTRACT.md`
(endpoints, status codes, shapes) — read and reference those rather than
restating them.

## Procedure
1. Read the relevant **acceptance criteria** (current `BUILD_PLAN.md` phase) and
   `docs/TESTING_STRATEGY.md`.
2. Build or update the **acceptance-criteria matrix** (criterion → test level →
   success path → failure/boundary path → Verified/Not verified/Not applicable)
   **before** declaring coverage sufficient.
3. Inspect existing tests and conventions (`tests/`, any `*.test.js` /
   `*.spec.js`).
4. Select the correct **test level** per criterion: Laravel feature, Laravel
   unit, Vue component, Pinia store, or documented manual verification.
5. Write tests for the **primary success path**.
6. Write tests for **material failure and validation** paths.
7. Write tests for **important boundaries**.
8. Use **fake external dependencies** — `Http::fake()` (backend) / mocked
   `services/api.js` or `fetch` (frontend). **Never** the live TVmaze API.
9. Run the **focused** test first.
10. Run the applicable **broader suite** afterward.
11. Report the **actual commands and actual results** — never fabricate a pass.
12. Identify remaining **unverified behavior** explicitly.
13. **Refuse to claim full coverage without evidence.**

## Bug fixes
A bug fix requires a **regression test that fails before the fix and passes
after it**, unless automation is genuinely impractical — in which case document a
manual reproduction + verification procedure and justify why.

## Levels & commands
- **Backend (PHPUnit):** `tests/Feature` for HTTP/API behavior (routes, status,
  validation, JSON shape, persistence, sorting/limits, external failures);
  `tests/Unit` for isolated logic with meaningful branching (e.g. normalization).
  SQLite `:memory:` (`phpunit.xml`) + `RefreshDatabase`. Run:
  `php artisan test --filter=<Focus>` then `php artisan test`.
- **Frontend (Vitest + Vue Test Utils — installed in BUILD_PLAN Phase 5):**
  component behavior (interactions, loading/empty/error, rendering, debounce,
  API handling, favorite-list interactions); Pinia stores only when they hold
  meaningful branching/transformations/async. Reset Pinia per test. Run:
  `npm run test`.

Keep tests deterministic and behavior-focused. Do not commit unless instructed.
