'use client'

import { useState } from 'react'

interface LyricsTabsProps {
  tamilContent: React.ReactNode
  tanglishContent: React.ReactNode
  hasTamilLyrics: boolean
}

export default function LyricsTabs({ tamilContent, tanglishContent, hasTamilLyrics }: LyricsTabsProps) {
  const [activeTab, setActiveTab] = useState<'tamil' | 'tanglish'>('tamil')

  if (!hasTamilLyrics) {
    // If no Tamil lyrics available, show only Tanglish
    return <div>{tanglishContent}</div>
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveTab('tamil')}
          className={`flex-1 px-6 py-4 text-lg font-semibold transition-all ${
            activeTab === 'tamil'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Tamil Lyrics
        </button>
        <button
          onClick={() => setActiveTab('tanglish')}
          className={`flex-1 px-6 py-4 text-lg font-semibold transition-all ${
            activeTab === 'tanglish'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Lyrics
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-8">
        {activeTab === 'tamil' ? tamilContent : tanglishContent}
      </div>
    </div>
  )
}
