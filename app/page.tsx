'use client'

import { useState, useEffect } from 'react'

export default function HomePage() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setLoading(true)
        setError('')
        
        console.log('Fetching songs from API...')
        const response = await fetch('/api/songs', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        console.log('Response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('API Response:', data)
          
          if (data.feed && data.feed.entry) {
            setSongs(data.feed.entry)
            console.log('Songs loaded:', data.feed.entry.length)
          } else {
            console.log('No entries found in feed')
            setSongs([])
          }
        } else {
          const errorData = await response.json()
          console.error('API Error:', errorData)
          setError(`Failed to fetch songs: ${response.status} - ${errorData.error || 'Unknown error'}`)
        }
      } catch (error) {
        console.error('Network error:', error)
        setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchSongs()
  }, [])

  const getSongSlug = (song: any) => {
    // Use the enhanced songTitle if available
    if (song.songTitle) {
      return song.songTitle.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim()
    }
    
    // Try to get category
    if (song.category && Array.isArray(song.category)) {
      for (const cat of song.category) {
        if (cat.term && cat.term.startsWith('Song:')) {
          return cat.term.replace(/^Song:/, '').trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
        }
      }
    }
    
    // Fallback to title-based slug
    const title = song.title?.$t || song.title || 'unknown-song'
    return title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return 'Unknown date'
    }
  }

  const extractDescription = (content: string) => {
    if (!content) return 'No description available'
    const text = content.replace(/<[^>]*>/g, '').trim()
    return text.length > 150 ? text.substring(0, 150) + '...' : text
  }

  const getThumbnail = (song: any) => {
    // Try different possible thumbnail sources
    if (song.media$thumbnail && song.media$thumbnail.url) {
      return song.media$thumbnail.url
    }
    
    if (song['media:thumbnail'] && song['media:thumbnail'].url) {
      return song['media:thumbnail'].url
    }
    
    // Look for images in content
    const content = song.content?.$t || ''
    const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i)
    if (imgMatch) {
      return imgMatch[1]
    }
    
    return null
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Latest Tamil Song Lyrics
              </h2>
              
              {loading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading latest songs...</p>
                  <p className="text-sm text-gray-500 mt-2">Fetching from Blogger API...</p>
                </div>
              )}

              {error && (
                <div className="text-center py-12">
                  <div className="text-red-500 text-lg mb-4">Error: {error}</div>
                  <p className="text-gray-600">Please try again later</p>
                </div>
              )}

              {!loading && !error && songs.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg">No songs found</div>
                  <p className="text-gray-400 mt-2">Check back later for new updates!</p>
                </div>
              )}

              {!loading && !error && songs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {songs.map((song: any, index: number) => {
                    const songTitle = song.songTitle || song.title?.$t || song.title || `Song ${index + 1}`
                    const songContent = song.content?.$t || song.content || ''
                    const publishedDate = song.published?.$t || song.published || ''
                    const thumbnail = getThumbnail(song)
                    const slug = getSongSlug(song)
                    
                    // Get enhanced metadata
                    const movieName = song.movieName || ''
                    const singerName = song.singerName || ''
                    const lyricistName = song.lyricistName || ''
                    
                    return (
                      <article key={song.id?.$t || index} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                        <div className="relative h-48 bg-gray-200">
                          {thumbnail ? (
                            <img 
                              src={thumbnail} 
                              alt={songTitle}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Hide image if it fails to load
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                </svg>
                                <span className="text-gray-400 text-sm">Tamil Song</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Overlay for better readability */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute bottom-4 left-4 text-white">
                              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-6">
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                            <time dateTime={publishedDate}>
                              {formatDate(publishedDate)}
                            </time>
                            <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
                              Tamil Song
                            </span>
                          </div>
                          
                          <a href={`/song/${encodeURIComponent(slug)}.html`}>
                            <h3 className="font-semibold text-lg text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                              {songTitle}
                            </h3>
                          </a>
                          
                          {/* Show movie, singer, and lyricist info if available */}
                          {(movieName || singerName || lyricistName) && (
                            <div className="text-sm text-gray-600 mb-3 space-y-1">
                              {movieName && (
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-800">Movie:</span>
                                  <span className="ml-1">{movieName}</span>
                                </div>
                              )}
                              {singerName && (
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-800">Singer:</span>
                                  <span className="ml-1">{singerName}</span>
                                </div>
                              )}
                              {lyricistName && (
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-800">Lyrics:</span>
                                  <span className="ml-1">{lyricistName}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                            {extractDescription(songContent)}
                          </p>
                          
                          <a 
                            href={`/song/${encodeURIComponent(slug)}.html`}
                            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm group"
                          >
                            Read Lyrics
                            <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </a>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* Notification Subscription */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 7V3m0 18v-4m4-4h4m-8 0H8m-4 0H1m7-4V7m0 0L4 3m4 4l4-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Stay Updated</h3>
                </div>
                
                <p className="text-gray-600 text-sm mb-4">
                  Get notified instantly when new Tamil song lyrics are added to our collection.
                </p>
                
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                  Subscribe to Notifications
                </button>
                
                <p className="text-xs text-gray-500 mt-3">
                  You can unsubscribe at any time. Your privacy is important to us.
                </p>
              </div>

              {/* Sidebar Ad */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center h-96">
                <div className="text-gray-500 text-sm mb-2">Advertisement</div>
                <div className="text-gray-400 text-xs">Sidebar Ad</div>
                <div className="text-gray-400 text-xs mt-2">
                  Google AdSense will be integrated here
                </div>
              </div>
              
              {/* Popular Songs Section */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Popular This Week
                </h3>
                <div className="space-y-3">
                  {songs.length > 0 ? (
                    songs.slice(0, 5).map((song: any, index: number) => {
                      const songTitle = song.title?.$t || song.title || `Song ${index + 1}`
                      const slug = getSongSlug(song)
                      
                      return (
                        <div key={index} className="text-sm">
                          <a 
                            href={`/song/${encodeURIComponent(slug)}.html`}
                            className="text-blue-600 hover:text-blue-700 block truncate"
                            title={songTitle}
                          >
                            {songTitle}
                          </a>
                        </div>
                      )
                    })
                  ) : (
                    // Show placeholder links when no songs are loaded
                    [1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="text-sm">
                        <div className="text-gray-400">
                          Loading song {i}...
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Ad */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-gray-500 text-sm mb-2">Advertisement</div>
          <div className="text-gray-400 text-xs">Bottom Banner Ad</div>
          <div className="text-gray-400 text-xs mt-2">
            Google AdSense will be integrated here
          </div>
        </div>
      </div>
    </div>
  )
}
