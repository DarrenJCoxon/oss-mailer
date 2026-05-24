# P002 — Open Source Contributor

| Field | Value |
| --- | --- |
| Status | 🟢 active |
| Paired with | none |
| Used by WUs | — |
| First filed | 2026-05-24 |
| Last refined | 2026-05-24 |

## What this persona is, in one sentence

A developer who uses Mailer and wants to extend it — adding a new provider, a new email category, or a missing feature — and contribute it back to the project.

## The seven dimensions

### 1. Identity

A developer already using Mailer (or evaluating it) who hits a gap: their preferred provider isn't supported, or they need a feature that doesn't exist yet. They're comfortable opening a PR. They may or may not know the codebase before they start.

### 2. Reality

Laptop, local dev environment. Cloning the repo, running it locally, reading source code. No time pressure but they'll give up if the contribution path is unclear or the codebase is opaque.

### 3. Psychology

Technically confident. Low tolerance for poor DX — if adding a provider requires touching 8 files in non-obvious ways, they'll abandon the PR or fork instead. Motivated by scratching their own itch; contribution is a side effect, not the goal.

### 4. Trigger

They're running Mailer and their preferred provider (e.g. Brevo, Sendgrid, Postmark as a fallback option) isn't supported. Or they need a feature — webhook retry logic, a new email category, better logging. They'd rather contribute than maintain a private fork.

### 5. History

Has contributed to open source before or is comfortable with the process. Understands PRs, branching, and code review. Familiar with TypeScript. May not know Drizzle or the project's specific routing architecture before they start.

### 6. Success

They add the provider / feature by touching the minimum number of files in an obvious pattern, tests pass, and the PR is mergeable without major rework. The contribution path felt like it was designed for them, not discovered by accident.

### 7. Constraints

- Won't read a poorly structured codebase to figure out the contribution pattern
- Won't write tests if there's no test infrastructure or example to follow
- Won't submit a PR that requires touching core routing logic just to add a provider — the extension point must be clean

## The acid-test refinement

A developer who has never seen the codebase opens a GitHub issue, forks the repo, and adds support for a new provider in under two hours using only the README, the existing provider implementations as examples, and the test suite. No Slack, no asking the maintainer.

## Paired persona

none

## Used by WUs

— (to be updated as WUs are filed)

## Notes / refinements

### 2026-05-24 — first filed

Key design implication: provider integration must be a clean, minimal extension point — one file, one interface, picked up automatically by the router. This is an architectural constraint that flows from this persona's constraints.
