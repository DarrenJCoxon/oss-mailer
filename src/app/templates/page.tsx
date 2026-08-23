import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/db'
import { emailTemplates } from '@/db/schema'

export const metadata: Metadata = { title: 'Templates — oss-mailer' }

// Reads live DB state (which templates are customised). Must render per-request,
// not be statically prerendered at build time.
export const dynamic = 'force-dynamic'

const CATEGORIES = [
  { key: 'magic_link', label: 'Magic link', description: 'Sent when a user requests a sign-in link.' },
  { key: 'transactional', label: 'Transactional', description: 'Contact forms, receipts and operational messages.' },
  { key: 'promotional', label: 'Promotional', description: 'Bulk promotional emails to your users.' },
  { key: 'update', label: 'Update', description: 'Product updates and notifications.' },
] as const

export default async function TemplatesPage() {
  const customised: Record<string, boolean> = {}
  const customisedSubjects: Record<string, string | null> = {}

  try {
    const rows = await db.select().from(emailTemplates)
    for (const row of rows) {
      customised[row.category] = Boolean(row.subject || row.html)
      customisedSubjects[row.category] = row.subject
    }
  } catch {
    // DB error: show all as default, edit still works
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pt-10 pb-12">
      <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50 mb-8">
        Templates
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORIES.map(({ key, label, description }) => {
          const isCustomised = Boolean(customised[key])
          const subject = customisedSubjects[key]
          return (
            <div
              key={key}
              className="rounded-lg border border-gray-200 dark:border-[#2E3244] bg-white dark:bg-[#1A1D2E] p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">{label}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isCustomised
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {isCustomised ? 'Customised' : 'Default'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{description}</p>
              {subject && (
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-3">Subject: {subject}</p>
              )}
              <div className="flex gap-2 mt-3">
                <Link
                  href={`/templates/${key}`}
                  className="text-sm font-medium px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Edit
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
