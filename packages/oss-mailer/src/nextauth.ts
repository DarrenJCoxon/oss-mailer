import { createMailerClient, MailerError } from './index.js'

// Local declaration of the params shape — no next-auth import needed.
// This matches NextAuth v5's SendVerificationRequestParams structurally.
export type SendVerificationRequestParams = {
  identifier: string
  url: string
  expires: Date
  provider: { from?: string; [key: string]: unknown }
  token: string
  theme?: unknown
  request: Request
}

export type MailerEmailProviderConfig = {
  mailerUrl: string
  apiKey: string
  from: string
  appName?: string
  subject?: (params: SendVerificationRequestParams) => string
  fetch?: typeof fetch
}

export type MailerEmailProvider = {
  id: 'mailer'
  type: 'email'
  name: 'Mailer'
  from: string
  maxAge: number
  sendVerificationRequest: (params: SendVerificationRequestParams) => Promise<void>
  options: MailerEmailProviderConfig
}

export function MailerEmailProvider(
  config: MailerEmailProviderConfig,
): MailerEmailProvider {
  if (!config.mailerUrl || typeof config.mailerUrl !== 'string') {
    throw new MailerError({ code: 'CONFIG', message: 'MailerEmailProvider: mailerUrl is required' })
  }
  if (!config.apiKey || typeof config.apiKey !== 'string') {
    throw new MailerError({ code: 'CONFIG', message: 'MailerEmailProvider: apiKey is required' })
  }
  if (!config.from || typeof config.from !== 'string') {
    throw new MailerError({ code: 'CONFIG', message: 'MailerEmailProvider: from is required' })
  }

  return {
    id: 'mailer',
    type: 'email',
    name: 'Mailer',
    from: config.from,
    maxAge: 24 * 60 * 60,
    options: config,
    async sendVerificationRequest(params: SendVerificationRequestParams): Promise<void> {
      const subject = config.subject
        ? config.subject(params)
        : `Sign in to ${config.appName ?? 'your account'}`

      const client = createMailerClient({
        url: config.mailerUrl,
        apiKey: config.apiKey,
        fetch: config.fetch,
      })

      await client.sendMail({
        category: 'magic_link',
        to: params.identifier,
        subject,
        props: { url: params.url },
      })
    },
  }
}
