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
