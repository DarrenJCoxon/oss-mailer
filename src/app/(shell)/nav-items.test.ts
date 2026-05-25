import { describe, it, expect } from 'vitest'
import { NAV_ITEMS } from './nav-items'

describe('NAV_ITEMS', () => {
  it('contains exactly 4 items', () => {
    expect(NAV_ITEMS).toHaveLength(4)
  })

  it('contains the / route', () => {
    expect(NAV_ITEMS.some((item) => item.href === '/')).toBe(true)
  })

  it('contains the /test-send route', () => {
    expect(NAV_ITEMS.some((item) => item.href === '/test-send')).toBe(true)
  })

  it('contains the /templates route', () => {
    expect(NAV_ITEMS.some((item) => item.href === '/templates')).toBe(true)
  })

  it('contains the /settings route', () => {
    expect(NAV_ITEMS.some((item) => item.href === '/settings')).toBe(true)
  })

  it('has the correct order: /, /test-send, /templates, /settings', () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      '/',
      '/test-send',
      '/templates',
      '/settings',
    ])
  })

  describe('active-link logic (as implemented in Sidebar / MobileNav)', () => {
    function isActive(href: string, pathname: string): boolean {
      return href === '/'
        ? pathname === '/'
        : pathname === href || pathname.startsWith(href + '/')
    }

    it('/ matches only when pathname is exactly /', () => {
      expect(isActive('/', '/')).toBe(true)
    })

    it('/ does not match /test-send', () => {
      expect(isActive('/', '/test-send')).toBe(false)
    })

    it('/ does not match /templates', () => {
      expect(isActive('/', '/templates')).toBe(false)
    })

    it('/templates matches exact /templates', () => {
      expect(isActive('/templates', '/templates')).toBe(true)
    })

    it('/templates matches /templates/abc (startsWith + /)', () => {
      expect(isActive('/templates', '/templates/abc')).toBe(true)
    })

    it('/templates does not match /templates-old (no trailing slash guard)', () => {
      // The guard appends "/" so /templates + "/" is "/templates/" which
      // "/templates-old" does not start with — this is intentional.
      expect(isActive('/templates', '/templates-old')).toBe(false)
    })

    it('/settings matches exact /settings', () => {
      expect(isActive('/settings', '/settings')).toBe(true)
    })

    it('/settings matches /settings/profile', () => {
      expect(isActive('/settings', '/settings/profile')).toBe(true)
    })

    it('/test-send matches exact /test-send', () => {
      expect(isActive('/test-send', '/test-send')).toBe(true)
    })
  })
})
