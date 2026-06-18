# foreUP Coding Challenge — TV Shows & Favorites

A small Laravel + Vue application for browsing television shows (via the TVmaze
API) and organizing them into favorite lists.

> **Status: planning + scaffold only.** The base Laravel 13 / Vue 3 application
> has been scaffolded and committed. **Application features are not implemented
> yet.** TVmaze integration, search, and favorite lists are *planned* and
> documented under [`docs/`](docs/) — none of them work today.

## Coding-challenge overview

The finished application will let a user:

- Browse an initial unfiltered list of TV shows.
- Search shows as they type (results in a responsive grid).
- Create multiple favorite lists and save shows to one or more of them.
- View lists alphabetically with a count of saved shows.
- View a list's favorites ordered by most recently modified, and remove
  individual favorites or delete whole lists.

All interactions happen through JavaScript without full-page reloads. The Vue
frontend talks only to the Laravel API; **Laravel** is the only thing that calls
TVmaze:

```text
Vue frontend  ->  Laravel internal API  ->  TVmaze API
```

## Current implementation status

| Area | Status |
| --- | --- |
| Laravel 13 + Vue 3 scaffold | ✅ Done |
| Vite + Tailwind CSS 4 + SQLite | ✅ Configured |
| Planning & architecture docs | ✅ This step |
| TVmaze backend integration | ⬜ Planned |
| Favorites database & API | ⬜ Planned |
| Vue search UI | ⬜ Planned |
| Vue favorites UI | ⬜ Planned |
| Backend & frontend tests | ⬜ Planned |

## Selected stack

- Laravel 13 (PHP 8.4)
- Vue 3 (Composition API) — plain JavaScript, **no TypeScript**
- Vite, Tailwind CSS 4
- SQLite
- Laravel HTTP client (for TVmaze)
- PHPUnit (ships with Laravel 13) for backend tests
- Vitest + Vue Test Utils for frontend tests *(planned; not yet installed)*

There is no authentication — assume a larger parent application would provide it.

## Local setup

```bash
# 1. PHP dependencies
composer install

# 2. JS dependencies
npm install

# 3. Environment file + app key (skip if .env already exists)
cp .env.example .env
php artisan key:generate

# 4. SQLite database + schema
touch database/database.sqlite      # already present after scaffold
php artisan migrate
```

The project is configured for SQLite (`DB_CONNECTION=sqlite`) using
`database/database.sqlite`.

## Development commands

```bash
php artisan serve     # Laravel backend at http://127.0.0.1:8000
npm run dev           # Vite dev server (HMR)
```

## Build command

```bash
npm run build         # Production frontend build (Vite)
```

## Test commands (that currently exist)

```bash
php artisan test      # Backend tests via PHPUnit (default scaffold tests only)
# or:
./vendor/bin/phpunit
```

> Frontend tests (Vitest) are **not installed yet**; an `npm test` script will be
> added in the testing phase. Only the default Laravel example tests exist today.

## Documentation

| Document | Purpose |
| --- | --- |
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) | Scope, phased plan, definition of done, risks |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Planned architecture and folder structure |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | Planned internal Laravel API |
| [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) | Planned SQLite schema |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architecture decision records |
| [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md) | AI-assisted development process |

## AI-assistance disclosure

This project is developed with AI assistance (Claude Code) for planning,
scaffolding, implementation suggestions, review, and documentation. All
AI-generated changes are reviewed by the developer, and all commands and tests
are actually run before being relied upon. See
[docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md) for details.

> This README is intentionally concise and will be expanded near project
> completion.
