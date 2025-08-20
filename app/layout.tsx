import './globals.css'
import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'

import dynamic from 'next/dynamic'

const GTM_ID = process.env.NEXT_PUBLIC_GA_ID;

const SpeedInsights = dynamic(() => import('@vercel/speed-insights/next').then(mod => mod.SpeedInsights), { ssr: false })
const Analytics = dynamic(() => import('@vercel/analytics/react').then(mod => mod.Analytics), { ssr: false })
const GAClient = dynamic(() => import('../components/GAClient').then(mod => mod.default), { ssr: false })
const ThemeSwitcher = dynamic(() => import('../components/ThemeSwitcher').then(mod => mod.default), { ssr: false })
// const GA = dynamic(() => import('../components/GAClient').then(mod => mod.default), { ssr: false })
// const ClientErrorCatcher = dynamic(() => import('../components/ClientErrorCatcher').then(mod => mod.default), { ssr: false })
// const GA_ID = process.env.NEXT_PUBLIC_GA_ID

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'Tamil Song Lyrics - Latest Tamil Songs',
  description: 'Discover the latest Tamil song lyrics with translations. Find your favorite Tamil songs, artists, and lyrics all in one place.',
  keywords: 'Tamil songs, Tamil lyrics, song lyrics, Tamil music, latest Tamil songs, Tamil movie songs',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'android-chrome',
        url: '/android-chrome-192x192.png',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}> 
      {/* Google Tag Manager and Google Analytics (in <head>) */}
      <head>
        {/* Google Analytics gtag.js */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
          `
        }} />
      </head>
  <body className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        {/* Header */}
        <header className="shadow-sm sticky top-0 z-50 site-header" style={{ backgroundColor: 'var(--header-surface)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <img src="/favicon.png" alt="Tamil Song Lyrics" className="w-8 h-8 rounded" />
                <span className="sr-only">Tamil Song Lyrics</span>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-8">
                <a href="/" className="header-link font-medium transition-colors">
                  Home
                </a>
                <a href="/latest" className="header-link font-medium transition-colors">
                  Latest Songs
                </a>
                <a href="/popular" className="header-link font-medium transition-colors">
                  Popular
                </a>
                <a href="/about" className="header-link font-medium transition-colors">
                  About
                </a>
              </nav>
              {/* Theme switcher (desktop only) */}
              <div className="hidden md:block">
                <ThemeSwitcher />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
  <footer className="site-footer" style={{ backgroundColor: 'var(--header-surface)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Brand */}
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <img src="/favicon.png" alt="TSL" className="w-8 h-8 rounded" />
                  <span className="font-bold text-xl">
                    Tamil Song Lyrics
                  </span>
                </div>
                <p className="header-link mb-4 max-w-md">
                  Your ultimate destination for the latest Tamil song lyrics. 
                  Discover new music, find your favorite songs, and enjoy the 
                  beauty of Tamil poetry and music.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
                <ul className="space-y-2">
                  <li><a href="/" className="header-link transition-colors">Home</a></li>
                  <li><a href="/latest" className="header-link transition-colors">Latest Songs</a></li>
                  <li><a href="/popular" className="header-link transition-colors">Popular Songs</a></li>
                  <li><a href="/artists" className="header-link transition-colors">Artists</a></li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Support</h3>
                <ul className="space-y-2">
                  <li><a href="/about" className="header-link transition-colors">About Us</a></li>
                  <li><a href="/contact" className="header-link transition-colors">Contact</a></li>
                  <li><a href="/privacy" className="header-link transition-colors">Privacy Policy</a></li>
                  <li><a href="/terms" className="header-link transition-colors">Terms of Service</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 Tamil Song Lyrics. All rights reserved.</p>
            </div>
          </div>
        </footer>
  {/* Google Analytics - client-side helper (loaded dynamically) */}
  {GTM_ID ? <GAClient gaId={GTM_ID} /> : null}
  <SpeedInsights />
  <Analytics />
  {/* <ClientErrorCatcher /> */}
      </body>
    </html>
  )
}
