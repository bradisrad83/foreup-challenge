# Decision Records

Short records of the choices made for this challenge. Each lists the decision,
the reason, and the tradeoff/consequence. These reflect *planning* intent.

## 1. Laravel 13
- **Decision:** Use Laravel 13 as the backend framework.
- **Reason:** Matches the challenge stack; mature HTTP client, validation,
  Eloquent, and testing tools fit the requirements well.
- **Tradeoff:** Ties backend code to Laravel conventions; mitigated by keeping a
  framework-neutral HTTP API (see #13).

## 2. Vue 3 Composition API
- **Decision:** Build the frontend with Vue 3 using the Composition API.
- **Reason:** Required by the challenge; composables give clean, reusable state
  logic for search and favorites.
- **Tradeoff:** Slightly more setup than the Options API for small components;
  acceptable for the reuse it enables.

## 3. Plain JavaScript (no TypeScript)
- **Decision:** Use plain JavaScript.
- **Reason:** Required by the challenge; keeps the toolchain minimal.
- **Tradeoff:** No static type checking; mitigated by small surface area and
  frontend tests.

## 4. Tailwind CSS 4
- **Decision:** Style with Tailwind CSS 4 (already configured in the scaffold).
- **Reason:** Fast, consistent, responsive styling without bespoke CSS files.
- **Tradeoff:** Utility-heavy markup; manageable by extracting components.

## 5. SQLite
- **Decision:** Use SQLite for persistence.
- **Reason:** Zero-setup, file-based, ideal for a self-contained challenge.
- **Tradeoff:** Fewer concurrency features than a server database; irrelevant at
  this scale. Case-insensitive uniqueness is handled via a normalized column
  (see [DATABASE_DESIGN.md](DATABASE_DESIGN.md)).

## 6. TVmaze
- **Decision:** Source show data from the TVmaze API.
- **Reason:** Specified by the challenge; no API key required.
- **Tradeoff:** Dependent on a third party; mitigated by normalization, caching
  successes, and a controlled 502 on failure.

## 7. Laravel as the API boundary
- **Decision:** Vue calls Laravel; only Laravel calls TVmaze.
- **Reason:** Centralizes normalization, HTML stripping, caching, and error
  handling; avoids CORS and exposing upstream details to the browser.
- **Tradeoff:** One extra hop per request; negligible and outweighed by control.

## 8. Storing favorite snapshots
- **Decision:** Persist a snapshot of the normalized show with each favorite.
- **Reason:** Lists render without re-fetching TVmaze and survive upstream
  changes/outages.
- **Tradeoff:** Some data duplication and potential staleness vs. live data;
  acceptable and arguably desirable (preserves what the user saved).

## 9. No authentication
- **Decision:** No auth in this application.
- **Reason:** The challenge assumes a larger parent application handles it.
- **Tradeoff:** Data is not user-scoped; out of scope by design.

## 10. No Docker initially
- **Decision:** Run locally without Docker.
- **Reason:** PHP/Node/SQLite run directly; fewer moving parts for review.
- **Tradeoff:** Relies on local toolchain versions; documented in the README.

## 11. Pinia for shared application state
- **Decision:** Use Pinia for state shared across components, in two stores
  (`stores/shows.js`, `stores/favoriteLists.js`). Keep transient
  component-specific UI state local. (Supersedes the earlier
  "composables instead of Pinia" plan.)
- **Reason:** State is genuinely shared and must stay synchronized across the
  UI — search query/results/loading/error, favorite lists and counts, the
  selected list and its details, and add/remove/delete mutations with count
  synchronization. Pinia gives one clear owner per concern and predictable
  cross-component updates, which is hard to keep tidy with ad-hoc composables
  and prop passing.
- **Tradeoff:** Adds one dependency (`pinia`). Mitigated by limiting it to two
  focused stores; transient UI state stays local, and composables are still used
  for reusable helpers (e.g. `useDebounce`).

## 12. No Vue Router (initially)
- **Decision:** One primary screen; browse mode and favorite-list mode are
  represented by state, not routes.
- **Reason:** There is a single screen and no deep-linking requirement, so
  routing would add setup without solving a need.
- **Tradeoff:** No URL-addressable sub-views; acceptable now and can be added
  later if URL-addressable list views become a requirement.

## 13. No dual Laravel/Symfony backend (initially)
- **Decision:** Implement one backend (Laravel) now.
- **Reason:** Building two backends is unnecessary to meet the requirements.
- **Tradeoff:** Only one implementation exists; the contract keeps the door open
  (#14).

## 14. Internal API designed so Symfony can be added later
- **Decision:** Keep the `/api` contract framework-neutral (plain JSON, standard
  status codes, no Laravel-specific payloads leaking to the client).
- **Reason:** A Symfony service could later implement the same contract without
  frontend changes.
- **Tradeoff:** Avoids leaning on some Laravel-specific response conveniences;
  minor.

## 15. No pagination (cap at 100)
- **Decision:** Return at most 100 results; no pagination/infinite scroll.
- **Reason:** The challenge explicitly allows limiting results; keeps the API
  and grid simple.
- **Tradeoff:** Very large result sets are truncated; acceptable per the
  challenge.

## 16. One request per list when adding to multiple lists
- **Decision:** Save a show to multiple lists with one `POST` per list, not a
  batch endpoint.
- **Reason:** Reuses the single favorites endpoint; per-list status reporting;
  no partial-success protocol to design at trivial request volume.
- **Tradeoff:** N requests for N lists; negligible at this scale.

## 17. Testing framework — PHPUnit (backend)
- **Decision:** Use PHPUnit, which ships with Laravel 13, for backend tests.
- **Reason:** It is already installed and fully satisfies the challenge's testing
  needs; no new dependency required.
- **Tradeoff:** No Pest expressive syntax. Pest could be added later as a
  developer convenience, but is **not** planned for this challenge and nothing is
  installed during planning. Frontend testing uses Vitest + Vue Test Utils
  (installed in the testing phase).

## 18. Caching successful TVmaze results only
- **Decision:** Cache normalized successful responses briefly (~5–10 min) in
  Laravel's default cache; never cache failures.
- **Reason:** Reduces upstream calls and improves responsiveness while ensuring
  an outage cannot poison the cache.
- **Tradeoff:** Results can be up to the TTL stale; acceptable for show listings.

## 19. Controlled 502 on TVmaze failure
- **Decision:** Return HTTP 502 with a consistent message when TVmaze is
  unavailable.
- **Reason:** Distinguishes upstream failure from client error; lets the UI show
  a clear retry message.
- **Tradeoff:** Requires explicit upstream error handling; small and worth it.

## 20. No Inertia
- **Decision:** The frontend is a standalone client-side Vue SPA talking to a
  JSON API; do not use Inertia.
- **Reason:** The challenge emphasizes a frontend calling custom backend
  endpoints, so an explicit JSON API boundary is clearer to demonstrate and
  keeps the Vue app portable to a future Symfony backend. There is no
  multi-page, server-driven navigation requirement.
- **Tradeoff:** We forgo Inertia's automatic page/prop wiring and manage fetches
  ourselves. Inertia is a valid tool, but it would add an architectural layer
  without solving a current requirement here.

## 21. Native `fetch` rather than Axios
- **Decision:** Use the browser's native `fetch` (with `AbortController`),
  wrapped by `services/api.js`. No Axios initially.
- **Reason:** No extra dependency; `fetch` supports abort signals and is
  sufficient for the small number of JSON endpoints; keeps the frontend
  lightweight.
- **Tradeoff:** Some conveniences (interceptors, automatic JSON) are written by
  hand in the wrapper. Axios can be revisited if a concrete future requirement
  justifies it.

## 22. Minimal Blade application shell
- **Decision:** Laravel serves one minimal Blade page at `/`
  (`resources/views/app.blade.php`) that loads the built assets and provides a
  single `<div id="app">`; Vue mounts once via `resources/js/app.js`.
- **Reason:** Gives Vite/Blade asset handling and a single mount point without
  adopting Inertia or server-driven views; the SPA owns all rendering.
- **Tradeoff:** Initial render waits for the JS bundle (no SSR); acceptable for
  this single-screen challenge.

## 23. One-screen, state-driven UI
- **Decision:** Present browse mode and favorite-list mode on one screen,
  switching via application state rather than routes or separate pages.
- **Reason:** Matches the single-screen scope and pairs naturally with Pinia
  (#11) and "no Vue Router" (#12); avoids navigation overhead.
- **Tradeoff:** No distinct URLs per mode; revisit alongside #12 if
  URL-addressable views are later required.
