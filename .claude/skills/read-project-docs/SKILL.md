---
name: read-project-docs
description: >-
  Canonical documentation preflight for this Laravel/Vue challenge. Run before
  any substantial implementation, test, or review work to ground yourself in the
  current phase, applicable decisions, file ownership, planned behavior, and any
  documentation/source conflicts. Produces a short grounding summary; material
  conflicts are reported, not silently resolved.
---

# Read project docs (preflight)

A required preflight before substantial work. The documentation is authoritative
for **intended design**; the implementation is authoritative for **current
runtime behavior**. Where they diverge, **flag it** — do not silently reconcile.

## 1. Read (in order)
Always read `CLAUDE.md` first (fixed stack, architecture rules, security, coding
standards). Then read what your task needs:

- **Order for a full pass:** `README.md` → `docs/PROJECT_PLAN.md` →
  `docs/ARCHITECTURE.md` → `docs/API_CONTRACT.md` → `docs/DATABASE_DESIGN.md` →
  `docs/DECISIONS.md` → `docs/AI_WORKFLOW.md` → `docs/BUILD_PLAN.md`.
- **Backend / API:** `API_CONTRACT.md`, `DATABASE_DESIGN.md`, `DECISIONS.md`.
- **TVmaze:** `API_CONTRACT.md` (normalized shape, 502) + the
  `consume-tvmaze-api` skill.
- **Frontend:** `ARCHITECTURE.md` (frontend shape + folder structure),
  `API_CONTRACT.md` (response shapes / status codes), `DECISIONS.md`.
- **Tests:** the current `BUILD_PLAN.md` phase acceptance criteria.

## 2. Inspect the source/config that the task touches
Confirm what actually exists (e.g. `routes/`, `bootstrap/app.php`, `app/`,
`resources/js/`, `database/migrations/`, `tests/`, `package.json`, `phpunit.xml`)
rather than assuming the docs match the code.

## 3. Identify and state (grounding summary)
1. **Current implementation phase** — per `BUILD_PLAN.md` / `PROJECT_PLAN.md`
   (note the two numbering schemes differ) and what code actually exists.
2. **Applicable decisions** — the `DECISIONS.md` entries that govern this task.
3. **File ownership** — which files you own for this task and which are
   prohibited (other agents' files; never `.claude/agents/architecture-advisor.md`).
4. **Planned-but-not-yet-implemented** behavior relevant to the task (documented
   but absent in code).
5. **Documentation ↔ source conflicts** found.

## 4. Handle conflicts
- Do **not** silently resolve a documentation conflict.
- **Report material conflicts to the main session/developer before proceeding**,
  and wait for direction.
- Do not change a documented contract or decision as a side effect of a feature —
  the relevant doc must be updated deliberately first.

State the phase scope and the exact contract you are implementing to before
writing code.
