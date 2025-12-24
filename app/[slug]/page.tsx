import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cachedBloggerFetch } from '@/lib/dateBasedCache'
import sanitizeHtml from 'sanitize-html'
import dynamic from 'next/dynamic'
// Client-side enhancer that attaches GA events to share anchors (keeps server render fast/SEO-friendly)
const ShareEnhancer = dynamic(() => import('../../components/ShareEnhancer').then(mod => mod.default), { ssr: false });
// Client stanza renderer (client-only, interactive share buttons)
const StanzaShareClient = dynamic(() => import('../../components/StanzaShareClient').then(mod => mod.default), { ssr: false });

// Server-side metadata generator so page <title> is correct on first load (helps GA)
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const song = await getSongData(params.slug)
  const title = song ? getSongTitle(song) : 'Tamil Song Lyrics'
  return {
    title
  }
}

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


// In-memory memoization map for SSR request lifecycle
const songDataPromiseMap = new Map<string, Promise<Song | null>>();

async function getSongData(slug: string): Promise<Song | null> {
  // Remove .html extension if present
    console.log("Raw slug received:", JSON.stringify(slug));
  const cleanSlug = slug.replace('.html', '')
    .replace(/[_-]\d+(?=[_-])/g, '_') // Replace _digits_ or -digits- with just _ (preserve separation between words)
    .replace(/[_-]\d+$/g, '') // Remove _digits or -digits at the end
    .replace(/[^a-z0-9\s-_]/g, '') // Allow underscore to pass through
    .replace(/[\s_]+/g, '-') // Convert spaces and underscores to single hyphen
    .replace(/-+/g, '-') // Clean up multiple hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  console.log("Clean slug after processing:", JSON.stringify(cleanSlug));
  if (songDataPromiseMap.has(cleanSlug)) {
    return songDataPromiseMap.get(cleanSlug)!;
  }
  const fetchPromise = (async () => {
    try {
      console.log(`Fetching song data for slug: ${cleanSlug}`);
      // Use direct Blogger search API to find older songs
      const searchTerms = cleanSlug.replace(/-/g, ' ');
      // Use date-based cached fetch - direct Blogger API call
      const data = await cachedBloggerFetch(
        `https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&q=${encodeURIComponent(searchTerms)}&max-results=10`, {
        next: {
          revalidate: 86400, // Cache for 24 hours
          tags: [`song-${cleanSlug}`] // Tag for on-demand revalidation
        }
      }
      );
      const songs = data.feed?.entry || [];
      // Filter posts that have Song: category
      const songPosts = songs.filter((entry: any) => {
        return entry.category?.some((cat: any) => cat.term?.startsWith('Song:') || cat.term?.startsWith('OldSong:'));
      });
      // Find matching slug
      const targetSong = songPosts.find((song: any) => {
        let songSlug = '';
        const apiTitle = song.title?.$t || song.title;
        if (apiTitle) {
          songSlug = apiTitle.toLowerCase()
            .trim()
            .replace(/\b\d+\b/g, '') // Remove standalone digits (e.g., "2" in "2 Point 0")
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Convert spaces to hyphens
            .replace(/-+/g, '-') // Clean up multiple hyphens
            .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens

        }
        console.log(`songSlug from posts: ${songSlug}`);
        return songSlug === cleanSlug || songSlug.startsWith(`${cleanSlug}`);
      });
      if (!targetSong) {
        console.log(`No song found for slug: ${cleanSlug}`);
        return null;
      }
      const songCategory = targetSong.category?.find((cat: any) => cat.term?.startsWith('Song:'));
      const movieCategory = targetSong.category?.find((cat: any) => cat.term?.startsWith('Movie:'));
      const singerCategory = targetSong.category?.find((cat: any) => cat.term?.startsWith('Singer:'));
      const lyricsCategory = targetSong.category?.find((cat: any) => cat.term?.startsWith('Lyrics:'));
      const processedSong = {
        ...targetSong,
        songTitle: songCategory ? songCategory.term.replace('Song:', '') : targetSong.title?.$t,
        movieName: movieCategory?.term?.replace('Movie:', '') || '',
        singerName: singerCategory?.term?.replace('Singer:', '') || '',
        lyricistName: lyricsCategory?.term?.replace('Lyrics:', '') || '',
      } as Song;
      console.log(`Found song: ${processedSong.title?.$t}`);
      return processedSong;
    } catch (error) {
      console.error('Error fetching song data:', error);
      return null;
    }
  })();
  songDataPromiseMap.set(cleanSlug, fetchPromise);
  return fetchPromise;
}

