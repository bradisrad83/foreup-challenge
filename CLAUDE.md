# CLAUDE.md

Persistent guidance for Claude Code working on this repository. Keep it in mind
on every task. The documents under `docs/` are the source of truth — read the
relevant one before implementing a feature.

## Project

This is a **foreUP coding challenge**: a TV-show search and favorite-list
application. Users browse and search shows (data from TVmaze, via a Laravel API)
and organize them into favorite lists. See [README.md](README.md) for status and
[docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for scope and phases.

## Technology (fixed stack)

- Laravel 13, PHP 8.4
- Vue 3 with the Composition API, **plain JavaScript**
- Vite, Tailwind CSS 4
- SQLite
- PHPUnit for backend tests
- Vitest + Vue Test Utils for frontend tests **once installed**

Do **not**:

- Introduce TypeScript.
- Introduce authentication (assume a parent application provides it).
- Add Symfony during the initial implementation.
- Add Docker unless explicitly requested.
- Introduce Pinia or Vue Router unless the architecture clearly requires them
  **and** the developer approves.

## Architecture

- Vue calls **only** Laravel internal endpoints; Vue must **never** call TVmaze
  directly.
- Laravel owns all upstream TVmaze communication and response normalization.
- TVmaze HTML summaries must be converted to **plain text** before reaching Vue.
- Search results are capped at **100**.
- Favorite records store **snapshots** of show data (not references to a shared
  shows table).
- Keep the internal API **framework-neutral** so a Symfony backend could
  implement the same contract later.
- Follow [docs/API_CONTRACT.md](docs/API_CONTRACT.md),
  [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md), and
  [docs/DECISIONS.md](docs/DECISIONS.md).

## Development workflow

1. Inspect existing files before changing them.
2. Work in small, reviewable phases.
3. State the intended scope before making substantial changes.
4. Do not continue into the next phase unless explicitly instructed.
5. Do not make unrelated cleanup changes.
6. Do not add dependencies without explaining why.
7. Do not alter documented API contracts silently.
8. Update relevant documentation when an approved decision changes.
9. Stop and report when the requested phase is complete.
10. Never claim a command or test passed unless it was actually run.

## Model usage

This is a project **workflow preference** to control token/cost usage without
sacrificing quality. It is **not** a guarantee of automatic main-session model
switching — the running session's model is chosen by the developer/harness, not
enforced here.

- **Sonnet is the default model for normal project work.** Use it for
  implementation, testing, debugging, routine refactoring, command execution,
  focused code review, and ordinary documentation updates.
- **Reserve Opus** for tasks requiring substantial architectural judgment,
  ambiguity resolution, cross-cutting planning, or high-stakes final review,
  such as:
  - Initial architecture planning
  - API or database contract design
  - Major changes affecting several layers
  - Security and scalability design review
  - Resolving difficult architectural tradeoffs
  - Final submission architecture review
  - Interview and code-walkthrough preparation
  - Complex debugging only after normal investigation has failed
- Do **not** use Opus merely because a task involves documentation. Routine
  README changes, progress notes, test documentation, and implementation
  summaries should use Sonnet.
- Prefer the least expensive model that can reliably complete the task.
- Do not change models or delegate to an Opus subagent without a clear reason.
- When Opus is used, record the reason in the final task report or
  [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md).
- The `architecture-advisor` subagent (`.claude/agents/`) isolates the Opus-level
  architectural-review tasks above.
- The developer may override the model choice at any time.

## Git rules

- Do not commit unless explicitly instructed.
- Do not push to a remote unless explicitly instructed.
- Do not amend, rebase, reset, or force-push unless explicitly instructed.
- Keep commits scoped to one logical phase.
- Show staged changes before committing.
- Do not add AI attribution trailers such as `Co-Authored-By` unless explicitly
  requested.
- **Never operate on the parent `/Users/bradgoldsmith/Desktop` Git repository.**
- Confirm the active Git root is **this project**
  (`git rev-parse --show-toplevel`) before any Git write operation.

## Coding standards

**Backend (Laravel)**

- Use Laravel conventions.
- Keep controllers thin.
- Use Form Requests for nontrivial validation.
- Use API Resources (or clear transformers) for response consistency.
- Use dependency injection.
- Prefer small focused services over large classes.
- Avoid repository layers, DTO libraries, events, queues, and similar
  abstractions unless they solve a real requirement.
- Use Eloquent relationships and database constraints; avoid N+1 queries.

**Frontend (Vue)**

- Use `<script setup>` and the Composition API.
- Use composables for reusable stateful behavior.
- Keep components focused.
- Use semantic HTML and accessible controls.
- Do not render untrusted HTML.
- Keep plain-JavaScript contracts clear and predictable; do not imitate
  TypeScript with excessive JSDoc.

## Testing and verification

```bash
php artisan test          # backend (PHPUnit)
npm run test              # frontend (Vitest) — exists only once Vitest is installed
npm run build             # production frontend build
./vendor/bin/pint --test  # PHP code style check
```

- Frontend test commands may not exist until Vitest is installed.
- TVmaze HTTP calls must be **faked** in automated backend tests; automated tests
  must never depend on the live TVmaze API.
- Run focused tests during development; run the complete suite before a phase is
  considered complete.
- Fix test failures rather than simply reporting them.

## Security

- Never commit `.env`, secrets, API tokens, SQLite database files, build output,
  `vendor`, or `node_modules`.
- Validate all client payloads on the server.
- Do not expose upstream exception details to clients.
- Do not allow user input to control the TVmaze host.
- Use upstream request timeouts.
- Do not cache failed upstream requests.

## Reference documents (source of truth)

Inspect the relevant document before implementing a feature:

- [README.md](README.md)
- [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/API_CONTRACT.md](docs/API_CONTRACT.md)
- [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md)
- [docs/DECISIONS.md](docs/DECISIONS.md)
- [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md)
