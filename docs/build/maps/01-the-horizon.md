# Map 1 — The Horizon

> The whole journey from where we are now to a working oss-mailer. One picture of the whole forest. No jargon. If you read only one map, read this one.

## What this project is

oss-mailer is an open-source, self-hosted email routing layer that a developer drops into their backend and immediately has working email — magic links for auth, promotional blasts, and product update notifications. It sits in front of cheap commodity providers (AWS SES, Mailgun, Brevo) and handles the routing, queuing, and retry logic so the developer never has to wire up provider SDKs directly. There is no hosted service, no subscription, and no per-email cost beyond what the underlying providers charge. Anyone can deploy it, extend it, and contribute new provider integrations back.

## Who it's for

- **P001 — Indie SaaS Developer**: a solo developer or small team running one or more SaaS products who needs reliable transactional and marketing email without paying Postmark or Resend prices.
- **P002 — Open Source Contributor**: a developer who uses oss-mailer, hits a gap (missing provider, missing feature), and wants to contribute it back to the project.

## What "done" looks like

A developer finds oss-mailer on GitHub, forks or clones it, sets their AWS SES and Mailgun credentials as environment variables, and deploys to Vercel in under 30 minutes. They add one API call to their backend — `sendEmail({ category: 'magic_link', to: '...', ... })` — and it works. Magic links land in inboxes in under 3 seconds. Promotional and update emails queue and deliver reliably. If a provider is down, the send fails over automatically. Logs are queryable so the developer can see exactly what sent, when, and via which provider. Adding a new provider is a single file implementing a known interface — no changes to core routing logic required.

## The shape of the journey

The first stretch is building the core — the routing engine, the provider adapter interface, and the first two providers (SES and Mailgun). This produces a working system that can accept a send request, pick the right provider based on email category, and deliver. At this stage it's functional but rough: usable by its author, not yet ready for strangers.

Once the core works, the second stretch is hardening it for the open-source audience. That means a clean one-command deploy story (Vercel deploy button, env var checklist), a well-structured codebase with clear extension points, and enough documentation that a developer who has never seen the repo can add a provider in under two hours. This is also where the async queue (Upstash QStash) and retry logic get solid — because strangers will hit edge cases the author hasn't imagined.

The final stretch is release and community. Publishing to GitHub with a good README, setting up contribution guidelines, and landing the first external contributor. At that point oss-mailer is a real open-source project, not a personal tool — and the job is maintaining quality and reviewing PRs rather than building from scratch.

## What's not in scope

- **A hosted SaaS version**: oss-mailer is self-hosted by design. There is no central service, no accounts, no billing. See D001.
- **Email analytics and tracking**: open rates, click tracking, unsubscribe dashboards — none of that. This is a router, not a marketing platform.
- **Template management UI**: templates are React Email components in code, not a drag-and-drop editor.
- **Inbound email processing**: oss-mailer sends email; it does not receive, parse, or route inbound messages.
- **Multi-tenant isolation**: each deployment is single-tenant. Isolation between customers of the developer's SaaS is the developer's responsibility, not oss-mailer's.

## How this map changes

This map is updated **only when the destination changes**. If "done" looks different than it did six months ago, that's a real horizon shift and the map gets rewritten. Day-to-day changes belong in Map 3 (the near-term plan) or in work-unit notes — not here.
