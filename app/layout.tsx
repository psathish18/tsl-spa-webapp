import './globals.css'
import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'

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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">TSL</span>
                </div>
                <span className="font-bold text-xl text-gray-900">
                  Tamil Song Lyrics
                </span>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-8">
                <a href="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                  Home
                </a>
                <a href="/latest" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                  Latest Songs
                </a>
                <a href="/popular" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                  Popular
                </a>
                <a href="/about" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                  About
                </a>
              </nav>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Brand */}
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">TSL</span>
                  </div>
                  <span className="font-bold text-xl">
                    Tamil Song Lyrics
                  </span>
                </div>
                <p className="text-gray-400 mb-4 max-w-md">
                  Your ultimate destination for the latest Tamil song lyrics. 
                  Discover new music, find your favorite songs, and enjoy the 
                  beauty of Tamil poetry and music.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
                <ul className="space-y-2">
                  <li><a href="/" className="text-gray-400 hover:text-white transition-colors">Home</a></li>
                  <li><a href="/latest" className="text-gray-400 hover:text-white transition-colors">Latest Songs</a></li>
                  <li><a href="/popular" className="text-gray-400 hover:text-white transition-colors">Popular Songs</a></li>
                  <li><a href="/artists" className="text-gray-400 hover:text-white transition-colors">Artists</a></li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Support</h3>
                <ul className="space-y-2">
                  <li><a href="/about" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
                  <li><a href="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
                  <li><a href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 Tamil Song Lyrics. All rights reserved.</p>
            </div>
          </div>
        </footer>
        <SpeedInsights />
      </body>
    </html>
  )
}
