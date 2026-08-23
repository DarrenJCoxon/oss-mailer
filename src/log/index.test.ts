/**
 * Covers src/log/index.ts
 *
 * Section 1 — DEFAULT_LOG_LIMIT constant
 * Section 2 — toSendLogRow (one test per mapping rule)
 * Section 3 — filterSendLogRows (happy path + filter combinations + edge cases)
 * Section 4 — CATEGORY_FILTER_OPTIONS / STATUS_FILTER_OPTIONS shape
 * Section 5 — Voice spot-check across EMPTY_STATE_COPY, EMPTY_FILTERED_COPY, DB_ERROR_COPY
 */
import { describe, it, expect } from 'vitest'

import {
  DEFAULT_LOG_LIMIT,
  toSendLogRow,
  filterSendLogRows,
  CATEGORY_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  EMPTY_STATE_COPY,
  EMPTY_FILTERED_COPY,
  DB_ERROR_COPY,
  type DbSendLogRow,
  type SendLogRow,
} from './index'

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<DbSendLogRow> = {}): DbSendLogRow {
  return {
    id: 'test-id',
    category: 'magic_link',
    to: 'user@example.com',
    provider: 'ses',
    success: true,
    message_id: 'msg-123',
    error_detail: null,
    sent_at: new Date('2026-01-01T12:00:00Z'),
    duration_ms: 250,
    ...overrides,
  }
}

function makeSendLogRow(overrides: Partial<SendLogRow> = {}): SendLogRow {
  return {
    id: 'test-id',
    category: 'magic_link',
    to: 'user@example.com',
    provider: 'ses',
    status: 'sent',
    messageId: 'msg-123',
    errorDetail: null,
    sentAtIso: '2026-01-01T12:00:00.000Z',
    durationMs: 250,
    ...overrides,
  }
}

// ─── Section 1: DEFAULT_LOG_LIMIT ─────────────────────────────────────────────

describe('DEFAULT_LOG_LIMIT', () => {
  it('equals exactly 200', () => {
    expect(DEFAULT_LOG_LIMIT).toBe(200)
  })
})

// ─── Section 2: toSendLogRow ──────────────────────────────────────────────────

describe('toSendLogRow', () => {
  it('maps success: true to status: "sent"', () => {
    const result = toSendLogRow(makeRow({ success: true }))
    expect(result.status).toBe('sent')
  })

  it('maps success: false to status: "failed"', () => {
    const result = toSendLogRow(makeRow({ success: false }))
    expect(result.status).toBe('failed')
  })

  it('preserves id', () => {
    const result = toSendLogRow(makeRow({ id: 'abc-456' }))
    expect(result.id).toBe('abc-456')
  })

  it('preserves to', () => {
    const result = toSendLogRow(makeRow({ to: 'other@example.com' }))
    expect(result.to).toBe('other@example.com')
  })

  it('preserves provider', () => {
    const result = toSendLogRow(makeRow({ provider: 'sendgrid' }))
    expect(result.provider).toBe('sendgrid')
  })

  it('preserves category', () => {
    const result = toSendLogRow(makeRow({ category: 'promotional' }))
    expect(result.category).toBe('promotional')
  })

  it('maps duration_ms to durationMs', () => {
    const result = toSendLogRow(makeRow({ duration_ms: 999 }))
    expect(result.durationMs).toBe(999)
  })

  it('renames message_id to messageId', () => {
    const result = toSendLogRow(makeRow({ message_id: 'renamed-id' }))
    expect(result.messageId).toBe('renamed-id')
  })

  it('renames error_detail to errorDetail', () => {
    const result = toSendLogRow(makeRow({ error_detail: 'some error' }))
    expect(result.errorDetail).toBe('some error')
  })

  it('calls toISOString() on sent_at for sentAtIso', () => {
    const date = new Date('2026-03-15T08:30:00Z')
    const result = toSendLogRow(makeRow({ sent_at: date }))
    expect(result.sentAtIso).toBe(date.toISOString())
  })

  it('preserves null for messageId when message_id is null', () => {
    const result = toSendLogRow(makeRow({ message_id: null }))
    expect(result.messageId).toBeNull()
  })

  it('preserves null for errorDetail when error_detail is null', () => {
    const result = toSendLogRow(makeRow({ error_detail: null }))
    expect(result.errorDetail).toBeNull()
  })
})

// ─── Section 3: filterSendLogRows ─────────────────────────────────────────────

