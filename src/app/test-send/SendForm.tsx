'use client'

import { useActionState, useState } from 'react'
import { sendTestEmail, type ActionState } from './actions'
import { CATEGORIES, buildDefaultSubject } from '@/test-send'

function ResultPanel({ state }: { state: ActionState }) {
  if (state.phase !== 'result') {
    return <section aria-live="polite" aria-atomic="true" />
  }

  const { result, submittedTo } = state

  if (result.kind === 'sent') {
    return (
      <section
        aria-live="polite"
        aria-atomic="true"
        className="mt-6 rounded-lg p-4 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
      >
        <p role="status" className="text-base leading-normal font-semibold">
          <span aria-hidden="true">✓ </span>
          Sent. Message ID: <span className="font-mono text-sm leading-snug">{result.messageId}</span>
        </p>
        <p className="text-sm font-normal leading-normal mt-1">
          Provider: <span className="font-mono text-sm leading-snug">{result.provider}</span>
        </p>
        <p className="text-sm font-normal leading-normal mt-1">
          Sent at: <span className="font-mono text-sm leading-snug">{result.sentAt}</span>
        </p>
        <p className="text-sm font-normal leading-normal mt-1">
          Test sent to: <span className="font-mono text-sm leading-snug">{submittedTo}</span>
        </p>
      </section>
    )
  }

  if (result.kind === 'queued') {
    return (
      <section
        aria-live="polite"
        aria-atomic="true"
        className="mt-6 rounded-lg p-4 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
      >
        <p role="status" className="text-base leading-normal font-semibold">
          <span aria-hidden="true">✓ </span>
          Queued. Job ID: <span className="font-mono text-sm leading-snug">{result.jobId}</span>
        </p>
        <p className="text-sm font-normal leading-normal mt-1">
          Bulk send queued for delivery. Check the send log when WU-011 ships.
        </p>
        <p className="text-sm font-normal leading-normal mt-1">
          Test sent to: <span className="font-mono text-sm leading-snug">{submittedTo}</span>
        </p>
      </section>
    )
  }

  const headingByCode: Record<string, string> = {
    UNAUTHORIZED: 'Send failed: unauthorised.',
    VALIDATION_FAILED: 'Send failed: invalid request.',
    UNKNOWN_CATEGORY: 'Send failed: unknown category.',
    SEND_FAILED: 'Send failed.',
    QUEUE_FAILED: 'Queue failed.',
    NETWORK: 'Send failed: could not reach the handler.',
    UNEXPECTED: 'Send failed: unexpected response.',
  }

  const heading = headingByCode[result.code] ?? 'Send failed.'

  return (
    <section
      aria-live="polite"
      aria-atomic="true"
      className="mt-6 rounded-lg p-4 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"
    >
      <p role="alert" className="text-base leading-normal font-semibold">
        <span aria-hidden="true">✗ </span>
        {heading}
      </p>
      <p className="text-sm font-normal leading-normal mt-1">{result.detail}</p>
      <p className="text-sm font-normal leading-normal mt-1">
        Test sent to: <span className="font-mono text-sm leading-snug">{submittedTo}</span>
      </p>
    </section>
  )
}

export function SendForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendTestEmail, {
    phase: 'idle',
  })

  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('magic_link')
  const [subject, setSubject] = useState(buildDefaultSubject('magic_link'))
  const [subjectTouched, setSubjectTouched] = useState(false)
  const [to, setTo] = useState('')

  const canSubmit = to.trim() !== '' && subject.trim() !== ''

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newCategory = e.target.value as (typeof CATEGORIES)[number]
    setCategory(newCategory)
    if (!subjectTouched) {
      setSubject(buildDefaultSubject(newCategory))
    }
  }

  return (
    <div>
      <form action={action} className="space-y-5">
        <div>
          <label
            htmlFor="field-category"
            className="text-sm font-medium leading-snug text-gray-700 dark:text-gray-300 block mb-1"
          >
            Category
          </label>
          <select
            id="field-category"
            name="category"
            value={category}
            onChange={handleCategoryChange}
            className="block w-full rounded-md border border-gray-200 dark:border-[#2E3244] bg-gray-50 dark:bg-[#1A1D27] text-gray-900 dark:text-gray-50 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="field-to"
            className="text-sm font-medium leading-snug text-gray-700 dark:text-gray-300 block mb-1"
          >
            Recipient (required)
          </label>
          <input
            id="field-to"
            name="to"
            type="email"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="block w-full rounded-md border border-gray-200 dark:border-[#2E3244] bg-gray-50 dark:bg-[#1A1D27] text-gray-900 dark:text-gray-50 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            placeholder="recipient@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="field-subject"
            className="text-sm font-medium leading-snug text-gray-700 dark:text-gray-300 block mb-1"
          >
            Subject (required)
          </label>
          <input
            id="field-subject"
            name="subject"
            type="text"
            required
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              setSubjectTouched(true)
            }}
            className="block w-full rounded-md border border-gray-200 dark:border-[#2E3244] bg-gray-50 dark:bg-[#1A1D27] text-gray-900 dark:text-gray-50 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          />
        </div>

        <div className="mt-6">
          <button
            type="submit"
            aria-busy={pending ? 'true' : 'false'}
            aria-disabled={pending || !canSubmit}
            disabled={pending || !canSubmit}
            className="rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>

      <ResultPanel state={state} />
    </div>
  )
}
