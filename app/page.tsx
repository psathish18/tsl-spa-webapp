import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
import { cachedBloggerFetch } from '@/lib/dateBasedCache'
import { AdBanner } from '@/components/GoogleAdsense'
import OneSignalSubscriptionCard from '@/components/OneSignalSubscriptionCard'
import { REVALIDATE_HOMEPAGE, REVALIDATE_BLOGGER_FETCH } from '@/lib/cacheConfig'

// Advanced revalidation config
// Extended to 30 days to reduce CPU usage on free tier
// Use manual revalidation API for immediate updates: /api/revalidate?path=/
export const revalidate = REVALIDATE_HOMEPAGE
export const dynamicParams = true

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

interface BloggerResponse {
  feed: {
    entry: Song[]
  }
}

async function getSongs(): Promise<Song[]> {
  try {
    // Use the date-based cached fetch - direct Blogger API call
    const data = await cachedBloggerFetch(
      `https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&max-results=10`,
      {
        next: {
          revalidate: REVALIDATE_BLOGGER_FETCH, // Match page revalidation - 30 days
          tags: ['songs-latest', 'homepage']
        }
      }
    );

    const songs = data.feed?.entry || []
    
    // Filter and process songs
    const songPosts = songs.filter((entry: any) => {
      return entry.category?.some((cat: any) => cat.term?.startsWith('Song:'))
    }).map((entry: any) => {
      // Extract song title from categories
      const songCategory = entry.category?.find((cat: any) => 
        cat.term?.startsWith('Song:')
      )
      const songTitle = songCategory ? songCategory.term.replace('Song:', '').trim() : entry.title?.$t

      // Extract other metadata
      const movieCategory = entry.category?.find((cat: any) => 
        cat.term?.startsWith('Movie:')
      )
      const singerCategory = entry.category?.find((cat: any) => 
        cat.term?.startsWith('Singer:')
      )
      const lyricsCategory = entry.category?.find((cat: any) => 
        cat.term?.startsWith('Lyrics:')
      )

      return {
        ...entry,
        songTitle,
        movieName: movieCategory?.term?.replace('Movie:', '') || '',
        singerName: singerCategory?.term?.replace('Singer:', '') || '',
        lyricistName: lyricsCategory?.term?.replace('Lyrics:', '') || '',
      }
    })

    return songPosts
  } catch (error) {
    console.error('Error fetching songs:', error)
    return []
  }
}

export const metadata: Metadata = {
  title: 'Tamil Song Lyrics - Latest Songs & Lyrics',
  description: 'Discover the latest Tamil song lyrics, movie songs, and popular music. Read and enjoy beautiful Tamil poetry and lyrics from your favorite movies and artists.',
  keywords: 'Tamil songs, Tamil lyrics, song lyrics, Tamil music, latest Tamil songs, Tamil movie songs',
  alternates: {
    canonical: 'https://tsonglyrics.com/',
  },
  openGraph: {
    title: 'Tamil Song Lyrics - Latest Songs & Lyrics',
    description: 'Discover the latest Tamil song lyrics, movie songs, and popular music.',
    type: 'website',
  },
}

