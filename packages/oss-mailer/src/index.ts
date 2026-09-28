export type EmailCategory = 'magic_link' | 'transactional' | 'promotional' | 'update'

/**
 * A file attached to a transactional or magic-link email (for example an
 * invoice PDF). The mailer accepts PDF, CSV, PNG and JPEG, up to 5 files and
 * 5 MB in total.
 */
export type MailAttachment = {
  filename: string
  contentType: 'application/pdf' | 'text/csv' | 'image/png' | 'image/jpeg'
  /** The file's bytes, or the same bytes already base64-encoded. */
  content: Uint8Array | string
}

export type SendMailInput = {
  category: EmailCategory
  to: string
  subject: string
  props?: Record<string, unknown>
  replyTo?: string
  /** Required by the calling application for promotional and update mail. */
  unsubscribeUrl?: string
  /** Only for transactional and magic_link mail, which are sent straight away. */
  attachments?: MailAttachment[]
}

/** Base64 without Node's Buffer, so the SDK also runs on edge runtimes. */
function toBase64(content: Uint8Array | string): string {
  if (typeof content === 'string') return content
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < content.length; i += chunk) {
    binary += String.fromCharCode(...content.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export type SendMailResult =
  | { success: true; messageId: string; provider: string; sentAt: string }
  | { queued: true; jobId: string }

export type MailerErrorCode =
  | 'CONFIG'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'UNKNOWN_CATEGORY'
  | 'SEND_FAILED'
  | 'QUEUE_FAILED'
  | 'NETWORK'
  | 'UNEXPECTED_RESPONSE'

export class MailerError extends Error {
  readonly code: MailerErrorCode
  readonly status?: number
  readonly detail?: string
  readonly fields?: ReadonlyArray<{ field: string; reason: string }>
  readonly _tag = 'MailerError' as const

  constructor(args: {
    code: MailerErrorCode
    message: string
    status?: number
    detail?: string
    fields?: ReadonlyArray<{ field: string; reason: string }>
    cause?: unknown
  }) {
    super(args.message, { cause: args.cause })
    this.name = 'MailerError'
    this.code = args.code
    this.status = args.status
    this.detail = args.detail
    this.fields = args.fields
    Error.captureStackTrace?.(this, MailerError)
  }
}

export function isMailerError(e: unknown): e is MailerError {
  return (
    e instanceof MailerError ||
    (typeof e === 'object' &&
      e !== null &&
      (e as { _tag?: unknown })._tag === 'MailerError')
  )
}

export type MailerClient = {
  sendMail(input: SendMailInput): Promise<SendMailResult>
}

export function createMailerClient(config: {
  url: string
  apiKey: string
  fetch?: typeof fetch
}): MailerClient {
  if (!config.url || typeof config.url !== 'string') {
    throw new MailerError({ code: 'CONFIG', message: 'createMailerClient: url is required' })
  }
  if (!config.apiKey || typeof config.apiKey !== 'string') {
    throw new MailerError({ code: 'CONFIG', message: 'createMailerClient: apiKey is required' })
  }

  const url = config.url.replace(/\/$/, '')

  return {
    async sendMail(input: SendMailInput): Promise<SendMailResult> {
      const fetchFn = config.fetch ?? globalThis.fetch

      let response: Response
      try {
        response = await fetchFn(`${url}/api/send`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            category: input.category,
            to: input.to,
            subject: input.subject,
            props: input.unsubscribeUrl
              ? { ...input.props, unsubscribeUrl: input.unsubscribeUrl }
              : input.props,
            replyTo: input.replyTo,
            attachments: input.attachments?.map((attachment) => ({
              filename: attachment.filename,
              contentType: attachment.contentType,
              content: toBase64(attachment.content),
            })),
          }),
        })
      } catch (cause) {
        throw new MailerError({
          code: 'NETWORK',
          message: 'Mailer request failed',
          detail: cause instanceof Error ? cause.message : String(cause),
          cause,
        })
      }

      const status = response.status

      if (status === 401) {
        throw new MailerError({ code: 'UNAUTHORIZED', status: 401, message: 'Mailer rejected API key' })
      }

      let body: unknown
      let rawText = ''
      try {
        rawText = await response.text()
        body = JSON.parse(rawText)
      } catch {
        throw new MailerError({
          code: 'UNEXPECTED_RESPONSE',
          status,
          message: 'Unexpected mailer response',
          detail: rawText.slice(0, 200),
        })
      }

      if (status === 400 && isRecord(body)) {
        if (body.error === 'VALIDATION_FAILED') {
          throw new MailerError({
            code: 'VALIDATION_FAILED',
            status: 400,
            message: 'Validation failed',
            fields: body.fields as ReadonlyArray<{ field: string; reason: string }>,
          })
        }
        if (body.error === 'UNKNOWN_CATEGORY') {
          throw new MailerError({
            code: 'UNKNOWN_CATEGORY',
            status: 400,
            message: `Unknown category: ${body.category as string}`,
            detail: body.category as string,
          })
        }
      }

      if (status === 500 && isRecord(body)) {
        if (body.error === 'SEND_FAILED') {
          throw new MailerError({
            code: 'SEND_FAILED',
            status: 500,
            message: 'Mailer send failed',
            detail: body.detail as string | undefined,
          })
        }
        if (body.error === 'QUEUE_FAILED') {
          throw new MailerError({
            code: 'QUEUE_FAILED',
            status: 500,
            message: 'Mailer queue failed',
            detail: body.detail as string | undefined,
          })
        }
      }

      if (status === 200 && isRecord(body) && body.success === true && typeof body.messageId === 'string') {
        return {
          success: true,
          messageId: body.messageId as string,
          provider: body.provider as string,
          sentAt: body.sentAt as string,
        }
      }

      if (status === 202 && isRecord(body) && body.queued === true && typeof body.jobId === 'string') {
        return { queued: true, jobId: body.jobId as string }
      }

      throw new MailerError({
        code: 'UNEXPECTED_RESPONSE',
        status,
        message: 'Unexpected mailer response',
        detail: rawText.slice(0, 200),
      })
    },
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
