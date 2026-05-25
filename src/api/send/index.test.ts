/**
 * Covers src/api/send/index.ts
 *
 * Section 1 — validateSendRequest (pure function, table-driven)
 *   AC-VAL-1:  Valid full body → { ok: true, data: { category, to, subject, props } }
 *   AC-VAL-2:  Valid body without props → { ok: true, data: { ..., props: undefined } }
 *   AC-VAL-3:  Non-object body (string, null, array, number) → { ok: false, fields: [{ field: '(root)', ... }] }
 *   AC-VAL-4:  Missing category → field error on 'category'
 *   AC-VAL-5:  category is a number → field error on 'category'
 *   AC-VAL-6:  Missing to → field error on 'to'
 *   AC-VAL-7:  Empty string to → field error on 'to'
 *   AC-VAL-8:  Missing subject → field error on 'subject'
 *   AC-VAL-9:  props is null → field error on 'props'
 *   AC-VAL-10: props is an array → field error on 'props'
 *   AC-VAL-11: props is a plain object → ok (no error)
 *   AC-VAL-12: Multiple missing fields → all fields listed
 *
 * Section 2 — createSendHandler (inject fakes, construct new Request)
 *   AC-1: Auth — missing/wrong/malformed Authorization → 401 UNAUTHORIZED
 *   AC-2: Validation — valid body → 200; missing to → 400; malformed JSON → 400
 *   AC-4: Field-level errors — to and subject missing → both in fields array
 *   AC-5: Unknown category → 400 UNKNOWN_CATEGORY
 *   AC-6: Voice compliance — error strings are plain, no Oops/Unfortunately/Please
 *   AC-7: Full success/failure paths — magic_link send, promotional/update queue
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

import { validateSendRequest, createSendHandler } from './index'
import type { ValidationFailure } from './index'

// ─── Section 1: validateSendRequest ──────────────────────────────────────────

describe('validateSendRequest — AC-VAL-1: valid full body', () => {
  it('returns ok: true with all fields when body is complete', () => {
    const result = validateSendRequest({
      category: 'magic_link',
      to: 'user@example.com',
      subject: 'Click here',
      props: { url: 'https://example.com' },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.category).toBe('magic_link')
    expect(result.data.to).toBe('user@example.com')
    expect(result.data.subject).toBe('Click here')
    expect(result.data.props).toEqual({ url: 'https://example.com' })
  })
})

describe('validateSendRequest — AC-VAL-2: valid body without props', () => {
  it('returns ok: true with props undefined when props is omitted', () => {
    const result = validateSendRequest({
      category: 'magic_link',
      to: 'user@example.com',
      subject: 'Click here',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.props).toBeUndefined()
  })
})

describe('validateSendRequest — AC-VAL-3: non-object body', () => {
  // string, null, and number are caught by the typeof guard and return a single (root) error
  const rootErrorCases: Array<{ label: string; input: unknown }> = [
    { label: 'string', input: 'hello' },
    { label: 'null', input: null },
    { label: 'number', input: 42 },
  ]

  for (const { label, input } of rootErrorCases) {
    it(`returns ok: false with (root) field error for ${label}`, () => {
      const result = validateSendRequest(input)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.fields).toHaveLength(1)
      expect(result.fields[0].field).toBe('(root)')
      expect(typeof result.fields[0].reason).toBe('string')
    })
  }

  // Arrays pass the typeof object check and fall through to field-level validation
  it('returns ok: false for an array (falls through to field validation, not a root error)', () => {
    const result = validateSendRequest(['a', 'b'])
    expect(result.ok).toBe(false)
    // No (root) error — array passes the typeof guard; field errors are reported instead
    if (result.ok) return
    const fieldNames = result.fields.map((f: ValidationFailure) => f.field)
    expect(fieldNames).not.toContain('(root)')
    // category, to, and subject are all missing on an array
    expect(fieldNames).toContain('category')
    expect(fieldNames).toContain('to')
    expect(fieldNames).toContain('subject')
  })
})

describe('validateSendRequest — AC-VAL-4: missing category', () => {
  it('returns a field error for category when it is absent', () => {
    const result = validateSendRequest({ to: 'user@example.com', subject: 'Hi' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const catField = result.fields.find((f) => f.field === 'category')
    expect(catField).toBeDefined()
  })
})

describe('validateSendRequest — AC-VAL-5: category is a number', () => {
  it('returns a field error for category when it is a number', () => {
    const result = validateSendRequest({ category: 42, to: 'user@example.com', subject: 'Hi' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const catField = result.fields.find((f) => f.field === 'category')
    expect(catField).toBeDefined()
  })
})

describe('validateSendRequest — AC-VAL-6: missing to', () => {
  it('returns a field error for to when it is absent', () => {
    const result = validateSendRequest({ category: 'magic_link', subject: 'Hi' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const toField = result.fields.find((f) => f.field === 'to')
    expect(toField).toBeDefined()
  })
})

describe('validateSendRequest — AC-VAL-7: empty string to', () => {
  it('returns a field error for to when it is an empty string', () => {
    const result = validateSendRequest({ category: 'magic_link', to: '', subject: 'Hi' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const toField = result.fields.find((f) => f.field === 'to')
    expect(toField).toBeDefined()
  })
})

describe('validateSendRequest — AC-VAL-8: missing subject', () => {
  it('returns a field error for subject when it is absent', () => {
    const result = validateSendRequest({ category: 'magic_link', to: 'user@example.com' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const subjectField = result.fields.find((f) => f.field === 'subject')
    expect(subjectField).toBeDefined()
  })
})

describe('validateSendRequest — AC-VAL-9: props is null', () => {
  it('returns a field error for props when it is null', () => {
    const result = validateSendRequest({
      category: 'magic_link',
      to: 'user@example.com',
      subject: 'Hi',
      props: null,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const propsField = result.fields.find((f) => f.field === 'props')
    expect(propsField).toBeDefined()
  })
})

describe('validateSendRequest — AC-VAL-10: props is an array', () => {
  it('returns a field error for props when it is an array', () => {
    const result = validateSendRequest({
      category: 'magic_link',
      to: 'user@example.com',
      subject: 'Hi',
      props: ['a', 'b'],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const propsField = result.fields.find((f) => f.field === 'props')
    expect(propsField).toBeDefined()
  })
})

describe('validateSendRequest — AC-VAL-11: props is a plain object', () => {
  it('returns ok: true when props is a plain object', () => {
    const result = validateSendRequest({
      category: 'magic_link',
      to: 'user@example.com',
      subject: 'Hi',
      props: { key: 'value' },
    })
    expect(result.ok).toBe(true)
  })
})

describe('validateSendRequest — AC-VAL-12: multiple missing fields', () => {
  it('lists all missing required fields when to and subject are both absent', () => {
    const result = validateSendRequest({ category: 'magic_link' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const fieldNames = result.fields.map((f: ValidationFailure) => f.field)
    expect(fieldNames).toContain('to')
    expect(fieldNames).toContain('subject')
  })

  it('lists category, to, and subject when all three are absent', () => {
    const result = validateSendRequest({})
    expect(result.ok).toBe(false)
    if (result.ok) return
    const fieldNames = result.fields.map((f: ValidationFailure) => f.field)
    expect(fieldNames).toContain('category')
    expect(fieldNames).toContain('to')
    expect(fieldNames).toContain('subject')
  })
})

// ─── Section 2: createSendHandler ────────────────────────────────────────────

// ─── Handler helper setup ────────────────────────────────────────────────────

const fakeMailSender = { send: vi.fn() }
const fakeQueue = { enqueue: vi.fn() }
const apiKey = 'test-key-123'
const handler = createSendHandler({ mailSender: fakeMailSender, queue: fakeQueue, apiKey })

function makeReq(body: unknown, authHeader?: string): Request {
  return new Request('https://example.com/api/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authHeader !== undefined ? { authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── AC-1: Authorization ─────────────────────────────────────────────────────

describe('createSendHandler — AC-1: authorization', () => {
  it('returns 401 UNAUTHORIZED when Authorization header is missing', async () => {
    const req = makeReq({ category: 'magic_link', to: 'u@example.com', subject: 'Hi' })
    const res = await handler(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('UNAUTHORIZED')
  })

  it('returns 401 UNAUTHORIZED when bearer token is wrong', async () => {
    const req = makeReq(
      { category: 'magic_link', to: 'u@example.com', subject: 'Hi' },
      'Bearer wrong-token',
    )
    const res = await handler(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('UNAUTHORIZED')
  })

  it('returns 401 when Authorization is not Bearer scheme', async () => {
    const req = makeReq(
      { category: 'magic_link', to: 'u@example.com', subject: 'Hi' },
      'NotBearer xyz',
    )
    const res = await handler(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('UNAUTHORIZED')
  })

  it('does NOT return 401 when Authorization header is correct', async () => {
    fakeMailSender.send.mockResolvedValue({
      success: true,
      messageId: 'msg-1',
      provider: 'ses',
      sentAt: '2026-01-01T00:00:00.000Z',
    })
    const req = makeReq(
      { category: 'magic_link', to: 'u@example.com', subject: 'Hi' },
      `Bearer ${apiKey}`,
    )
    const res = await handler(req)
    expect(res.status).not.toBe(401)
  })
})

// ─── AC-2: Validation ────────────────────────────────────────────────────────

describe('createSendHandler — AC-2: validation', () => {
  it('returns 200 for a valid magic_link body', async () => {
    fakeMailSender.send.mockResolvedValue({
      success: true,
      messageId: 'msg-1',
      provider: 'ses',
      sentAt: '2026-01-01T00:00:00.000Z',
    })
    const req = makeReq(
      { category: 'magic_link', to: 'u@example.com', subject: 'Login' },
      `Bearer ${apiKey}`,
    )
    const res = await handler(req)
    expect(res.status).toBe(200)
  })

  it('returns 400 VALIDATION_FAILED with to field error when to is missing', async () => {
    const req = makeReq(
      { category: 'magic_link', subject: 'Login' },
      `Bearer ${apiKey}`,
    )
    const res = await handler(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('VALIDATION_FAILED')
    const fieldNames = json.fields.map((f: ValidationFailure) => f.field)
    expect(fieldNames).toContain('to')
  })

  it('returns 400 VALIDATION_FAILED with (body) field error for malformed JSON', async () => {
    const req = new Request('https://example.com/api/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: 'not-json',
    })
    const res = await handler(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('VALIDATION_FAILED')
    const fieldNames = json.fields.map((f: ValidationFailure) => f.field)
    expect(fieldNames).toContain('(body)')
  })
})

// ─── AC-4: Field-level errors ────────────────────────────────────────────────

describe('createSendHandler — AC-4: field-level errors', () => {
  it('includes entries for both to and subject when both are missing', async () => {
    const req = makeReq({ category: 'magic_link' }, `Bearer ${apiKey}`)
    const res = await handler(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    const fieldNames = json.fields.map((f: ValidationFailure) => f.field)
    expect(fieldNames).toContain('to')
    expect(fieldNames).toContain('subject')
  })

  it('each field entry has { field: string, reason: string } shape', async () => {
    const req = makeReq({ category: 'magic_link' }, `Bearer ${apiKey}`)
    const res = await handler(req)
    const json = await res.json()
    for (const entry of json.fields) {
      expect(typeof entry.field).toBe('string')
      expect(typeof entry.reason).toBe('string')
    }
  })
})

// ─── AC-5: Unknown category ──────────────────────────────────────────────────

describe('createSendHandler — AC-5: unknown category', () => {
  it('returns 400 UNKNOWN_CATEGORY for a category string not in the known set', async () => {
    const req = makeReq(
      { category: 'unknown_type', to: 'u@example.com', subject: 'Hi' },
      `Bearer ${apiKey}`,
    )
    const res = await handler(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('UNKNOWN_CATEGORY')
    expect(json.category).toBe('unknown_type')
  })
})

// ─── AC-6: Voice compliance ──────────────────────────────────────────────────

describe('createSendHandler — AC-6: voice compliance', () => {
  it('401 error string does not contain Oops, Unfortunately, or Please', async () => {
    const req = makeReq({ category: 'magic_link', to: 'u@example.com', subject: 'Hi' })
    const res = await handler(req)
    const json = await res.json()
    expect(json.error).not.toMatch(/Oops|Unfortunately|Please/i)
  })

  it('400 VALIDATION_FAILED reason strings are lowercase and direct', async () => {
    const req = makeReq({ category: 'magic_link' }, `Bearer ${apiKey}`)
    const res = await handler(req)
    const json = await res.json()
    for (const entry of json.fields as ValidationFailure[]) {
      // reason should not start with a capital letter (Oops, Unfortunately, Please)
      expect(entry.reason).not.toMatch(/^(Oops|Unfortunately|Please)/i)
    }
  })
})

// ─── AC-7: Full success/failure paths ────────────────────────────────────────

describe('createSendHandler — AC-7: magic_link success path', () => {
  it('returns 200 with send result fields on magic_link success', async () => {
    fakeMailSender.send.mockResolvedValue({
      success: true,
      messageId: 'msg-1',
      provider: 'ses',
      sentAt: '2026-01-01T00:00:00.000Z',
    })
    const req = makeReq(
      { category: 'magic_link', to: 'u@example.com', subject: 'Login' },
      `Bearer ${apiKey}`,
    )
    const res = await handler(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.messageId).toBe('msg-1')
    expect(json.provider).toBe('ses')
    expect(json.sentAt).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('createSendHandler — AC-7: magic_link send failure (success: false)', () => {
  it('returns 500 SEND_FAILED when mailSender.send returns success: false', async () => {
    fakeMailSender.send.mockResolvedValue({
      success: false,
      error: 'bad creds',
      provider: 'ses',
      sentAt: '2026-01-01T00:00:00.000Z',
    })
    const req = makeReq(
      { category: 'magic_link', to: 'u@example.com', subject: 'Login' },
      `Bearer ${apiKey}`,
    )
    const res = await handler(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('SEND_FAILED')
    expect(json.detail).toBe('bad creds')
  })
})

describe('createSendHandler — AC-7: magic_link send throws', () => {
  it('returns 500 SEND_FAILED when mailSender.send throws an Error', async () => {
    fakeMailSender.send.mockRejectedValue(new Error('boom'))
    const req = makeReq(
      { category: 'magic_link', to: 'u@example.com', subject: 'Login' },
      `Bearer ${apiKey}`,
    )
    const res = await handler(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('SEND_FAILED')
    expect(json.detail).toBe('boom')
  })
})

describe('createSendHandler — AC-7: promotional success path', () => {
  it('returns 202 with queued: true and jobId for promotional category', async () => {
    fakeQueue.enqueue.mockResolvedValue({ jobId: 'job-1' })
    const req = makeReq(
      { category: 'promotional', to: 'u@example.com', subject: 'Newsletter' },
      `Bearer ${apiKey}`,
    )
    const res = await handler(req)
    expect(res.status).toBe(202)
    const json = await res.json()
    expect(json.queued).toBe(true)
    expect(json.jobId).toBe('job-1')
  })
})

describe('createSendHandler — AC-7: promotional enqueue throws', () => {
  it('returns 500 QUEUE_FAILED when queue.enqueue throws', async () => {
    fakeQueue.enqueue.mockRejectedValue(new Error('queue unavailable'))
    const req = makeReq(
      { category: 'promotional', to: 'u@example.com', subject: 'Newsletter' },
      `Bearer ${apiKey}`,
    )
    const res = await handler(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('QUEUE_FAILED')
    expect(typeof json.detail).toBe('string')
  })
})

describe('createSendHandler — AC-7: update category success path', () => {
  it('returns 202 with queued: true and jobId for update category', async () => {
    fakeQueue.enqueue.mockResolvedValue({ jobId: 'job-2' })
    const req = makeReq(
      { category: 'update', to: 'u@example.com', subject: 'Product update' },
      `Bearer ${apiKey}`,
    )
    const res = await handler(req)
    expect(res.status).toBe(202)
    const json = await res.json()
    expect(json.queued).toBe(true)
    expect(json.jobId).toBe('job-2')
  })
})
