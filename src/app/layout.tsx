import React from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { LoadingProvider } from '@/context/LoadingContext'
import { SiteProvider } from '@/context/SiteContext'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Spool CMS - Beautiful Headless CMS for Next.js',
  description: 'Real-time content management with AI-native editing and beautiful admin interface',
  keywords: 'cms, headless, nextjs, content management, real-time, ai',
  authors: [{ name: 'Spool Team' }],
  openGraph: {
    title: 'Spool CMS',
    description: 'Beautiful headless CMS for Next.js with real-time editing',
    url: 'https://spool.dev',
    siteName: 'Spool CMS',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Spool CMS - Beautiful Headless CMS for Next.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spool CMS',
    description: 'Beautiful headless CMS for Next.js with real-time editing',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LoadingProvider>
              <SiteProvider>
                {children}
                <Toaster />
              </SiteProvider>
            </LoadingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 