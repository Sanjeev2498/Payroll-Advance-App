import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Security Workforce & Payroll Management',
  description: 'Comprehensive workforce operations platform for security agencies and staffing companies',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-gray-100 min-h-screen">
      <body className={`${inter.className} bg-gray-100 min-h-screen`}>
        <div id="__next" className="min-h-screen bg-gray-100">
          <Providers>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  )
}