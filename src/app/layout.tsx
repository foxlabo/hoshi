import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hoshi — Local photo library',
  description: 'Index a folder of photos, browse a timeline, manage albums.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-zinc-50 text-zinc-900 antialiased">{children}</body>
    </html>
  )
}
