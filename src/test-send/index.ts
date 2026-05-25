export type Category = 'magic_link' | 'promotional' | 'update'

export const CATEGORIES: readonly Category[] = ['magic_link', 'promotional', 'update']

export function buildDefaultSubject(category: Category): string {
  return `Test — ${category}`
}

export type ClientFormErrors = {
  to?: string
  subject?: string
}

export function validateClientForm(input: { to: string; subject: string }): ClientFormErrors {
  const errors: ClientFormErrors = {}
  if (input.to.trim() === '') {
    errors.to = 'Recipient address is required'
  }
  if (input.subject.trim() === '') {
    errors.subject = 'Subject is required'
  }
  return errors
}

export type SendApiResponse =
  | { kind: 'sent'; messageId: string; provider: string; sentAt: string }
  | { kind: 'queued'; jobId: string }
  | {
      kind: 'error'
      code:
        | 'UNAUTHORIZED'
        | 'VALIDATION_FAILED'
        | 'UNKNOWN_CATEGORY'
        | 'SEND_FAILED'
        | 'QUEUE_FAILED'
        | 'NETWORK'
        | 'UNEXPECTED'
      detail: string
    }

function formatFieldsList(fields: unknown): string {
  if (!Array.isArray(fields)) return 'Invalid request fields.'
  return fields
    .map((f) => {
      if (typeof f === 'object' && f !== null && 'reason' in f) {
        const obj = f as { field?: unknown; reason: unknown }
        return `${String(obj.field ?? '')}: ${String(obj.reason)}`
      }
      return String(f)
    })
    .join('; ')
}

export function mapApiResponseToResult(status: number, body: unknown): SendApiResponse {
  const b = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}

  if (status === 200 && b.success === true) {
    return {
      kind: 'sent',
      messageId: String(b.messageId ?? ''),
      provider: String(b.provider ?? ''),
      sentAt: String(b.sentAt ?? ''),
    }
  }

  if (status === 202 && b.queued === true) {
    return {
      kind: 'queued',
      jobId: String(b.jobId ?? ''),
    }
  }

  if (status === 401) {
    return {
      kind: 'error',
      code: 'UNAUTHORIZED',
      detail: 'API key rejected by /api/send. Check MAILER_API_KEY.',
    }
  }

  if (status === 400 && b.error === 'VALIDATION_FAILED') {
    return {
      kind: 'error',
      code: 'VALIDATION_FAILED',
      detail: formatFieldsList(b.fields),
    }
  }

  if (status === 400 && b.error === 'UNKNOWN_CATEGORY') {
    return {
      kind: 'error',
      code: 'UNKNOWN_CATEGORY',
      detail: `Unknown category: ${b.category}`,
    }
  }

  if (status === 500 && b.error === 'SEND_FAILED') {
    return {
      kind: 'error',
      code: 'SEND_FAILED',
      detail: typeof b.detail === 'string' ? b.detail : 'Send failed without a provider error message.',
    }
  }

  if (status === 500 && b.error === 'QUEUE_FAILED') {
    return {
      kind: 'error',
      code: 'QUEUE_FAILED',
      detail: typeof b.detail === 'string' ? b.detail : 'Queue enqueue failed.',
    }
  }

  return {
    kind: 'error',
    code: 'UNEXPECTED',
    detail: `Unexpected response: status ${status}`,
  }
}
