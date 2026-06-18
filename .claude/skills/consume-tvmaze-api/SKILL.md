---
name: consume-tvmaze-api
description: >-
  Call the upstream TVmaze API from the Laravel backend and normalize its
  responses. Use ONLY in backend services (app/Services/TvMaze) — the frontend
  must never call TVmaze. Covers both /shows and /search/shows shapes, HTML
  stripping, the 100 cap, caching, timeouts, and the 502 failure path.
---

# Consume the TVmaze API (backend only)

TVmaze is reached **only** from `app/Services/TvMaze/` using Laravel's HTTP
client. The frontend never calls TVmaze. Base URL + timeout come from
`config/services.php` (env) — user input must never control the host.

## Endpoints
- Initial list: `GET https://api.tvmaze.com/shows?page=0` → array of show
  objects.
- Search: `GET https://api.tvmaze.com/search/shows?q={query}` → array of
  `{ score, show }`; unwrap `show`.

## Normalize (single internal shape — see `docs/API_CONTRACT.md`)
Map to: `external_id, name, image_url, summary, premiered, ended, status,
genres, rating, language, network, official_url, metadata`.
- Strip HTML from `summary` to plain text (`strip_tags` + entity decode + trim).
- Missing optional fields → `null`; `genres` → `[]`.
- **Cap results at 100** (slice).

## Reliability
- Set a request **timeout**.
- **Cache successful** normalized results ~5 min (within the documented
  ~5–10 min range — see `DECISIONS.md` #18), keyed per request (`shows:index`,
  `shows:search:{query}`). **Never cache failures.**
- On timeout / non-2xx / transport error: return a controlled **502** with
  `{ "message": ... }`; never leak upstream exception details.

## Tests
Always use **`Http::fake()`** with sample payloads for both shapes plus a failure
case. **Never** call the live API in automated tests.
