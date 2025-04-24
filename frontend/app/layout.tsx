import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from '@/components/providers'
import { CacheInitializer } from '@/components/cache/init-loading'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VyManager',
  description: 'Modern web interface to make configuring, deploying and monitoring VyOS routers easier',
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
          <Providers>
            <CacheInitializer>
              {children}
              <Toaster />
            </CacheInitializer>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
} 