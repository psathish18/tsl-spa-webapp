import { Metadata } from 'next'
import Link from 'next/link'
import { cachedBloggerFetch } from '@/lib/dateBasedCache'
import sanitizeHtml from 'sanitize-html'

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

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
    
    console.log(`Fetching song data for slug: ${cleanSlug}`)
    
    // Use direct Blogger search API to find older songs
    const searchTerms = cleanSlug.replace(/-/g, ' ')
    
    // Use date-based cached fetch - direct Blogger API call
    const data = await cachedBloggerFetch(
      `https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&q=${encodeURIComponent(searchTerms)}&max-results=10`
    )

    const songs = data.feed?.entry || []
    
    // Filter songs and find matching slug
    const songPosts = songs.filter((entry: any) => {
      return entry.category?.some((cat: any) => cat.term?.startsWith('Song:'))
    })
    
    const targetSong = songPosts.find((song: any) => {
      // Generate slug using same logic as home page
      let songSlug = '';
      
      const apiTitle = song.title?.$t || song.title
      if (apiTitle) {
        songSlug = apiTitle.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      }
      
      console.log(`Comparing: "${songSlug}" === "${cleanSlug}"`)
      return songSlug === cleanSlug;
    })

    if (!targetSong) {
      console.log(`No song found for slug: ${cleanSlug}`)
      return null
    }

    // Process the song data similar to /api/songs
    const songCategory = targetSong.category?.find((cat: any) => 
      cat.term?.startsWith('Song:')
    )
    const movieCategory = targetSong.category?.find((cat: any) => 
      cat.term?.startsWith('Movie:')
    )
    const singerCategory = targetSong.category?.find((cat: any) => 
      cat.term?.startsWith('Singer:')
    )
    const lyricsCategory = targetSong.category?.find((cat: any) => 
      cat.term?.startsWith('Lyrics:')
    )

    const processedSong = {
      ...targetSong,
      songTitle: songCategory ? songCategory.term.replace('Song:', '') : targetSong.title?.$t,
      movieName: movieCategory?.term?.replace('Movie:', '') || '',
      singerName: singerCategory?.term?.replace('Singer:', '') || '',
      lyricistName: lyricsCategory?.term?.replace('Lyrics:', '') || '',
    } as Song
    
    console.log(`Found song: ${processedSong.title?.$t}`)
    return processedSong
  } catch (error) {
    console.error('Error fetching song data:', error)
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

  // Remove image tags from Blogger HTML content to reduce page weight
  // Images in lyrics posts are rarely essential and can be heavy; strip them
  function stripImagesFromHtml(html: string): string {
    if (!html) return html
    // Remove <img ...> tags (self-closing or with closing tag)
    return html.replace(/<img\b[^>]*>(?:<\/img>)?/gi, '')
  }

  const safeContent = stripImagesFromHtml(content)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <article>
        {/* SEO breadcrumbs */}
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-gray-500">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            {song.category && (() => {
              // Find the actual movie category term from Blogger
              const movieCategory = song.category.find(cat => cat.term.startsWith('Movie:'));
              if (movieCategory) {
                const movieName = movieCategory.term.replace('Movie:', '');
                return (
                  <>
                    <li>•</li>
                    <li>
                      <Link 
                        href={`/category?category=${encodeURIComponent(movieCategory.term)}`}
                        className="hover:text-blue-600"
                      >
                        {movieName}
                      </Link>
                    </li>
                  </>
                );
              }
              return null;
            })()}
            <li>•</li>
            <li className="text-gray-900">{cleanTitle} Lyrics</li>
          </ol>
        </nav>

        <header className="mb-8">
          {/* SEO-optimized H1 with consistent title */}
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {fullTitle}
          </h1>
          
          {/* Published date on its own line */}
          {publishedDate && (
            <div className="mb-4">
              <span className="text-gray-600 text-sm">
                Published: {publishedDate.toLocaleDateString()}
              </span>
            </div>
          )}
          
          {/* Tags/categories on the next line */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {/* Display all category tags from Blogger API */}
              {song.category && song.category.map((cat, index) => {
                const term = cat.term;
                
                // Determine the style based on category type
                let bgColor = 'bg-indigo-100';
                let textColor = 'text-indigo-800';
                let hoverColor = 'hover:bg-indigo-200';
                
                if (term.startsWith('Movie:')) {
                  bgColor = 'bg-blue-100';
                  textColor = 'text-blue-800';
                  hoverColor = 'hover:bg-blue-200';
                } else if (term.startsWith('Singer:')) {
                  bgColor = 'bg-purple-100';
                  textColor = 'text-purple-800';
                  hoverColor = 'hover:bg-purple-200';
                } else if (term.startsWith('Lyrics:') || term.startsWith('Lyricist:')) {
                  bgColor = 'bg-orange-100';
                  textColor = 'text-orange-800';
                  hoverColor = 'hover:bg-orange-200';
                } else if (term.startsWith('Music:') || term.startsWith('OldMusic:')) {
                  bgColor = 'bg-green-100';
                  textColor = 'text-green-800';
                  hoverColor = 'hover:bg-green-200';
                }
                
                // Only skip Song: categories as they're song-specific, not useful for filtering
                if (term.startsWith('Song:')) {
                  return null;
                }
                
                return (
                  <Link
                    key={index}
                    href={`/category?category=${encodeURIComponent(term)}`}
                    className={`${bgColor} ${textColor} text-sm px-3 py-1 rounded-full font-medium ${hoverColor} transition-colors`}
                  >
                    {term}
                  </Link>
                );
              })}
            </div>
          </div>
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
        
        {/* Main lyrics content split into stanzas with share buttons */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-3">
            Tamil Lyrics
          </h2>

          {/* Inline stanza rendering to avoid hydration issues */}
          <div className="prose prose-lg max-w-none leading-relaxed text-gray-800" style={{ fontFamily: '"Noto Sans Tamil", "Tamil MN", "Latha", "Vijaya", sans-serif', lineHeight: '2' }} suppressHydrationWarning>
            {(() => {
              const siteUrl = 'https://tsonglyrics.com'
              const pagePath = `${siteUrl}/${params.slug.replace('.html','')}.html`
              const stanzaSeparator = /(?:<br\s*\/?>(?:\s|\n|\r)*){2,}/i
              const rawStanzas = safeContent.split(stanzaSeparator).map(s => s.trim()).filter(Boolean)

              function stanzaToText(html: string) {
                const withNewlines = html.replace(/<br\s*\/?>/gi, '\n')
                const stripped = withNewlines.replace(/<[^>]+>/g, '')
                return stripped.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).join('\n').trim()
              }

              function truncateForTwitter(text: string, max = 240) {
                if (text.length <= max) return text
                return text.slice(0, max - 1).trim() + '…'
              }

              const hashtagList = (song.category || [])
                .map((c: any) => c.term || '')
                .filter((t: string) => !t.startsWith('Song:') && !!t)
                .map((t: string) => t.replace(/^[^:]*:/, '').trim())
                .map((v: string) => v.replace(/[^a-zA-Z0-9]/g, ''))
                .filter(Boolean)
                .map((v: string) => `#${v}`)
              const hashtagsStr = hashtagList.join(' ')

              return rawStanzas.map((stanzaHtml, idx) => {
                const cleanStanzaHtml = sanitizeHtml(stanzaHtml, {
                  allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'br' ]),
                  allowedAttributes: {
                    a: [ 'href', 'title', 'target', 'rel' ]
                  }
                })

                const plain = stanzaToText(cleanStanzaHtml)
                const snippetWithStars = `⭐${plain}⭐`
                const snippetWithBreaks = `${snippetWithStars}\n\n`
                const hashtagsLine = hashtagsStr ? `${hashtagsStr}\n` : ''
                const pageWithVia = `${pagePath} via @tsongslyrics`
                const fullText = `${snippetWithBreaks}${hashtagsLine}${pageWithVia}`

                const textForTweet = `${snippetWithBreaks}${hashtagsLine}`.trim()
                const tweetText = truncateForTwitter(textForTweet)
                const encodedUrl = encodeURIComponent(pagePath)
                const twitterHref = `https://twitter.com/intent/tweet?via=tsongslyrics&url=${encodedUrl}&text=${encodeURIComponent(tweetText)}`
                const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`

                return (
                  <div key={idx} className="mb-6" suppressHydrationWarning>
                    <div dangerouslySetInnerHTML={{ __html: cleanStanzaHtml }} />
                    <div className="mt-3 flex justify-end items-center gap-3 text-sm text-gray-600">
                      <a
                        href={twitterHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors opacity-90"
                      >
                        Tweet
                      </a>
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors opacity-90"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
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
