import { vi, describe, it, expect } from 'vitest'

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-inter', className: 'font-inter' }),
  JetBrains_Mono: () => ({ variable: '--font-jetbrains-mono', className: 'font-jetbrains-mono' }),
}))

vi.mock('./(shell)/AccountMenu', () => ({
  AccountMenu: () => null,
}))

describe('RootLayout', () => {
  it('exports a default function', async () => {
    const { default: RootLayout } = await import('./layout')
    expect(typeof RootLayout).toBe('function')
  })
})
