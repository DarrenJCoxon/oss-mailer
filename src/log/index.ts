export type SendLogRow = {
  id: string
  category: string
  to: string
  provider: string
  status: 'sent' | 'failed'
  messageId: string | null
  errorDetail: string | null
  sentAtIso: string
  durationMs: number
}

export type CategoryFilter = 'all' | 'magic_link' | 'promotional' | 'update'
export type StatusFilter = 'all' | 'sent' | 'failed'

export type LogFilters = {
  category: CategoryFilter
  status: StatusFilter
}

export const DEFAULT_LOG_LIMIT = 200

export const CATEGORY_FILTER_OPTIONS: ReadonlyArray<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'All categories' },
  { value: 'magic_link', label: 'magic_link' },
  { value: 'promotional', label: 'promotional' },
  { value: 'update', label: 'update' },
]

export const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'sent', label: 'sent' },
  { value: 'failed', label: 'failed' },
]

export const EMPTY_STATE_COPY = {
  title: 'No sends yet.',
  body: 'Use the Test Send page to fire your first email.',
  linkLabel: 'Go to Test Send',
  linkHref: '/test-send',
} as const

export const EMPTY_FILTERED_COPY = {
  body: 'No results match your filters. Clear filters to see all sends.',
} as const

export const DB_ERROR_COPY = {
  body: 'Could not load send log. Check your database connection.',
} as const

export type DbSendLogRow = {
  id: string
  category: string
  to: string
  provider: string
  success: boolean
  message_id: string | null
  error_detail: string | null
  sent_at: Date
  duration_ms: number
}

export function toSendLogRow(row: DbSendLogRow): SendLogRow {
  return {
    id: row.id,
    category: row.category,
    to: row.to,
    provider: row.provider,
    status: row.success ? 'sent' : 'failed',
    messageId: row.message_id,
    errorDetail: row.error_detail,
    sentAtIso: row.sent_at.toISOString(),
    durationMs: row.duration_ms,
  }
}

export function filterSendLogRows(
  rows: ReadonlyArray<SendLogRow>,
  filters: LogFilters,
): SendLogRow[] {
  return rows.filter((r) => {
    if (filters.category !== 'all' && r.category !== filters.category) return false
    if (filters.status !== 'all' && r.status !== filters.status) return false
    return true
  })
}
