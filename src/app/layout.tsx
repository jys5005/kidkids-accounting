import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // maximumScale 제거 — 데스크톱용 넓은 표를 폰에서 핀치줌으로 확대해 볼 수 있게 허용
}

export const metadata: Metadata = {
  title: '수전자장부 어린이집 관리시스템',
  description: '수전자장부 어린이집 관리시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-1 p-2 text-sm font-medium">
          <div className="w-full">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
