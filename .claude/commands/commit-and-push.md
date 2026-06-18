---
description: Safely stage, verify, commit, and push one coherent change on the current branch.
argument-hint: [optional summary of the change]
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git diff:*), Bash(git log:*), Bash(git remote:*), Bash(git rev-parse:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(./vendor/bin/pint --test:*), Bash(php artisan test:*), Bash(npm run build:*), Read, Grep, Glob
---

# /commit-and-push

Commit the current work as **one coherent change** and push the current branch.
Optional context from the user: $ARGUMENTS

## 1. Inspect
- `git rev-parse --show-toplevel` — confirm the repo root is **this** project,
  never the parent `/Users/bradgoldsmith/Desktop` repo.
- `git branch --show-current`, `git status`, `git --no-pager diff` (unstaged) and
  `git --no-pager diff --staged`.
- `git --no-pager log -10 --oneline` — match the existing commit style
  (lowercase conventional: `feat:`, `fix:`, `docs:`, `chore:`, `test:`).
- `git remote -v` — confirm a remote exists.

## 2. Decide whether it is one coherent commit
Group the diff by intent. If it mixes clearly unrelated changes that belong in
separate commits, **STOP** and report the suggested split — do not commit.

## 3. STOP (do not commit) if any of these hold
- The current branch is `main` or `master`.
- Merge-conflict markers exist (`<<<<<<<`, `=======`, `>>>>>>>`).
- A likely secret or `.env` file is staged/changed (`.env*`, keys, tokens,
  credentials).
- Temporary probes, debug code, or generated dependencies are present
  (e.g. `__loadcheck`, `dd(`, `var_dump(`, stray `console.log`, `vendor/`,
  `node_modules/`).
- There are no changes to commit.
- Verification (step 4) fails.

Report the specific blocker and stop.

## 4. Verify (only commands that exist here; run those relevant to the diff)
- Changed PHP (`app/`, `routes/`, `config/`, `database/`, `tests/`,
  `bootstrap/`): `./vendor/bin/pint --test` **and** `php artisan test`.
- Changed frontend (`resources/js/`, `resources/css/`, `vite.config.js`,
  `package.json`): `npm run build`.
- Docs/config only (`docs/`, `*.md`, `.claude/`): no code verification required —
  say so explicitly.

Report real output. **Never claim a pass you did not run.** Do **not** run
`npm run test`, `npm run lint`, or `npm run format:check` — they do not exist yet.

## 5. Stage + compose the message
- Stage only the files in this coherent change (`git add <paths>`); never stage
  unrelated files.
- Write a concise message from the **actual diff** and its purpose, in the repo's
  style. No `Co-Authored-By` / AI attribution.

## 6. Show before acting
Print the **staged files**, the **proposed commit message**, and the
**verification results**, then proceed — the normal Claude Code permission flow
will request approval for the commit and push.

## 7. Commit + push
- `git commit -m "<message>"` — never `--amend`, never `--no-verify`.
- Push the current branch: `git push`; if it has no upstream,
  `git push -u origin <current-branch>`. **Never force-push.**

## 8. Report
Branch · commit hash · commit message · committed files · verification results ·
push result · any remaining uncommitted changes.

## 9. PR description (copy-paste-ready)
`gh` is **not** installed, so the PR cannot be created or edited automatically.
GitHub also only auto-fills a PR body from the commit message when the branch has
**exactly one** commit ahead of base — so multi-commit branches open with an empty
description. To save manual writing, **always** end with a ready-to-paste PR body.

- Determine the base branch (default `main`) and list every commit on this branch
  that is not on base, oldest first:
  `git --no-pager log --reverse --format='- %s' origin/main..HEAD`
  (fall back to `main..HEAD` if `origin/main` is unavailable).
- Print the block below inside a single fenced ```` ```markdown ```` code block so
  the user can copy it verbatim into the GitHub PR **description** field. Derive
  the content only from the actual commits and diffs on the branch — never invent
  scope.

```markdown
## Summary
<1–3 sentences describing what this branch delivers and why.>

## Changes
<the `- <subject>` lines from the log command above; one per commit>

## Verification
<the real commands run and their actual results, e.g.
`php artisan test` → 53 passed; `./vendor/bin/pint --test` → passed>

## Notes
<known follow-ups, deferred items, or "None">
```

- If only one commit is ahead of base, keep the block but it may be brief.
- Do **not** add `Co-Authored-By` / AI attribution. Do **not** claim a
  verification result that was not actually produced in this run.
