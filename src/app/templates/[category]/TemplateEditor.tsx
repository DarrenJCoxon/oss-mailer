'use client'

import { useState, useTransition } from 'react'
import { saveTemplateAction, resetTemplateAction } from './actions'

type ValidCategory = 'magic_link' | 'promotional' | 'update'

type Props = {
  category: ValidCategory
  initialSubject: string
  initialHtml: string
}

export function TemplateEditor({ category, initialSubject, initialHtml }: Props) {
  const [subject, setSubject] = useState(initialSubject)
  const [html, setHtml] = useState(initialHtml)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const previewHtml = html || '<p style="color:#888;font-family:sans-serif;padding:1rem">Enter HTML above to see a preview.</p>'

  function handleSave() {
    setFeedback(null)
    startTransition(async () => {
      const result = await saveTemplateAction(category, { subject, html })
      setFeedback(result.success
        ? { type: 'success', message: 'Template saved.' }
        : { type: 'error', message: result.error ?? 'Save failed.' }
      )
    })
  }

  function handleReset() {
    setFeedback(null)
    startTransition(async () => {
      const result = await resetTemplateAction(category)
      if (result.success) {
        setSubject('')
        setHtml('')
        setFeedback({ type: 'success', message: 'Reset to default.' })
      } else {
        setFeedback({ type: 'error', message: result.error ?? 'Reset failed.' })
      }
    })
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Form panel */}
      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject line
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Leave blank to use default"
            className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-[#2E3244] bg-white dark:bg-[#1A1D2E] text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="html" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            HTML body
          </label>
          <textarea
            id="html"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="Leave blank to use the default react-email template"
            rows={16}
            className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-[#2E3244] bg-white dark:bg-[#1A1D2E] text-sm font-mono text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 rounded-md px-3 py-2 text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            aria-disabled={isPending}
            aria-busy={isPending}
            className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            aria-disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-200 dark:border-[#2E3244] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21263A] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Reset to default
          </button>
        </div>
      </div>

      {/* Preview panel */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview</p>
        <iframe
          srcDoc={previewHtml}
          sandbox="allow-same-origin"
          title="Email preview"
          className="w-full h-[500px] rounded-md border border-gray-200 dark:border-[#2E3244] bg-white"
        />
      </div>
    </div>
  )
}
