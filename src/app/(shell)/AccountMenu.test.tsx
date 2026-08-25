import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.fn()

vi.mock('@/auth', () => ({
  auth: authMock,
  signOut: vi.fn(),
}))

describe('AccountMenu', () => {
  beforeEach(() => {
    authMock.mockReset()
  })

  it('does not render for signed-out visitors', async () => {
    authMock.mockResolvedValue(null)
    const { AccountMenu } = await import('./AccountMenu')

    expect(await AccountMenu()).toBeNull()
  })

  it('renders account controls for an authenticated user', async () => {
    authMock.mockResolvedValue({ user: { email: 'owner@example.com' } })
    const { AccountMenu } = await import('./AccountMenu')

    const element = await AccountMenu()

    expect(element).not.toBeNull()
    expect(JSON.stringify(element)).toContain('owner@example.com')
    expect(JSON.stringify(element)).toContain('Sign out')
  })
})
