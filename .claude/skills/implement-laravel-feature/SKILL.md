---
name: implement-laravel-feature
description: >-
  Implement a Laravel 13 backend feature for this challenge (API endpoint, thin
  controller, Form Request, API Resource, model, SQLite migration/factory). Use
  for server-side work under app/, routes/api.php, config/, and database/.
---

# Implement a Laravel feature

Stack: Laravel 13, PHP 8.4, SQLite, PHPUnit. Follow `docs/API_CONTRACT.md` and
`docs/DATABASE_DESIGN.md` exactly.

## Steps
1. Read the relevant docs (`read-project-docs`). Confirm the endpoint contract
   and schema.
2. **Route:** add the endpoint to `routes/api.php` (create the file if absent)
   under `/api`. **Register the file** by adding
   `api: __DIR__.'/../routes/api.php',` to `withRouting()` in `bootstrap/app.php`
   — in Laravel 11+ the file is not loaded otherwise, so requests 404.
   **Do not run `php artisan install:api`**: it installs Sanctum and auth
   scaffolding, which this project does not use (no authentication — see
   `DECISIONS.md` #9). Register the route file manually instead.
3. **Controller:** thin, in `app/Http/Controllers/Api/`. No business logic or
   HTTP-client calls inline — delegate to a service (e.g. `Services/TvMaze`).
4. **Validation:** Form Request in `app/Http/Requests/`, returning Laravel's
   standard 422 shape. Enforce list-name rules (trim, 1–255 chars,
   case-insensitive uniqueness via `normalized_name`).
5. **Model / migration:** SQLite-compatible migration in `database/migrations/`;
   casts (`genres`/`metadata` → array, dates, `rating` → float); relationships;
   unique indexes (`normalized_name`; composite `favorite_list_id` +
   `external_id`); `onDelete('cascade')`. Add a factory.
6. **Response:** API Resource → `{ "data": ... }`. Lists ordered by `name` asc;
   favorites by `updated_at` desc; counts via `withCount` (no N+1).
7. **Status codes:** 200/201/204, 422 (validation + duplicate list name), 409
   (duplicate favorite), 404 (missing or mismatched list/favorite).
8. **Tests:** add PHPUnit coverage (`write-tests`).

## Verify
```bash
php artisan migrate
php artisan test --filter=<Focus>
php artisan test
./vendor/bin/pint --test
```

Don't expose upstream errors to clients; don't add dependencies without
justification; don't commit unless instructed.
