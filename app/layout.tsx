import './globals.css'
import type { Metadata } from 'next'

import dynamic from 'next/dynamic'

// Lazy load all non-critical components to reduce edge requests
const FloatingSearchButton = dynamic(() => import('../components/FloatingSearchButton'), { ssr: false })
const OneSignalButton = dynamic(() => import('../components/OneSignalButton'), { 
  ssr: false,
  loading: () => null // No loading state needed - appears when ready
})
const OneSignalSubscriptionCard = dynamic(() => import('../components/OneSignalSubscriptionCard'), { 
  ssr: false,
  loading: () => null
})

const GTM_ID = process.env.NEXT_PUBLIC_GA_ID;

// Removed Vercel Analytics to reduce edge requests
// Using Google Analytics only for tracking
const GAClient = dynamic(() => import('../components/GAClient'), { ssr: false })
const ThemeSwitcher = dynamic(() => import('../components/ThemeSwitcher'), { ssr: false })

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
    <html lang="en"> 
      {/* Google Tag Manager and Google Analytics (in <head>) */}
      <head>
        {/* Preconnect to critical domains */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        
        {/* Google AdSense - Preconnect early */}
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <link
            rel="preconnect"
            href="https://pagead2.googlesyndication.com"
            crossOrigin="anonymous"
          />
        )}
      </head>
  <body className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        {/* Header */}
        <header className="shadow-sm sticky top-0 z-50 site-header" style={{ backgroundColor: 'var(--header-surface)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo - Clickable to home */}
              <a href="/" className="flex items-center space-x-3">
                <img src="/favicon.png" alt="Tamil Song Lyrics" className="w-8 h-8 rounded" />
                <span className="hidden md:block font-bold text-xl" style={{ color: 'var(--text)' }}>
                  Lyrics of Tamil Songs
                </span>
              </a>

              {/* OneSignal notification button and theme switcher */}
              <div className="flex items-center gap-3">
                <OneSignalButton />
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
                {/* Stay Updated Section */}
                <OneSignalSubscriptionCard />
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
                <ul className="space-y-2">
                  <li><a href="/" className="header-link transition-colors">Home</a></li>
                  <li>
                <a href="/tamil-song-lyrics-in-english.html">
                  Tamil Songs Lyrics With English Meaning
                </a>
              </li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Support</h3>
                <ul className="space-y-2">
                  <li><a href="/about" className="header-link transition-colors">About Us</a></li>
                  <li><a href="/privacy" className="header-link transition-colors">Privacy Policy</a></li>
                  <li><a href="/terms" className="header-link transition-colors">Terms of Service</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2026 Tamil Song Lyrics. All rights reserved.</p>
            </div>
          </div>
        </footer>
  
  {/* Floating Search Button */}
  <FloatingSearchButton />
  
  {/* Defer all analytics/tracking scripts to end of body */}
  {/* Google Analytics - Lazy loaded after page interaction or 3 seconds */}
  {process.env.NEXT_PUBLIC_GA_ID && (
    <script dangerouslySetInnerHTML={{
      __html: `
        (function() {
          var gaLoaded = false;
          var gaId = '${process.env.NEXT_PUBLIC_GA_ID}';
          
          function loadGA() {
            if (gaLoaded) return;
            gaLoaded = true;
            
            // Load gtag script
            var script = document.createElement('script');
            script.async = true;
            script.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
            document.head.appendChild(script);
            
            // Initialize gtag
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', gaId, {
              page_path: window.location.pathname,
            });
            window.gtag = gtag;
          }
          
          // Load on first user interaction
          ['mousedown', 'touchstart', 'keydown', 'scroll'].forEach(function(event) {
            window.addEventListener(event, loadGA, { once: true, passive: true });
          });
          
          // Fallback: load after 3 seconds if no interaction
          setTimeout(loadGA, 3000);
        })();
      `
    }} />
  )}
  
  {/* OneSignal - Deferred */}
  {process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID && (
    <>
      <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
      <script dangerouslySetInnerHTML={{
        __html: `
          window.OneSignalDeferred = window.OneSignalDeferred || [];
          OneSignalDeferred.push(async function(OneSignal) {
            await OneSignal.init({
              appId: "${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID}",
              allowLocalhostAsSecureOrigin: true,
            });
          });
        `
      }} />
    </>
  )}
  
  {/* Google Analytics - client-side helper (loaded dynamically) */}
  {GTM_ID ? <GAClient gaId={GTM_ID} /> : null}
  
  {/* Load AdSense after page content - improves FCP */}
  {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var script = document.createElement('script');
            script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}';
            script.async = true;
            script.crossOrigin = 'anonymous';
            
            // Load after window load + 500ms to prioritize FCP
            if (document.readyState === 'complete') {
              setTimeout(function() { document.head.appendChild(script); }, 500);
            } else {
              window.addEventListener('load', function() {
                setTimeout(function() { document.head.appendChild(script); }, 500);
              });
            }
          })();
        `
      }}
    />
  )}
      </body>
    </html>
  )
}
