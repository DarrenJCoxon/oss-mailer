/**
 * Covers src/health/index.ts
 *
 * Section 1 — buildHealthReport
 *   AC-1: Report shape — envVars order/length, routing rows, sandboxMode type
 *   AC-2: Presence semantics — empty/whitespace/undefined → false; non-empty → true
 *   AC-3: Routing null — unset provider → null; set to 'ses' → 'ses'
 *   AC-4: Sandbox boolean — exact 'true' → true; all else → false
 *
 * Section 2 — createHealthHandler
 *   AC-5: Missing Authorization header → 401, body 'Unauthorized', no env key names
 *   AC-6: Wrong bearer token → 401, body does not contain env values
 *   AC-7: Wrong scheme (Basic) → 401
 *   AC-8: Correct bearer → 200, content-type includes text/html
 *   AC-9: 200 body contains each REQUIRED_ENV_VARS key name
 *   AC-10: 200 body does not contain env values
 *   AC-11: SES_SANDBOX_MODE='true' → body contains 'SES is in sandbox mode'
 *   AC-12: No sandbox → body does NOT contain 'SES is in sandbox mode'
 *   AC-13: XSS escaping — <script> in provider env var → escaped in HTML
 *   AC-14: Voice — body contains none of 'Oops', 'Unfortunately', 'Please'
 *   AC-15: Empty apiKey → all requests return 401
 */
import { describe, it, expect } from 'vitest'

import {
  buildHealthReport,
  createHealthHandler,
} from '@/health'
import { REQUIRED_ENV_VARS } from '@/lib/env'

// ─── Test fixture helper ──────────────────────────────────────────────────────

function makeEnv(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    MAILER_API_KEY: 'test-key',
    MAILER_FROM: 'sender@example.com',
    SES_ACCESS_KEY_ID: 'AKIA...',
    SES_SECRET_ACCESS_KEY: 'secret',
    SES_REGION: 'eu-west-1',
    MAGIC_LINK_PROVIDER: 'ses',
    PROMOTIONAL_PROVIDER: 'ses',
    UPDATE_PROVIDER: 'ses',
    DATABASE_URL: 'postgres://...',
    QSTASH_TOKEN: 'qstash-token',
    QSTASH_CURRENT_SIGNING_KEY: 'sig1',
    QSTASH_NEXT_SIGNING_KEY: 'sig2',
    DELIVER_URL: 'http://localhost:3000/api/queue/deliver',
    ...overrides,
  }
}

function makeRequest(authHeader?: string): Request {
  return new Request('https://example.com/health', {
    method: 'GET',
    headers: authHeader !== undefined ? { authorization: authHeader } : {},
  })
}

// ─── Section 1: buildHealthReport ────────────────────────────────────────────

describe('buildHealthReport — AC-1: report shape', () => {
  it('envVars length matches REQUIRED_ENV_VARS length', () => {
    const report = buildHealthReport(makeEnv())
    expect(report.envVars).toHaveLength(REQUIRED_ENV_VARS.length)
  })

  it('envVars keys are in the same order as REQUIRED_ENV_VARS', () => {
    const report = buildHealthReport(makeEnv())
    const reportKeys = report.envVars.map((v) => v.key)
    expect(reportKeys).toEqual(Array.from(REQUIRED_ENV_VARS))
  })

  it('routing has exactly 4 rows', () => {
    const report = buildHealthReport(makeEnv())
    expect(report.routing).toHaveLength(4)
  })

  it('routing rows are in order: magic_link, transactional, promotional, update', () => {
    const report = buildHealthReport(makeEnv())
    expect(report.routing[0].category).toBe('magic_link')
    expect(report.routing[1].category).toBe('transactional')
    expect(report.routing[2].category).toBe('promotional')
    expect(report.routing[3].category).toBe('update')
  })

  it('shows the magic-link provider as the transactional fallback', () => {
    const report = buildHealthReport(makeEnv({ TRANSACTIONAL_PROVIDER: undefined }))

    expect(report.routing[1].provider).toBe('ses')
  })

  it('sandboxMode is a boolean', () => {
    const report = buildHealthReport(makeEnv())
    expect(typeof report.sandboxMode).toBe('boolean')
  })
})

describe('buildHealthReport — AC-2: presence semantics', () => {
  it('empty string → present: false', () => {
    const report = buildHealthReport(makeEnv({ MAILER_API_KEY: '' }))
    const entry = report.envVars.find((v) => v.key === 'MAILER_API_KEY')!
    expect(entry.present).toBe(false)
  })

  it('whitespace-only string → present: false', () => {
    const report = buildHealthReport(makeEnv({ MAILER_API_KEY: '   ' }))
    const entry = report.envVars.find((v) => v.key === 'MAILER_API_KEY')!
    expect(entry.present).toBe(false)
  })

  it('undefined → present: false', () => {
    const report = buildHealthReport(makeEnv({ MAILER_API_KEY: undefined }))
    const entry = report.envVars.find((v) => v.key === 'MAILER_API_KEY')!
    expect(entry.present).toBe(false)
  })

  it("single character 'x' → present: true", () => {
    const report = buildHealthReport(makeEnv({ MAILER_API_KEY: 'x' }))
    const entry = report.envVars.find((v) => v.key === 'MAILER_API_KEY')!
    expect(entry.present).toBe(true)
  })

  it("value padded with spaces '  x  ' → present: true", () => {
    const report = buildHealthReport(makeEnv({ MAILER_API_KEY: '  x  ' }))
    const entry = report.envVars.find((v) => v.key === 'MAILER_API_KEY')!
    expect(entry.present).toBe(true)
  })
})

