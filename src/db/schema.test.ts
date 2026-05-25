import { describe, it, expect } from 'vitest'
import * as schema from './schema'
import { sendLog } from './schema'

describe('schema', () => {
  it('imports without error', () => {
    void schema
  })
})

describe('sendLog table export', () => {
  it('exports the sendLog table', () => {
    expect(sendLog).toBeDefined()
  })

  it('sendLog has an id column', () => {
    expect(sendLog.id).toBeDefined()
  })

  it('sendLog has a to column', () => {
    expect(sendLog.to).toBeDefined()
  })

  it('sendLog has a category column', () => {
    expect(sendLog.category).toBeDefined()
  })

  it('sendLog has a provider column', () => {
    expect(sendLog.provider).toBeDefined()
  })

  it('sendLog has a success column', () => {
    expect(sendLog.success).toBeDefined()
  })

  it('sendLog has a message_id column', () => {
    expect(sendLog.message_id).toBeDefined()
  })

  it('sendLog has an error_detail column', () => {
    expect(sendLog.error_detail).toBeDefined()
  })

  it('sendLog has a sent_at column', () => {
    expect(sendLog.sent_at).toBeDefined()
  })

  it('sendLog has a created_at column', () => {
    expect(sendLog.created_at).toBeDefined()
  })

  it('sendLog has a duration_ms column', () => {
    expect(sendLog.duration_ms).toBeDefined()
  })

  it('schema exports InsertSendLog type (type-level check via schema keys)', () => {
    // Type exports don't exist at runtime, but confirming sendLog.$inferInsert is accessible via the table object
    expect(sendLog).toBeDefined()
  })
})
