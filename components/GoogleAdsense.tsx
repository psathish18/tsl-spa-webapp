'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

interface AdBannerProps {
  slot: string
  className?: string
}

export function AdBanner({ slot, className = '' }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)
  const pathname = usePathname()
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  useEffect(() => {
    if (!adRef.current) return

    // Function to check if AdSense is loaded
    const isAdSenseLoaded = () => {
      return typeof window !== 'undefined' && 
             window.adsbygoogle && 
             Array.isArray(window.adsbygoogle)
    }

    // Function to push ad
    const pushAd = () => {
      if (!adRef.current) return false

      try {
        const insElement = adRef.current
        
        // Clear any existing ad content from cache
        insElement.innerHTML = '';
        
        // Remove any existing status attributes
        insElement.removeAttribute('data-adsbygoogle-status');
        insElement.removeAttribute('data-ad-status');
        
        // Push new ad request
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        return true
      } catch (e) {
        console.error('AdSense push error:', e)
        return false
      }
    }

    // Retry logic
    const attemptPush = (delay: number) => {
      const timer = setTimeout(() => {
        if (!adRef.current) return

        if (isAdSenseLoaded()) {
          const success = pushAd()
          if (!success && retryCount < maxRetries) {
            setRetryCount(prev => prev + 1)
          }
        } else if (retryCount < maxRetries) {
          // AdSense not loaded yet, retry
          setRetryCount(prev => prev + 1)
        }
      }, delay)

      return () => clearTimeout(timer)
    }

    // Use longer delay for retries to give script more time to load
    const delay = retryCount === 0 ? 150 : 300 * retryCount
    const cleanup = attemptPush(delay)

    return cleanup
  }, [pathname, slot, retryCount])

  // Reset retry count when pathname changes
  useEffect(() => {
    setRetryCount(0)
  }, [pathname])

  // Use pathname as key to force complete remount on navigation
  return (
    <div className={`ad-container ${className}`} key={`ad-${slot}-${pathname}`}>
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