describe('buildHealthReport — AC-3: routing null/value', () => {
  it('MAGIC_LINK_PROVIDER unset → routing[0].provider === null', () => {
    const report = buildHealthReport(makeEnv({ MAGIC_LINK_PROVIDER: undefined }))
    expect(report.routing[0].provider).toBeNull()
  })

  it("MAGIC_LINK_PROVIDER set to 'ses' → routing[0].provider === 'ses'", () => {
    const report = buildHealthReport(makeEnv({ MAGIC_LINK_PROVIDER: 'ses' }))
    expect(report.routing[0].provider).toBe('ses')
  })

  it('MAGIC_LINK_PROVIDER empty string → routing[0].provider === null', () => {
    const report = buildHealthReport(makeEnv({ MAGIC_LINK_PROVIDER: '' }))
    expect(report.routing[0].provider).toBeNull()
  })
})

describe('buildHealthReport — AC-4: sandbox boolean', () => {
  it("exact string 'true' → sandboxMode: true", () => {
    const report = buildHealthReport(makeEnv({ SES_SANDBOX_MODE: 'true' }))
    expect(report.sandboxMode).toBe(true)
  })

  it("'TRUE' → sandboxMode: false", () => {
    const report = buildHealthReport(makeEnv({ SES_SANDBOX_MODE: 'TRUE' }))
    expect(report.sandboxMode).toBe(false)
  })

  it("'1' → sandboxMode: false", () => {
    const report = buildHealthReport(makeEnv({ SES_SANDBOX_MODE: '1' }))
    expect(report.sandboxMode).toBe(false)
  })

  it("'false' → sandboxMode: false", () => {
    const report = buildHealthReport(makeEnv({ SES_SANDBOX_MODE: 'false' }))
    expect(report.sandboxMode).toBe(false)
  })

  it('undefined → sandboxMode: false', () => {
    const report = buildHealthReport(makeEnv({ SES_SANDBOX_MODE: undefined }))
    expect(report.sandboxMode).toBe(false)
  })

  it("empty string '' → sandboxMode: false", () => {
    const report = buildHealthReport(makeEnv({ SES_SANDBOX_MODE: '' }))
    expect(report.sandboxMode).toBe(false)
  })
})

// ─── Section 2: createHealthHandler ──────────────────────────────────────────

describe('createHealthHandler — AC-5: missing Authorization header → 401', () => {
  it('returns status 401 when Authorization header is absent', async () => {
    const handler = createHealthHandler({ env: makeEnv(), apiKey: 'test-key' })
    const res = await handler(makeRequest())
    expect(res.status).toBe(401)
  })

  it("body is exactly 'Unauthorized'", async () => {
    const handler = createHealthHandler({ env: makeEnv(), apiKey: 'test-key' })
    const res = await handler(makeRequest())
    const body = await res.text()
    expect(body).toBe('Unauthorized')
  })

  it('body does not contain any REQUIRED_ENV_VARS key names', async () => {
    const handler = createHealthHandler({ env: makeEnv(), apiKey: 'test-key' })
    const res = await handler(makeRequest())
    const body = await res.text()
    for (const key of REQUIRED_ENV_VARS) {
      expect(body).not.toContain(key)
    }
  })
})

describe('createHealthHandler — AC-6: wrong bearer token → 401 no env value leak', () => {
  it('returns status 401 for wrong bearer token', async () => {
    const handler = createHealthHandler({ env: makeEnv(), apiKey: 'test-key' })
    const res = await handler(makeRequest('Bearer wrong-token'))
    expect(res.status).toBe(401)
  })

  it('body does not contain env values when wrong token supplied', async () => {
    const sentinel = 'sentinel-do-not-leak'
    const env = makeEnv({ MAILER_API_KEY: sentinel })
    const handler = createHealthHandler({ env, apiKey: 'test-key' })
    const res = await handler(makeRequest('Bearer wrong-token'))
    const body = await res.text()
    expect(body).not.toContain(sentinel)
  })
})

describe('createHealthHandler — AC-7: wrong scheme → 401', () => {
  it('returns 401 when scheme is Basic instead of Bearer', async () => {
    const handler = createHealthHandler({ env: makeEnv(), apiKey: 'test-key' })
    const res = await handler(makeRequest('Basic dXNlcjpwYXNz'))
    expect(res.status).toBe(401)
  })
})

