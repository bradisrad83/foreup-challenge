# Testing Strategy

The canonical testing policy for the TV-show + favorites application. The
`write-tests` skill is the procedure; this document is the policy. Project
-specific scenarios live in [BUILD_PLAN.md](BUILD_PLAN.md) (phase acceptance
criteria) and [API_CONTRACT.md](API_CONTRACT.md) (endpoints, status codes,
shapes) — reference those rather than duplicating them here.

## Purpose

The goal is **confidence in behavior**, not maximizing a coverage percentage.
Tests exist to protect the application's observable behavior and to let a
reviewer trust that what is claimed "works" actually does.

## Core policy

> Every new feature, behavioral change, API endpoint, validation rule,
> persistence operation, external-integration behavior, and bug fix must include
> meaningful automated tests before it can be considered complete.

Changes that do **not** affect runtime behavior do not require tests:
documentation-only edits, formatting-only edits, comments, purely presentational
styling with no behavioral effect, and generated files. For those, testing is
marked **`Not applicable`** with a short reason — never silently omitted.

## Test timing

TDD is **optional**. Tests may be written before, during, or immediately after
implementation — but they must be complete **before feature handoff and
completion**.

## Definition of meaningful testing

For every feature or behavioral change, identify the applicable acceptance
criteria and map each one to an automated test, an explicitly performed manual
verification (when automation is impractical), or `Not applicable`.

Cover, when applicable:

1. Primary success behavior
2. Validation behavior
3. Material failure behavior
4. Important boundary conditions
5. Persistence behavior
6. Sorting, filtering, limits, or calculations
7. External dependency behavior
8. API contract behavior
9. Important frontend state transitions
10. Regression behavior for bug fixes

## Acceptance-criteria matrix

Before declaring coverage sufficient, build this matrix for the feature/phase:

| Acceptance criterion | Test level | Success path | Failure/boundary path | Verification status |
| -------------------- | ---------- | ------------ | --------------------- | ------------------- |

`Test level` is one of: Laravel feature, Laravel unit, Vue component, Pinia
store, or documented manual verification. `Verification status` is one of:

- **Verified**
- **Not verified**
- **Not applicable**

## Backend test strategy

Prefer **Laravel feature tests** for HTTP/API behavior:

- route and status behavior
- validation
- service integration
- JSON shape
- database persistence
- sorting and limits
- external API failures

Use **unit tests** selectively for isolated logic with meaningful branching:

- normalization
- calculations
- complex sorting
- reusable domain rules

Do **not** unit-test trivial framework behavior, simple accessors, or
implementation details merely to increase coverage.

All external TVmaze calls **must** use `Http::fake()` or an equivalent fake.
**Automated tests must never call the live TVmaze API.** Backend tests run on
SQLite `:memory:` (per `phpunit.xml`) with `RefreshDatabase`.

## Frontend test strategy

Use **Vue component tests** for meaningful UI behavior:

- user interactions
- loading state
- empty state
- error state
- result rendering
- debounce behavior
- API response handling
- favorite-list interactions

Use **Pinia store tests** only when the store contains meaningful behavior,
branching, transformations, or async actions. Do not require tests for purely
presentational markup unless it has important conditional behavior or
accessibility requirements. Mock all API requests (`services/api.js` / `fetch`) —
no real network, no live TVmaze. (Vitest + Vue Test Utils are installed in
BUILD_PLAN Phase 5.)

## Bug-fix policy

Every bug fix must include a **regression test that fails before the fix and
passes afterward**, unless automation is genuinely impractical. When impractical,
document a manual reproduction and verification procedure and justify why.

## Completion policy

A feature cannot be marked **`Complete`** when a material acceptance criterion is
**`Not verified`**.

**`Complete with follow-up`** is allowed only when:

- the unverified behavior is non-critical,
- the missing verification is explicitly documented,
- the gap does not violate the build-plan definition of done, and
- the feature's primary behavior, failure handling, and persistence requirements
  are verified.

## Coverage policy

- No mandatory 100% target.
- Coverage is a **warning signal**, not a quality guarantee.
- New behavior must be covered.
- Critical branches should receive strong coverage.
- Coverage must not be increased using meaningless assertions.
- Untested code or behavior must be **disclosed during handoff**.

## Test quality rules

Tests **must**:

- verify externally observable behavior where possible
- use meaningful assertions
- remain deterministic
- avoid live network dependencies
- avoid depending on execution order
- avoid excessive mocking of the code under test
- clearly communicate the behavior being protected

Tests **must not**:

- assert only that a response exists
- duplicate framework internals
- be written solely to execute lines
- hide failures with broad exception handling
- use arbitrary sleeps for async behavior when deterministic alternatives exist
