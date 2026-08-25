import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from './(shell)/Sidebar'
import { MobileNav } from './(shell)/MobileNav'
import { FirstRunBanner } from './(shell)/FirstRunBanner'
import { AccountMenu } from './(shell)/AccountMenu'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'oss-mailer',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-white text-gray-900 dark:bg-[#0F1117] dark:text-gray-50 antialiased">
        <div className="min-h-screen md:flex">
          <Sidebar />
          <MobileNav />
          <div className="flex-1 min-w-0">
            <FirstRunBanner />
            <AccountMenu />
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
