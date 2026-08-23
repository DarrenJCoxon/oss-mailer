import type { SendRequest } from '../../sender'
import type { SendResult } from '../../providers/interface'
import type { EmailCategory } from '../../router'

const KNOWN_CATEGORIES: ReadonlySet<EmailCategory> = new Set([
  'magic_link',
  'transactional',
  'promotional',
  'update',
])

const SYNCHRONOUS_CATEGORIES: ReadonlySet<EmailCategory> = new Set([
  'magic_link',
  'transactional',
])

export type ValidationFailure = { field: string; reason: string }

export function validateSendRequest(
  raw: unknown,
): { ok: true; data: SendRequest } | { ok: false; fields: ValidationFailure[] } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, fields: [{ field: '(root)', reason: 'body must be a JSON object' }] }
  }

  const r = raw as Record<string, unknown>
  const fields: ValidationFailure[] = []

  if (typeof r.category !== 'string') {
    fields.push({ field: 'category', reason: 'must be a string' })
  }

  if (typeof r.to !== 'string' || !isSafeEmailAddress(r.to)) {
    fields.push({ field: 'to', reason: 'must be a valid email address' })
  }

  if (
    typeof r.subject !== 'string' ||
    r.subject.length === 0 ||
    r.subject.length > 200 ||
    /[\r\n]/.test(r.subject)
  ) {
    fields.push({ field: 'subject', reason: 'must be 1-200 characters without line breaks' })
  }

  if (
    r.props !== undefined &&
    (typeof r.props !== 'object' || r.props === null || Array.isArray(r.props))
  ) {
    fields.push({ field: 'props', reason: 'must be an object if provided' })
  }

  if (
    r.replyTo !== undefined &&
    (typeof r.replyTo !== 'string' || !isSafeEmailAddress(r.replyTo))
  ) {
    fields.push({ field: 'replyTo', reason: 'must be a valid email address if provided' })
  }

  if (
    (r.category === 'promotional' || r.category === 'update') &&
    !isSafeHttpUrl((r.props as Record<string, unknown> | undefined)?.unsubscribeUrl)
  ) {
    fields.push({
      field: 'props.unsubscribeUrl',
      reason: 'must be an absolute HTTP(S) URL for promotional and update mail',
    })
  }

  if (fields.length > 0) return { ok: false, fields }

  return {
    ok: true,
    data: {
      category: r.category as EmailCategory,
      to: r.to as string,
      subject: r.subject as string,
      props: r.props as Record<string, unknown> | undefined,
      replyTo: r.replyTo as string | undefined,
    },
  }
}

export interface MailSenderForSend {
  send(req: SendRequest): Promise<SendResult>
}

export interface QueueForSend {
  enqueue(req: SendRequest): Promise<{ jobId: string }>
}

export function createSendHandler(deps: {
  mailSender: MailSenderForSend
  queue: QueueForSend
  apiKey: string
}): (req: Request) => Promise<Response> {
  return async function sendHandler(req: Request): Promise<Response> {
    const auth = req.headers.get('authorization') ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
    if (token.length === 0 || token !== deps.apiKey) {
      return jsonResponse({ error: 'UNAUTHORIZED' }, 401)
    }

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return jsonResponse(
        {
          error: 'VALIDATION_FAILED',
          fields: [{ field: '(body)', reason: 'request body is not valid JSON' }],
        },
        400,
      )
    }

    const v = validateSendRequest(raw)
    if (!v.ok) {
      return jsonResponse({ error: 'VALIDATION_FAILED', fields: v.fields }, 400)
    }
    const body = v.data

    if (!KNOWN_CATEGORIES.has(body.category)) {
      return jsonResponse({ error: 'UNKNOWN_CATEGORY', category: body.category }, 400)
    }

    if (SYNCHRONOUS_CATEGORIES.has(body.category)) {
      let result: SendResult
      try {
        result = await deps.mailSender.send(body)
      } catch (cause) {
        console.error('[Api.send] mailSender.send threw:', cause)
        return jsonResponse(
          {
            error: 'SEND_FAILED',
            detail: cause instanceof Error ? cause.message : 'send threw',
          },
          500,
        )
      }

      if (!result.success) {
        return jsonResponse(
          { error: 'SEND_FAILED', detail: result.error ?? 'send returned success: false' },
          500,
        )
      }

      return jsonResponse(
        {
          success: true,
          messageId: result.messageId,
          provider: result.provider,
          sentAt: result.sentAt,
        },
        200,
      )
    }

    try {
      const { jobId } = await deps.queue.enqueue(body)
      return jsonResponse({ queued: true, jobId }, 202)
    } catch (cause) {
      console.error('[Api.send] queue.enqueue threw:', cause)
      return jsonResponse(
        {
          error: 'QUEUE_FAILED',
          detail: cause instanceof Error ? cause.message : 'enqueue threw',
        },
        500,
      )
    }
  }
}

function isSafeEmailAddress(value: string): boolean {
  return value.length <= 254
    && !/[\r\n]/.test(value)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isSafeHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string' || /[\r\n]/.test(value)) return false
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:')
      && !url.username
      && !url.password
  } catch {
    return false
  }
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
