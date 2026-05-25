/**
 * Covers src/test-send/index.ts
 *
 * Section 1 — CATEGORIES constant (AC-4)
 * Section 2 — buildDefaultSubject
 * Section 3 — validateClientForm
 * Section 4 — mapApiResponseToResult (one test per mapping rule)
 * Section 5 — Voice spot-check across all mapApiResponseToResult results
 */
import { describe, it, expect } from 'vitest'

import {
  CATEGORIES,
  buildDefaultSubject,
  validateClientForm,
  mapApiResponseToResult,
} from './index'

// ─── Section 1: CATEGORIES ────────────────────────────────────────────────────

describe('CATEGORIES — AC-4', () => {
  it('has exactly 3 entries', () => {
    expect(CATEGORIES).toHaveLength(3)
  })

  it('is exactly [magic_link, promotional, update] in that order', () => {
    expect(Array.from(CATEGORIES)).toEqual(['magic_link', 'promotional', 'update'])
  })
})

// ─── Section 2: buildDefaultSubject ───────────────────────────────────────────

describe('buildDefaultSubject', () => {
  it('returns "Test — magic_link" for magic_link', () => {
    expect(buildDefaultSubject('magic_link')).toBe('Test — magic_link')
  })

  it('returns "Test — promotional" for promotional', () => {
    expect(buildDefaultSubject('promotional')).toBe('Test — promotional')
  })

  it('returns "Test — update" for update', () => {
    expect(buildDefaultSubject('update')).toBe('Test — update')
  })
})

// ─── Section 3: validateClientForm ────────────────────────────────────────────

describe('validateClientForm', () => {
  it('returns to error "Recipient address is required" when to is empty, no subject error', () => {
    const errors = validateClientForm({ to: '', subject: 'x' })
    expect(errors.to).toBe('Recipient address is required')
    expect(errors.subject).toBeUndefined()
  })

  it('returns subject error "Subject is required" when subject is empty, no to error', () => {
    const errors = validateClientForm({ to: 'a', subject: '' })
    expect(errors.subject).toBe('Subject is required')
    expect(errors.to).toBeUndefined()
  })

  it('treats whitespace-only to as empty and returns to error', () => {
    const errors = validateClientForm({ to: '   ', subject: 'x' })
    expect(errors.to).toBe('Recipient address is required')
    expect(errors.subject).toBeUndefined()
  })

  it('returns {} when both to and subject are non-empty', () => {
    const errors = validateClientForm({ to: 'a', subject: 'b' })
    expect(errors).toEqual({})
  })

  it('returns both errors when to and subject are both empty', () => {
    const errors = validateClientForm({ to: '', subject: '' })
    expect(errors.to).toBe('Recipient address is required')
    expect(errors.subject).toBe('Subject is required')
  })
})

// ─── Section 4: mapApiResponseToResult ────────────────────────────────────────

