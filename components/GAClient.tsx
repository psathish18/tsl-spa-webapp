"use client"

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function GAClient({ gaId }: { gaId?: string | null }) {
  const pathname = usePathname()
  const gtagTries = useRef(0)
  const titleTries = useRef(0)

  // Layout default title used as a sentinel — if the title still equals this we'll wait a bit
  const DEFAULT_SITE_TITLE = 'Tamil Song Lyrics - Latest Tamil Songs'

  function sendPageView() {
    const pageTitle = typeof document !== 'undefined' ? document.title : undefined
    const pagePath = pathname || (typeof location !== 'undefined' ? location.pathname : '/')

    // If the page title is still the generic layout title, wait a little for the route/component
    // to update the title (category pages fetch data client-side and update document.title).
    if (pageTitle === DEFAULT_SITE_TITLE && titleTries.current < 6) {
      titleTries.current += 1
      setTimeout(sendPageView, 200 * titleTries.current)
      return
    }

    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
      try {
        ;(window as any).gtag('event', 'page_view', {
          page_title: pageTitle,
          page_path: pagePath,
        })

        if (gaId) {
          ;(window as any).gtag('config', gaId, {
            page_title: pageTitle,
            page_path: pagePath,
          })
        }
      } catch (e) {
        // ignore errors from gtag
      }
    } else if (gtagTries.current < 5) {
      gtagTries.current += 1
      setTimeout(sendPageView, 300 * gtagTries.current)
    }
  }

  useEffect(() => {
    // reset tries on route change so we attempt again for every navigation
    gtagTries.current = 0
    titleTries.current = 0
    sendPageView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return null
}
