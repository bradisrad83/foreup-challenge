---
description: Verify a completed feature or build-plan phase and produce a structured handoff (logging it when complete).
argument-hint: [feature or build-plan phase]
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git diff:*), Bash(git log:*), Bash(git rev-parse:*), Bash(./vendor/bin/pint --test:*), Bash(php artisan test:*), Bash(npm run build:*), Read, Grep, Glob, Edit(./docs/IMPLEMENTATION_LOG.md)
---

# /feature-handoff

Review and verify a completed feature or build-plan phase, then return a
structured handoff. Target (if given): $ARGUMENTS

This command is **read/review-oriented**. It must **not** modify application
code, commit, or push. The only file it may edit is `docs/IMPLEMENTATION_LOG.md`
(step 7).

## 1. Ground yourself
Follow the `read-project-docs` skill (canonical order): `CLAUDE.md` →
`docs/PROJECT_PLAN.md` → `docs/ARCHITECTURE.md` → `docs/API_CONTRACT.md` →
`docs/DATABASE_DESIGN.md` → `docs/DECISIONS.md` → `docs/AI_WORKFLOW.md` →
`docs/BUILD_PLAN.md`. Identify the current build-plan phase.

## 2. Inspect
- `git status` and `git --no-pager diff`. If the working tree is clean, use
  `git --no-pager log -10 --oneline` to find the relevant commits.
- The affected application and test files; the build-plan **acceptance
  criteria** for the phase; the **API contract**; the **database design**; the
  **architectural decisions**.

## 3. Verify (only existing commands, relevant to the change)
- PHP changes: `./vendor/bin/pint --test` and `php artisan test`.
- Frontend changes: `npm run build` (run `npm run test` **only if** Vitest is
  installed — it is not until BUILD_PLAN Phase 5).
- Confirm automated tests **never call the live TVmaze API** (look for
  `Http::fake()` / mocked `fetch`).

Run real commands and report real output — never fabricate results.

## 4. Assess
Determine the feature name, build-plan phase, implementation status,
architecture/contract/DB alignment, tests & verification performed,
documentation impact, and risks/remaining work. **Do not silently resolve** any
documentation/source conflict — flag it to the developer.

## 4b. Testing completion gate (before assigning final status)
Require all of these before setting status (policy:
[docs/TESTING_STRATEGY.md](../../docs/TESTING_STRATEGY.md)):
1. An **acceptance-criteria → verification matrix** (criterion · test level ·
   success path · failure/boundary path · Verified/Not verified/Not applicable).
2. Actual test or manual-verification **evidence for every `Verified` item**.
3. **Disclosure of every `Not verified` item.**
4. Confirmation that tests **do not call the live TVmaze API**.
5. Confirmation that the applicable **focused and broader suites passed** (real
   command output).

## 5. Return a structured handoff (to the main session / developer)
- **Feature**
- **Build-plan phase**
- **Status:** Complete | Complete with follow-up | Incomplete | Blocked
- **Implementation summary**
- **Important files**
- **Architecture / API / database alignment**
- **Tests and verification** (commands + results)
- **Risks or open issues**
- **Documentation impact**
- **AI workflow used** (agents / skills / commands; human review checkpoints)
- **Suggested next step**
- **Suggested commit message and file set**

### Status rules
- **Complete** — only when every material acceptance criterion is **Verified**,
  all applicable tests pass, no critical behavior is left unverified, and no
  blocker or high-severity testing gap remains.
- **Complete with follow-up** — only when all primary and material behavior is
  **Verified**, remaining unverified items are non-critical and listed as
  explicit follow-ups, and the build-plan definition of done is still satisfied.
- **Incomplete** — required when a material acceptance criterion is **Not
  verified**, meaningful tests are missing, required failure or persistence
  behavior is untested, or applicable tests fail.
- **Blocked** — required when verification cannot proceed because of an external
  or environmental blocker.

If deeper review is warranted, recommend the developer engage
`architecture-advisor` (system-level design) or `security-quality-reviewer`
(code-level); this command does **not** invoke them.

## 6. Log gate
Continue to step 7 **only** when Status is **Complete** or **Complete with
follow-up**. Otherwise stop after the handoff.

## 7. Append to `docs/IMPLEMENTATION_LOG.md`
- Read the existing entries first. If one already covers this feature/phase,
  **do not duplicate** — report that instead.
- Append a new entry in **chronological order** (after existing entries) using
  the template in that file.
- Use **today's date**. Use the real commit hash if committed; otherwise
  `Pending` — **never invent a hash**.
- The entry must record: **tests actually run and their real results**; each
  acceptance criterion classified **Verified / Not verified / Not applicable**;
  **missing coverage**; any **manual verification** performed; and **why** the
  chosen completion status is justified.
- Edit **only** `docs/IMPLEMENTATION_LOG.md`; do not touch application code or
  other documentation.

### Grounding rules for the log entry
- Base every statement only on what was inspected or run in **this** handoff:
  source code, Git `status`/`diff`/`log` output, project documentation, and
  actual test/build/format output. Every factual claim must be traceable to one
  of those sources.
- Record **only verification commands actually executed in this handoff**, each
  with its **real** result. Never copy expected results from documentation or
  invent a passing result.
- Describe a requirement as **implemented** only when it was confirmed in
  **inspected code**. Never describe something as implemented merely because it
  appears in the build plan, architecture, API contract, or other planned
  documentation.
- Treat documentation as authoritative for **intended design** and code/command
  output as authoritative for **actual current behavior**.
- **Never log planned behavior as completed behavior.**
- Classify each relevant behavior as:
  - **Verified**
  - **Not verified**
  - **Not applicable**
- Use **Verified** only when an automated test or an explicitly performed manual
  verification actually covered the behavior.
- Do **not** describe something as tested unless a named automated test or a
  clearly described manual check exercised it.
- Scope claims to what the available tests and verification actually cover.
  **Never infer that the entire application works** from a passing but limited
  test suite.
- Preserve unresolved findings in the entry:
  - known limitations
  - missing coverage
  - failed commands
  - unresolved documentation/source conflicts
  - non-blocking follow-ups
- **Never omit a follow-up merely to make a phase appear complete.**
