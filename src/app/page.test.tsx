import { describe, it, expect } from 'vitest'
import Home from './page'

describe('Home', () => {
  it('exports a default function', () => {
    expect(typeof Home).toBe('function')
  })
})
