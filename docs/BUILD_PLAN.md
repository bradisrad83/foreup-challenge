# Build Plan

> **Status:** Planning. This is a sequential, implementation-oriented checklist
> derived from the project's source-of-truth documents. It introduces **no new
> architecture or contract decisions** — where it gives a concrete value, that
> value sits within what those documents already allow.
>
> **Source of truth** (read before each phase):
> [README.md](../README.md), [CLAUDE.md](../CLAUDE.md),
> [PROJECT_PLAN.md](PROJECT_PLAN.md), [ARCHITECTURE.md](ARCHITECTURE.md),
> [API_CONTRACT.md](API_CONTRACT.md), [DATABASE_DESIGN.md](DATABASE_DESIGN.md),
> [DECISIONS.md](DECISIONS.md), [AI_WORKFLOW.md](AI_WORKFLOW.md).
>
> **Phase numbering note:** the phases below are this document's own
> implementation sequence and do **not** map one-to-one onto the eight phases in
> `PROJECT_PLAN.md`. Where `DATABASE_DESIGN.md` says migrations are created in
> "Phase 3", it refers to the `PROJECT_PLAN.md` numbering; here the same work is
> Build-Plan **Phase 2**.

## Working principles

- Work on **one phase at a time**.
- Do **not** begin the next phase until the current phase is reviewed.
- Keep commits scoped to **one logical unit** (one suggested commit per phase).
- Run **focused tests** during implementation.
- Run the **full relevant suite** before a phase is considered complete.
- Do **not** change API or database contracts without updating the
  source-of-truth documents **first**.
- Do **not** add dependencies without justification.
- Do **not** use the live TVmaze API in automated tests (`Http::fake()` only).
- Do **not** commit unless explicitly instructed.
- **Sonnet** handles normal implementation work.
- **Opus** is reserved for major architecture review or difficult cross-cutting
  decisions (delegate to the `architecture-advisor` subagent when warranted).

---

## Phase 1 — TVmaze backend search API

Implements `GET /api/shows` per [API_CONTRACT.md](API_CONTRACT.md) (Shows) and
the TVmaze boundary in [ARCHITECTURE.md](ARCHITECTURE.md).

### In scope
- Laravel API route `GET /api/shows` (in `routes/api.php`).
- Search request validation (optional `search` string).
- TVmaze configuration (base URL + timeout in `config/services.php`, read from
  env; **user input never controls the host**).
- Dedicated TVmaze client/service in `app/Services/TvMaze/` (the only caller of
  TVmaze).
- Response normalization to the single normalized show shape.
- HTML removal from `summary` → plain text.
- Initial unfiltered results: TVmaze `GET /shows?page=0`.
- Search behavior: TVmaze `GET /search/shows?q={search}`, unwrapping each
  result's `show`.
- Maximum **100** results (slice).
- **5-minute** cache TTL for successful normalized results (within the
  documented ~5–10 min range), keyed per request (e.g. `shows:index`,
  `shows:search:{query}`).
- Upstream request timeout.
- Controlled **502** response on TVmaze timeout/non-success; failures **not**
  cached.
- A `ShowResource` (API Resource) so the response shape lives in one place.
- PHPUnit feature/unit tests using `Http::fake()`.

### Not in scope
- Favorites database work (Phase 2).
- Vue search interface (Phase 3).
- Frontend dependencies or frontend tests.

### Acceptance criteria
- [ ] `GET /api/shows` returns the initial unfiltered list.
- [ ] `GET /api/shows?search=breaking` returns search results.
- [ ] Consistent `{ "data": [...] }` response for both.
- [ ] Both upstream shapes (`/shows` array and `/search/shows` `{score,show}`)
      normalize correctly to the same shape.
- [ ] Results never exceed **100**.
- [ ] Missing optional values safely become `null` (and `genres` → `[]`).
- [ ] `summary` is plain text (no HTML tags/entities).
- [ ] On upstream failure: **502** with `{ "message": ... }`; failure is **not**
      cached.
- [ ] A valid request with no matches returns `{ "data": [] }` (200), not 404.
- [ ] Automated tests use `Http::fake()` and never call the live API.
- [ ] Relevant PHPUnit tests pass; full backend suite passes; Pint passes.

### Commands
```bash
php artisan test --filter=Show
php artisan test
./vendor/bin/pint --test
```

### Suggested commit
```text
feat: add TVmaze show search API
```

---

## Phase 2 — Favorites database and backend API

Implements the favorite-list and favorite endpoints in
[API_CONTRACT.md](API_CONTRACT.md) and the schema in
[DATABASE_DESIGN.md](DATABASE_DESIGN.md).

