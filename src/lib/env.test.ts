import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateEnv } from './env'

const ALL_VARS = [
  'MAILER_API_KEY',
  'MAILER_FROM',
  'SES_ACCESS_KEY_ID',
  'SES_SECRET_ACCESS_KEY',
  'SES_REGION',
  'MAGIC_LINK_PROVIDER',
  'PROMOTIONAL_PROVIDER',
  'UPDATE_PROVIDER',
  'DATABASE_URL',
  'QSTASH_TOKEN',
  'QSTASH_CURRENT_SIGNING_KEY',
  'QSTASH_NEXT_SIGNING_KEY',
  'DELIVER_URL',
] as const

let saved: Partial<Record<string, string>> = {}

beforeEach(() => {
  saved = {}
  for (const key of ALL_VARS) {
    saved[key] = process.env[key]
    process.env[key] = 'dummy'
  }
})

afterEach(() => {
  for (const key of ALL_VARS) {
    if (saved[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = saved[key]
    }
  }
})

describe('validateEnv', () => {
  it('does not throw when all required vars are set', () => {
    expect(() => validateEnv()).not.toThrow()
  })

  it('throws naming the missing var when one is removed', () => {
    delete process.env['MAILER_API_KEY']
    expect(() => validateEnv()).toThrow('MAILER_API_KEY')
  })

  it('throws naming all missing vars when multiple are removed', () => {
    delete process.env['QSTASH_TOKEN']
    delete process.env['DATABASE_URL']
    expect(() => validateEnv()).toThrow('QSTASH_TOKEN')
  })
})
