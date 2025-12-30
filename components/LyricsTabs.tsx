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
    // If no Tamil lyrics available, show only Tanglish without tabs
    return (
      <div className="lyrics-tab-container rounded-lg p-8">
        {tanglishContent}
      </div>
    );
  }

  return (
    <div className="lyrics-tab-container rounded-lg overflow-hidden">
      {/* Tab Headers */}
      <div className="flex lyrics-tab-header">
        <button
          onClick={() => setActiveTab('tamil')}
          className={`flex-1 px-6 py-4 text-lg font-semibold transition-all relative ${
            activeTab === 'tamil'
              ? 'lyrics-tab-active'
              : 'lyrics-tab-inactive'
          }`}
        >
          Tamil Lyrics
          {activeTab === 'tamil' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 lyrics-tab-indicator" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('tanglish')}
          className={`flex-1 px-6 py-4 text-lg font-semibold transition-all relative ${
            activeTab === 'tanglish'
              ? 'lyrics-tab-active'
              : 'lyrics-tab-inactive'
          }`}
        >
          Lyrics
          {activeTab === 'tanglish' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 lyrics-tab-indicator" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-8 lyrics-tab-content">
        {activeTab === 'tamil' ? tamilContent : tanglishContent}
      </div>
    </div>
  )
}