export default async function SongDetailsPage({ params }: { params: { slug: string } }) {
  const song = await getSongData(params.slug)

  if (!song) {
    // Return 404 status instead of custom "not found" page
    notFound()
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

  // Split into sanitized stanzas server-side to avoid importing server-only packages in client code
  // Support multiple HTML patterns used by Blogger: <br>, <br/>, <br />, <br></br> and paragraph boundaries </p><p>
  const stanzaSeparator = /(?:<br\b[^>]*>(?:\s*<\/br>)?\s*){2,}|<\/p>\s*<p\b[^>]*>/i
  const rawStanzas = safeContent.split(stanzaSeparator).map(s => s.trim()).filter(Boolean)
  const sanitizeOptions = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'br' ]),
    allowedAttributes: { a: [ 'href', 'title', 'target', 'rel' ] }
  }
  const stanzas = rawStanzas.map(s => sanitizeHtml(s, sanitizeOptions))

  // // Debugging: log sizes to help identify empty content issues in production builds
  // try {
  //   console.log('DEBUG: safeContent length =', (safeContent || '').length)
  //   console.log('DEBUG: rawStanzas count =', rawStanzas.length)
  //   console.log('DEBUG: stanzas count =', stanzas.length)
  //   if (stanzas.length > 0) {
  //     console.log('DEBUG: first stanza preview:', stanzas[0].slice(0, 120))
  //   }
  // } catch (e) {
  //   console.warn('DEBUG: could not log stanza debug info', e)
  // }

  // Build hashtag list and item_cat once on the server so we can render share anchors
  const hashtagList = (song.category || [])
    .map((c: any) => c.term || '')
    .filter((t: string) => !t.startsWith('Song:') && !!t)
    .map((t: string) => t.replace(/^[^:]*:/, '').trim())
    .map((v: string) => v.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .map((v: string) => `#${v}`);
  const hashtagsStr = hashtagList.join(' ');
  let itemCat = '';
  if (song.category) {
    const songCat = song.category.find((cat: any) => cat.term && cat.term.startsWith('Song:'));
    if (songCat) itemCat = songCat.term;
  }

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
                    className={`category-pill ${bgColor} ${textColor} text-sm px-3 py-1 rounded-full font-medium ${hoverColor} transition-colors`}
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
          <div
            className="prose prose-lg max-w-none leading-relaxed text-gray-800"
            style={{ lineHeight: '2' }}
            data-server-stanzas-count={stanzas ? String(stanzas.length) : '0'}
          >
            {/* Server-rendered stanza blocks so content is visible immediately for SEO and UX */}
            {stanzas && stanzas.length > 0 ? (
              stanzas.map((stanzaHtml, idx) => {
                // Build snippet and attributes for client enhancer
                const plain = stanzaHtml.replace(/<br\s*\/?/gi, '\n').replace(/<[^>]+>/g, '').split('\n').map(l=>l.replace(/\s+/g,' ').trim()).join('\n').trim();
                const snippetWithStars = `⭐${plain}⭐`;
                const snippetForAttr = snippetWithStars;
                const hashtagsAttr = hashtagsStr;
                const pageWithPath = `https://tsonglyrics.com/${params.slug.replace('.html','')}.html`;
                const twitterHref = `https://twitter.com/intent/tweet?via=tsongslyrics&url=${encodeURIComponent(pageWithPath)}&text=${encodeURIComponent(snippetWithStars + (hashtagsAttr ? '\n' + hashtagsAttr : ''))}`;
                const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(snippetWithStars + '\n\n' + (hashtagsAttr ? hashtagsAttr + '\n' : '') + pageWithPath + ' via @tsongslyrics')}`;
                return (
                  <div key={idx} className="mb-6">
                    <div dangerouslySetInnerHTML={{ __html: stanzaHtml }} />
                    <div className="mt-3 flex justify-end items-center gap-3 text-sm text-gray-600">
                      <a href={twitterHref} target="_blank" rel="noopener noreferrer" data-snippet={snippetForAttr} data-hashtags={hashtagsAttr} data-itemcat={itemCat} className="share-pill twitter">Tweet !!!</a>
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" data-snippet={snippetForAttr} data-hashtags={hashtagsAttr} data-itemcat={itemCat} className="whatsapp-only share-pill whatsapp">WhatsApp !!!</a>
                    </div>
                  </div>
                );
              })
            ) : (
              // Fallback: render sanitized full content if stanza splitting didn't produce fragments
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(safeContent, sanitizeOptions) }} />
            )}
            {/* Client-side enhancer attaches GA events to the above share anchors */}
            <ShareEnhancer />
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
