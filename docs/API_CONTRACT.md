# Internal API Contract

> **Status:** Planned. None of these endpoints exist yet. This contract is the
> source of truth for upcoming backend and frontend phases.

All endpoints are served by Laravel under `/api`, return JSON, and are the only
thing the Vue frontend calls. Laravel calls TVmaze; the frontend never does.

## Conventions

- **Collections** return `{ "data": [ ... ] }`.
- **Single resources** return `{ "data": { ... } }`.
- **Validation errors** use Laravel's standard shape (HTTP 422):

  ```json
  {
    "message": "The name field is required.",
    "errors": { "name": ["The name field is required."] }
  }
  ```

- **Other errors** return `{ "message": "..." }` with an appropriate status.
- Timestamps are ISO-8601 strings. Unavailable optional fields are `null`.

## Normalized show shape

Both TVmaze shapes are normalized to this object (summary HTML stripped to
plain text):

```json
{
  "external_id": 169,
  "name": "Breaking Bad",
  "image_url": "https://...",
  "summary": "A chemistry teacher...",
  "premiered": "2008-01-20",
  "ended": "2013-09-29",
  "status": "Ended",
  "genres": ["Drama", "Crime", "Thriller"],
  "rating": 9.2,
  "language": "English",
  "network": "AMC",
  "official_url": "https://...",
  "metadata": { "runtime": 60, "show_type": "Scripted" }
}
```

`external_id` is the TVmaze show id. Any optional field that TVmaze omits is
returned as `null` (and `genres` defaults to `[]`).

---

## Shows

### `GET /api/shows`

Browse the initial unfiltered list, or search.

**Query parameters**

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `search` | string | No | When present and non-empty, performs a TVmaze search. When absent/empty, returns the initial unfiltered list. |

Examples:

```text
GET /api/shows                 # initial unfiltered list
GET /api/shows?search=breaking # search
```

**Behavior**

- No `search` → TVmaze `GET /shows?page=0`, normalized.
- With `search` → TVmaze `GET /search/shows?q={search}`, each result's `show`
  unwrapped, normalized.
- Results are **capped at 100** (see Pagination).

**Success — 200**

```json
{ "data": [ /* normalized show objects */ ] }
```

**Empty list — 200**

A valid request with no matching shows returns an empty collection (not a 404):

```json
{ "data": [] }
```

**Upstream TVmaze failure — 502**

If TVmaze times out or returns a non-success status:

```json
{ "message": "The show service is temporarily unavailable. Please try again." }
```

The failure is not cached; a later request may succeed.

---

## Favorite lists

### `GET /api/favorite-lists`

List all favorite lists, **ordered by name ascending**, each including its
saved-show count.

**Success — 200**

```json
{
  "data": [
    { "id": 1, "name": "Weeknight Watching", "favorites_count": 3,
      "created_at": "2026-06-17T00:00:00Z", "updated_at": "2026-06-17T00:00:00Z" }
  ]
}
```

Empty database returns `{ "data": [] }`.

### `POST /api/favorite-lists`

Create a list.

**Request**

```json
{ "name": "Weeknight Watching" }
```

- `name` is required, trimmed, 1–255 chars, and **case-insensitively unique**
  (compared via `normalized_name`).

**Success — 201**

```json
{ "data": { "id": 1, "name": "Weeknight Watching", "favorites_count": 0,
  "created_at": "...", "updated_at": "..." } }
```

**Duplicate list — 422** (validation)

A name that matches an existing list case-insensitively is a validation error:

```json
{
  "message": "A list with this name already exists.",
  "errors": { "name": ["A list with this name already exists."] }
}
```

### `GET /api/favorite-lists/{favoriteList}`

Fetch one list with its favorites, **favorites ordered by `updated_at`
descending** (most recently modified first).

**Success — 200**

```json
{
  "data": {
    "id": 1, "name": "Weeknight Watching", "favorites_count": 2,
    "created_at": "...", "updated_at": "...",
    "favorites": [ /* normalized show snapshot + id */ ]
  }
}
```

**Not found — 404**

```json
{ "message": "Favorite list not found." }
```

### `DELETE /api/favorite-lists/{favoriteList}`

Delete a list and (via cascade) all its favorites.

- **Success — 204** (no body).
- **Not found — 404** as above.

---

## Favorites (within a list)

### `POST /api/favorite-lists/{favoriteList}/favorites`

Save a show snapshot to the list.

**Request** (normalized show fields the client already has)

```json
{
  "external_id": 169,
  "name": "Breaking Bad",
  "image_url": "https://...",
  "summary": "A chemistry teacher...",
  "premiered": "2008-01-20",
  "ended": "2013-09-29",
  "status": "Ended",
  "genres": ["Drama", "Crime", "Thriller"],
  "rating": 9.2,
  "language": "English",
  "network": "AMC",
  "official_url": "https://...",
  "metadata": { "runtime": 60, "show_type": "Scripted" }
}
```

- `external_id` and `name` are required; other fields are optional and stored as
  the snapshot (nullable). Validated by a Form Request.

**Success — 201**

```json
{ "data": { "id": 10, "favorite_list_id": 1, /* ...snapshot... */ } }
```

**Duplicate favorite — 409** (conflict)

The same `external_id` already exists in this list
(unique `favorite_list_id` + `external_id`):

```json
{ "message": "This show is already in the list." }
```

**List not found — 404.** **Invalid payload — 422** (standard validation shape).

### `DELETE /api/favorite-lists/{favoriteList}/favorites/{favorite}`

Remove one favorite from the list.

- **Success — 204** (no body).
- **Not found — 404** if the list or favorite does not exist (or the favorite
  does not belong to the list).

---

## Favorited show ids

### `GET /api/favorites/ids`

Returns the **distinct** TVmaze `external_id`s of every saved show across **all**
lists. Lets the client mark already-favorited shows (e.g. a filled heart on the
browse grid) without loading each list's contents. A show saved to multiple
lists appears **once**.

**Success — 200**

```json
{ "data": [169, 200, 431] }
```

Empty database returns `{ "data": [] }`.

---

## Adding a show to multiple lists

**Decision: one `POST` per selected list** (no batch endpoint).

When the user saves a show to several lists at once, the frontend issues one
`POST /api/favorite-lists/{id}/favorites` per selected list (e.g. via
`Promise.all`). Reasons:

- It reuses the single existing endpoint — no extra route, request shape, or
  partial-success semantics to design.
- Each save is independently validated and gets its own clear status (created,
  409 duplicate, etc.), which the UI can report per list.
- The list count is small and interactive, so the request volume is negligible.

A batch endpoint would add complexity (partial-failure handling, a new payload)
without a real benefit at this scale.

## Pagination

**Decision: no pagination.** The challenge allows limiting results, so both the
initial list and search return at most **100** normalized shows in a single
response. This keeps the frontend grid and the API simple. (TVmaze's
`/shows?page=0` already returns a bounded page; search results are sliced to
100.)

## Status code summary

| Scenario | Status |
| --- | --- |
| Successful read | 200 |
| Successful create | 201 |
| Successful delete | 204 |
| Empty collection | 200 (`{ "data": [] }`) |
| Validation error (incl. duplicate list name) | 422 |
| Duplicate favorite in a list | 409 |
| List/favorite not found | 404 |
| TVmaze unavailable | 502 |
