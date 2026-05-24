# Work units

A **work unit** is one concrete thing the project will build. Each one has a title, an outcome (what's true after it ships that wasn't true before), a story of someone using it, and a short list of how you'll know it's done. The catalogue's value compounds as work units accumulate notes — every session adds to the record of what was attempted, what worked, what didn't, and what was learned. See [the glossary](../GLOSSARY.md#work-unit) for the full definition.

## Index

| WU | Title | Status | Notes |
| --- | --- | --- | --- |
| [WU-001](done/001-project-scaffolding.md) | Project scaffolding | ✅ shipped | — |
| [WU-002](002-email-provider-interface-ses-adapter.md) | `EmailProvider` interface + SES adapter | 🔵 proposed | Depends on WU-001 |
| [WU-003](003-router.md) | Router — category → provider from env config | 🔵 proposed | Depends on WU-002 |
| [WU-004](004-template-renderer.md) | Template Renderer — React Email → HTML | 🔵 proposed | Depends on WU-001 |
| [WU-005](005-mail-sender.md) | Mail Sender — core sync delivery | 🔵 proposed | Depends on WU-002, WU-003, WU-004, WU-006 |
| [WU-006](006-send-log-backend.md) | Send Log backend — Postgres schema + Drizzle + write path | 🔵 proposed | Depends on WU-001 |
| [WU-007](007-queue.md) | Queue — QStash enqueue + webhook handler | 🔵 proposed | Depends on WU-005 |
| [WU-008](008-api-endpoint.md) | API endpoint — `POST /api/send` | 🔵 proposed | Depends on WU-005, WU-007 |
| [WU-009](009-test-send-ui.md) | Test Send UI | 🔵 proposed | Depends on WU-008 |
| [WU-010](010-config-health-check-ui.md) | Config Health Check UI | 🔵 proposed | Depends on WU-001 |
| [WU-011](011-send-log-dashboard-ui.md) | Send Log Dashboard UI | 🔵 proposed | Depends on WU-006, WU-008 |

## What status means

- 🔵 **proposed** — written down, not yet started
- 🟡 **in flight** — actively being worked on
- 🟣 **awaiting review** — implementation done, review pending
- ✅ **shipped** — complete; lives in `done/`
- 🔴 **blocked** — cannot proceed; the WU's notes say why

## When to file a work unit

When you're about to start (or have just started) work that you'll want to track. Anything bigger than "edit a paragraph" deserves one. Smaller work can land inside an existing work unit's notes.

If a work unit is **proposed** but can't start yet, say why right in its title or notes:
- _waiting on Q003_ — an open question must resolve first
- _waiting on WU 007_ — another work unit must ship first
- _deferred — start when [specific condition]_ — set a checkable trigger

## How to file one

Easiest way: run `/wu-new`. The AI will walk you through the four fields (title, outcome, walkthrough, how-we-know-it's-done) and save the file in the right place, then add a row to this index.

If you'd rather file manually: copy `001-template-simple.md` to `NNN-short-title.md` and fill it in. Use `001-template-full.md` instead if your work unit is infrastructure (build, publish, refactor) and you want the fuller shape (contracts produced/consumed, forward-compatibility notes).
