# Architecture

> **Status:** Planned design. Folder structures below are targets for upcoming
> phases; only `resources/js/App.vue` and `resources/js/app.js` exist today.

## High-level request flow

```text
┌─────────────┐    JSON over fetch    ┌──────────────────┐   HTTP client   ┌────────────┐
│ Vue frontend │ ───────────────────▶ │ Laravel internal │ ──────────────▶ │ TVmaze API │
│ (browser)    │ ◀─────────────────── │ API (/api/*)     │ ◀────────────── │            │
└─────────────┘   normalized JSON     └──────────────────┘  raw upstream   └────────────┘
```

The Vue app calls **only** Laravel endpoints under `/api`. Laravel is the sole
caller of TVmaze. This boundary keeps upstream details, normalization, HTML
stripping, and caching on the server.

## Laravel responsibilities

- Expose a small internal JSON API under `/api`.
- Call TVmaze with the Laravel HTTP client (timeouts + error handling).
- **Normalize** both TVmaze shapes (`/shows` and `/search/shows`) into one
  internal show shape; strip HTML from summaries to plain text.
- Cap results at 100; cache successful normalized results briefly.
- Persist favorite lists and favorites in SQLite.
- Validate input (Form Requests) and return consistent JSON responses and
  errors, including a controlled 502 when TVmaze is unavailable.

## Vue responsibilities

- Render the browse/search UI and the favorites UI as a single client-side app.
- Manage **shared** application state in Pinia stores; keep **transient**
  component-specific UI state local (see "Frontend application shape").
- Call the Laravel API via a thin `services/api.js` wrapper around native
  `fetch`.
- Debounce search input (~300 ms) and cancel stale requests with
  `AbortController`.
- Present loading, empty, and error states; never call TVmaze directly.

## Frontend application shape

The frontend is a **standalone client-side Vue 3 application** mounted into a
minimal Laravel Blade shell. It is **not** an Inertia application.

- **Blade shell:** Laravel serves one minimal Blade page at `/`
  (`resources/views/app.blade.php`) whose only job is to load the built assets
  and provide a single mount point (`<div id="app">`).
- **Single mount:** Vue mounts once via `resources/js/app.js`
  (`createApp(App).mount('#app')`). All views are Vue components; navigation
  between browse mode and favorite-list mode is **state-driven on one screen**,
  not server- or route-driven.
- **JSON API boundary:** Vue communicates with Laravel only through JSON
  endpoints under `/api/*` (plain `fetch`). Vue never calls TVmaze directly, and
  Laravel remains responsible for validation, persistence, TVmaze
  communication, normalization, caching, and controlled error responses.
- **No Inertia:** there is no server-driven page/prop bridge. The explicit JSON
  API boundary is clearer to demonstrate and keeps the SPA portable to a future
  Symfony backend. See [DECISIONS.md](DECISIONS.md).
- **No Vue Router (initially):** one primary screen; browse vs. favorites is
  represented by state. Routing can be added later if URL-addressable list views
  become a requirement.
- **HTTP client:** native `fetch` + `AbortController`, wrapped by
  `services/api.js`. No Axios unless a concrete future requirement justifies it.

### State: Pinia (shared) vs. local (transient)

Pinia holds genuinely **shared** state that multiple components read or mutate
and that must stay synchronized — search query/results/loading/error, favorite
lists and their counts, the selected list and its details, and the results of
add/remove/delete mutations (including count synchronization after a mutation).

Two stores initially (do **not** create one giant global store):

- `resources/js/stores/shows.js` — search query, results, loading/error state,
  the initial unfiltered fetch, executing searches, clearing search, and
  stale-response protection (`AbortController`). Debounce timing may live in a
  small composable (`composables/useDebounce.js`) when that is clearer than
  putting timing logic in the store.
- `resources/js/stores/favoriteLists.js` — loading all lists, favorite counts,
  selected list id, selected list details, creating/loading/deleting a list,
  adding a show to one or more lists, removing a favorite, synchronizing counts
  and selected-list state, and mutation/validation errors.

Keep **local to components** (not in Pinia): dialog/confirmation-dialog
visibility, temporary form input, which card opened a selector, purely visual
state, and one-off UI/animation state.

