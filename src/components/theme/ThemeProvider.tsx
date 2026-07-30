'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * App-wide theme provider. Defaults to the operating-system preference and
 * remembers the visitor's manual choice (light / dark / system) in localStorage.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
