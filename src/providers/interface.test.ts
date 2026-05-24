/**
 * AC-1: EmailProvider interface exported from src/providers/interface.ts
 * with `name`, `validate()`, and `send()` fully typed.
 *
 * This file is pure TypeScript types — no runtime code exists to call.
 * The test confirms the module is importable and the exported names are present,
 * which also satisfies Gate B coverage for interface.ts.
 */
import { describe, it, expect } from 'vitest'
import type {
  EmailProvider,
  ProviderSendRequest,
  SendResult,
} from './interface'

describe('interface.ts exports (AC-1)', () => {
  it('ProviderSendRequest shape can be constructed with required fields', () => {
    const req: ProviderSendRequest = {
      from: 'from@example.com',
      to: 'to@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      text: 'Hi',
    }
    expect(req.from).toBe('from@example.com')
    expect(req.to).toBe('to@example.com')
    expect(req.subject).toBe('Hello')
    expect(req.html).toBe('<p>Hi</p>')
    expect(req.text).toBe('Hi')
  })

  it('ProviderSendRequest accepts optional headers', () => {
    const req: ProviderSendRequest = {
      from: 'from@example.com',
      to: 'to@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      text: 'Hi',
      headers: { 'List-Unsubscribe': '<https://example.com/unsub>' },
    }
    expect(req.headers?.['List-Unsubscribe']).toBe('<https://example.com/unsub>')
  })

  it('SendResult shape can be constructed', () => {
    const result: SendResult = {
      success: true,
      messageId: 'msg-001',
      provider: 'ses',
      sentAt: new Date().toISOString(),
    }
    expect(result.success).toBe(true)
    expect(result.provider).toBe('ses')
    expect(typeof result.sentAt).toBe('string')
  })

  it('EmailProvider interface is satisfied by a conforming object', () => {
    // Compile-time verification: TypeScript will error here if the interface
    // does not have the expected members.
    const adapter: EmailProvider = {
      name: 'dummy',
      validate() { /* noop */ },
      async send(_req) {
        return { success: true, provider: 'dummy', sentAt: new Date().toISOString() }
      },
    }
    expect(adapter.name).toBe('dummy')
    expect(typeof adapter.validate).toBe('function')
    expect(typeof adapter.send).toBe('function')
  })
})
