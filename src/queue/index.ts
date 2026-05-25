import type { SendRequest } from '../sender'
import type { SendResult } from '../providers/interface'

export type QueueErrorCode = 'ENQUEUE_FAILED'

export class QueueError extends Error {
  readonly code: QueueErrorCode
  readonly cause?: unknown
  readonly _tag = 'QueueError' as const

  constructor(args: { code: QueueErrorCode; message: string; cause?: unknown }) {
    super(args.message)
    this.name = 'QueueError'
    this.code = args.code
    this.cause = args.cause
    Error.captureStackTrace?.(this, QueueError)
  }
}

export function isQueueError(e: unknown): e is QueueError {
  return (
    e instanceof QueueError ||
    (typeof e === 'object' && e !== null && (e as { _tag?: unknown })._tag === 'QueueError')
  )
}

export interface QStashPublisher {
  publishJSON(args: { url: string; body: unknown; retries?: number }): Promise<{ messageId: string }>
}

export function createQueue(opts: { publisher: QStashPublisher; deliverUrl: string }): {
  enqueue(req: SendRequest): Promise<{ jobId: string }>
} {
  return {
    async enqueue(req) {
      try {
        const { messageId } = await opts.publisher.publishJSON({
          url: opts.deliverUrl,
          body: req,
        })
        return { jobId: messageId }
      } catch (cause) {
        throw new QueueError({
          code: 'ENQUEUE_FAILED',
          message: `Failed to enqueue send to QStash for category=${req.category}`,
          cause,
        })
      }
    },
  }
}

export interface MailSenderForHandler {
  send(req: SendRequest): Promise<SendResult>
}

export function createDeliverHandler(deps: { mailSender: MailSenderForHandler }): (req: Request) => Promise<Response> {
  return async function deliverHandler(req: Request): Promise<Response> {
    let body: SendRequest
    try {
      body = (await req.json()) as SendRequest
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'INVALID_JSON' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      )
    }

    let result: SendResult
    try {
      result = await deps.mailSender.send(body)
    } catch (cause) {
      // Thrown errors (TemplateError, MISSING_CONFIG, etc.) → 500 so QStash retries.
      // The Mail Sender writes its own log entries; the handler does not log here.
      console.error('[Queue.deliverHandler] mailSender.send threw:', cause)
      return new Response(
        JSON.stringify({ ok: false, error: 'SEND_THREW' }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      )
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ ok: false, error: result.error ?? 'SEND_FAILED' }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ ok: true, messageId: result.messageId }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )
  }
}