describe('createHealthHandler — AC-8: correct bearer → 200 with text/html', () => {
  it('returns status 200 for correct bearer token', async () => {
    const handler = createHealthHandler({ env: makeEnv(), apiKey: 'test-key' })
    const res = await handler(makeRequest('Bearer test-key'))
    expect(res.status).toBe(200)
  })

  it('content-type includes text/html', async () => {
    const handler = createHealthHandler({ env: makeEnv(), apiKey: 'test-key' })
    const res = await handler(makeRequest('Bearer test-key'))
    const ct = res.headers.get('content-type') ?? ''
    expect(ct).toContain('text/html')
  })
})

describe('createHealthHandler — AC-9: 200 body contains all REQUIRED_ENV_VARS key names', () => {
  it('body contains every key from REQUIRED_ENV_VARS', async () => {
    const handler = createHealthHandler({ env: makeEnv(), apiKey: 'test-key' })
    const res = await handler(makeRequest('Bearer test-key'))
    const body = await res.text()
    for (const key of REQUIRED_ENV_VARS) {
      expect(body).toContain(key)
    }
  })
})

describe('createHealthHandler — AC-10: 200 body does not contain env values', () => {
  it('body does not expose env var values (sentinel value not leaked)', async () => {
    const sentinel = 'sentinel-value-leak'
    const env = makeEnv({ MAILER_FROM: sentinel })
    const handler = createHealthHandler({ env, apiKey: 'test-key' })
    const res = await handler(makeRequest('Bearer test-key'))
    const body = await res.text()
    expect(body).not.toContain(sentinel)
  })
})

describe('createHealthHandler — AC-11: SES sandbox banner present when SES_SANDBOX_MODE=true', () => {
  it("body contains 'SES is in sandbox mode' when SES_SANDBOX_MODE is 'true'", async () => {
    const env = makeEnv({ SES_SANDBOX_MODE: 'true' })
    const handler = createHealthHandler({ env, apiKey: 'test-key' })
    const res = await handler(makeRequest('Bearer test-key'))
    const body = await res.text()
    expect(body).toContain('SES is in sandbox mode')
  })
})

describe('createHealthHandler — AC-12: SES sandbox banner absent without sandbox env', () => {
  it("body does NOT contain 'SES is in sandbox mode' when SES_SANDBOX_MODE is not set", async () => {
    const env = makeEnv({ SES_SANDBOX_MODE: undefined })
    const handler = createHealthHandler({ env, apiKey: 'test-key' })
    const res = await handler(makeRequest('Bearer test-key'))
    const body = await res.text()
    expect(body).not.toContain('SES is in sandbox mode')
  })
})

describe('createHealthHandler — AC-13: HTML escaping of provider values', () => {
  it("MAGIC_LINK_PROVIDER containing '<script>' is escaped — raw tag does not appear in HTML", async () => {
    const env = makeEnv({ MAGIC_LINK_PROVIDER: '<script>alert(1)</script>' })
    const handler = createHealthHandler({ env, apiKey: 'test-key' })
    const res = await handler(makeRequest('Bearer test-key'))
    const body = await res.text()
    expect(body).not.toContain('<script>')
  })

  it('the escaped form (&lt;script&gt;) IS present in the HTML', async () => {
    const env = makeEnv({ MAGIC_LINK_PROVIDER: '<script>alert(1)</script>' })
    const handler = createHealthHandler({ env, apiKey: 'test-key' })
    const res = await handler(makeRequest('Bearer test-key'))
    const body = await res.text()
    expect(body).toContain('&lt;script&gt;')
  })
})

describe('createHealthHandler — AC-14: voice — no forbidden words in 200 response body', () => {
  const forbidden = ['oops', 'unfortunately', 'please']

  it('body contains none of: Oops, Unfortunately, Please (case-insensitive)', async () => {
    const handler = createHealthHandler({ env: makeEnv(), apiKey: 'test-key' })
    const res = await handler(makeRequest('Bearer test-key'))
    const body = (await res.text()).toLowerCase()
    for (const word of forbidden) {
      expect(body).not.toContain(word)
    }
  })
})

describe('createHealthHandler — AC-15: empty apiKey rejects all requests with 401', () => {
  it('returns 401 for request with no Authorization when apiKey is empty string', async () => {
    const handler = createHealthHandler({ env: makeEnv(), apiKey: '' })
    const res = await handler(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 for request with correct-looking Bearer when apiKey is empty string', async () => {
    const handler = createHealthHandler({ env: makeEnv(), apiKey: '' })
    // Token is also empty — cannot match empty apiKey because length === 0 fires first
    const res = await handler(makeRequest('Bearer '))
    expect(res.status).toBe(401)
  })

  it('returns 401 for any non-empty bearer token when apiKey is empty string', async () => {
    const handler = createHealthHandler({ env: makeEnv(), apiKey: '' })
    const res = await handler(makeRequest('Bearer some-token'))
    expect(res.status).toBe(401)
  })
})
