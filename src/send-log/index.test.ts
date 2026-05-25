/**
 * Covers src/send-log/index.ts
 *
 * AC-1: writeSendAttempt(args) inserts a row and returns { id: string } (a UUID)
 * AC-2: writeSendAttempt maps args.messageId → message_id and args.error → error_detail
 * AC-3: writeSendAttempt throws SendLogError({ code: 'DB_WRITE_FAILED' }) on Drizzle error
 * AC-4: getRecentSends({ limit: 50 }) returns at most 50 rows ordered by sent_at desc
 * AC-5: getRecentSends({ limit: 10, category: 'magic_link' }) filters by category
 * AC-6: getRecentSends({ limit: 10, status: 'failure' }) filters by success = false
 * AC-7: getRecentSends({ limit: 10, status: 'success' }) filters by success = true
 * AC-8: getRecentSends throws SendLogError({ code: 'DB_READ_FAILED' }) on Drizzle error
 * AC-9: isSendLogError returns true for SendLogError instances and duck-typed objects with _tag === 'SendLogError'
 * AC-10: isSendLogError returns false for non-SendLogError errors
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// vi.hoisted ensures these are available when the vi.mock factory runs (factories are hoisted)
const {
  mockReturning,
  mockValues,
  mockInsert,
  mockLimit,
  mockOrderBy,
  mockWhere,
  mockFrom,
  mockSelect,
} = vi.hoisted(() => ({
  mockReturning: vi.fn(),
  mockValues: vi.fn(),
  mockInsert: vi.fn(),
  mockLimit: vi.fn(),
  mockOrderBy: vi.fn(),
  mockWhere: vi.fn(),
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
}))

vi.mock('@neondatabase/serverless', () => ({ neon: vi.fn(() => vi.fn()) }))
vi.mock('drizzle-orm/neon-http', () => ({ drizzle: vi.fn(() => ({})) }))

vi.mock('../db', () => ({
  db: {
    insert: mockInsert,
    select: mockSelect,
  },
}))

import {
  writeSendAttempt,
  getRecentSends,
  SendLogError,
  isSendLogError,
  createLogWriter,
} from './index'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeWriteArgs(
  overrides: Partial<Parameters<typeof writeSendAttempt>[0]> = {},
): Parameters<typeof writeSendAttempt>[0] {
  return {
    category: 'magic_link',
    to: 'user@example.com',
    provider: 'ses',
    success: true,
    messageId: 'msg-abc-123',
    error: undefined,
    durationMs: 42,
    ...overrides,
  }
}

function setupInsertChain(resolvedValue: Array<{ id: string }>) {
  mockReturning.mockResolvedValue(resolvedValue)
  mockValues.mockReturnValue({ returning: mockReturning })
  mockInsert.mockReturnValue({ values: mockValues })
}

function setupSelectChain(resolvedValue: unknown[]) {
  mockLimit.mockResolvedValue(resolvedValue)
  mockOrderBy.mockReturnValue({ limit: mockLimit })
  mockWhere.mockReturnValue({ orderBy: mockOrderBy })
  mockFrom.mockReturnValue({ where: mockWhere })
  mockSelect.mockReturnValue({ from: mockFrom })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── AC-1: writeSendAttempt returns { id: string } ───────────────────────────

describe('writeSendAttempt — AC-1: inserts a row and returns { id: string }', () => {
  it('returns an object with an id property', async () => {
    setupInsertChain([{ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }])
    const result = await writeSendAttempt(makeWriteArgs())
    expect(result).toHaveProperty('id')
  })

  it('returns the id string from the inserted row', async () => {
    const uuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    setupInsertChain([{ id: uuid }])
    const result = await writeSendAttempt(makeWriteArgs())
    expect(result.id).toBe(uuid)
  })

  it('calls db.insert once per invocation', async () => {
    setupInsertChain([{ id: 'test-id' }])
    await writeSendAttempt(makeWriteArgs())
    expect(mockInsert).toHaveBeenCalledOnce()
  })

  it('calls .values() with the correct base fields', async () => {
    setupInsertChain([{ id: 'test-id' }])
    await writeSendAttempt(
      makeWriteArgs({ category: 'magic_link', to: 'user@example.com', provider: 'ses', success: true }),
    )
    const insertedRow = mockValues.mock.calls[0][0]
    expect(insertedRow.category).toBe('magic_link')
    expect(insertedRow.to).toBe('user@example.com')
    expect(insertedRow.provider).toBe('ses')
    expect(insertedRow.success).toBe(true)
  })
})

// ─── AC-2: args.messageId → message_id, args.error → error_detail ────────────

describe('writeSendAttempt — AC-2: field mapping', () => {
  it('maps args.messageId to message_id in the inserted row', async () => {
    setupInsertChain([{ id: 'test-id' }])
    await writeSendAttempt(makeWriteArgs({ messageId: 'provider-msg-999' }))
    const insertedRow = mockValues.mock.calls[0][0]
    expect(insertedRow.message_id).toBe('provider-msg-999')
  })

  it('maps args.error to error_detail in the inserted row', async () => {
    setupInsertChain([{ id: 'test-id' }])
    await writeSendAttempt(makeWriteArgs({ error: 'Something went wrong', success: false }))
    const insertedRow = mockValues.mock.calls[0][0]
    expect(insertedRow.error_detail).toBe('Something went wrong')
  })

  it('sets message_id to null when args.messageId is undefined', async () => {
    setupInsertChain([{ id: 'test-id' }])
    await writeSendAttempt(makeWriteArgs({ messageId: undefined }))
    const insertedRow = mockValues.mock.calls[0][0]
    expect(insertedRow.message_id).toBeNull()
  })

  it('sets error_detail to null when args.error is undefined', async () => {
    setupInsertChain([{ id: 'test-id' }])
    await writeSendAttempt(makeWriteArgs({ error: undefined }))
    const insertedRow = mockValues.mock.calls[0][0]
    expect(insertedRow.error_detail).toBeNull()
  })

  it('maps args.durationMs to duration_ms in the inserted row', async () => {
    setupInsertChain([{ id: 'test-id' }])
    await writeSendAttempt(makeWriteArgs({ durationMs: 123 }))
    const insertedRow = mockValues.mock.calls[0][0]
    expect(insertedRow.duration_ms).toBe(123)
  })
})

// ─── AC-3: DB error → SendLogError({ code: 'DB_WRITE_FAILED' }) ──────────────

describe('writeSendAttempt — AC-3: throws SendLogError on Drizzle error', () => {
  it('throws a SendLogError when the Drizzle insert rejects', async () => {
    mockReturning.mockRejectedValue(new Error('connection refused'))
    mockValues.mockReturnValue({ returning: mockReturning })
    mockInsert.mockReturnValue({ values: mockValues })

    await expect(writeSendAttempt(makeWriteArgs())).rejects.toBeInstanceOf(SendLogError)
  })

  it('throws SendLogError with code DB_WRITE_FAILED on Drizzle error', async () => {
    mockReturning.mockRejectedValue(new Error('connection refused'))
    mockValues.mockReturnValue({ returning: mockReturning })
    mockInsert.mockReturnValue({ values: mockValues })

    let caught: unknown
    try {
      await writeSendAttempt(makeWriteArgs())
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(SendLogError)
    expect((caught as SendLogError).code).toBe('DB_WRITE_FAILED')
  })

  it('does not expose the raw Drizzle error directly (wraps it as cause)', async () => {
    const rawError = new Error('neon: socket hang up')
    mockReturning.mockRejectedValue(rawError)
    mockValues.mockReturnValue({ returning: mockReturning })
    mockInsert.mockReturnValue({ values: mockValues })

    let caught: unknown
    try {
      await writeSendAttempt(makeWriteArgs())
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(SendLogError)
    expect((caught as SendLogError).cause).toBe(rawError)
  })
})

// ─── AC-4: getRecentSends({ limit: 50 }) returns at most 50 rows, desc order ──

describe('getRecentSends — AC-4: limit and ordering', () => {
  it('calls .limit() with the supplied limit value', async () => {
    setupSelectChain([])
    await getRecentSends({ limit: 50 })
    expect(mockLimit).toHaveBeenCalledWith(50)
  })

  it('returns the rows resolved by the DB query', async () => {
    const fakeRows = [
      {
        id: 'row-1',
        category: 'magic_link',
        to: 'a@b.com',
        provider: 'ses',
        success: true,
        message_id: null,
        error_detail: null,
        sent_at: new Date(),
        created_at: new Date(),
        duration_ms: 10,
      },
      {
        id: 'row-2',
        category: 'promotional',
        to: 'c@d.com',
        provider: 'ses',
        success: false,
        message_id: null,
        error_detail: 'err',
        sent_at: new Date(),
        created_at: new Date(),
        duration_ms: 20,
      },
    ]
    setupSelectChain(fakeRows)
    const result = await getRecentSends({ limit: 50 })
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 'row-1' })
    expect(result[1]).toMatchObject({ id: 'row-2' })
  })

  it('calls .orderBy() (ordering applied before limit)', async () => {
    setupSelectChain([])
    await getRecentSends({ limit: 50 })
    expect(mockOrderBy).toHaveBeenCalledOnce()
  })
})

// ─── AC-5: getRecentSends filters by category ────────────────────────────────

describe('getRecentSends — AC-5: filters by category', () => {
  it('passes a WHERE condition to .where() when category is provided', async () => {
    setupSelectChain([])
    await getRecentSends({ limit: 10, category: 'magic_link' })
    const whereArg = mockWhere.mock.calls[0][0]
    expect(whereArg).toBeDefined()
    expect(whereArg).not.toBeUndefined()
  })

  it('returns rows from the chain when filtering by category', async () => {
    const fakeRows = [{ id: 'row-1', category: 'magic_link' }]
    setupSelectChain(fakeRows)
    const result = await getRecentSends({ limit: 10, category: 'magic_link' })
    expect(result).toHaveLength(1)
  })

  it('passes undefined to .where() when no filters are given', async () => {
    setupSelectChain([])
    await getRecentSends({ limit: 10 })
    const whereArg = mockWhere.mock.calls[0][0]
    expect(whereArg).toBeUndefined()
  })
})

// ─── AC-6: getRecentSends({ status: 'failure' }) filters by success = false ──

describe("getRecentSends — AC-6: filters by status 'failure'", () => {
  it('passes a WHERE condition when status is failure', async () => {
    setupSelectChain([])
    await getRecentSends({ limit: 10, status: 'failure' })
    const whereArg = mockWhere.mock.calls[0][0]
    expect(whereArg).toBeDefined()
    expect(whereArg).not.toBeUndefined()
  })

  it('returns the rows from the chain when filtering by failure status', async () => {
    const fakeRows = [{ id: 'row-1', success: false }]
    setupSelectChain(fakeRows)
    const result = await getRecentSends({ limit: 10, status: 'failure' })
    expect(result).toHaveLength(1)
  })
})

// ─── AC-7: getRecentSends({ status: 'success' }) filters by success = true ───

describe("getRecentSends — AC-7: filters by status 'success'", () => {
  it('passes a WHERE condition when status is success', async () => {
    setupSelectChain([])
    await getRecentSends({ limit: 10, status: 'success' })
    const whereArg = mockWhere.mock.calls[0][0]
    expect(whereArg).toBeDefined()
    expect(whereArg).not.toBeUndefined()
  })

  it('returns the rows from the chain when filtering by success status', async () => {
    const fakeRows = [{ id: 'row-2', success: true }]
    setupSelectChain(fakeRows)
    const result = await getRecentSends({ limit: 10, status: 'success' })
    expect(result).toHaveLength(1)
  })
})

// ─── AC-8: getRecentSends throws SendLogError({ code: 'DB_READ_FAILED' }) ────

describe('getRecentSends — AC-8: throws SendLogError on Drizzle error', () => {
  it('throws a SendLogError when the DB query rejects', async () => {
    mockLimit.mockRejectedValue(new Error('read timeout'))
    mockOrderBy.mockReturnValue({ limit: mockLimit })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockSelect.mockReturnValue({ from: mockFrom })

    await expect(getRecentSends({ limit: 10 })).rejects.toBeInstanceOf(SendLogError)
  })

  it('throws SendLogError with code DB_READ_FAILED on Drizzle error', async () => {
    mockLimit.mockRejectedValue(new Error('read timeout'))
    mockOrderBy.mockReturnValue({ limit: mockLimit })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockSelect.mockReturnValue({ from: mockFrom })

    let caught: unknown
    try {
      await getRecentSends({ limit: 10 })
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(SendLogError)
    expect((caught as SendLogError).code).toBe('DB_READ_FAILED')
  })

  it('wraps the raw DB error as cause on read failure', async () => {
    const rawError = new Error('neon: ECONNRESET')
    mockLimit.mockRejectedValue(rawError)
    mockOrderBy.mockReturnValue({ limit: mockLimit })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockSelect.mockReturnValue({ from: mockFrom })

    let caught: unknown
    try {
      await getRecentSends({ limit: 10 })
    } catch (e) {
      caught = e
    }
    expect((caught as SendLogError).cause).toBe(rawError)
  })
})

// ─── AC-9: isSendLogError — true for instances and duck-typed objects ─────────

describe('isSendLogError — AC-9: true for SendLogError and duck-typed objects', () => {
  it('returns true for a SendLogError instance', () => {
    const err = new SendLogError({ code: 'DB_WRITE_FAILED' })
    expect(isSendLogError(err)).toBe(true)
  })

  it('returns true for SendLogError with DB_READ_FAILED code', () => {
    const err = new SendLogError({ code: 'DB_READ_FAILED' })
    expect(isSendLogError(err)).toBe(true)
  })

  it('returns true for a plain object with _tag === "SendLogError" (duck-typing)', () => {
    const fake = { _tag: 'SendLogError' }
    expect(isSendLogError(fake)).toBe(true)
  })

  it('SendLogError instance has name "SendLogError"', () => {
    const err = new SendLogError({ code: 'DB_WRITE_FAILED' })
    expect(err.name).toBe('SendLogError')
  })

  it('SendLogError instance is an instance of Error', () => {
    const err = new SendLogError({ code: 'DB_WRITE_FAILED' })
    expect(err).toBeInstanceOf(Error)
  })

  it('SendLogError exposes _tag === "SendLogError"', () => {
    const err = new SendLogError({ code: 'DB_WRITE_FAILED' })
    expect(err._tag).toBe('SendLogError')
  })

  it('SendLogError uses code as the message when no message is provided', () => {
    const err = new SendLogError({ code: 'DB_WRITE_FAILED' })
    expect(err.message).toBe('DB_WRITE_FAILED')
  })

  it('SendLogError uses the provided message when supplied', () => {
    const err = new SendLogError({ code: 'DB_WRITE_FAILED', message: 'custom message' })
    expect(err.message).toBe('custom message')
  })

  it('SendLogError stores optional cause', () => {
    const cause = new Error('raw db error')
    const err = new SendLogError({ code: 'DB_WRITE_FAILED', cause })
    expect(err.cause).toBe(cause)
  })
})

// ─── AC-10: isSendLogError — false for non-SendLogError values ───────────────

describe('isSendLogError — AC-10: false for non-SendLogError errors', () => {
  it('returns false for a plain Error', () => {
    expect(isSendLogError(new Error('plain'))).toBe(false)
  })

  it('returns false for a string', () => {
    expect(isSendLogError('not an error')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isSendLogError(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isSendLogError(undefined)).toBe(false)
  })

  it('returns false for a plain object with a different _tag', () => {
    expect(isSendLogError({ _tag: 'ProviderError' })).toBe(false)
  })

  it('returns false for a plain object without _tag', () => {
    expect(isSendLogError({ code: 'DB_WRITE_FAILED' })).toBe(false)
  })

  it('returns false for a number', () => {
    expect(isSendLogError(42)).toBe(false)
  })
})

// ─── createLogWriter — Gate B coverage ───────────────────────────────────────

describe('createLogWriter — new export', () => {
  it('returns an object with a writeSendAttempt method', () => {
    const writer = createLogWriter()
    expect(typeof writer.writeSendAttempt).toBe('function')
  })

  it('writeSendAttempt returns a Promise', () => {
    setupInsertChain([{ id: 'test-id' }])
    const writer = createLogWriter()
    const result = writer.writeSendAttempt({
      category: 'magic_link',
      to: 'user@example.com',
      provider: 'ses',
      success: true,
      durationMs: 10,
    })
    expect(result).toBeInstanceOf(Promise)
  })

  it('writeSendAttempt resolves without a value (Promise<void>)', async () => {
    setupInsertChain([{ id: 'test-id' }])
    const writer = createLogWriter()
    const result = await writer.writeSendAttempt({
      category: 'magic_link',
      to: 'user@example.com',
      provider: 'ses',
      success: true,
      durationMs: 10,
    })
    expect(result).toBeUndefined()
  })

  it('writeSendAttempt calls db.insert (passes args through to writeSendAttempt)', async () => {
    setupInsertChain([{ id: 'test-id' }])
    const writer = createLogWriter()
    await writer.writeSendAttempt({
      category: 'promotional',
      to: 'other@example.com',
      provider: 'ses',
      success: false,
      error: 'timeout',
      durationMs: 500,
    })
    expect(mockInsert).toHaveBeenCalledOnce()
    const insertedRow = mockValues.mock.calls[0][0]
    expect(insertedRow.category).toBe('promotional')
    expect(insertedRow.to).toBe('other@example.com')
    expect(insertedRow.success).toBe(false)
  })
})
