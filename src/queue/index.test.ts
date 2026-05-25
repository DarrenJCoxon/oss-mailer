/**
 * Covers src/queue/index.ts
 *
 * AC-1:  enqueue() calls publisher.publishJSON with correct args and returns { jobId }
 * AC-2:  enqueue() wraps publisher errors as QueueError with code ENQUEUE_FAILED
 * AC-3:  isQueueError returns true for QueueError instances (instanceof path)
 * AC-4:  isQueueError returns true for duck-typed objects with _tag === 'QueueError'
 * AC-5:  isQueueError returns false for plain Error, null, undefined, non-matching objects
 * AC-6:  createDeliverHandler — mailSender returns success result → HTTP 200 + JSON
 * AC-7:  createDeliverHandler — mailSender returns failure result → HTTP 500 + JSON
 * AC-8:  createDeliverHandler — mailSender throws → HTTP 500 with SEND_THREW
 * AC-9:  createDeliverHandler — malformed JSON body → HTTP 400 with INVALID_JSON; send not called
 * AC-10: QueueError has correct name, _tag, code and message properties
 */
import { vi, describe, it, expect } from 'vitest'

import {
  createQueue,
  createDeliverHandler,
  QueueError,
  isQueueError,
} from './index'
import type { QStashPublisher, MailSenderForHandler } from './index'
import type { SendRequest } from '../sender'
import type { SendResult } from '../providers/interface'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const DELIVER_URL = 'https://example.com/api/queue/deliver'

const SEND_REQUEST: SendRequest = {
  category: 'magic_link',
  to: 'user@example.com',
  subject: 'Your magic link',
}

function makeSendRequest(override: Partial<SendRequest> = {}): SendRequest {
  return { ...SEND_REQUEST, ...override }
}

function makeSuccessResult(override: Partial<SendResult> = {}): SendResult {
  return {
    success: true,
    messageId: 'msg-1',
    provider: 'ses',
    sentAt: new Date().toISOString(),
    ...override,
  }
}

