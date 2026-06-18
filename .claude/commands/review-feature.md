---
description: Deep, read-only pre-handoff review of the current feature — concrete defects, risks, missing coverage, and architecture drift. Does not modify, fix, commit, or assign completion status.
argument-hint: [feature or build-plan phase]
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git rev-parse:*), Bash(./vendor/bin/pint --test:*), Bash(php artisan test:*), Bash(npm run build:*), Read, Grep, Glob
---

# /review-feature

Perform a deep, **read-only** review of the current feature implementation
**before** `/feature-handoff`. Target (if given): $ARGUMENTS

This command **consolidates the main-session review checklist** and returns
concrete findings. It is strictly read-only and **must not**:

- modify application code or tests,
- modify or create documentation,
- update `docs/IMPLEMENTATION_LOG.md`,
- commit or push,
- claim the feature is **Complete** (only `/feature-handoff` assigns status),
- silently fix any finding (report it; do not apply it).

It complements `/feature-handoff`; it does **not** duplicate it. `/review-feature`
finds problems; `/feature-handoff` verifies a *finished* feature and assigns the
completion status. Run `/review-feature` first, resolve material findings, then
run `/feature-handoff`.

## 1. Ground yourself
Follow the `read-project-docs` skill (canonical order): `CLAUDE.md` →
`docs/PROJECT_PLAN.md` → `docs/ARCHITECTURE.md` → `docs/API_CONTRACT.md` →
`docs/DATABASE_DESIGN.md` → `docs/DECISIONS.md` → `docs/AI_WORKFLOW.md` →
`docs/BUILD_PLAN.md` → `docs/TESTING_STRATEGY.md`. Identify the current
build-plan phase and its acceptance criteria.

## 2. Establish review scope
- `git rev-parse --show-toplevel` — confirm the active repo is **this** project.
- `git branch --show-current`, `git status`.
- `git --no-pager diff` (unstaged) and `git --no-pager diff --staged`.
- If the working tree is **clean**, use `git --no-pager log -10 --oneline` and
  `git --no-pager show <hash>` to inspect the relevant recent commit(s).
- From the diff/commits, identify the **changed application files**, **changed
  tests**, the **applicable documentation**, and **relevant configuration**
  (e.g. `config/services.php`, `phpunit.xml`, `routes/api.php`).

## 3. Verify (run only existing, applicable commands)
Run the commands relevant to what changed; report real output only.

- Changed PHP: `php artisan test` (and focused `php artisan test --filter=<Focus>`
  first) **and** `./vendor/bin/pint --test`.
- Changed frontend: `npm run build` (run `npm run test` **only if** Vitest is
  installed — it is not until BUILD_PLAN Phase 5; `npm run lint` and
  `npm run format:check` do **not** exist — do not run them).

Never claim a pass you did not run. **A passing suite does not replace code
inspection** — inspect the source regardless of test results.

## 4. Review dimensions
Inspect the changed code and tests against each applicable dimension. Apply
proportionately to this take-home — do **not** recommend enterprise complexity
the project does not need (see `architecture-advisor` principles and
`DECISIONS.md`).

### Correctness
Incorrect behavior; edge cases; wrong status codes; wrong response shapes;
null / missing-data handling; sorting, limits, filtering, and persistence
errors; cache behavior (keys, TTL, success-only caching); race conditions or
stale-state issues where applicable.

### Laravel quality
Thin controllers; appropriate Form Requests; clean service boundaries
(`app/Services/TvMaze/` as the only TVmaze caller); dependency injection; API
Resources owning the response shape; exception handling; mass-assignment safety;
database constraints; transactions where needed; N+1 queries; SQLite
compatibility; framework conventions; unnecessary abstractions.

### Vue quality (only when frontend files are present)
State ownership (shared in Pinia vs. transient local state); loading / empty /
error states; async race conditions; debounce behavior; component
responsibility; accessibility; unnecessary reactivity or watchers; **direct
external API access** (the browser must call only `/api/*`); maintainability.

### External API safety
Browser never calls TVmaze directly; the upstream host cannot be controlled by
user input (base URL from config/env); request timeout; failure handling;
**only successful results cached** (failures never cached); raw upstream data
not leaked to the client; **automated tests never call the live service**
(`Http::fake()` / mocked `fetch`).

### Security
Input validation (server-side, authoritative); output handling; XSS risk; HTML
sanitization (summaries are plain text — no `v-html` on upstream/user data);
secret leakage; debug output (`dd(`, `var_dump(`, stray `console.log`); unsafe
exception details exposed to clients; unsafe file or URL handling; authorization
assumptions (no auth by design — #9); dependency or configuration risks.

### Tests
Each acceptance criterion mapped to a test; meaningful assertions; success
paths; failure paths; boundary conditions; regression protection for bug fixes;
excessive mocking of the code under test; missing tests; tests that only execute
code without proving behavior; live-network dependencies; deterministic
execution (no arbitrary sleeps where deterministic alternatives exist).

### Maintainability
Duplication; magic values; unclear names; excessive complexity; dead code;
premature abstraction; misleading comments; documentation drift; code that will
be hard to extend in the next phase.

### Performance and scalability (proportionate)
Unnecessary queries; unnecessary network calls; poor cache keys; excessive
payloads; repeated transformations; obvious frontend rendering issues.

## 5. Output format
Return the review to the main session / developer in this structure:

### Review scope
- Feature or build-plan phase reviewed.
- Files inspected.
- Documentation used.
- Commands run (with real results).

### Findings
Group by severity: **Blocker**, **High**, **Medium**, **Low**, **Optional
improvement**. For each finding give:
- file and location (`path:line`),
- the concrete problem,
- why it matters,
- the recommended correction (described, **not** applied),
- whether it must be fixed before handoff.

### Testing assessment
- Strong coverage.
- Missing coverage.
- Weak assertions.
- Unverified behavior.

### Architecture assessment
One of: **aligned**, **minor drift**, **material drift** — with evidence and
doc references.

### Positive observations
Only specific, evidence-based strengths.

### Recommendation
Exactly one of:
- **Ready for fixes and re-review**
- **Ready for feature handoff**
- **Not ready for feature handoff**
- **Blocked**

Do **not** mark the feature **Complete** — that is `/feature-handoff`'s decision.

## 6. Boundaries with the existing workflow
State these explicitly so responsibilities do not overlap:

- **`test-reviewer`** (agent) focuses on **test adequacy** and may **edit tests**
  after the engineer finishes. `/review-feature` does not edit tests.
- **`security-quality-reviewer`** (agent) is the **implementation-level**
  security/quality review specialist.
- **`architecture-advisor`** (agent, Opus) handles **unresolved system-level
  design tradeoffs**.
- **`/review-feature`** (this command) provides the **main-session review
  checklist and consolidated findings** before handoff.
- **`/feature-handoff`** runs **after** material review findings are resolved and
  **determines the completion status** (and logs it).
- **`/final-repo-audit`** (skill) is **broader** and reserved for **pre-submission**
  review of the whole repository.

This command **cannot launch agents**. When a finding warrants specialist
review, **recommend** that the developer invoke the appropriate agent through the
main session (e.g. `security-quality-reviewer` for code-level security,
`architecture-advisor` for system-level design) — it does not invoke them itself.
