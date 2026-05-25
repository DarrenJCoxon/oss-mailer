# oss-mailer

Client SDK for the [oss-mailer](https://github.com/<owner>/mailer) self-hosted email routing service.

## Install

```sh
npm install oss-mailer
```

## Usage

### Send a transactional email

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