## TVmaze integration boundary

All TVmaze access lives in `app/Services/TvMaze/`. Controllers depend on this
service, not on the HTTP client directly. Upstream URLs, query parameters,
timeouts, and response quirks are confined here, so the rest of the app only
ever sees the normalized internal shape.

## Normalization layer

A dedicated normalizer (within `Services/TvMaze/`) converts:

- `GET /shows?page=0` — array of show objects, and
- `GET /search/shows?q=` — array of `{ score, show }` wrappers (unwrap `show`),

into the single internal show shape defined in
[API_CONTRACT.md](API_CONTRACT.md). It strips HTML from `summary`
(e.g. `strip_tags` + entity decode + whitespace trim) and maps optional fields
to `null` when absent. An API Resource renders the final JSON so the response
shape is defined in exactly one place.

## Persistence approach

SQLite via Eloquent. Two tables: `favorite_lists` and `favorites`. A favorite
stores a **snapshot** of the normalized show at save time (name, image, summary,
genres, etc.), so lists render without re-fetching TVmaze. See
[DATABASE_DESIGN.md](DATABASE_DESIGN.md).

## Caching approach

Cache **successful** normalized results using Laravel's default cache store,
keyed by the request (e.g. `shows:index` and `shows:search:{query}`), with a
short TTL (~5–10 minutes). Failures are **never** cached, so an outage cannot
poison the cache. Favorites data is read from the database, not cached.

## Error-handling approach

- TVmaze timeout/non-2xx/transport error → controlled **502 Bad Gateway** with a
  consistent error body; the failure is not cached.
- Validation failures → standard Laravel **422** with `message` + `errors`.
- Missing list/favorite → **404**.
- Duplicate favorite in a list → **409** (uniqueness conflict).
- The frontend surfaces these as friendly, non-blocking messages.

## Validation responsibilities

- **Server (authoritative):** Form Requests validate list names (required,
  trimmed, length, case-insensitive uniqueness) and favorite payloads
  (required show fields, types). The database enforces uniqueness and foreign
  keys as a backstop.
- **Client (UX only):** light inline checks (e.g. non-empty list name) for fast
  feedback; never the source of truth.

## Proposed backend folder structure

```text
app/
  Http/
    Controllers/Api/      # thin controllers: ShowController, FavoriteListController, FavoriteController
    Requests/             # Form Requests for validation
    Resources/            # API Resources: ShowResource, FavoriteListResource, FavoriteResource
  Models/                 # FavoriteList, Favorite
  Services/
    TvMaze/               # client + normalizer (the only TVmaze caller)
routes/
  api.php                 # /api/* routes (added in a later phase)
```

## Proposed frontend folder structure

```text
resources/js/
├── components/
│   ├── layout/
│   │   ├── AppHeader.vue
│   │   └── FavoriteListSidebar.vue
│   ├── shows/
│   │   ├── SearchInput.vue
│   │   ├── ShowGrid.vue
│   │   ├── ShowCard.vue
│   │   └── ShowCardSkeleton.vue
│   ├── favorites/
│   │   ├── FavoriteListForm.vue
│   │   ├── FavoriteListDetails.vue
│   │   ├── FavoriteListSelector.vue
│   │   └── RemoveFavoriteButton.vue
│   └── shared/
│       ├── AppDialog.vue
│       ├── ConfirmDialog.vue
│       ├── EmptyState.vue
│       └── ErrorAlert.vue
├── stores/                # Pinia: shows.js, favoriteLists.js
│   ├── shows.js
│   └── favoriteLists.js
├── services/              # api.js — fetch wrapper around /api
│   └── api.js
├── composables/           # useDebounce.js (transient/reusable helpers)
│   └── useDebounce.js
├── App.vue
└── app.js
```

## Why this stays compatible with a future Symfony backend

The frontend depends only on the **HTTP API contract**, not on Laravel
internals. Keeping the contract explicit and framework-neutral (plain JSON,
standard status codes, no Laravel-specific payloads leaking to Vue) means a
Symfony service could implement the same `/api/*` contract later and the Vue app
would not change. The normalization/snapshot approach also keeps upstream
coupling on the server, where a different backend could replicate it.
