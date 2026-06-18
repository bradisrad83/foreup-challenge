# AI-Assisted Development Workflow

This project is built with AI assistance (Claude Code). This document describes
how that assistance is used, honestly and professionally, and how
accountability is maintained.

## Principles

- **AI assists; the developer decides.** AI tools may help with planning,
  scaffolding, implementation suggestions, test-case ideas, code review, and
  documentation. They do not make final decisions.
- **Everything is reviewed.** All AI-generated changes are read and understood by
  the developer before being kept. Output is never accepted blindly.
- **Commands and tests are actually run.** Claims that something "works" are
  backed by real runs of the relevant commands and tests, with their output
  observed — not assumed from generated code.
- **Small, reviewable phases.** Work proceeds in the phases defined in
  [PROJECT_PLAN.md](PROJECT_PLAN.md), each small enough to review in one sitting.
- **No unauthorized commits.** Claude must not stage or create Git commits unless
  the developer explicitly instructs it to, and only with the requested message.
- **The developer owns the result.** The developer remains responsible for
  understanding, explaining, and defending every part of the implementation.

## Practices

- Important prompts and notable AI exchanges may be preserved for later
  discussion and transparency.
- Intermediate handoff notes are maintained between phases so context is not
  lost (see the template below).
- When AI output conflicts with the documented plan or contract, the plan wins
  until the developer deliberately updates it.
- Generated dependencies are not installed silently; dependency changes are an
  explicit, reviewed step.

## Phase record template

Record each AI-assisted phase using this template (append entries below as work
proceeds):

```text
## Phase name

- Goal:
- Model used:
- Reason for model choice:
- Prompt summary:
- Files changed:
- Commands run:
- Tests run:
- Developer review notes:
- Follow-up work:
```

## Model strategy

This policy exists to control token and cost usage without sacrificing quality.

- **Sonnet is the default implementation model** — used for routine coding,
  testing, debugging, refactoring, command execution, focused review, and
  ordinary documentation.
- **Opus is reserved** for architecture, major planning, complex tradeoffs, and
  final high-level review.
- The **`architecture-advisor`** subagent (`.claude/agents/architecture-advisor.md`,
  `model: opus`) exists to isolate those architectural tasks in their own
  context.
- The model used (and the reason, when Opus) should be recorded in the phase log
  or the relevant task report.
- Routing is **not automatic**: the running session's model is selected by the
  developer/harness. This document and `CLAUDE.md` express a preference and a
  delegation path, not an enforced switch. The developer may override at any
  time. See `CLAUDE.md` → "Model usage".

## Project guidance, skills, and agents

- **`CLAUDE.md`** (repository root) holds always-applicable project guidance that
  Claude Code should follow on every task.
- **Skills** will be added only for genuinely repeatable, multi-step workflows
  that benefit from being captured.
- **Custom agents** will be added only when a specialized task clearly benefits
  from isolated context.
- Skills and agents will not be added merely for appearance; each must earn its
  place by solving a real, recurring need.

## Phase log

> Entries are added as phases are completed. The scaffold and this planning step
> were AI-assisted and developer-reviewed; detailed per-phase entries begin with
> implementation.
