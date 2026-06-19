# Backlog

Tracked, **not-yet-scheduled** enhancements that are out of the current
BUILD_PLAN phases. These are ideas captured so they are not lost — they are
**not** committed work. Anything here that touches the API or database contract
must update the relevant source-of-truth document **first** (see `CLAUDE.md`).

Approved planned enhancements that have a firm design decision live in
[DECISIONS.md](DECISIONS.md) instead (e.g. the show-detail modal, #24).

---

## Filter shows by genre

**Status:** Backlog (not scheduled). **Type:** Frontend-led; optional server
support.

**What:** Let the user narrow the currently displayed shows by genre (e.g.
Drama, Comedy), in addition to the existing title search.

**Important upstream constraint:** TVmaze has **no genre-search endpoint and no
genre query parameter**. Its API exposes `/search/shows?q=` (name/title search)
and `/shows?page=` (paginated index); `genres` is only a **field** on each show
object. So this is a **filter over shows we already fetched**, not a new kind of
upstream search — we cannot ask TVmaze "give me all Drama shows."

**Preferred approach — client-side filter (no contract change):**
- Derive the set of genres present in the current `shows` store results.
- Render them as toggle chips; filter the displayed list in the store/UI.
- Cheapest and instant; no backend, no API-contract change, no extra TVmaze
  call. Scope is bounded to the ≤100 results currently loaded.

**Alternative — server-side `?genre=` param:**
- `GET /api/shows?genre=Drama` where Laravel filters the normalized results
  before returning. Cleaner separation, but it is an **API-contract change** and
  must update [API_CONTRACT.md](API_CONTRACT.md) **first**. Still bounded by what
  TVmaze returns for the base list/search (no genre search upstream).

**Explicitly not feasible with TVmaze:** free-text search across show
*descriptions/summaries* or other arbitrary keywords. TVmaze search is
name-based; we could only approximate it by filtering already-fetched results'
fields client-side, which is of limited value. Set expectations accordingly
rather than promising full keyword search.

**Suggested slot:** after the core search → favorites flow (BUILD_PLAN Phases
3–4) is complete.

---

## "Favorited" indicator on show cards

**Status:** Backlog (not scheduled). **Type:** Cross-cutting — backend
(+ contract) and frontend.

**What:** On the Browse grid, fill the heart icon (pink/red) when a show is
already saved in **at least one** list, so users can tell at a glance what's
already favorited (it can still be in multiple lists).

**Why it needs a backend addition:** the card must know whether a show's
`external_id` is in **any** list. The lists index deliberately stays lean
(counts only, no membership), and a list's favorites are only loaded when that
list is opened — so the client has no global "what's favorited" set. A
client-only set (tracking adds during the session) would be wrong after a
reload, so that shortcut is rejected.

**Preferred approach:**
- Add a small endpoint, e.g. `GET /api/favorites/ids` → a JSON array of the
  distinct favorited `external_id`s. This is an **API_CONTRACT.md change** and
  must update that document **first**.
- Frontend: load the set on mount into the `favoriteLists` store; the card fills
  the heart when its `external_id` is in the set; update the set on add/remove
  so it stays in sync without a refetch.

**Effort:** moderate (backend endpoint + contract + frontend). `backend-engineer`
for the endpoint, then frontend.

---

## Favorites detail as a responsive grid

**Status:** Backlog (not scheduled). **Type:** Frontend-only polish.

**What:** Render a selected list's favorites as a responsive card grid (similar
to the Browse grid) instead of the current single full-width column of wide
rows, for visual consistency and better use of space on desktop.

**Notes:** Pure frontend restyle of `FavoriteListDetails` (possibly a slimmer
shared card with a remove button). Lowest priority — the current layout works.

**Suggested slot:** fits naturally into **BUILD_PLAN Phase 6** (accessibility,
responsive behavior, and browser review).
