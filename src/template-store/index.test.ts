import { describe, it, expect, vi } from 'vitest'
import { getTemplateOverride, saveTemplate, resetTemplate } from './index'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeDb(rows: Array<{ category: string; subject: string | null; html: string | null; updated_at: Date }> = []) {
  const whereStub = vi.fn().mockResolvedValue(rows)
  const fromStub = vi.fn().mockReturnValue({ where: whereStub })
  const selectStub = vi.fn().mockReturnValue({ from: fromStub })

  const onConflictDoUpdateStub = vi.fn().mockResolvedValue(undefined)
  const valuesStub = vi.fn().mockReturnValue({ onConflictDoUpdate: onConflictDoUpdateStub })
  const insertStub = vi.fn().mockReturnValue({ values: valuesStub })

  const deleteWhereStub = vi.fn().mockResolvedValue(undefined)
  const deleteFromStub = vi.fn().mockReturnValue({ where: deleteWhereStub })

  return {
    select: selectStub,
    insert: insertStub,
    delete: deleteFromStub,
    _stubs: {
      where: whereStub,
      from: fromStub,
      valuesStub,
      onConflictDoUpdateStub,
      deleteWhereStub,
    },
  }
}

// ─── getTemplateOverride ────────────────────────────────────────────────────

describe('getTemplateOverride', () => {
  it('returns undefined when no rows found', async () => {
    const db = makeDb([])
    const result = await getTemplateOverride(db, 'magic_link')
    expect(result).toBeUndefined()
  })

  it('returns undefined when row has no subject or html', async () => {
    const db = makeDb([{ category: 'magic_link', subject: null, html: null, updated_at: new Date() }])
    const result = await getTemplateOverride(db, 'magic_link')
    expect(result).toBeUndefined()
  })

  it('returns subject override when row has subject', async () => {
    const db = makeDb([{ category: 'magic_link', subject: 'Custom subject', html: null, updated_at: new Date() }])
    const result = await getTemplateOverride(db, 'magic_link')
    expect(result).toEqual({ subject: 'Custom subject' })
  })

  it('returns html override when row has html', async () => {
    const db = makeDb([{ category: 'magic_link', subject: null, html: '<p>Custom</p>', updated_at: new Date() }])
    const result = await getTemplateOverride(db, 'magic_link')
    expect(result).toEqual({ html: '<p>Custom</p>' })
  })

  it('returns both subject and html when both present', async () => {
    const db = makeDb([{ category: 'magic_link', subject: 'Sub', html: '<p>HTML</p>', updated_at: new Date() }])
    const result = await getTemplateOverride(db, 'magic_link')
    expect(result).toEqual({ subject: 'Sub', html: '<p>HTML</p>' })
  })
})

// ─── saveTemplate ────────────────────────────────────────────────────────────

describe('saveTemplate', () => {
  it('calls insert with correct category and data', async () => {
    const db = makeDb()
    await saveTemplate(db, 'promotional', { subject: 'Hello', html: '<p>Hi</p>' })
    expect(db.insert).toHaveBeenCalledOnce()
    expect(db._stubs.valuesStub).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'promotional', subject: 'Hello', html: '<p>Hi</p>' }),
    )
  })

  it('passes null for missing subject', async () => {
    const db = makeDb()
    await saveTemplate(db, 'update', { html: '<p>Hi</p>' })
    expect(db._stubs.valuesStub).toHaveBeenCalledWith(
      expect.objectContaining({ subject: null }),
    )
  })

  it('passes null for missing html', async () => {
    const db = makeDb()
    await saveTemplate(db, 'update', { subject: 'Sub' })
    expect(db._stubs.valuesStub).toHaveBeenCalledWith(
      expect.objectContaining({ html: null }),
    )
  })

  it('calls onConflictDoUpdate with target and set', async () => {
    const db = makeDb()
    await saveTemplate(db, 'magic_link', { subject: 'Sub', html: '<p>x</p>' })
    expect(db._stubs.onConflictDoUpdateStub).toHaveBeenCalledWith(
      expect.objectContaining({ set: expect.objectContaining({ subject: 'Sub', html: '<p>x</p>' }) }),
    )
  })
})

// ─── resetTemplate ────────────────────────────────────────────────────────────

describe('resetTemplate', () => {
  it('calls delete on the email_templates table', async () => {
    const db = makeDb()
    await resetTemplate(db, 'promotional')
    expect(db.delete).toHaveBeenCalledOnce()
  })

  it('calls where after delete', async () => {
    const db = makeDb()
    await resetTemplate(db, 'magic_link')
    expect(db._stubs.deleteWhereStub).toHaveBeenCalledOnce()
  })
})
