'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function FloatingSearchButton() {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(true)

  const handleClick = () => {
    // Track search button click
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'search_button_click', {
        event_category: 'Search',
        event_label: 'Floating Search Button'
      })
    }
    router.push('/search')
  }

  if (!isVisible) return null

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
      aria-label="Search songs"
    >
      <svg 
        className="w-6 h-6 group-hover:scale-110 transition-transform" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
        />
      </svg>
      
      {/* Ripple effect on hover */}
      <span className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-20 group-hover:animate-ping"></span>
    </button>
  )
}
