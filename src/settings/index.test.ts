import { describe, it, expect } from 'vitest'
import { buildSettingsReport } from './index'
import { REQUIRED_ENV_VARS } from '@/lib/env'

function makeEnv(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    AUTH_SECRET: 'auth-secret',
    AUTH_GOOGLE_ID: 'google-client-id',
    AUTH_GOOGLE_SECRET: 'google-client-secret',
    AUTH_ALLOWED_EMAILS: 'owner@example.com',
    MAGIC_LINK_PROVIDER: 'ses',
    PROMOTIONAL_PROVIDER: 'ses',
    UPDATE_PROVIDER: 'ses',
    MAILER_FROM: 'noreply@example.com',
    SES_ACCESS_KEY_ID: 'AKIA...',
    SES_SECRET_ACCESS_KEY: 'secret',
    SES_REGION: 'us-east-1',
    DATABASE_URL: 'postgres://localhost/mailer',
    MAILER_API_KEY: 'test-key',
    QSTASH_TOKEN: 'qstash-token',
    QSTASH_CURRENT_SIGNING_KEY: 'sig1',
    QSTASH_NEXT_SIGNING_KEY: 'sig2',
    DELIVER_URL: 'https://mailer.example.com/api/queue/deliver',
    ...overrides,
  }
}

describe('buildSettingsReport', () => {
  it('marks vars as set when present in env', () => {
    const report = buildSettingsReport(makeEnv({ MAILER_API_KEY: 'some-key' }))
    const entry = report.vars.find((v) => v.key === 'MAILER_API_KEY')!
    expect(entry.set).toBe(true)
  })

  it('marks vars as not set when absent', () => {
    const report = buildSettingsReport(makeEnv({ MAILER_API_KEY: undefined }))
    const entry = report.vars.find((v) => v.key === 'MAILER_API_KEY')!
    expect(entry.set).toBe(false)
  })

  it('marks vars as not set when empty string', () => {
    const report = buildSettingsReport(makeEnv({ MAILER_API_KEY: '' }))
    const entry = report.vars.find((v) => v.key === 'MAILER_API_KEY')!
    expect(entry.set).toBe(false)
  })

  it('returns correct totalCount (required vars only)', () => {
    const report = buildSettingsReport(makeEnv())
    // 17 required vars (SES_SANDBOX_MODE is required: false)
    expect(report.totalCount).toBe(17)
  })

  it('returns correct setCount', () => {
    const report = buildSettingsReport(makeEnv())
    expect(report.setCount).toBe(17)
  })

  it('returns correct missingCount', () => {
    const report = buildSettingsReport(makeEnv({ MAILER_API_KEY: undefined, QSTASH_TOKEN: undefined }))
    expect(report.missingCount).toBe(2)
  })

  it('includes SES_SANDBOX_MODE as required=false', () => {
    const report = buildSettingsReport(makeEnv())
    const entry = report.vars.find((v) => v.key === 'SES_SANDBOX_MODE')!
    expect(entry).toBeDefined()
    expect(entry.required).toBe(false)
  })

  it('all required vars are required=true', () => {
    const report = buildSettingsReport(makeEnv())
    const requiredVars = report.vars.filter((v) => v.required)
    expect(requiredVars.length).toBeGreaterThan(0)
    for (const v of requiredVars) {
      expect(v.required).toBe(true)
    }
  })

  // AC-2: All required vars appear grouped into the three logical sections
  it('contains vars in all three groups: provider, security, and queue', () => {
    const report = buildSettingsReport(makeEnv())
    const groups = new Set(report.vars.map((v) => v.group))
    expect(groups.has('provider')).toBe(true)
    expect(groups.has('security')).toBe(true)
    expect(groups.has('queue')).toBe(true)
  })

  it('has required vars spread across provider, security, and queue', () => {
    const report = buildSettingsReport(makeEnv())
    const requiredVars = report.vars.filter((v) => v.required)
    expect(requiredVars.length).toBe(17)
    const providerRequired = requiredVars.filter((v) => v.group === 'provider')
    const securityRequired = requiredVars.filter((v) => v.group === 'security')
    const queueRequired = requiredVars.filter((v) => v.group === 'queue')
    expect(providerRequired.length).toBeGreaterThan(0)
    expect(securityRequired.length).toBeGreaterThan(0)
    expect(queueRequired.length).toBeGreaterThan(0)
  })

  // Drift guard: every key in REQUIRED_ENV_VARS must appear in the settings report
  it('includes every REQUIRED_ENV_VARS key in the report', () => {
    const report = buildSettingsReport(makeEnv())
    const reportKeys = new Set(report.vars.map((v) => v.key))
    for (const key of REQUIRED_ENV_VARS) {
      expect(reportKeys.has(key), `${key} missing from settings report`).toBe(true)
    }
  })

  // AC-4: Var values are never exposed — only the boolean set/missing status
  it('does not include the raw env value in any report var', () => {
    const report = buildSettingsReport(makeEnv({ MAILER_API_KEY: 'super-secret-value' }))
    for (const v of report.vars) {
      const serialised = JSON.stringify(v)
      expect(serialised).not.toContain('super-secret-value')
    }
  })
})
