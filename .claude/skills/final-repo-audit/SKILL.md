---
name: final-repo-audit
description: >-
  Run the pre-submission audit for this challenge: full backend + frontend
  suites, production build, Pint, npm audit, and a secret/hygiene + acceptance
  check. Use before final submission or a release commit.
---

# Final repo audit

Run before submission. Report real command output — never claim a pass without
running it.

**Who runs this:** the main session or a Bash-capable agent (e.g.
`backend-engineer` or `test-reviewer`). Read-only reviewers
(`security-quality-reviewer`, `architecture-advisor`) **do not execute commands** —
they inspect the resulting code and the captured command output.

## Commands (only those that exist)
```bash
php artisan test          # full backend suite (PHPUnit)
./vendor/bin/pint --test  # PHP style
npm run build             # production frontend build
npm run test              # frontend (only after Vitest is installed)
npm audit                 # review advisories (report; do not auto-fix)
```
`npm run lint` / `npm run format:check` do **not** exist — skip unless added.

## Checks
- All suites green; build succeeds; Pint clean.
- **No live TVmaze** in any test (`Http::fake` / mocked fetch).
- No tracked secrets, `.env`, SQLite DB files, build output, `vendor/`, or
  `node_modules` (`git status`, `.gitignore`).
- SQLite-compatible migrations/queries; data persists.
- Frontend calls only `/api/*`; summaries render as plain text.
- Definition-of-done items in `docs/BUILD_PLAN.md` are met; docs match reality
  (no stale "planned" claims).

## Then
Summarize results and any blockers and **return them to the main
session/developer**. The main session decides whether to engage
`security-quality-reviewer` (code-level security/quality) or
`architecture-advisor` (system-level design); agents do not launch one another.
Do not commit unless instructed.
