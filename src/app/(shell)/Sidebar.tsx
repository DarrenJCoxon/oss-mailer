'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from './nav-items'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden md:flex md:flex-col md:w-[220px] md:shrink-0 md:border-r md:border-gray-200 md:dark:border-[#2E3244] md:bg-gray-50 md:dark:bg-[#1A1D27]"
    >
      <div className="px-6 py-5 border-b border-gray-200 dark:border-[#2E3244]">
        <span className="text-base font-semibold text-gray-900 dark:text-gray-50">
          oss-mailer
        </span>
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
                  aria-current={isActive ? 'page' : undefined}
                  className={
                    isActive
                      ? 'flex items-center gap-2 px-6 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-l-2 border-blue-600 dark:border-blue-400 bg-gray-100 dark:bg-[#21263A]'
                      : 'flex items-center gap-2 px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-l-2 border-transparent hover:bg-gray-100 dark:hover:bg-[#21263A]'
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
  )
}
