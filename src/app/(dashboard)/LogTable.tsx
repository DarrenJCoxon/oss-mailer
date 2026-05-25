'use client'

import React, { useState } from 'react'
import {
  type SendLogRow,
  type LogFilters,
  type CategoryFilter,
  type StatusFilter,
  CATEGORY_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  EMPTY_STATE_COPY,
  EMPTY_FILTERED_COPY,
  filterSendLogRows,
} from '@/log'

function StatusBadge({ status }: { status: 'sent' | 'failed' }) {
  const cls =
    status === 'sent'
      ? 'inline-block rounded px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900'
      : 'inline-block rounded px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900'
  return <span className={cls}>{status}</span>
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-block rounded px-2 py-0.5 text-xs font-medium font-mono text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900">
      {category}
    </span>
  )
}

export function LogTable({ rows }: { rows: SendLogRow[] }) {
  const [filters, setFilters] = useState<LogFilters>({ category: 'all', status: 'all' })
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({})

  const visible = filterSendLogRows(rows, filters)

  function toggle(id: string) {
    setExpandedById((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (rows.length === 0) {
    return (
      <section className="text-center py-16">
        <p className="text-base text-gray-700 dark:text-gray-300">{EMPTY_STATE_COPY.title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{EMPTY_STATE_COPY.body}</p>
        <a
          href={EMPTY_STATE_COPY.linkHref}
          className="inline-block mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline-offset-2 hover:underline"
        >
          {EMPTY_STATE_COPY.linkLabel}
        </a>
      </section>
    )
  }

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <label htmlFor="filter-category" className="sr-only">
          Category filter
        </label>
        <select
          id="filter-category"
          value={filters.category}
          onChange={(e) =>
            setFilters((f) => ({ ...f, category: e.target.value as CategoryFilter }))
          }
          className="rounded-md border border-gray-200 dark:border-[#2E3244] bg-gray-50 dark:bg-[#1A1D27] text-gray-900 dark:text-gray-50 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {CATEGORY_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label htmlFor="filter-status" className="sr-only">
          Status filter
        </label>
        <select
          id="filter-status"
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value as StatusFilter }))
          }
          className="rounded-md border border-gray-200 dark:border-[#2E3244] bg-gray-50 dark:bg-[#1A1D27] text-gray-900 dark:text-gray-50 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <table className="w-full">
        <thead>
          <tr>
            <th scope="col" className="text-sm font-medium text-gray-500 dark:text-gray-400 text-left px-3 py-2">
              Sent at
            </th>
            <th scope="col" className="text-sm font-medium text-gray-500 dark:text-gray-400 text-left px-3 py-2">
              Category
            </th>
            <th scope="col" className="text-sm font-medium text-gray-500 dark:text-gray-400 text-left px-3 py-2">
              Recipient
            </th>
            <th scope="col" className="text-sm font-medium text-gray-500 dark:text-gray-400 text-left px-3 py-2">
              Provider
            </th>
            <th scope="col" className="text-sm font-medium text-gray-500 dark:text-gray-400 text-left px-3 py-2">
              Status
            </th>
            <th scope="col" className="text-sm font-medium text-gray-500 dark:text-gray-400 text-left px-3 py-2">
              Message ID
            </th>
            <th scope="col" className="text-sm font-medium text-gray-500 dark:text-gray-400 text-left px-3 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody aria-live="polite" aria-relevant="additions removals">
          {visible.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                {EMPTY_FILTERED_COPY.body}
              </td>
            </tr>
          ) : (
            visible.map((row) => {
              const isExpanded = !!expandedById[row.id]
              return (
                <React.Fragment key={row.id}>
                  <tr className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-3 py-2 align-top">
                      <span className="font-mono text-sm">{row.sentAtIso}</span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <CategoryBadge category={row.category} />
                    </td>
                    <td className="px-3 py-2 align-top">{row.to}</td>
                    <td className="px-3 py-2 align-top">{row.provider}</td>
                    <td className="px-3 py-2 align-top">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="font-mono text-sm">{row.messageId ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {row.status === 'failed' && (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={`row-detail-${row.id}`}
                          onClick={() => toggle(row.id)}
                          onKeyDown={(e) => { if (e.key === 'Escape' && isExpanded) toggle(row.id) }}
                          className="text-gray-600 dark:text-gray-300 px-2 py-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                          <span aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
                          <span className="sr-only">
                            {isExpanded ? 'Collapse error detail' : 'Expand error detail'}
                          </span>
                        </button>
                      )}
                    </td>
                  </tr>
                  {row.status === 'failed' && (
                    <tr id={`row-detail-${row.id}`} hidden={!isExpanded}>
                      <td
                        colSpan={7}
                        className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm font-mono p-3"
                      >
                        {row.errorDetail ?? 'No error detail recorded.'}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
