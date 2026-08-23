# oss-mailer

Client SDK for the [oss-mailer](https://github.com/DarrenJCoxon/oss-mailer) self-hosted email routing service.

## Install

```sh
npm install oss-mailer
```

## Usage

### Queue a product update

```ts
import { createMailerClient } from 'oss-mailer'

const mailer = createMailerClient({
  url: process.env.MAILER_URL!,
  apiKey: process.env.MAILER_API_KEY!,
})

await mailer.sendMail({
  category: 'update',
  to: 'user@example.com',
  subject: 'Your weekly digest',
  props: { html: preRenderedHtml },
})
```

### Send a transactional email

```ts
await mailer.sendMail({
  category: 'transactional',
  to: 'support@example.com',
  replyTo: 'customer@example.com',
  subject: 'New contact enquiry',
  props: { html: preRenderedHtml },
})
```

### Queue a promotional mailshot

Audience selection, consent and campaign scheduling stay in your application. Send one
personalised request per recipient; oss-mailer queues delivery and adds unsubscribe headers.

```ts
await mailer.sendMail({
  category: 'promotional',
  to: 'subscriber@example.com',
  subject: 'What is new at Kompass',
  unsubscribeUrl: 'https://example.com/email/preferences/unsubscribe?token=...',
  props: { html: preRenderedHtml },
})
```

### Send a magic link email

```ts
await mailer.sendMail({
  category: 'magic_link',
  to: 'user@example.com',
  subject: 'Sign in to your account',
  props: { url: 'https://app.example.com/auth/verify?token=abc123' },
})
```

### NextAuth v5 email provider

```ts
import { MailerEmailProvider } from 'oss-mailer/nextauth'

// In your auth.ts:
providers: [
  MailerEmailProvider({
    mailerUrl: process.env.MAILER_URL!,
    apiKey: process.env.MAILER_API_KEY!,
    from: 'noreply@yourapp.com',
    appName: 'My App',
  })
]
```

## Environment variables (set in your app, not in this package)

| Variable | Description |
|---|---|
| `MAILER_URL` | Base URL of your deployed oss-mailer instance |
| `MAILER_API_KEY` | API key configured on the mailer service |

## Error handling

```ts
import { createMailerClient, isMailerError } from 'oss-mailer'

try {
  await mailer.sendMail(...)
} catch (e) {
  if (isMailerError(e)) {
    console.error(e.code, e.detail)
  }
}
```
