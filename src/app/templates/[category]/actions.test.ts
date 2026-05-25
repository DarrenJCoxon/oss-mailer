/**
 * Covers src/app/templates/[category]/actions.ts
 *
 * AC: saveTemplateAction returns { success: false, error: 'Invalid category.' } for unknown category
 * AC: saveTemplateAction calls saveTemplate and returns { success: true } on success
 * AC: saveTemplateAction returns { success: false, error: 'Failed to save template.' } on DB error
 * AC: resetTemplateAction returns { success: false, error: 'Invalid category.' } for unknown category
 * AC: resetTemplateAction calls resetTemplate and returns { success: true } on success
 * AC: resetTemplateAction returns { success: false, error: 'Failed to reset template.' } on DB error
 * AC: actions.ts is a Server Action file (has 'use server')
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Mock DB — prevent any real DB calls
vi.mock('@/db', () => ({
  db: {},
}))

// Mock template-store — control saveTemplate / resetTemplate behaviour
const mockSaveTemplate = vi.fn()
const mockResetTemplate = vi.fn()

vi.mock('@/template-store', () => ({
  saveTemplate: (...args: unknown[]) => mockSaveTemplate(...args),
  resetTemplate: (...args: unknown[]) => mockResetTemplate(...args),
}))

import { saveTemplateAction, resetTemplateAction } from './actions'

beforeEach(() => {
  mockSaveTemplate.mockReset()
  mockResetTemplate.mockReset()
})

// ─── saveTemplateAction ───────────────────────────────────────────────────────

describe('saveTemplateAction', () => {
  it('returns { success: false, error: "Invalid category." } for an unknown category', async () => {
    const result = await saveTemplateAction('bad_category', { subject: 'S', html: '<p>H</p>' })
    expect(result).toEqual({ success: false, error: 'Invalid category.' })
  })

  it('does not call saveTemplate for an invalid category', async () => {
    await saveTemplateAction('not_real', { subject: 'S' })
    expect(mockSaveTemplate).not.toHaveBeenCalled()
  })

  it('returns { success: true } for magic_link on DB success', async () => {
    mockSaveTemplate.mockResolvedValue(undefined)
    const result = await saveTemplateAction('magic_link', { subject: 'Sub', html: '<p>Hi</p>' })
    expect(result).toEqual({ success: true })
  })

  it('returns { success: true } for promotional on DB success', async () => {
    mockSaveTemplate.mockResolvedValue(undefined)
    const result = await saveTemplateAction('promotional', { subject: 'Promo', html: '<p>Promo</p>' })
    expect(result).toEqual({ success: true })
  })

  it('returns { success: true } for update on DB success', async () => {
    mockSaveTemplate.mockResolvedValue(undefined)
    const result = await saveTemplateAction('update', { html: '<p>Update</p>' })
    expect(result).toEqual({ success: true })
  })

  it('calls saveTemplate with the db, correct category and data', async () => {
    mockSaveTemplate.mockResolvedValue(undefined)
    await saveTemplateAction('magic_link', { subject: 'S', html: '<p>H</p>' })
    expect(mockSaveTemplate).toHaveBeenCalledOnce()
    expect(mockSaveTemplate).toHaveBeenCalledWith(
      expect.anything(), // db
      'magic_link',
      { subject: 'S', html: '<p>H</p>' },
    )
  })

  it('returns { success: false, error: "Failed to save template." } when saveTemplate throws', async () => {
    mockSaveTemplate.mockRejectedValue(new Error('DB connection refused'))
    const result = await saveTemplateAction('magic_link', { subject: 'S', html: '<p>H</p>' })
    expect(result).toEqual({ success: false, error: 'Failed to save template.' })
  })

  it('does not throw when saveTemplate rejects — returns error object', async () => {
    mockSaveTemplate.mockRejectedValue(new Error('timeout'))
    await expect(saveTemplateAction('promotional', { html: '<p>x</p>' })).resolves.not.toThrow()
  })
})

// ─── resetTemplateAction ──────────────────────────────────────────────────────

describe('resetTemplateAction', () => {
  it('returns { success: false, error: "Invalid category." } for an unknown category', async () => {
    const result = await resetTemplateAction('bad_category')
    expect(result).toEqual({ success: false, error: 'Invalid category.' })
  })

  it('does not call resetTemplate for an invalid category', async () => {
    await resetTemplateAction('not_real')
    expect(mockResetTemplate).not.toHaveBeenCalled()
  })

  it('returns { success: true } for magic_link on DB success', async () => {
    mockResetTemplate.mockResolvedValue(undefined)
    const result = await resetTemplateAction('magic_link')
    expect(result).toEqual({ success: true })
  })

  it('returns { success: true } for promotional on DB success', async () => {
    mockResetTemplate.mockResolvedValue(undefined)
    const result = await resetTemplateAction('promotional')
    expect(result).toEqual({ success: true })
  })

  it('returns { success: true } for update on DB success', async () => {
    mockResetTemplate.mockResolvedValue(undefined)
    const result = await resetTemplateAction('update')
    expect(result).toEqual({ success: true })
  })

  it('calls resetTemplate with the db and correct category', async () => {
    mockResetTemplate.mockResolvedValue(undefined)
    await resetTemplateAction('promotional')
    expect(mockResetTemplate).toHaveBeenCalledOnce()
    expect(mockResetTemplate).toHaveBeenCalledWith(
      expect.anything(), // db
      'promotional',
    )
  })

  it('returns { success: false, error: "Failed to reset template." } when resetTemplate throws', async () => {
    mockResetTemplate.mockRejectedValue(new Error('DB write failed'))
    const result = await resetTemplateAction('magic_link')
    expect(result).toEqual({ success: false, error: 'Failed to reset template.' })
  })

  it('does not throw when resetTemplate rejects — returns error object', async () => {
    mockResetTemplate.mockRejectedValue(new Error('timeout'))
    await expect(resetTemplateAction('update')).resolves.not.toThrow()
  })
})

// ─── Server Action assertion ──────────────────────────────────────────────────

describe('actions.ts is a Server Action file', () => {
  it('contains "use server" directive at the top', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, 'actions.ts'),
      'utf8'
    )
    expect(source).toMatch(/^['"]use server['"]/)
  })
})
