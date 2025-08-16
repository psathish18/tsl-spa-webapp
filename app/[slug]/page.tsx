import { Metadata } from 'next'
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

// Helper function to get consistent song title (shared between metadata and component)
function getSongTitle(song: any): string {
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

// Function to get song data for both page and metadata
async function getSongData(slug: string): Promise<Song | null> {
  try {
    // Remove .html extension if present
    const cleanSlug = slug.replace('.html', '')
    
    // Fetch all songs to find the matching one
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/songs`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch songs')
    }
    
    const data = await response.json()
    const songs = data.feed?.entry || []
    
    // Find the song that matches our slug using the original slug generation logic
    const matchingSong = songs.find((song: any) => {
      // Use the same slug generation logic as the home page
      let songSlug = '';
      
      // Priority 1: Use the API title (includes "lyrics" - better for SEO and migration)
      const apiTitle = song.title?.$t || song.title
      if (apiTitle) {
        songSlug = apiTitle.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .trim();
      } else if (song.songTitle) {
        // Priority 2: Use the enhanced songTitle if available
        songSlug = song.songTitle.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .trim();
      } else if (song.category && Array.isArray(song.category)) {
        // Priority 3: Try to get category (fallback)
        for (const cat of song.category) {
          if (cat.term && cat.term.startsWith('Song:')) {
            songSlug = cat.term.replace(/^Song:/, '').trim()
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim();
            break;
          }
        }
      }
      
      // Final fallback
      if (!songSlug) {
        songSlug = 'unknown-song'
      }
      
      return songSlug === cleanSlug
    })
    
    return matchingSong || null
  } catch (error) {
    console.error('Error fetching song:', error)
    return null
  }
}

// SEO-optimized metadata generation
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const song = await getSongData(params.slug)
  
  if (!song) {
    return {
      title: 'Song Lyrics Not Found | Tamil Song Lyrics',
      description: 'The requested Tamil song lyrics could not be found.',
    }
  }

  // Extract clean song title (remove "lyrics" if already present to avoid duplication)
  const fullTitle = getSongTitle(song)
  const cleanTitle = fullTitle.replace(/\s*lyrics?\s*/gi, '').trim()
  const movieName = song.movieName || ''
  
  // SEO-optimized title with consistent naming
  const seoTitle = `${fullTitle} | Tamil Song Lyrics`
  const seoDescription = movieName 
    ? `${fullTitle} in Tamil from ${movieName} movie. Read complete ${cleanTitle} song lyrics with meaning.`
    : `${fullTitle} in Tamil. Read complete ${cleanTitle} song lyrics with meaning and translation.`

  return {
    title: seoTitle,
    description: seoDescription,
    keywords: [
      `${cleanTitle} lyrics`,
      `${cleanTitle} tamil lyrics`,
      `${cleanTitle} song lyrics`,
      ...(movieName ? [`${movieName} songs lyrics`, `${cleanTitle} ${movieName}`] : []),
      'tamil song lyrics',
      'tamil lyrics',
      'song lyrics tamil'
    ].join(', '),
    openGraph: {
      title: `${fullTitle}`,
      description: seoDescription,
      type: 'article',
      publishedTime: song.published?.$t,
      locale: 'ta_IN',
      siteName: 'Tamil Song Lyrics',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${cleanTitle} Lyrics`,
      description: seoDescription,
    },
    alternates: {
      canonical: `https://tsonglyrics.com/${params.slug.replace('.html', '')}.html`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export default async function SongDetailsPage({ params }: { params: { slug: string } }) {
  const song = await getSongData(params.slug)

  if (!song) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Song Lyrics Not Found</h1>
          <p className="text-gray-600 mb-6">
            The song lyrics you&apos;re looking for might have been moved or doesn&apos;t exist.
          </p>
          <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            Browse All Songs
          </Link>
        </div>
      </div>
    )
  }

  // Extract clean data for display - use shared title function
  const fullTitle = getSongTitle(song)
  const cleanTitle = fullTitle.replace(/\s*lyrics?\s*/gi, '').trim() // For breadcrumbs
  const movieName = song.movieName || ''
  const singerName = song.singerName || song.author?.[0]?.name?.$t || 'Unknown Artist'
  const lyricistName = song.lyricistName || ''
  const content = song.content?.$t || ''
  const publishedDate = song.published?.$t ? new Date(song.published.$t) : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <article>
        {/* SEO breadcrumbs */}
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-gray-500">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>•</li>
            <li><Link href="/songs" className="hover:text-blue-600">Tamil Songs</Link></li>
            {movieName && (
              <>
                <li>•</li>
                <li><span className="hover:text-blue-600">{movieName}</span></li>
              </>
            )}
            <li>•</li>
            <li className="text-gray-900">{cleanTitle} Lyrics</li>
          </ol>
        </nav>

        <header className="mb-8">
          {/* SEO-optimized H1 with consistent title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {fullTitle}
          </h1>
          
          {/* Song metadata */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {movieName && (
                <div>
                  <span className="font-semibold text-gray-700">Movie:</span>
                  <span className="ml-2 text-gray-900">{movieName}</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-gray-700">Singer:</span>
                <span className="ml-2 text-gray-900">{singerName}</span>
              </div>
              {lyricistName && (
                <div>
                  <span className="font-semibold text-gray-700">Lyricist:</span>
                  <span className="ml-2 text-gray-900">{lyricistName}</span>
                </div>
              )}
              {publishedDate && (
                <div>
                  <span className="font-semibold text-gray-700">Published:</span>
                  <time dateTime={song.published?.$t} className="ml-2 text-gray-900">
                    {publishedDate.toLocaleDateString()}
                  </time>
                </div>
              )}
            </div>
          </div>

          {/* Tags/Categories */}
          {song.category && song.category.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {song.category.map((cat, index) => (
                  <span 
                    key={index}
                    className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                  >
                    {cat.term}
                  </span>
                ))}
              </div>
            </div>
          )}
        </header>
        
        {/* Structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MusicRecording",
              "name": cleanTitle,
              "description": `Tamil lyrics for ${cleanTitle}${movieName ? ` from ${movieName} movie` : ''}`,
              "inLanguage": "ta",
              "genre": "Tamil Music",
              ...(movieName && {
                "inAlbum": {
                  "@type": "MusicAlbum",
                  "name": movieName
                }
              }),
              "byArtist": {
                "@type": "Person",
                "name": singerName
              },
              ...(lyricistName && {
                "lyricist": {
                  "@type": "Person", 
                  "name": lyricistName
                }
              }),
              "datePublished": song.published?.$t,
              "publisher": {
                "@type": "Organization",
                "name": "Tamil Song Lyrics",
                "url": "https://tsonglyrics.com"
              },
              "mainEntity": {
                "@type": "CreativeWork",
                "name": `${cleanTitle} Lyrics`,
                "text": content.replace(/<[^>]*>/g, ''), // Remove HTML tags for schema
                "inLanguage": "ta"
              }
            })
          }}
        />
        
        {/* Main lyrics content */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-3">
            {cleanTitle} Tamil Lyrics
          </h2>
          
          <div 
            className="prose prose-lg max-w-none leading-relaxed text-gray-800"
            style={{ 
              fontFamily: '"Noto Sans Tamil", "Tamil MN", "Latha", "Vijaya", sans-serif',
              lineHeight: '2'
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* Related songs section placeholder */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">More Tamil Song Lyrics</h3>
          <div className="text-center py-8">
            <Link 
              href="/"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse All Songs
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}
