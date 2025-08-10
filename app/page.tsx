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
        const response = await fetch('/api/songs')
        if (response.ok) {
          const data = await response.json()
          setSongs(data.feed?.entry || [])
        } else {
          setError('Failed to fetch songs')
        }
      } catch (error) {
        console.error('Error fetching songs:', error)
        setError('Network error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchSongs()
  }, [])

  const getSongSlug = (song: any) => {
    const category = song.category?.[0]?.term
    if (category) {
      return category.replace(/^Song:/, '').trim()
    }
    return song.title.$t.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const extractDescription = (content: string) => {
    const text = content.replace(/<[^>]*>/g, '')
    return text.length > 150 ? text.substring(0, 150) + '...' : text
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Tamil Song Lyrics
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Discover the latest Tamil songs with lyrics and translations
            </p>
            <p className="text-lg mb-8 text-blue-200 max-w-2xl mx-auto">
              Your ultimate destination for Tamil music. Find the latest song lyrics, 
              discover new artists, and enjoy the beauty of Tamil poetry.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-blue-600 font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors">
                Explore Latest Songs
              </button>
              <button className="border-2 border-white text-white font-semibold py-3 px-8 rounded-lg hover:bg-white hover:text-blue-600 transition-colors">
                Subscribe for Updates
              </button>
            </div>
          </div>
        </div>
      </section>

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
                  {songs.map((song: any, index: number) => (
                    <article key={song.id?.$t || index} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                      <div className="relative h-48 bg-gray-200">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-gray-400 text-sm">
                            {song.media$thumbnail?.url ? (
                              <img 
                                src={song.media$thumbnail.url} 
                                alt={song.title.$t}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center">
                                <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                </svg>
                                Song Image
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                          <time dateTime={song.published.$t}>
                            {formatDate(song.published.$t)}
                          </time>
                          {song.category?.[0]?.term && (
                            <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
                              Song
                            </span>
                          )}
                        </div>
                        
                        <a href={`/song/${encodeURIComponent(getSongSlug(song))}`}>
                          <h3 className="font-semibold text-lg text-gray-900 mb-2 hover:text-blue-600 transition-colors line-clamp-2">
                            {song.title.$t}
                          </h3>
                        </a>
                        
                        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                          {extractDescription(song.content.$t)}
                        </p>
                        
                        <a 
                          href={`/song/${encodeURIComponent(getSongSlug(song))}`}
                          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm group"
                        >
                          Read Lyrics
                          <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                      </div>
                    </article>
                  ))}
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
                  {songs.slice(0, 5).map((song: any, index: number) => (
                    <div key={index} className="text-sm">
                      <a 
                        href={`/song/${encodeURIComponent(getSongSlug(song))}`}
                        className="text-blue-600 hover:text-blue-700 line-clamp-2"
                      >
                        {song.title?.$t || `Sample Tamil Song ${index + 1}`}
                      </a>
                    </div>
                  ))}
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
