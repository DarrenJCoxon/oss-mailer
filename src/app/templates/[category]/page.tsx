import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/db'
import { emailTemplates } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { TemplateEditor } from './TemplateEditor'

const VALID_CATEGORIES = ['magic_link', 'transactional', 'promotional', 'update'] as const
type ValidCategory = (typeof VALID_CATEGORIES)[number]

const CATEGORY_LABELS: Record<ValidCategory, string> = {
  magic_link: 'Magic link',
  transactional: 'Transactional',
  promotional: 'Promotional',
  update: 'Update',
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const label = CATEGORY_LABELS[category as ValidCategory] ?? category
  return { title: `${label} template — oss-mailer` }
}

export default async function TemplatePage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  if (!VALID_CATEGORIES.includes(category as ValidCategory)) {
    notFound()
  }

  let currentSubject: string | null = null
  let currentHtml: string | null = null

  try {
    const rows = await db.select().from(emailTemplates).where(eq(emailTemplates.category, category))
    if (rows.length > 0) {
      currentSubject = rows[0].subject
      currentHtml = rows[0].html
    }
  } catch {
    // DB unavailable — show empty form, saving will attempt DB write
  }

  const label = CATEGORY_LABELS[category as ValidCategory]

  return (
    <main className="mx-auto max-w-5xl px-4 pt-10 pb-12">
      <div className="mb-6">
        <Link href="/templates" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          ← Templates
        </Link>
      </div>
      <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50 mb-8">
        {label} template
      </h1>
      <TemplateEditor
        category={category as ValidCategory}
        initialSubject={currentSubject ?? ''}
        initialHtml={currentHtml ?? ''}
      />
    </main>
  )
}
