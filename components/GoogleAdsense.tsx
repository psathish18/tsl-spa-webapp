'use client'

import { useEffect, useRef } from 'react'

interface AdBannerProps {
  slot: string
  className?: string
}

export function AdBanner({ slot, className = '' }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)
  const isAdPushed = useRef(false)

  useEffect(() => {
    // Only push if not already pushed and element exists
    if (isAdPushed.current || !adRef.current) return

    try {
      // Wait for next tick to ensure DOM is ready
      const timer = setTimeout(() => {
        if (adRef.current && typeof window !== 'undefined') {
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({})
          isAdPushed.current = true
        }
      }, 100)

      return () => clearTimeout(timer)
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [slot])

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