describe('mapApiResponseToResult', () => {
  it('status 200 with success: true maps to { kind: "sent", messageId, provider, sentAt }', () => {
    const result = mapApiResponseToResult(200, {
      success: true,
      messageId: 'mid',
      provider: 'ses',
      sentAt: '2026-01-01T00:00:00Z',
    })
    expect(result).toEqual({
      kind: 'sent',
      messageId: 'mid',
      provider: 'ses',
      sentAt: '2026-01-01T00:00:00Z',
    })
  })

  it('status 202 with queued: true maps to { kind: "queued", jobId }', () => {
    const result = mapApiResponseToResult(202, { queued: true, jobId: 'j1' })
    expect(result).toEqual({ kind: 'queued', jobId: 'j1' })
  })

  it('status 401 maps to { kind: "error", code: "UNAUTHORIZED" } with MAILER_API_KEY in detail', () => {
    const result = mapApiResponseToResult(401, {})
    expect(result.kind).toBe('error')
    if (result.kind !== 'error') return
    expect(result.code).toBe('UNAUTHORIZED')
    expect(result.detail).toMatch(/MAILER_API_KEY/)
  })

  it(
    'status 400 with error: VALIDATION_FAILED maps to { kind: "error", code: "VALIDATION_FAILED" } with joined reason(s)',
    () => {
      const result = mapApiResponseToResult(400, {
        error: 'VALIDATION_FAILED',
        fields: [{ field: 'to', reason: 'must be a non-empty string' }],
      })
      expect(result.kind).toBe('error')
      if (result.kind !== 'error') return
      expect(result.code).toBe('VALIDATION_FAILED')
      expect(result.detail).toBe('to: must be a non-empty string')
    },
  )

  it(
    'status 400 with error: UNKNOWN_CATEGORY maps to { kind: "error", code: "UNKNOWN_CATEGORY", detail containing the category }',
    () => {
      const result = mapApiResponseToResult(400, {
        error: 'UNKNOWN_CATEGORY',
        category: 'invalid',
      })
      expect(result.kind).toBe('error')
      if (result.kind !== 'error') return
      expect(result.code).toBe('UNKNOWN_CATEGORY')
      expect(result.detail).toEqual(expect.stringContaining('invalid'))
    },
  )

  it('status 500 with error: SEND_FAILED and detail maps to { kind: "error", code: "SEND_FAILED", detail: <string> }', () => {
    const result = mapApiResponseToResult(500, {
      error: 'SEND_FAILED',
      detail: 'SES credentials invalid',
    })
    expect(result.kind).toBe('error')
    if (result.kind !== 'error') return
    expect(result.code).toBe('SEND_FAILED')
    expect(result.detail).toBe('SES credentials invalid')
  })

  it('status 500 with error: SEND_FAILED and no detail uses fallback message string', () => {
    const result = mapApiResponseToResult(500, { error: 'SEND_FAILED' })
    expect(result.kind).toBe('error')
    if (result.kind !== 'error') return
    expect(result.code).toBe('SEND_FAILED')
    expect(result.detail).toEqual(expect.any(String))
    expect(result.detail.length).toBeGreaterThan(0)
  })

  it('status 500 with error: QUEUE_FAILED and detail maps to { kind: "error", code: "QUEUE_FAILED", detail: <string> }', () => {
    const result = mapApiResponseToResult(500, {
      error: 'QUEUE_FAILED',
      detail: 'Enqueue failed',
    })
    expect(result.kind).toBe('error')
    if (result.kind !== 'error') return
    expect(result.code).toBe('QUEUE_FAILED')
    expect(result.detail).toBe('Enqueue failed')
  })

  it('status 503 with unexpected body maps to { kind: "error", code: "UNEXPECTED", detail containing "503" }', () => {
    const result = mapApiResponseToResult(503, {})
    expect(result.kind).toBe('error')
    if (result.kind !== 'error') return
    expect(result.code).toBe('UNEXPECTED')
    expect(result.detail).toEqual(expect.stringContaining('503'))
  })
})

// ─── Section 5: Voice spot-check ──────────────────────────────────────────────

describe('mapApiResponseToResult — voice spot-check: no forbidden words in any result', () => {
  const forbiddenWords = ['Oops', 'Unfortunately', 'Please', 'Sorry', 'Successfully']

  const allCases: Array<{ label: string; status: number; body: unknown }> = [
    {
      label: '200 sent',
      status: 200,
      body: { success: true, messageId: 'mid', provider: 'ses', sentAt: '2026-01-01T00:00:00Z' },
    },
    {
      label: '202 queued',
      status: 202,
      body: { queued: true, jobId: 'j1' },
    },
    {
      label: '401 unauthorized',
      status: 401,
      body: {},
    },
    {
      label: '400 VALIDATION_FAILED',
      status: 400,
      body: {
        error: 'VALIDATION_FAILED',
        fields: [{ field: 'to', reason: 'must be a non-empty string' }],
      },
    },
    {
      label: '400 UNKNOWN_CATEGORY',
      status: 400,
      body: { error: 'UNKNOWN_CATEGORY', category: 'invalid' },
    },
    {
      label: '500 SEND_FAILED with detail',
      status: 500,
      body: { error: 'SEND_FAILED', detail: 'SES credentials invalid' },
    },
    {
      label: '500 SEND_FAILED no detail',
      status: 500,
      body: { error: 'SEND_FAILED' },
    },
    {
      label: '500 QUEUE_FAILED',
      status: 500,
      body: { error: 'QUEUE_FAILED', detail: 'Enqueue failed' },
    },
    {
      label: '503 unexpected',
      status: 503,
      body: {},
    },
  ]

  for (const { label, status, body } of allCases) {
    it(`no forbidden word in result for case: ${label}`, () => {
      const result = mapApiResponseToResult(status, body)

      // Collect all string values from the result to check
      const strings: string[] = []
      if (result.kind === 'sent') {
        strings.push(result.messageId, result.provider, result.sentAt)
      } else if (result.kind === 'queued') {
        strings.push(result.jobId)
      } else if (result.kind === 'error') {
        strings.push(result.code, result.detail)
      }

      for (const str of strings) {
        for (const word of forbiddenWords) {
          expect(str).not.toContain(word)
        }
      }
    })
  }
})
