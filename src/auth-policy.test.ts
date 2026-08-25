import { describe, expect, it } from 'vitest'
import { createAllowedEmailSet, isAllowedEmail, isPublicPath } from './auth-policy'

describe('authentication policy', () => {
  it('allows only configured email addresses, case-insensitively', () => {
    const allowed = createAllowedEmailSet('Owner@example.com, other@example.com ')

    expect(isAllowedEmail('owner@example.com', allowed)).toBe(true)
    expect(isAllowedEmail('OWNER@EXAMPLE.COM', allowed)).toBe(true)
    expect(isAllowedEmail('stranger@example.com', allowed)).toBe(false)
    expect(isAllowedEmail(undefined, allowed)).toBe(false)
  })

  it('fails closed when the allowlist is empty', () => {
    expect(isAllowedEmail('owner@example.com', createAllowedEmailSet(''))).toBe(false)
  })

  it('keeps the SDK and provider callbacks public to their own auth handlers', () => {
    expect(isPublicPath('/api/send')).toBe(true)
    expect(isPublicPath('/api/queue/deliver')).toBe(true)
    expect(isPublicPath('/health')).toBe(true)
    expect(isPublicPath('/api/auth/session')).toBe(true)
    expect(isPublicPath('/test-send')).toBe(false)
    expect(isPublicPath('/settings')).toBe(false)
  })
})
