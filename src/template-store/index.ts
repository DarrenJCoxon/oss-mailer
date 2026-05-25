import { eq } from 'drizzle-orm'
import { emailTemplates } from '@/db/schema'
import type { EmailCategory } from '@/router'

export type TemplateOverride = {
  subject?: string
  html?: string
}

// Accept any db-shaped object — tested with a stub; production uses src/db's db export
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any

export async function getTemplateOverride(
  db: Db,
  category: EmailCategory,
): Promise<TemplateOverride | undefined> {
  const rows = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.category, category))
  if (!rows || rows.length === 0) return undefined
  const row = rows[0]
  const override: TemplateOverride = {}
  if (row.subject) override.subject = row.subject
  if (row.html) override.html = row.html
  return Object.keys(override).length > 0 ? override : undefined
}

export async function saveTemplate(
  db: Db,
  category: EmailCategory,
  data: { subject?: string; html?: string },
): Promise<void> {
  await db
    .insert(emailTemplates)
    .values({ category, subject: data.subject ?? null, html: data.html ?? null })
    .onConflictDoUpdate({
      target: emailTemplates.category,
      set: { subject: data.subject ?? null, html: data.html ?? null, updated_at: new Date() },
    })
}

export async function resetTemplate(
  db: Db,
  category: EmailCategory,
): Promise<void> {
  await db.delete(emailTemplates).where(eq(emailTemplates.category, category))
}
