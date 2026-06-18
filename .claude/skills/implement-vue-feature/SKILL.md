---
name: implement-vue-feature
description: >-
  Implement a Vue 3 SPA feature for this challenge (component, Pinia store
  action, composable, api.js call). Use for work under resources/js. The frontend
  talks only to Laravel /api/* — never TVmaze.
---

# Implement a Vue feature

Stack: Vue 3 Composition API, plain JS, Vite, Tailwind 4, Pinia. Standalone SPA
in a Blade shell — no Inertia, no Vue Router, no TypeScript. Follow
`docs/ARCHITECTURE.md` and `docs/API_CONTRACT.md`.

## Steps
1. Read the relevant docs (`read-project-docs`).
2. **Data access:** call Laravel only via `services/api.js` (native `fetch` +
   `AbortController`, `Accept: application/json`). Never call TVmaze.
3. **State:** put shared state in `stores/shows.js` or `stores/favoriteLists.js`
   (the only two stores). Keep transient UI state (dialogs, form input) local to
   components.
4. **Components:** `<script setup>`; place under `components/{layout,shows,
   favorites,shared}/` per the documented structure; keep them focused.
5. **Behavior:** ~300 ms debounce; discard stale responses; show
   loading/empty/error states; render summaries as plain text; lazy-load images
   with a placeholder; cap shown results at 100.
6. **Accessibility:** labels, alt text, visible focus, dialog semantics, and
   `aria-live` for async updates.
7. **Tests:** add Vitest coverage (`write-tests`).

## Verify
```bash
npm run build
npm run test     # exists only after Vitest is installed (Phase 5)
```

Add dependencies only with justification (e.g. `pinia`); don't commit unless
instructed.
