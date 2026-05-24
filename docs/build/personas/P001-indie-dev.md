# P001 — Indie SaaS Developer

| Field | Value |
| --- | --- |
| Status | 🟢 active |
| Paired with | none |
| Used by WUs | — |
| First filed | 2026-05-24 |
| Last refined | 2026-05-24 |

## What this persona is, in one sentence

A solo developer or small team building one or more SaaS products who needs reliable transactional and marketing email without paying Postmark or Resend prices.

## The seven dimensions

### 1. Identity

A developer — likely solo or a tiny team — running SaaS products that need to send three categories of email: magic links (auth), promotional blasts, and product update notifications. They have AWS credentials and are comfortable with infrastructure but don't want to babysit a raw SES integration or manage bounce/complaint handling from scratch.

### 2. Reality

Laptop, stable connection. Working in a code editor or terminal. Not time-pressured on setup but actively watching costs as products scale. Email volume is low-to-medium today but they're building for growth.

### 3. Psychology

Technically confident. Will read docs if they're clear. Won't tolerate black-box behaviour — they want to know which provider sent what and why. Frustrated by per-seat or per-volume pricing from premium senders that feel like they're paying for features they'll never use (open tracking dashboards, Salesforce integrations, etc.).

### 4. Trigger

Monthly bill from Resend or Postmark arrives and it's climbing. Or they're setting up a new SaaS product and refuse to sign up for another expensive sender. They know SES is cheaper but don't want to wire it directly — they need the routing logic, a simple API, and sensible defaults handled for them.

### 5. History

Has used Postmark, Resend, or SendGrid before. Understands email fundamentals (SPF/DKIM, bounces, transactional vs. bulk). May have direct SES experience. Comfortable with environment variables, API keys, and self-hosted infrastructure on Vercel or similar.

### 6. Success

They call one endpoint with a category (`magic_link` / `promotional` / `update`) and the email sends via the cheapest appropriate provider. No per-email pricing surprises. Logs are queryable. If a provider is down, it fails over silently. Monthly email costs are a rounding error.

### 7. Constraints

- Won't maintain a complex self-hosted system that needs babysitting
- Won't accept a black box — needs visibility into what sent and via what provider
- Won't configure provider SDKs individually per project — one integration, many projects
- Won't pay for features they don't use (analytics dashboards, CRM sync, etc.)

## The acid-test refinement

Developer with three active SaaS apps, each at different volume stages. One is sending 5k magic links/month, one is blasting 50k promotional emails/month, one is just getting started. All three need to share routing config but keep logs separate. Cost must stay well below what Resend would charge at the same volume.

## Paired persona

none

## Used by WUs

— (to be updated as WUs are filed)

## Notes / refinements

### 2026-05-24 — first filed

Based directly on operator's description. Core frustration: Postmark/Resend pricing for capabilities that are far simpler than what those products provide. Key insight: persona wants a thin, transparent routing layer — not a platform.
