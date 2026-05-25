export type NavItem = { href: string; label: string }

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Send log' },
  { href: '/test-send', label: 'Test send' },
  { href: '/templates', label: 'Templates' },
  { href: '/settings', label: 'Settings' },
] as const
