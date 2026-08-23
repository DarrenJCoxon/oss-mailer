import type { SendResult } from '../providers/interface'
import type { createRouter, EmailCategory } from '../router'
import { renderTemplate } from '../renderer'
import type { TemplateOverride } from '../template-store'

export type MailSenderErrorCode = 'TEMPLATE_ERROR' | 'SEND_LOG_ERROR' | 'MISSING_CONFIG'

export class MailSenderError extends Error {
  readonly code: MailSenderErrorCode
  readonly cause?: unknown
  readonly _tag = 'MailSenderError' as const

  constructor(args: {
    code: MailSenderErrorCode
    message: string
    cause?: unknown
  }) {
    super(args.message)
    this.name = 'MailSenderError'
    this.code = args.code
    this.cause = args.cause
    Error.captureStackTrace?.(this, MailSenderError)
  }
}

export function isMailSenderError(e: unknown): e is MailSenderError {
  return (
    e instanceof MailSenderError ||
    (typeof e === 'object' &&
      e !== null &&
      (e as { _tag?: unknown })._tag === 'MailSenderError')
  )
}

export type WriteSendAttemptArgs = {
  category: string
  to: string
  provider: string
  success: boolean
  messageId?: string
  error?: string
  durationMs: number
}

export interface SendLogWriter {
  writeSendAttempt(args: WriteSendAttemptArgs): Promise<void>
}

export type SendRequest = {
  category: EmailCategory
  to: string
  subject: string
  props?: Record<string, unknown>
  replyTo?: string
}

const UNSUBSCRIBE_CATEGORIES: ReadonlySet<EmailCategory> = new Set([
  'promotional',
  'update',
])

export function createMailSender(
  router: ReturnType<typeof createRouter>,
  logWriter: SendLogWriter,
  getOverride?: (category: EmailCategory) => Promise<TemplateOverride | undefined>,
): { send(req: SendRequest): Promise<SendResult> } {
  async function send(req: SendRequest): Promise<SendResult> {
    const override = getOverride ? await getOverride(req.category) : undefined
    const { html, text } = await renderTemplate(req.category, req.props, override)

    const adapter = router.resolve(req.category)

    const from = process.env.MAILER_FROM
    if (!from) {
      throw new MailSenderError({ code: 'MISSING_CONFIG', message: 'MAILER_FROM env var is not set' })
    }

    let headers: Record<string, string> | undefined
    if (UNSUBSCRIBE_CATEGORIES.has(req.category)) {
      const unsubscribeUrl = req.props?.unsubscribeUrl as string | undefined
      if (unsubscribeUrl) {
        headers = { 'List-Unsubscribe': '<' + unsubscribeUrl + '>' }
      } else {
        console.warn('[MailSender] List-Unsubscribe omitted — props.unsubscribeUrl missing for category:', req.category)
      }
    }

    const start = Date.now()

    const subject = override?.subject ?? req.subject

    const result = await adapter.send({
      from,
      to: req.to,
      subject,
      html,
      text,
      ...(req.replyTo ? { replyTo: req.replyTo } : {}),
      ...(headers ? { headers } : {}),
    })

    const durationMs = Date.now() - start

    try {
      await logWriter.writeSendAttempt({
        category: req.category,
        to: req.to,
        provider: result.provider,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        durationMs,
      })
    } catch (e) {
      console.error('[MailSender] writeSendAttempt failed:', e)
    }

    return result
  }

  return { send }
}
