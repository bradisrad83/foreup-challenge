# Database Design

> **Status:** Planned schema. No migrations exist yet — they are created in
> Phase 3. SQLite is the database (`database/database.sqlite`).

Two tables: `favorite_lists` and `favorites`. A favorite stores a **snapshot**
of the normalized show at save time.

## Table: `favorite_lists`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | auto-increment |
| `name` | string | display name, as entered (trimmed) |
| `normalized_name` | string | lowercased/normalized; **unique** |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### List-name handling

- **Trimmed:** leading/trailing whitespace removed on input; the request is
  rejected (422) if the result is empty.
- **Stored for display:** the trimmed value is saved in `name` exactly as the
  user typed it (original casing preserved).
- **Normalized for uniqueness:** `normalized_name` = `name` lowercased with
  internal whitespace collapsed to single spaces (e.g.
  `"  Weeknight   Watching "` → display `"Weeknight   Watching"` trimmed,
  normalized `"weeknight watching"`).
- **Compared case-insensitively:** uniqueness is enforced by a **unique index on
  `normalized_name`**. This is reliable in SQLite without depending on
  collation behavior. The Form Request also checks it for a friendly 422 before
  hitting the constraint.

## Table: `favorites`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | auto-increment |
| `favorite_list_id` | integer FK | → `favorite_lists.id`, cascade on delete |
| `external_id` | integer | TVmaze show id |
| `name` | string | |
| `image_url` | string nullable | |
| `summary` | text nullable | plain text (HTML stripped before storage) |
| `premiered` | date nullable | |
| `ended` | date nullable | |
| `status` | string nullable | |
| `genres` | JSON nullable | array of strings |
| `rating` | decimal/float nullable | |
| `language` | string nullable | |
| `network` | string nullable | |
| `official_url` | string nullable | |
| `metadata` | JSON nullable | e.g. `{ "runtime": 60, "show_type": "Scripted" }` |
| `created_at` | datetime | |
| `updated_at` | datetime | used for "most recently modified" ordering |

### Relationships & constraints

- **Foreign key:** `favorites.favorite_list_id` references `favorite_lists.id`.
- **Cascade deletion:** deleting a list deletes its favorites (DB-level
  `onDelete('cascade')`). Foreign keys must be enabled in SQLite (Laravel
  enables `PRAGMA foreign_keys` by default).
- **Composite unique:** unique index on (`favorite_list_id`, `external_id`) so a
  show appears at most once per list. A duplicate insert is reported as **409**
  (the API checks first; the constraint is the backstop).

### Indexes

- Unique (`favorite_list_id`, `external_id`) — prevents duplicates and speeds
  list membership lookups.
- Index on `favorite_list_id` is implied by the composite for list queries.
- (Optional) index on `favorites.updated_at` if ordering within large lists
  becomes a concern — not expected at challenge scale.

### Eloquent casts

| Column | Cast |
| --- | --- |
| `genres` | `array` |
| `metadata` | `array` |
| `premiered` / `ended` | `date` (or `immutable_date`) |
| `rating` | `float` (or `decimal:1`) |

## Design rationale

### Why store a show snapshot
Favorites persist the normalized show fields directly so a list can be displayed
without re-calling TVmaze. This keeps list views fast and resilient to TVmaze
outages, and preserves what the user actually saved even if upstream data later
changes.

### Why not a globally shared `shows` table
A normalized shared `shows` table (with favorites referencing it) would add a
join, sync concerns, and lifecycle questions (when to refresh/evict shows) for
no real benefit at this small, single-user-context scale. Snapshots are simpler
and directly satisfy the requirements. (At larger scale a shared catalog might
be worth revisiting — explicitly out of scope here.)

## Query expectations

- **Favorite lists list:** order by `name` ascending; include a
  `favorites_count`. Counts are loaded efficiently with
  `withCount('favorites')` (a single aggregate query, no N+1).
- **A list's favorites:** order by `updated_at` **descending** (most recently
  modified first).
- **Membership / duplicate check:** lookup by (`favorite_list_id`,
  `external_id`) using the unique index.