export default async function HomePage() {
  const songs = await getSongs()

  const getSongTitle = (song: any) => {
    // Priority 1: Use the API title (includes "lyrics" - better for SEO and consistency)
    const apiTitle = song.title?.$t || song.title
    if (apiTitle) {
      return apiTitle
    }
    
    // Priority 2: Use the enhanced songTitle with "Lyrics" appended
    if (song.songTitle) {
      return song.songTitle.includes('lyrics') || song.songTitle.includes('Lyrics')
        ? song.songTitle
        : `${song.songTitle} Lyrics`
    }
    
    // Priority 3: Try to get category
    if (song.category && Array.isArray(song.category)) {
      for (const cat of song.category) {
        if (cat.term && cat.term.startsWith('Song:')) {
          const songName = cat.term.replace(/^Song:/, '').trim()
          return songName.includes('lyrics') || songName.includes('Lyrics')
            ? songName
            : `${songName} Lyrics`
        }
      }
    }
    
    // Final fallback
    return 'Unknown Song Lyrics'
  }

  const getSongSlug = (song: any) => {
    // Priority 1: Extract slug from API link array (rel: alternate)
    if (song.link && Array.isArray(song.link)) {
      const alternateLink = song.link.find((l: any) => l.rel === 'alternate')
      if (alternateLink?.href) {
        // Extract slug.html from the full URL
        // e.g., https://tsonglyricsapp.blogspot.com/p/song-name-lyrics.html -> song-name-lyrics
        const match = alternateLink.href.match(/\/([^\/]+\.html)$/)
        if (match) {
          return match[1].replace('.html', '')
        }
      }
    }
    
    // Fallback: Use the API title
    const apiTitle = song.title?.$t || song.title
    if (apiTitle) {
      return apiTitle.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim()
    }
    
    // Priority 3: Try to get category (fallback)
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
    
    // Final fallback
    return 'unknown-song'
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
      // Decode the URL and get higher resolution by replacing size parameter
      let imageUrl = decodeURIComponent(song.media$thumbnail.url)
      // Replace small thumbnail size (s72-c) with larger size (s400-c for better quality)
      imageUrl = imageUrl.replace(/\/s\d+-c\//, '/s400-c/')
      // console.log('Found media$thumbnail (enhanced):', imageUrl)
      return imageUrl
    }
    
    if (song['media:thumbnail'] && song['media:thumbnail'].url) {
      let imageUrl = decodeURIComponent(song['media:thumbnail'].url)
      imageUrl = imageUrl.replace(/\/s\d+-c\//, '/s400-c/')
      // console.log('Found media:thumbnail (enhanced):', imageUrl)
      return imageUrl
    }
    
    // Look for images in content
    const content = song.content?.$t || ''
    const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i)
    if (imgMatch) {
      let imageUrl = decodeURIComponent(imgMatch[1])
      // Also try to enhance resolution for content images
      imageUrl = imageUrl.replace(/\/s\d+-c\//, '/s400-c/')
      // console.log('Found image in content (enhanced):', imageUrl)
      return imageUrl
    }
    
    // console.log('No thumbnail found for song:', song.title?.$t || 'Unknown')
    return null
  }
  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Latest Tamil Song Lyrics
              </h2>
              
              {songs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg">No songs found</div>
                  <p className="text-gray-400 mt-2">Check back later for new updates!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {songs.map((song: any, index: number) => {
                    const songTitle = getSongTitle(song)
                    const songContent = song.content?.$t || song.content || ''
                    const publishedDate = song.published?.$t || song.published || ''
                    const thumbnail = getThumbnail(song)
                    const slug = getSongSlug(song)
                    
                    // Get enhanced metadata
                    const movieName = song.movieName || ''
                    const singerName = song.singerName || ''
                    const lyricistName = song.lyricistName || ''
                    
                    return (
                      <Link
                        key={song.id?.$t || index}
                        href={`/${encodeURIComponent(slug)}.html`}
                        className="group block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                      >
                        <article className="relative h-full">
                        <div className="relative h-48 overflow-hidden rounded-t-lg image-fallback">
                          {thumbnail ? (
                            <Image 
                              src={thumbnail} 
                              alt={songTitle}
                              fill
                              className="object-cover transition-all duration-500 hover:scale-105"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              priority={index < 6} // Prioritize first 6 images for above-the-fold loading
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center image-fallback">
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-3 image-fallback-circle rounded-full flex items-center justify-center">
                                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                  </svg>
                                </div>
                                <span className="text-blue-600 text-sm font-medium">Tamil Song Lyrics</span>
                                
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
                          <div className="flex items-center justify-start text-sm text-gray-500 mb-3">
                            <time dateTime={publishedDate}>
                              {formatDate(publishedDate)}
                            </time>
                          </div>
                          
                            <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                              {songTitle}
                            </h3>
                          
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
                          
                          {/* Intentionally removed explicit "Read Lyrics" text to make the whole card clickable */}
                        </div>
                        </article>
                      </Link>
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
              <OneSignalSubscriptionCard />

              {/* Sidebar Ad */}
              <AdBanner 
                slot="sidebar-1" 
                className="mb-6"
              />
              
              {/* Popular Songs Section */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Popular This Week
                </h3>
                <div className="space-y-3">
                  {songs.length > 0 ? (
                    songs.slice(0, 5).map((song: any, index: number) => {
                      const songTitle = getSongTitle(song)
                      const slug = getSongSlug(song)
                      
                      return (
                        <div key={index} className="text-sm">
                          <a 
                            href={`/${encodeURIComponent(slug)}.html`}
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
        <AdBanner 
          slot="bottom-banner-1" 
          className=""
        />
      </div>
    </div>
  )
}