function makeRequest(body: unknown): Request {
  return new Request(DELIVER_URL, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function makeMalformedRequest(): Request {
  return new Request(DELIVER_URL, {
    method: 'POST',
    body: 'not-json',
    headers: { 'content-type': 'application/json' },
  })
}

// ─── AC-1: enqueue() happy path ───────────────────────────────────────────────

describe('createQueue().enqueue() — AC-1', () => {
  it('calls publisher.publishJSON with url and the send request as body', async () => {
    const publisher: QStashPublisher = {
      publishJSON: vi.fn().mockResolvedValue({ messageId: 'abc-123' }),
    }
    const queue = createQueue({ publisher, deliverUrl: DELIVER_URL })
    const req = makeSendRequest()

    await queue.enqueue(req)

    expect(publisher.publishJSON).toHaveBeenCalledWith({
      url: DELIVER_URL,
      body: req,
    })
  })

  it('returns { jobId } sourced from the publishJSON messageId', async () => {
    const publisher: QStashPublisher = {
      publishJSON: vi.fn().mockResolvedValue({ messageId: 'abc-123' }),
    }
    const queue = createQueue({ publisher, deliverUrl: DELIVER_URL })

    const result = await queue.enqueue(makeSendRequest())

    expect(result).toEqual({ jobId: 'abc-123' })
  })

  it('maps different messageId values correctly', async () => {
    const publisher: QStashPublisher = {
      publishJSON: vi.fn().mockResolvedValue({ messageId: 'xyz-999' }),
    }
    const queue = createQueue({ publisher, deliverUrl: DELIVER_URL })

    const result = await queue.enqueue(makeSendRequest())

    expect(result.jobId).toBe('xyz-999')
  })
})

// ─── AC-2: enqueue() wraps publisher errors as QueueError ────────────────────

describe('createQueue().enqueue() error handling — AC-2', () => {
  it('throws QueueError when publisher.publishJSON throws', async () => {
    const publisher: QStashPublisher = {
      publishJSON: vi.fn().mockRejectedValue(new Error('network failure')),
    }
    const queue = createQueue({ publisher, deliverUrl: DELIVER_URL })

    await expect(queue.enqueue(makeSendRequest())).rejects.toBeInstanceOf(QueueError)
  })

  it('thrown QueueError has code ENQUEUE_FAILED', async () => {
    const publisher: QStashPublisher = {
      publishJSON: vi.fn().mockRejectedValue(new Error('network failure')),
    }
    const queue = createQueue({ publisher, deliverUrl: DELIVER_URL })

    let caught: unknown
    try {
      await queue.enqueue(makeSendRequest())
    } catch (e) {
      caught = e
    }
    expect((caught as QueueError).code).toBe('ENQUEUE_FAILED')
  })

  it('QueueError wraps the original error as cause', async () => {
    const originalError = new Error('network failure')
    const publisher: QStashPublisher = {
      publishJSON: vi.fn().mockRejectedValue(originalError),
    }
    const queue = createQueue({ publisher, deliverUrl: DELIVER_URL })

    let caught: unknown
    try {
      await queue.enqueue(makeSendRequest())
    } catch (e) {
      caught = e
    }
    expect((caught as QueueError).cause).toBe(originalError)
  })

  it('does NOT rethrow the raw error — always wraps in QueueError', async () => {
    const originalError = new Error('raw error')
    const publisher: QStashPublisher = {
      publishJSON: vi.fn().mockRejectedValue(originalError),
    }
    const queue = createQueue({ publisher, deliverUrl: DELIVER_URL })

    let caught: unknown
    try {
      await queue.enqueue(makeSendRequest())
    } catch (e) {
      caught = e
    }
    expect(caught).not.toBe(originalError)
    expect(caught).toBeInstanceOf(QueueError)
  })
})

// ─── AC-3: isQueueError — instanceof path ────────────────────────────────────

describe('isQueueError instanceof path — AC-3', () => {
  it('returns true for a QueueError instance', () => {
    const err = new QueueError({ code: 'ENQUEUE_FAILED', message: 'test' })
    expect(isQueueError(err)).toBe(true)
  })

  it('returns true for a QueueError caught from enqueue()', async () => {
    const publisher: QStashPublisher = {
      publishJSON: vi.fn().mockRejectedValue(new Error('fail')),
    }
    const queue = createQueue({ publisher, deliverUrl: DELIVER_URL })

    let caught: unknown
    try {
      await queue.enqueue(makeSendRequest())
    } catch (e) {
      caught = e
    }
    expect(isQueueError(caught)).toBe(true)
  })
})

// ─── AC-4: isQueueError — duck-typed path ────────────────────────────────────

describe('isQueueError duck-typing path — AC-4', () => {
  it("returns true for a plain object with _tag === 'QueueError'", () => {
    expect(isQueueError({ _tag: 'QueueError' })).toBe(true)
  })
})

// ─── AC-5: isQueueError — negative cases ─────────────────────────────────────

describe('isQueueError negative cases — AC-5', () => {
  it('returns false for a plain Error', () => {
    expect(isQueueError(new Error('plain'))).toBe(false)
  })

  it('returns false for null', () => {
    expect(isQueueError(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isQueueError(undefined)).toBe(false)
  })

  it('returns false for a plain object with a different _tag', () => {
    expect(isQueueError({ _tag: 'RouterError' })).toBe(false)
  })

  it('returns false for a plain object without _tag', () => {
    expect(isQueueError({ code: 'ENQUEUE_FAILED' })).toBe(false)
  })
})

// ─── AC-6: createDeliverHandler — success path ───────────────────────────────

describe('createDeliverHandler success path — AC-6', () => {
  it('returns HTTP 200 when mailSender returns success', async () => {
    const fakeSuccess: MailSenderForHandler = {
      send: vi.fn().mockResolvedValue(makeSuccessResult()),
    }
    const handler = createDeliverHandler({ mailSender: fakeSuccess })

    const response = await handler(makeRequest(makeSendRequest()))

    expect(response.status).toBe(200)
  })

  it('returns JSON body { ok: true, messageId } on success', async () => {
    const fakeSuccess: MailSenderForHandler = {
      send: vi.fn().mockResolvedValue(makeSuccessResult({ messageId: 'msg-1' })),
    }
    const handler = createDeliverHandler({ mailSender: fakeSuccess })

    const response = await handler(makeRequest(makeSendRequest()))
    const body = await response.json()

    expect(body).toEqual({ ok: true, messageId: 'msg-1' })
  })

  it('calls mailSender.send with the parsed request body', async () => {
    const fakeSuccess: MailSenderForHandler = {
      send: vi.fn().mockResolvedValue(makeSuccessResult()),
    }
    const handler = createDeliverHandler({ mailSender: fakeSuccess })
    const req = makeSendRequest()

    await handler(makeRequest(req))

    expect(fakeSuccess.send).toHaveBeenCalledWith(req)
  })
})

// ─── AC-7: createDeliverHandler — failure result ─────────────────────────────

describe('createDeliverHandler failure result — AC-7', () => {
  it('returns HTTP 500 when mailSender returns success: false', async () => {
    const failResult: SendResult = {
      success: false,
      error: 'bad creds',
      provider: 'ses',
      sentAt: new Date().toISOString(),
    }
    const fakeFails: MailSenderForHandler = {
      send: vi.fn().mockResolvedValue(failResult),
    }
    const handler = createDeliverHandler({ mailSender: fakeFails })

    const response = await handler(makeRequest(makeSendRequest()))

    expect(response.status).toBe(500)
  })

  it('returns JSON body { ok: false, error } when mailSender returns failure', async () => {
    const failResult: SendResult = {
      success: false,
      error: 'bad creds',
      provider: 'ses',
      sentAt: new Date().toISOString(),
    }
    const fakeFails: MailSenderForHandler = {
      send: vi.fn().mockResolvedValue(failResult),
    }
    const handler = createDeliverHandler({ mailSender: fakeFails })

    const response = await handler(makeRequest(makeSendRequest()))
    const body = await response.json()

    expect(body).toEqual({ ok: false, error: 'bad creds' })
  })
})

// ─── AC-8: createDeliverHandler — mailSender throws ──────────────────────────

describe('createDeliverHandler — mailSender throws — AC-8', () => {
  it('returns HTTP 500 when mailSender.send throws', async () => {
    const fakeThrows: MailSenderForHandler = {
      send: vi.fn().mockRejectedValue(new Error('oops')),
    }
    const handler = createDeliverHandler({ mailSender: fakeThrows })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await handler(makeRequest(makeSendRequest()))
    consoleSpy.mockRestore()

    expect(response.status).toBe(500)
  })

  it('returns JSON body { ok: false, error: SEND_THREW } when mailSender.send throws', async () => {
    const fakeThrows: MailSenderForHandler = {
      send: vi.fn().mockRejectedValue(new Error('oops')),
    }
    const handler = createDeliverHandler({ mailSender: fakeThrows })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await handler(makeRequest(makeSendRequest()))
    consoleSpy.mockRestore()

    const body = await response.json()
    expect(body).toEqual({ ok: false, error: 'SEND_THREW' })
  })
})

// ─── AC-9: createDeliverHandler — malformed JSON ─────────────────────────────

describe('createDeliverHandler — malformed JSON body — AC-9', () => {
  it('returns HTTP 400 when the request body is not valid JSON', async () => {
    const fakeSend: MailSenderForHandler = {
      send: vi.fn(),
    }
    const handler = createDeliverHandler({ mailSender: fakeSend })

    const response = await handler(makeMalformedRequest())

    expect(response.status).toBe(400)
  })

  it('returns JSON body { ok: false, error: INVALID_JSON } for malformed body', async () => {
    const fakeSend: MailSenderForHandler = {
      send: vi.fn(),
    }
    const handler = createDeliverHandler({ mailSender: fakeSend })

    const response = await handler(makeMalformedRequest())
    const body = await response.json()

    expect(body).toEqual({ ok: false, error: 'INVALID_JSON' })
  })

  it('does NOT call mailSender.send when the body is malformed JSON', async () => {
    const fakeSend: MailSenderForHandler = {
      send: vi.fn(),
    }
    const handler = createDeliverHandler({ mailSender: fakeSend })

    await handler(makeMalformedRequest())

    expect(fakeSend.send).not.toHaveBeenCalled()
  })
})

// ─── AC-10: QueueError class properties ──────────────────────────────────────

describe('QueueError class properties — AC-10', () => {
  it("has name === 'QueueError'", () => {
    const err = new QueueError({ code: 'ENQUEUE_FAILED', message: 'test message' })
    expect(err.name).toBe('QueueError')
  })

  it("has _tag === 'QueueError'", () => {
    const err = new QueueError({ code: 'ENQUEUE_FAILED', message: 'test message' })
    expect(err._tag).toBe('QueueError')
  })

  it("has code === 'ENQUEUE_FAILED'", () => {
    const err = new QueueError({ code: 'ENQUEUE_FAILED', message: 'test message' })
    expect(err.code).toBe('ENQUEUE_FAILED')
  })

  it('has the message passed to the constructor', () => {
    const err = new QueueError({ code: 'ENQUEUE_FAILED', message: 'enqueue failed for user@example.com' })
    expect(err.message).toBe('enqueue failed for user@example.com')
  })

  it('is an instance of Error', () => {
    const err = new QueueError({ code: 'ENQUEUE_FAILED', message: 'test' })
    expect(err).toBeInstanceOf(Error)
  })

  it('stores the optional cause', () => {
    const cause = new Error('original')
    const err = new QueueError({ code: 'ENQUEUE_FAILED', message: 'test', cause })
    expect(err.cause).toBe(cause)
  })
})
