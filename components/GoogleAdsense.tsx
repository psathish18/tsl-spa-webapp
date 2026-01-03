'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

interface AdBannerProps {
  slot: string
  className?: string
}

export function AdBanner({ slot, className = '' }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)
  const pathname = usePathname() // Track route changes
  const attemptedPush = useRef(false)

  useEffect(() => {
    // Reset on pathname change (handles client-side navigation to ISR pages)
    attemptedPush.current = false
  }, [pathname])

  useEffect(() => {
    // Only push once per pathname
    if (attemptedPush.current || !adRef.current) return

    try {
      // Wait for next tick to ensure DOM is ready
      const timer = setTimeout(() => {
        if (adRef.current && typeof window !== 'undefined') {
          // Clear existing ad content first (important for cached pages)
          if (adRef.current.innerHTML.trim() !== '') {
            adRef.current.innerHTML = ''
          }
          
          // Push new ad request
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({})
          attemptedPush.current = true
        }
      }, 100)

      return () => clearTimeout(timer)
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [slot, pathname]) // Re-run when pathname changes

  return (
    <div className={`ad-container ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}

export function GoogleAdsense() {
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
    />
  )
}
