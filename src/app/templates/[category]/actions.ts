'use server'

import { db } from '@/db'
import { saveTemplate, resetTemplate } from '@/template-store'
import type { EmailCategory } from '@/router'

const VALID_CATEGORIES = new Set(['magic_link', 'transactional', 'promotional', 'update'])

export async function saveTemplateAction(
  category: string,
  data: { subject?: string; html?: string },
): Promise<{ success: true } | { success: false; error: string }> {
  if (!VALID_CATEGORIES.has(category)) {
    return { success: false, error: 'Invalid category.' }
  }
  try {
    await saveTemplate(db, category as EmailCategory, data)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to save template.' }
  }
}

export async function resetTemplateAction(
  category: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!VALID_CATEGORIES.has(category)) {
    return { success: false, error: 'Invalid category.' }
  }
  try {
    await resetTemplate(db, category as EmailCategory)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to reset template.' }
  }
}
