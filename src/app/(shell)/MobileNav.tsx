'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from './nav-items'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#2E3244] bg-gray-50 dark:bg-[#1A1D27]">
        <span className="text-base font-semibold text-gray-900 dark:text-gray-50">
          oss-mailer
        </span>
        <button
          type="button"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          aria-controls="mobile-nav-drawer"
          onClick={() => setOpen(true)}
          className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#21263A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="mobile-nav-drawer"
        aria-label="Primary navigation"
        hidden={!open}
        className="md:hidden fixed inset-y-0 left-0 z-50 w-[260px] bg-gray-50 dark:bg-[#1A1D27] border-r border-gray-200 dark:border-[#2E3244] flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#2E3244]">
          <span className="text-base font-semibold text-gray-900 dark:text-gray-50">
            oss-mailer
          </span>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#21263A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <nav className="flex-1 py-3">
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={
                      isActive
                        ? 'flex items-center gap-2 px-6 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-l-2 border-blue-600 dark:border-blue-400'
                        : 'flex items-center gap-2 px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-l-2 border-transparent'
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}