### In scope
- `favorite_lists` migration + `FavoriteList` model.
- `favorites` migration + `Favorite` model.
- Relationships: `FavoriteList hasMany Favorite`, `Favorite belongsTo
  FavoriteList`.
- Casts: `genres` → array, `metadata` → array, `premiered`/`ended` → date,
  `rating` → float.
- Factories for both models (test support only).
- Form Requests for list creation and favorite creation.
- API Resources: `FavoriteListResource`, `FavoriteResource`.
- Controllers (thin) under `app/Http/Controllers/Api/`.
- Routes in `routes/api.php`.
- Case-insensitive list-name uniqueness via `normalized_name` (trim → lowercase
  → collapse internal whitespace); unique index on `normalized_name`; Form
  Request also checks for a friendly 422.
- Composite unique index on (`favorite_list_id`, `external_id`).
- Cascade deletion (`onDelete('cascade')`).
- Alphabetical list ordering (`name` ascending).
- Favorite counts via `withCount('favorites')` (no N+1).
- Favorites ordered by `updated_at` **descending** within a list.
- Duplicate list name → **422**.
- Duplicate favorite → **409**.
- Mismatched list/favorite deletion protection (favorite must belong to the
  list, else 404).
- Backend tests (feature + unit) using SQLite.

### Not in scope
- Vue favorites interface (Phase 4).
- Multi-list add modal (Phase 4).
- Frontend tests.

### Acceptance criteria — every endpoint in [API_CONTRACT.md](API_CONTRACT.md)
- [ ] `GET /api/favorite-lists` → 200, lists ordered by `name` asc, each with
      `favorites_count`; empty DB → `{ "data": [] }`.
- [ ] `POST /api/favorite-lists` → 201 with the created list; missing/empty name
      → 422; case-insensitive duplicate name → 422 with `errors.name`.
- [ ] `GET /api/favorite-lists/{favoriteList}` → 200 with favorites ordered by
      `updated_at` desc; unknown id → 404.
- [ ] `DELETE /api/favorite-lists/{favoriteList}` → 204; cascade removes its
      favorites; unknown id → 404.
- [ ] `POST /api/favorite-lists/{favoriteList}/favorites` → 201 with the saved
      snapshot; missing `external_id`/`name` → 422; duplicate `external_id` in
      that list → 409; unknown list → 404.
- [ ] `DELETE /api/favorite-lists/{favoriteList}/favorites/{favorite}` → 204;
      unknown list/favorite, or favorite not belonging to the list → 404.
- [ ] Data persists in SQLite; relevant PHPUnit tests pass; full backend suite
      passes; Pint passes.

### Commands
```bash
php artisan migrate
php artisan test --filter=Favorite
php artisan test
./vendor/bin/pint --test
```

### Suggested commit
```text
feat: add favorite list persistence API
```

---

## Phase 3 — Vue search interface

