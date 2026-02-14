'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HotPost {
  enabled: boolean
  slug: string
  title: string
  movieName?: string
  singerName?: string
}

export default function HotPostOverlay() {
  const [hotPost, setHotPost] = useState<HotPost | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Client-side fetch from static JSON file (no server/edge request)
    fetch('/hot-post.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch hot post config: ${res.status} ${res.statusText}`)
        }
        return res.json()
      })
      .then(data => {
        if (data.enabled) {
          setHotPost(data)
          // Delay visibility for smooth animation
          setTimeout(() => setIsVisible(true), 500)
        }
      })
      .catch(err => console.error('Failed to load hot post configuration from /hot-post.json:', err))
  }, [])

  if (!hotPost || !isVisible) {
    return null
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 animate-slide-up"
    >
      <Link
        href={`/${encodeURIComponent(hotPost.slug)}.html`}
        prefetch={false}
        className="block"
      >
        <div 
          className="hot-post-overlay mx-auto max-w-7xl px-4 py-3 shadow-lg backdrop-blur-sm"
          style={{
            backgroundColor: 'var(--header-surface)',
            borderTop: '2px solid var(--primary)',
          }}
        >
          <div className="flex items-center justify-center gap-3 group">
            {/* Hot/Fire Icon with pulsing animation */}
            <div className="flex-shrink-0 animate-pulse">
              <svg 
                className="w-6 h-6 sm:w-7 sm:h-7" 
                fill="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: '#ff4500' }}
              >
                <path d="M12 2c.41 0 .75.34.75.75v1.5c0 .41-.34.75-.75.75s-.75-.34-.75-.75v-1.5c0-.41.34-.75.75-.75zm0 16c.41 0 .75.34.75.75v1.5c0 .41-.34.75-.75.75s-.75-.34-.75-.75v-1.5c0-.41.34-.75.75-.75zm8.25-6c0 .41-.34.75-.75.75h-1.5c-.41 0-.75-.34-.75-.75s.34-.75.75-.75h1.5c.41 0 .75.34.75.75zm-14 0c0 .41-.34.75-.75.75h-1.5c-.41 0-.75-.34-.75-.75s.34-.75.75-.75h1.5c.41 0 .75.34.75.75zm11.03-5.53l1.06-1.06c.29-.29.77-.29 1.06 0 .29.29.29.77 0 1.06l-1.06 1.06c-.29.29-.77.29-1.06 0-.29-.29-.29-.77 0-1.06zm-12.37 12.37l1.06-1.06c.29-.29.77-.29 1.06 0 .29.29.29.77 0 1.06l-1.06 1.06c-.29.29-.77.29-1.06 0-.29-.29-.29-.77 0-1.06zm12.37 0c.29.29.29.77 0 1.06-.29.29-.77.29-1.06 0l-1.06-1.06c-.29-.29-.29-.77 0-1.06.29-.29.77-.29 1.06 0l1.06 1.06zm-12.37-12.37c.29.29.29.77 0 1.06-.29.29-.77.29-1.06 0l-1.06-1.06c-.29-.29-.29-.77 0-1.06.29-.29.77-.29 1.06 0l1.06 1.06z"/>
                <path d="M8.5 15.5c-1.5-2-1-4.5.5-6.5.5 1 1.5 1.5 2 2.5.5-1 1.5-2 3-2.5-1 2.5-1 4.5.5 6.5 1 1.5.5 3.5-1.5 4.5-2.5 1-5.5 0-5.5-3 0-1 .5-1.5 1-1.5z"/>
              </svg>
            </div>

            {/* Post Title - truncated on small screens */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span 
                  className="font-semibold text-sm sm:text-base truncate group-hover:underline transition-all"
                  style={{ color: 'var(--primary)' }}
                >
                  {hotPost.title}
                </span>
                {hotPost.movieName && (
                  <span 
                    className="text-xs sm:text-sm truncate"
                    style={{ color: 'var(--muted)' }}
                  >
                    {hotPost.movieName} {hotPost.singerName && `• ${hotPost.singerName}`}
                  </span>
                )}
              </div>
            </div>

            {/* Arrow icon - indicates clickable */}
            <div className="flex-shrink-0 group-hover:translate-x-1 transition-transform">
              <svg 
                className="w-5 h-5 sm:w-6 sm:h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: 'var(--primary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