describe('filterSendLogRows', () => {
  const sentMagicLink = makeSendLogRow({ id: '1', category: 'magic_link', status: 'sent' })
  const failedMagicLink = makeSendLogRow({ id: '2', category: 'magic_link', status: 'failed' })
  const sentPromotional = makeSendLogRow({ id: '3', category: 'promotional', status: 'sent' })
  const failedUpdate = makeSendLogRow({ id: '4', category: 'update', status: 'failed' })
  const allRows = [sentMagicLink, failedMagicLink, sentPromotional, failedUpdate]

  it('{ category: "all", status: "all" } returns all rows unchanged', () => {
    const result = filterSendLogRows(allRows, { category: 'all', status: 'all' })
    expect(result).toEqual(allRows)
  })

  it('category filter "magic_link" excludes rows with different category', () => {
    const result = filterSendLogRows(allRows, { category: 'magic_link', status: 'all' })
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.category === 'magic_link')).toBe(true)
  })

  it('status filter "failed" excludes "sent" rows', () => {
    const result = filterSendLogRows(allRows, { category: 'all', status: 'failed' })
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.status === 'failed')).toBe(true)
  })

  it('both filters combined: rows must match both category and status', () => {
    const result = filterSendLogRows(allRows, { category: 'magic_link', status: 'failed' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
    expect(result[0].category).toBe('magic_link')
    expect(result[0].status).toBe('failed')
  })

  it('empty input array returns []', () => {
    const result = filterSendLogRows([], { category: 'all', status: 'all' })
    expect(result).toEqual([])
  })

  it('preserves input order (does not sort)', () => {
    const rows = [failedUpdate, sentMagicLink, sentPromotional]
    const result = filterSendLogRows(rows, { category: 'all', status: 'all' })
    expect(result.map((r) => r.id)).toEqual(['4', '1', '3'])
  })
})

// ─── Section 4: Filter option arrays ──────────────────────────────────────────

describe('CATEGORY_FILTER_OPTIONS', () => {
  it('has exactly 5 entries', () => {
    expect(CATEGORY_FILTER_OPTIONS).toHaveLength(5)
  })

  it('first entry has value: "all"', () => {
    expect(CATEGORY_FILTER_OPTIONS[0].value).toBe('all')
  })

  it('includes an entry for "magic_link"', () => {
    expect(CATEGORY_FILTER_OPTIONS.some((o) => o.value === 'magic_link')).toBe(true)
  })

  it('includes an entry for "transactional"', () => {
    expect(CATEGORY_FILTER_OPTIONS.some((o) => o.value === 'transactional')).toBe(true)
  })

  it('includes an entry for "promotional"', () => {
    expect(CATEGORY_FILTER_OPTIONS.some((o) => o.value === 'promotional')).toBe(true)
  })

  it('includes an entry for "update"', () => {
    expect(CATEGORY_FILTER_OPTIONS.some((o) => o.value === 'update')).toBe(true)
  })
})

describe('STATUS_FILTER_OPTIONS', () => {
  it('has exactly 3 entries', () => {
    expect(STATUS_FILTER_OPTIONS).toHaveLength(3)
  })

  it('first entry has value: "all"', () => {
    expect(STATUS_FILTER_OPTIONS[0].value).toBe('all')
  })

  it('includes an entry for "sent"', () => {
    expect(STATUS_FILTER_OPTIONS.some((o) => o.value === 'sent')).toBe(true)
  })

  it('includes an entry for "failed"', () => {
    expect(STATUS_FILTER_OPTIONS.some((o) => o.value === 'failed')).toBe(true)
  })
})

// ─── Section 5: Voice spot-check ──────────────────────────────────────────────

describe('UI copy constants — voice spot-check: no forbidden words', () => {
  const forbiddenWords = ['oops', 'unfortunately', 'please', 'sorry', 'successfully', 'looks like']

  function collectStrings(obj: Record<string, string>): string[] {
    return Object.values(obj)
  }

  const allCopyStrings = [
    ...collectStrings(EMPTY_STATE_COPY as unknown as Record<string, string>),
    ...collectStrings(EMPTY_FILTERED_COPY as unknown as Record<string, string>),
    ...collectStrings(DB_ERROR_COPY as unknown as Record<string, string>),
  ]

  it('EMPTY_STATE_COPY contains no forbidden words (case-insensitive)', () => {
    const values = collectStrings(EMPTY_STATE_COPY as unknown as Record<string, string>)
    for (const value of values) {
      for (const word of forbiddenWords) {
        expect(value.toLowerCase()).not.toContain(word)
      }
    }
  })

  it('EMPTY_FILTERED_COPY contains no forbidden words (case-insensitive)', () => {
    const values = collectStrings(EMPTY_FILTERED_COPY as unknown as Record<string, string>)
    for (const value of values) {
      for (const word of forbiddenWords) {
        expect(value.toLowerCase()).not.toContain(word)
      }
    }
  })

  it('DB_ERROR_COPY contains no forbidden words (case-insensitive)', () => {
    const values = collectStrings(DB_ERROR_COPY as unknown as Record<string, string>)
    for (const value of values) {
      for (const word of forbiddenWords) {
        expect(value.toLowerCase()).not.toContain(word)
      }
    }
  })

  it('all copy strings combined contain no forbidden words (case-insensitive)', () => {
    for (const value of allCopyStrings) {
      for (const word of forbiddenWords) {
        expect(value.toLowerCase()).not.toContain(word)
      }
    }
  })
})