Consumes only `GET /api/shows`. Frontend structure per
[ARCHITECTURE.md](ARCHITECTURE.md) (`resources/js/`). This phase also lays the
**frontend foundation** the favorites UI will build on. The app is a standalone
Vue SPA in a minimal Blade shell — **no Inertia, no Vue Router** (see
[DECISIONS.md](DECISIONS.md) #20, #12, #22).

### In scope
- **Frontend foundation:** install and register **Pinia**
  (`npm install pinia`; `createApp(App).use(createPinia()).mount('#app')` in
  `app.js`). This is the first frontend dependency added and is justified by the
  shared-state needs in [DECISIONS.md](DECISIONS.md) #11.
- API service wrapper (`resources/js/services/api.js`) — thin wrapper around
  native `fetch` (`Accept: application/json`, JSON/error parsing, abort signals;
  CSRF handling reserved for mutation requests in Phase 4).
- **`shows` Pinia store** (`resources/js/stores/shows.js`): search query,
  results, loading/error state, initial unfiltered fetch, executing searches,
  clearing search, and `AbortController` stale-response protection.
- Debounce helper composable (`resources/js/composables/useDebounce.js`).
- ~**300 ms** debounce on the search input.
- **AbortController** (or equivalent) to discard stale responses.
- Initial unfiltered fetch on load.
- Search input control.
- Clear-search control.
- Loading state.
- Empty state.
- Error state (friendly message on 502).
- Responsive show-card grid (Tailwind).
- Missing-image placeholder.
- Lazy-loaded images (`loading="lazy"`).
- Plain-text summaries only (never render raw HTML).
- Search result cap (≤100) respected in the UI.
- Basic accessibility (labeled input, alt text, focusable controls).

### Not in scope
- Favorite-list creation (Phase 4).
- Add-to-list interaction (Phase 4).
- Favorite-list detail view (Phase 4).
- Frontend testing packages (Phase 5) unless trivially needed early.

### Acceptance criteria
- [ ] Initial list loads without a full-page reload.
- [ ] Typing searches automatically (debounced ~300 ms); no reloads.
- [ ] Stale responses are discarded (latest query wins).
- [ ] Loading, empty, and error states render correctly.
- [ ] Grid is responsive; missing images show a placeholder; images lazy-load.
- [ ] Summaries display as plain text only.
- [ ] `npm run build` passes.

### Commands
```bash
npm install pinia          # first frontend dependency; shared-state store
npm run dev
npm run build
```

### Suggested commit
```text
feat: build responsive show search interface
```

---

## Phase 4 — Vue favorites interface

Consumes the favorite endpoints from Phase 2. Saving a show to multiple lists
issues **one `POST` per selected list** (no batch endpoint), per
[API_CONTRACT.md](API_CONTRACT.md) and [DECISIONS.md](DECISIONS.md).

### In scope
- **`favoriteLists` Pinia store** (`resources/js/stores/favoriteLists.js`):
  loading all lists, favorite counts, selected list id, selected list details,
  creating/loading/deleting a list, adding a show to one or more lists, removing
  a favorite, synchronizing counts and selected-list state, and
  mutation/validation errors.
- Favorite-list creation UI.
- Duplicate-name validation display (surface the 422 `errors.name`).
- Alphabetical list display.
- Favorite counts per list.
- Selecting a list.
- Favorite-list detail view.
- Shows ordered by modified date (`updated_at` desc, as returned).
- Add a show to one or more lists.
- **One `POST` request per selected list** (e.g. `Promise.all`).
- Duplicate-favorite feedback (handle 409 per list).
- Remove a favorite.
- Delete a list with a confirmation step.
- Update UI state without page reloads.
- Mobile-friendly layout.
- Accessible interactions (focusable controls, dialog semantics).

### Not in scope
- Vue Router.
- Inertia.
- Authentication.
- Batch favorite endpoint.
- Additional Pinia stores beyond `shows` and `favoriteLists`.

> Note: Pinia is **in scope** for this app (set up in Phase 3, `favoriteLists`
> store added here) — see [DECISIONS.md](DECISIONS.md) #11.

### Acceptance criteria
- [ ] Create a list; duplicate (case-insensitive) name shows the validation
      message; no reload.
- [ ] Lists display alphabetically with correct counts.
- [ ] Selecting a list shows its favorites ordered by most recently modified.
- [ ] A show can be saved to multiple lists (one POST each); 409 duplicates are
      reported per list without breaking the others.
- [ ] Removing a favorite and deleting a list (with confirmation) update the UI
      without reloads and persist in SQLite.
- [ ] `npm run build` passes.

### Commands
```bash
npm run dev
npm run build
```

### Suggested commit
```text
feat: add favorite list management interface
```

---

## Phase 5 — Frontend testing

Adds the frontend test stack (Vitest + Vue Test Utils) per
[DECISIONS.md](DECISIONS.md). **No TypeScript tooling.**

### In scope
- Install **Vitest**.
- Install **Vue Test Utils**.
- Configure the frontend test environment (jsdom; `test` script in
  `package.json`; Vitest config; fresh Pinia per test via `createPinia()` /
  `setActivePinia`).
- **Test the Pinia stores** (`shows`, `favoriteLists`): search execution and
  clearing, loading/error transitions, list create/load/delete, add/remove
  favorite, and count synchronization after mutations.
- Test the search debounce.
- Test stale-response protection (AbortController behavior).
- Test loading, empty, and error states.
- Test the missing-image placeholder.
- Test list creation.
- Test duplicate-name validation display.
- Test favorite counts.
- Test favorite removal.
- Test delete confirmation.
- **Mock all frontend API requests** (no real network, no live TVmaze).

### Acceptance criteria
- [ ] Frontend tests pass (`npm run test`).
- [ ] Production build passes (`npm run build`).
- [ ] No TypeScript tooling added.
- [ ] No live TVmaze calls occur in tests.

### Commands
```bash
npm install -D vitest @vue/test-utils jsdom   # adds the planned dev deps
npm run test
npm run build
```

### Suggested commit
```text
test: add Vue component and composable coverage
```

---

## Phase 6 — Accessibility, responsive behavior, and browser review

Refinement only — no new features or contract changes.

### In scope
- Keyboard interaction review (tab order, activation).
- Visible focus states.
- Dialog behavior (focus trap where applicable).
- Escape-key support where relevant (e.g. closing the add-to-list dialog).
- `aria-live` messaging for async/empty/error updates.
- Image alt text.
- Mobile, tablet, and desktop layouts.
- Long-title handling.
- Overflow review.
- Compatibility review on current Chrome, Firefox, Safari, and Edge.
- Manual error-state verification (simulate a 502).

### Acceptance criteria
- [ ] Interactive elements are keyboard-accessible with visible focus.
- [ ] Async/empty/error states are announced via `aria-live`.
- [ ] Layout holds at mobile/tablet/desktop; long titles and overflow handled.
- [ ] Backend and frontend suites still pass; `npm run build` passes.

### Suggested commit
```text
fix: improve accessibility and responsive behavior
```

---

## Phase 7 — Final verification and submission cleanup

### In scope
- Run the complete backend suite.
- Run the complete frontend suite.
- Run the production build.
- Run Pint.
- Run linting/formatting checks **if configured** (see Command reference).
- Review `npm audit`.
- Remove unused scaffold files if appropriate (e.g. stray
  `resources/views/welcome.blade.php` if unused).
- Review dead code.
- Review logs and debug statements.
- Verify no secrets or local files are tracked.
- Update the README from current-state to final submission documentation.
- Update known limitations.
- Update the AI-assistance disclosure.
- Add screenshots.
- Review install instructions from a clean-clone perspective.
- Confirm documented commands actually work.
- Final architecture review (consider the `architecture-advisor` subagent).
- Final submission checklist (see below).

### Acceptance criteria
- [ ] All suites and the production build pass; Pint passes.
- [ ] `npm audit` reviewed; no tracked secrets/generated files.
- [ ] README setup verified from a clean clone; documented commands work.
- [ ] Docs match the implementation; no stale "planned" claims remain.

### Suggested commits (may be split)
```text
docs: finalize submission documentation
```
```text
chore: complete final project verification
```

---

## Per-phase checklist template

```text
### Before starting

- [ ] Read the relevant source-of-truth documents
- [ ] Confirm the active Git root and branch
- [ ] Confirm the working tree state
- [ ] State the exact phase scope
- [ ] Identify expected files to change

### Implementation

- [ ] Implement only the approved phase
- [ ] Avoid unrelated cleanup
- [ ] Update documentation only if an approved decision changed

### Verification

- [ ] Run focused tests
- [ ] Run the full relevant suite
- [ ] Run formatting/build commands
- [ ] Review the diff
- [ ] Confirm no secrets or generated files are included

### Handoff

- [ ] Summarize files changed
- [ ] Report commands run
- [ ] Report test results
- [ ] Report unresolved issues
- [ ] Suggest the phase commit message
- [ ] Stop before committing unless explicitly instructed
```

---

## Command reference

```bash
php artisan test          # backend (PHPUnit) — EXISTS
npm run test              # frontend (Vitest) — DOES NOT EXIST until Phase 5
npm run build             # production frontend build — EXISTS
./vendor/bin/pint --test  # PHP code style check — EXISTS
npm run lint              # DOES NOT EXIST (no ESLint configured; not planned)
npm run format:check      # DOES NOT EXIST (no Prettier configured; not planned)
```

> Only `php artisan test`, `npm run build`, and `./vendor/bin/pint --test`
> currently exist. `npm run test` is added in Phase 5. `npm run lint` and
> `npm run format:check` are **not** configured and are **not** planned for this
> challenge — run them only if such tooling is later added with justification.
> Do not assume these scripts work until they exist.

---

## Phase dependencies

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6 -> Phase 7
```

The arrows show the recommended working order, but the strict dependencies are:

- **Phase 3** (Vue search) technically depends only on **Phase 1** (it consumes
  `GET /api/shows`). It does not need the favorites backend.
- **Phase 4** (Vue favorites) depends on **both Phase 2** (favorites backend) and
  **Phase 3** (the search UI it builds on).
- **Phase 5** depends on Phases 3–4 (the UI it tests).
- **Phases 6–7** depend on all prior phases.

---

## Final submission definition of done

- [ ] Search works with no page reload.
- [ ] Empty search returns an initial list.
- [ ] Search updates automatically (debounced).
- [ ] Results capped at 100.
- [ ] Vue calls Laravel only (never TVmaze directly).
- [ ] Multiple lists work.
- [ ] Duplicate list names are rejected (422).
- [ ] Shows can be saved to multiple lists.
- [ ] Favorites display in modified-date order.
- [ ] Lists display alphabetically.
- [ ] Counts are correct.
- [ ] Favorites can be removed.
- [ ] Lists can be deleted.
- [ ] Data persists in SQLite.
- [ ] Backend tests pass.
- [ ] Frontend tests pass.
- [ ] Production build passes.
- [ ] README setup instructions are accurate.
- [ ] No secrets are tracked.
- [ ] Application is responsive and accessible.
- [ ] AI assistance is documented honestly.
