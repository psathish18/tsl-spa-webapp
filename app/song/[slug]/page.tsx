'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Song {
  id: { $t: string }
  title: { $t: string }
  content: { $t: string }
  published: { $t: string }
  author: Array<{ name: { $t: string } }>
  category?: Array<{ term: string }>
  media$thumbnail?: { url: string }
  songTitle?: string
  movieName?: string
  singerName?: string
  lyricistName?: string
}

export default function SongDetailsPage({ params }: { params: { slug: string } }) {
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSongDetails = async () => {
      try {
        setLoading(true)
        setError('')
        
        // Remove .html extension if present
        const cleanSlug = params.slug.replace('.html', '')
        
        console.log('Fetching song details for:', cleanSlug)
        
        // First, get all songs to find the matching one
        const songsResponse = await fetch('/api/songs')
        if (!songsResponse.ok) {
          throw new Error('Failed to fetch songs')
        }
        
        const songsData = await songsResponse.json()
        const songs = songsData.feed?.entry || []
        
        // Find the song that matches our slug
        const matchingSong = songs.find((song: any) => {
          const songTitle = song.songTitle || song.title?.$t || ''
          const songSlug = songTitle.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
          
          return songSlug === cleanSlug || songSlug.includes(cleanSlug) || cleanSlug.includes(songSlug)
        })
        
        if (matchingSong) {
          setSong(matchingSong)
        } else {
          setError('Song not found')
        }
        
      } catch (error) {
        console.error('Error fetching song details:', error)
        setError(error instanceof Error ? error.message : 'Failed to load song')
      } finally {
        setLoading(false)
      }
    }

    fetchSongDetails()
  }, [params.slug])

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

  const extractLyrics = (content: string) => {
    if (!content) return 'Lyrics not available'
    
    // Clean up the HTML content but keep basic formatting
    let lyrics = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '') // Remove head
      .trim()
    
    return lyrics
  }

  const getThumbnail = () => {
    if (song?.media$thumbnail?.url) {
      return song.media$thumbnail.url
    }
    
    // Look for images in content
    const content = song?.content?.$t || ''
    const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i)
    if (imgMatch) {
      return imgMatch[1]
    }
    
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading song details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !song) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="text-6xl mb-4">🎵</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Song Not Found</h1>
            <p className="text-gray-600 mb-8">
              {error || 'The song you\'re looking for doesn\'t exist or has been removed.'}
            </p>
            <Link 
              href="/" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const songTitle = song.songTitle || song.title?.$t || 'Unknown Song'
  const movieName = song.movieName || ''
  const singerName = song.singerName || ''
  const lyricistName = song.lyricistName || ''
  const publishedDate = song.published?.$t || ''
  const lyrics = extractLyrics(song.content?.$t || '')
  const thumbnail = getThumbnail()

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx>{`
        .lyrics-content p {
          margin-bottom: 1rem;
        }
        .lyrics-content br {
          display: block;
          margin: 0.5rem 0;
          content: "";
        }
        .lyrics-content div {
          margin-bottom: 0.5rem;
        }
        .lyrics-content strong, .lyrics-content b {
          font-weight: bold;
        }
        .lyrics-content em, .lyrics-content i {
          font-style: italic;
        }
        .lyrics-content h1, .lyrics-content h2, .lyrics-content h3 {
          font-weight: bold;
          margin: 1rem 0 0.5rem 0;
        }
        .lyrics-content ul, .lyrics-content ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }
        .lyrics-content li {
          margin-bottom: 0.25rem;
        }
      `}</style>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="text-sm text-gray-500 mb-2">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <span className="mx-2">/</span>
            <span>Song Lyrics</span>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <article className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Song Header */}
              <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex flex-col md:flex-row gap-6">
                  {thumbnail && (
                    <div className="flex-shrink-0">
                      <img 
                        src={thumbnail} 
                        alt={songTitle}
                        className="w-32 h-32 object-cover rounded-lg shadow-md"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                      {songTitle}
                    </h1>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      {movieName && (
                        <div className="flex items-center">
                          <span className="font-semibold text-gray-800 w-16">Movie:</span>
                          <span>{movieName}</span>
                        </div>
                      )}
                      {singerName && (
                        <div className="flex items-center">
                          <span className="font-semibold text-gray-800 w-16">Singer:</span>
                          <span>{singerName}</span>
                        </div>
                      )}
                      {lyricistName && (
                        <div className="flex items-center">
                          <span className="font-semibold text-gray-800 w-16">Lyrics:</span>
                          <span>{lyricistName}</span>
                        </div>
                      )}
                      {publishedDate && (
                        <div className="flex items-center">
                          <span className="font-semibold text-gray-800 w-16">Date:</span>
                          <span>{formatDate(publishedDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lyrics Content */}
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  Song Lyrics
                </h2>
                
                <div className="prose max-w-none">
                  <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-blue-500">
                    <div 
                      className="lyrics-content text-gray-800 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: lyrics }}
                      style={{
                        fontFamily: 'serif',
                        fontSize: '16px',
                        lineHeight: '1.6'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Share Section */}
              <div className="px-6 py-4 bg-gray-50 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Share this song:
                  </div>
                  <div className="flex space-x-2">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors">
                      Facebook
                    </button>
                    <button className="bg-blue-400 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition-colors">
                      Twitter
                    </button>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors">
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* Ad Space */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="text-gray-500 text-sm mb-2">Advertisement</div>
                <div className="text-gray-400 text-xs">Song Page Ad</div>
                <div className="text-gray-400 text-xs mt-2">
                  Google AdSense will be integrated here
                </div>
              </div>

              {/* Navigation */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Navigation</h3>
                <div className="space-y-2">
                  <Link 
                    href="/" 
                    className="block text-blue-600 hover:text-blue-700 text-sm py-1"
                  >
                    ← Back to Latest Songs
                  </Link>
                  <div className="text-gray-400 text-sm py-1">More from this movie</div>
                  <div className="text-gray-400 text-sm py-1">More by this singer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Ad */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
