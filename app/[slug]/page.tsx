import { Metadata } from 'next'
import Link from 'next/link'
import { cachedBloggerFetch } from '@/lib/dateBasedCache'
import sanitizeHtml from 'sanitize-html'

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

          {/* Stanza rendering:
              - Split on 2+ <br> tags to create stanzas
              - Render stanza HTML, and provide Tweet + WhatsApp share links
          */}
          {
            (() => {
              const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tsonglyrics.com'
              const pagePath = `${siteUrl}/${params.slug.replace('.html','')}.html`

              const stanzaSeparator = /(?:<br\s*\/?>(?:\s|\n|\r)*){2,}/i
              const rawStanzas = safeContent.split(stanzaSeparator).map(s => s.trim()).filter(Boolean)

              function stanzaToText(html: string) {
                // Convert <br> to newlines, remove other tags, preserve newlines
                const withNewlines = html.replace(/<br\s*\/?>/gi, '\n')
                const stripped = withNewlines.replace(/<[^>]+>/g, '')
                // Normalize spaces but keep single newlines
                return stripped.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).join('\n').trim()
              }

              function truncateForTwitter(text: string, max = 240) {
                if (text.length <= max) return text
                return text.slice(0, max - 1).trim() + '…'
              }

              // Build hashtags from categories (exclude Song:)
              const hashtagList = (song.category || [])
                .map((c: any) => c.term || '')
                .filter((t: string) => !t.startsWith('Song:') && !!t)
                .map((t: string) => t.replace(/^[^:]*:/, '').trim())
                .map((v: string) => v.replace(/[^a-zA-Z0-9]/g, ''))
                .filter(Boolean)
                .map((v: string) => `#${v}`)
              const hashtagsStr = hashtagList.join(' ')

              return (
                <div className="prose prose-lg max-w-none leading-relaxed text-gray-800" style={{ fontFamily: '"Noto Sans Tamil", "Tamil MN", "Latha", "Vijaya", sans-serif', lineHeight: '2' }}>
                  {rawStanzas.map((stanzaHtml, idx) => {
                    // Sanitize stanza HTML to remove scripts/styles and unsafe attributes
                    const cleanStanzaHtml = sanitizeHtml(stanzaHtml, {
                      allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'br' ]),
                      allowedAttributes: {
                        a: [ 'href', 'title', 'target', 'rel' ]
                      }
                    })

                    const plain = stanzaToText(cleanStanzaHtml)
                    // Add star emoji around snippet
                    const snippetWithStars = `⭐${plain}⭐`
                    // Ensure two blank lines after the snippet, and one newline after hashtags
                    const snippetWithBreaks = `${snippetWithStars}\n\n`
                    const hashtagsLine = hashtagsStr ? `${hashtagsStr}\n` : ''
                    // Append the page URL and a via attribution on its own line
                    const pageWithVia = `${pagePath} via @tsongslyrics`
                    const fullText = `${snippetWithBreaks}${hashtagsLine}${pageWithVia}`

                    // For Twitter, avoid duplicating the URL: use the page URL as the `url` param
                    // and exclude it from the tweet text. WhatsApp keeps the full text.
                    const textForTweet = `${snippetWithBreaks}${hashtagsLine}`.trim()
                    const tweetText = truncateForTwitter(textForTweet)
                    const encodedUrl = encodeURIComponent(pagePath)
                    const twitterHref = `https://twitter.com/intent/tweet?via=tsongslyrics&url=${encodedUrl}&text=${encodeURIComponent(tweetText)}`
                    // Preserve line breaks for WhatsApp by including them in the text payload
                    const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`

                    return (
                      <div key={idx} className="mb-6">
                        <div dangerouslySetInnerHTML={{ __html: cleanStanzaHtml }} />
            <div className="mt-3 flex justify-end items-center gap-3 text-sm text-gray-600">
                          <a
                            href={twitterHref}
                            target="_blank"
                            rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors opacity-90"
                            aria-label={`Share stanza ${idx + 1} on Twitter`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.26 4.26 0 0 0 1.88-2.35 8.49 8.49 0 0 1-2.7 1.03 4.24 4.24 0 0 0-7.22 3.87A12.04 12.04 0 0 1 3.15 4.6a4.24 4.24 0 0 0 1.31 5.66c-.64-.02-1.24-.2-1.76-.49v.05c0 2.06 1.46 3.78 3.4 4.17a4.27 4.27 0 0 1-1.75.07c.49 1.53 1.92 2.64 3.61 2.67A8.5 8.5 0 0 1 2 19.54 12.02 12.02 0 0 0 8.29 21c7.55 0 11.68-6.26 11.68-11.69v-.53A8.36 8.36 0 0 0 22.46 6z"/></svg>
                            <span>Tweet</span>
                          </a>

                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors opacity-90"
                            aria-label={`Share stanza ${idx + 1} on WhatsApp`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.81 11.81 0 0 0 12 0C5.37 0 .02 5.36.02 12c0 2.11.55 4.18 1.6 6.01L0 24l6.18-1.62A11.95 11.95 0 0 0 12 24c6.63 0 12-5.36 12-12 0-3.2-1.24-6.2-3.48-8.52zM12 21.6c-1.6 0-3.17-.42-4.56-1.22l-.33-.18-3.67.96.98-3.58-.21-.36A9.6 9.6 0 0 1 2.4 12C2.4 6.99 6.99 2.4 12 2.4S21.6 6.99 21.6 12 17.01 21.6 12 21.6zM17.1 14.7c-.28-.14-1.66-.82-1.92-.92-.26-.1-.45-.14-.64.14-.18.28-.7.92-.86 1.11-.16.18-.31.2-.59.07-.28-.14-1.18-.43-2.25-1.39-.83-.73-1.39-1.62-1.55-1.9-.16-.28-.02-.43.13-.57.13-.12.28-.31.42-.47.14-.16.18-.27.28-.45.09-.18.05-.34-.02-.47-.07-.12-.64-1.54-.88-2.12-.23-.56-.46-.48-.64-.49l-.55-.01c-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.28 0 1.34.98 2.64 1.12 2.82.14.18 1.93 3.12 4.68 4.36 3.24 1.46 3.24 1.03 3.82.97.59-.07 1.66-.68 1.9-1.34.25-.66.25-1.22.18-1.34-.07-.12-.26-.18-.54-.32z"/></svg>
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()
          }
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
