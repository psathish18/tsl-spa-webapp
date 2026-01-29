import { Metadata } from 'next'
import Link from 'next/link'
import { cachedBloggerFetch } from '@/lib/dateBasedCache'
import sanitizeHtml from 'sanitize-html'
import dynamic from 'next/dynamic'
import NotFoundSuggestions from '@/components/NotFoundSuggestions'
import { REVALIDATE_SONG_PAGE, REVALIDATE_BLOGGER_FETCH, REVALIDATE_TAMIL_LYRICS } from '@/lib/cacheConfig'
import {
  stripImagesFromHtml,
  htmlToPlainText,
  formatSnippetWithStars,
  buildHashtags,
  getSongCategory,
  buildTwitterShareUrl,
  buildWhatsAppShareUrl,
  splitAndSanitizeStanzas,
  splitAndSanitizeSections,
  STANZA_SEPARATOR,
  DEFAULT_SANITIZE_OPTIONS,
  ContentSections
} from '@/lib/lyricsUtils'
import {
  extractSnippet,
  generateSongDescription,
  extractSongMetadata,
  SONG_DESCRIPTION_SNIPPET_LENGTH,
  hasEnglishTranslationContent,
  generateKeywords
} from '@/lib/seoUtils'
import { fetchFromBlob } from '@/lib/blobStorage'
import type { SongBlobData } from '@/scripts/types/song-blob.types'
// Client-side enhancer that attaches GA events to share anchors (keeps server render fast/SEO-friendly)
const ShareEnhancer = dynamic(() => import('../../components/ShareEnhancer').then(mod => mod.default), { ssr: false });
// Client stanza renderer (client-only, interactive share buttons)
const StanzaShareClient = dynamic(() => import('../../components/StanzaShareClient').then(mod => mod.default), { ssr: false });
// Tab component for switching between Tamil and Tanglish lyrics
const LyricsTabs = dynamic(() => import('../../components/LyricsTabs').then(mod => mod.default), { ssr: false });
// Related songs component
import RelatedSongs from '@/components/RelatedSongs'

// Enable ISR for song pages - revalidate every 30 days
// Extended to reduce CPU usage on free tier
// Use manual revalidation API for immediate updates: /api/revalidate?path=/song-slug.html
export const revalidate = REVALIDATE_SONG_PAGE

// Server-side metadata generator so page <title> is correct on first load (helps GA)
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  console.log("Raw slug received:", JSON.stringify(params.slug));
  const { song, fromBlob, blobData } = await getSongDataWithBlobPriority(params.slug)
  
  if (!song) {
    return {
      title: 'Song Not Found - Tamil Song Lyrics',
      description: 'The requested song lyrics could not be found. Browse our collection of latest Tamil song lyrics.',
    }
  }
  
  // If data is from blob, use the optimized SEO metadata
  if (fromBlob && blobData) {
    const canonicalSlug = params.slug.endsWith('.html') ? params.slug : `${params.slug}.html`
    const canonicalUrl = `https://www.tsonglyrics.com/${canonicalSlug}`
    
    return {
      title: blobData.seo.title,
      description: blobData.seo.description,
      keywords: `${blobData.seo.keywords}`,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: blobData.seo.title,
        description: blobData.seo.description,
        type: 'article',
        url: canonicalUrl,
        siteName: 'Tamil Song Lyrics',
        ...(blobData.thumbnail && {
          images: [
            {
              url: blobData.thumbnail.replace(/\/s\d+-c\//, '/s400-c/'),
              width: 400,
              height: 400,
              alt: blobData.title,
            }
          ]
        })
      },
      twitter: {
        card: 'summary',
        title: blobData.seo.title,
        description: blobData.seo.description,
        ...(blobData.thumbnail && {
          images: [blobData.thumbnail.replace(/\/s\d+-c\//, '/s400-c/')]
        })
      }
    }
  }
  
  // Fallback: Use Blogger data (existing implementation)
  const title = getSongTitle(song)
  const content = song.content?.$t || ''
  
  // Extract meaningful labels from categories
  const metadata = extractSongMetadata(song.category, song.title.$t)
  
  // Get a snippet from the lyrics content
  const snippet = extractSnippet(stripImagesFromHtml(content), SONG_DESCRIPTION_SNIPPET_LENGTH)
  
  // Generate SEO-optimized description
  const description = generateSongDescription({
    entry: song,
    title: metadata.songTitle,
    snippet,
    movie: metadata.movieName,
    singer: metadata.singerName,
    lyricist: metadata.lyricistName,
    music: metadata.musicName,
    actor: metadata.actorName
  })
  
  // console.log("description", description)
  // Ensure slug has .html extension for canonical URL
  const canonicalSlug = params.slug.endsWith('.html') ? params.slug : `${params.slug}.html`
  const canonicalUrl = `https://www.tsonglyrics.com/${canonicalSlug}`
  
  // Build keywords from categories
  
  return {
    title,
    description,
    keywords: generateKeywords(song, metadata),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonicalUrl,
      siteName: 'Tamil Song Lyrics',
      ...(song.media$thumbnail?.url && {
        images: [
          {
            url: song.media$thumbnail.url.replace(/\/s\d+-c\//, '/s400-c/'),
            width: 400,
            height: 400,
            alt: title,
          }
        ]
      })
    },
    twitter: {
      card: 'summary',
      title,
      description,
      ...(song.media$thumbnail?.url && {
        images: [song.media$thumbnail.url.replace(/\/s\d+-c\//, '/s400-c/')]
      })
    }
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
// These maps are cleared after a timeout to prevent stale data in warm serverless containers
const songDataPromiseMap = new Map<string, Promise<Song | null>>();
const tamilLyricsPromiseMap = new Map<string, Promise<Song | null>>();
const blobDataCache = new Map<string, Promise<{ 
  song: Song | null, 
  fromBlob: boolean,
  blobData?: SongBlobData 
}>>();

// Clear memoization maps after 5 minutes to prevent stale data in production
if (typeof global !== 'undefined') {
  setInterval(() => {
    if (songDataPromiseMap.size > 0) {
      console.log(`Clearing ${songDataPromiseMap.size} memoized song promises`);
      songDataPromiseMap.clear();
    }
    if (tamilLyricsPromiseMap.size > 0) {
      console.log(`Clearing ${tamilLyricsPromiseMap.size} memoized Tamil lyrics promises`);
      tamilLyricsPromiseMap.clear();
    }
    if (blobDataCache.size > 0) {
      console.log(`Clearing ${blobDataCache.size} memoized blob data`);
      blobDataCache.clear();
    }
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Fetch song data with Blob Storage priority
 * Strategy: Try blob storage first, fallback to Blogger API
 * This reduces Vercel function invocations and improves performance
 */
async function getSongDataWithBlobPriority(slug: string): Promise<{ 
  song: Song | null, 
  fromBlob: boolean,
  blobData?: SongBlobData 
}> {
  const cleanSlug = slug.replace('.html', '')
  
  // Check cache first to avoid duplicate fetches
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && blobDataCache.has(cleanSlug)) {
    // console.log(`✅ Using cached blob data for: ${cleanSlug}`)
    return blobDataCache.get(cleanSlug)!
  }
  
  // Create the fetch promise
  const fetchPromise = (async () => {
    // Step 1: Try to fetch from Vercel Blob storage first
    try {
      const blobData = await fetchFromBlob(cleanSlug)
      
      if (blobData) {
        console.log(`✅ Using blob data for: ${cleanSlug}`)
        
        // Convert blob data to Song format for compatibility
        // This allows the page to work with both data sources
        const songFromBlob: Song = {
          id: { $t: blobData.id },
          title: { $t: blobData.title },
          content: { $t: blobData.stanzas.join('<br /><br />') }, // Join stanzas with double line breaks
          published: { $t: blobData.published },
          author: [{ name: { $t: 'Tamil Song Lyrics' } }],
          category: blobData.category.map(cat => ({ term: cat })),
          media$thumbnail: blobData.thumbnail ? { url: blobData.thumbnail } : undefined,
          songTitle: blobData.title,
          movieName: blobData.movieName,
          singerName: blobData.singerName,
          lyricistName: blobData.lyricistName,
        }
        
        return { song: songFromBlob, fromBlob: true, blobData }
      }
    } catch (error) {
      console.error('❌ Blob fetch failed, falling back to Blogger:', error)
    }
    
    // Step 2: Fallback to Blogger API (existing implementation)
    console.log(`📡 Falling back to Blogger API for: ${cleanSlug}`)
    const bloggerSong = await getSongData(cleanSlug)
    
    return { song: bloggerSong, fromBlob: false }
  })()
  
  // Cache the promise
  blobDataCache.set(cleanSlug, fetchPromise)
  
  return fetchPromise
}

async function getSongData(slug: string): Promise<Song | null> {
  // Remove .html extension if present
  const cleanSlug = slug.replace('.html', '')
    .replace(/[_-]\d+(?=[_-])/g, '_') // Replace _digits_ or -digits- with just _ (preserve separation between words)
    .replace(/[_-]\d+$/g, '') // Remove _digits or -digits at the end
    .replace(/[^a-z0-9\s-_]/g, '') // Allow underscore to pass through
    .replace(/[\s_]+/g, '-') // Convert spaces and underscores to single hyphen
    .replace(/-+/g, '-') // Clean up multiple hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    // console.log("Clean slug after processing:", JSON.stringify(cleanSlug));
    // convert to camel case for logging replacing hyphens with spaces and capitalizing each word
    // const camelCaseTitle = cleanSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    // console.log("Clean slug to title :", camelCaseTitle);

  // Skip in-memory cache in development to always fetch fresh data
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && songDataPromiseMap.has(cleanSlug)) {
    return songDataPromiseMap.get(cleanSlug)!;
  }
  const fetchPromise = (async () => {
    try {
      // console.log(`Fetching song data for slug: ${cleanSlug}`);
      // Use direct Blogger search API to find older songs
      const searchTerms = cleanSlug.replace(/-/g, ' ');
      // Use date-based cached fetch - direct Blogger API call
      const data = await cachedBloggerFetch(
        `https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&q=${encodeURIComponent(searchTerms)}&max-results=100`, {
        next: {
          revalidate: REVALIDATE_BLOGGER_FETCH, // Match page revalidation - 30 days
          tags: [`song-${cleanSlug}`] // Tag for on-demand revalidation
        }
      }
      );
      const songs = data.feed?.entry || [];
      // Filter posts that have Song: category
      const songPosts = songs;
      // .filter((entry: any) => {
      //   return entry.category?.some((cat: any) => cat.term?.startsWith('Song:') || cat.term?.startsWith('OldSong:'));
      // });
      
      // If we get exactly one song result, use it immediately (exact match)
      // Otherwise, find matching slug from multiple results
      const targetSong = songPosts.length === 1 
        ? songPosts[0]
        : songPosts.find((song: any) => {
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
        return songSlug === cleanSlug || songSlug.startsWith(`${cleanSlug}`) || cleanSlug.startsWith(`${songSlug}`);
      });
      if (!targetSong) {
        console.log(`No song found for slug: ${cleanSlug}`);
        // Don't cache "not found" results - remove from memoization map
        songDataPromiseMap.delete(cleanSlug);
        // Revalidate the cache tag to force fresh data on next request
        const { revalidateTag } = await import('next/cache');
        revalidateTag(`song-${cleanSlug}`);
        return null;
      }
      
      // Log CDN miss with matched Blogger entry details
      const songCategory = targetSong.category?.find((cat: any) => cat.term?.startsWith('Song:'));
      const movieCategory = targetSong.category?.find((cat: any) => cat.term?.startsWith('Movie:'));
      console.log(`[CDN_MISS] Raw Slug: ${slug} | Clean Slug: ${cleanSlug} | Blob File: ${slug.replace('.html', '')}.json | Blogger Song: ${songCategory?.term || 'N/A'} | Blogger Movie: ${movieCategory?.term || 'N/A'}`);
      
      const singerCategory = targetSong.category?.find((cat: any) => cat.term?.startsWith('Singer:'));
      const lyricsCategory = targetSong.category?.find((cat: any) => cat.term?.startsWith('Lyrics:'));
      const processedSong = {
        ...targetSong,
        songTitle: songCategory ? songCategory.term.replace('Song:', '') : targetSong.title?.$t,
        movieName: movieCategory?.term?.replace('Movie:', '') || '',
        singerName: singerCategory?.term?.replace('Singer:', '') || '',
        lyricistName: lyricsCategory?.term?.replace('Lyrics:', '') || '',
      } as Song;
      // console.log(`Found song: ${processedSong.title?.$t}`);
      return processedSong;
    } catch (error) {
      console.error('Error fetching song data:', error);
      // Don't cache errors - remove from memoization map
      songDataPromiseMap.delete(cleanSlug);
      return null;
    }
  })();
  songDataPromiseMap.set(cleanSlug, fetchPromise);
  return fetchPromise;
}

// Fetch Tamil lyrics from Tamil Blogger site
async function getTamilLyrics(songCategory: string): Promise<Song | null> {
  if (!songCategory) return null;
  
  // Skip in-memory cache in development to always fetch fresh data
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && tamilLyricsPromiseMap.has(songCategory)) {
    return tamilLyricsPromiseMap.get(songCategory)!;
  }
  
  const fetchPromise = (async () => {
    try {
      // console.log(`Fetching Tamil lyrics for: ${songCategory}`);
      // Search in Tamil blogger site using the Song: category
      const data = await cachedBloggerFetch(
        `https://tsonglyricsapptamil.blogspot.com/feeds/posts/default/-/${encodeURIComponent(songCategory)}?alt=json&max-results=5`,
        {
          next: {
            revalidate: REVALIDATE_TAMIL_LYRICS, // Match page revalidation - 30 days
            tags: [`tamil-lyrics-${songCategory}`]
          }
        }
      );
      
      const entries = data.feed?.entry || [];
      if (entries.length === 0) {
        console.log(`No Tamil lyrics found for: ${songCategory}`);
        // Don't cache "not found" results - remove from memoization map
        tamilLyricsPromiseMap.delete(songCategory);
        // Revalidate the cache tag to force fresh data on next request
        const { revalidateTag } = await import('next/cache');
        revalidateTag(`tamil-lyrics-${songCategory}`);
        return null;
      }
      
      // Return the first matching entry
      const tamilSong = entries[0];
      // console.log(`Found Tamil lyrics: ${tamilSong.title?.$t}`);
      return tamilSong as Song;
    } catch (error) {
      console.error('Error fetching Tamil lyrics:', error);
      // Don't cache errors - remove from memoization map
      tamilLyricsPromiseMap.delete(songCategory);
      return null;
    }
  })();
  
  tamilLyricsPromiseMap.set(songCategory, fetchPromise);
  return fetchPromise;
}

export default async function SongDetailsPage({ params }: { params: { slug: string } }) {
  // Fetch song data with blob storage priority
  const { song, fromBlob, blobData } = await getSongDataWithBlobPriority(params.slug)

  if (!song) {
    // Return custom 404 with smart suggestions based on the slug
    return (
      <div className="min-h-screen bg-white px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* 404 Header */}
          <div className="text-center mb-12">
            <div className="mb-6">
              <h1 className="text-8xl font-bold text-gray-200">404</h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Song Lyrics Not Found
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We couldn&apos;t find the song lyrics you&apos;re looking for. The song might have been moved, 
              renamed, or doesn&apos;t exist yet. Check out these suggestions below!
            </p>
          </div>

          {/* Smart Suggestions with the actual slug */}
          <NotFoundSuggestions searchSlug={params.slug} />

          {/* Action Button */}
          <div className="mt-12 flex justify-center items-center">
            <Link
              href="/"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold 
                       hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Browse All Songs
            </Link>
          </div>

          {/* Additional Help */}
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>
              Still can&apos;t find what you need? Try our{' '}
              <Link href="/" className="text-blue-600 hover:underline">
                homepage
              </Link>{' '}
              to discover the latest Tamil song lyrics.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Fetch Tamil lyrics with timeout - don't block page render for Tamil lyrics
  let tamilStanzas: string[] = [];
  
  // If data is from blob, use the pre-processed Tamil stanzas (no API call needed)
  // Note: Trust blob data even if tamilStanzas is empty - don't fall back to API
  if (fromBlob && blobData) {
    tamilStanzas = blobData.tamilStanzas || []
    if (tamilStanzas.length > 0) {
      console.log(`✅ Using ${tamilStanzas.length} Tamil lyrics from blob (no API call)`)
    }
    // No else - if empty, we trust blob data and don't fetch from API
  } else if (song.category) {
    // Fallback: Fetch Tamil lyrics from Blogger API only if blob data not available
    const songCat = getSongCategory(song.category);
    if (songCat) {
      // Use Promise.race with timeout to prevent Tamil lyrics from blocking
      try {
        const tamilSong = await Promise.race([
          getTamilLyrics(songCat),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)) // 1.5s timeout
        ]);
        if (tamilSong) {
          const tamilContent = tamilSong.content?.$t || '';
          const safeTamilContent = stripImagesFromHtml(tamilContent);
          tamilStanzas = splitAndSanitizeStanzas(safeTamilContent, sanitizeHtml);
        }
      } catch (error) {
        console.error('Tamil lyrics fetch failed or timed out:', error);
        // Continue without Tamil lyrics
      }
    }
  }

  // Extract clean data for display - use shared title function
  const fullTitle = getSongTitle(song)
  const cleanTitle = fullTitle
  const content = song.content?.$t || ''
  const publishedDate = song.published?.$t ? new Date(song.published.$t) : null

  const safeContent = stripImagesFromHtml(content)
  
  // Extract meaningful labels for structured data (same as metadata)
  const metadata = extractSongMetadata(song.category, song.title.$t)
  const movieName = metadata.movieName || song.movieName || ''
  const singerName = metadata.singerName || song.singerName || ''
  const lyricistName = metadata.lyricistName || song.lyricistName || ''
  const musicName = metadata.musicName || ''
  const songName = metadata.songTitle || cleanTitle
  
  // Get lyrics snippet for structured data description (same as metadata)
  const lyricsSnippet = extractSnippet(safeContent, SONG_DESCRIPTION_SNIPPET_LENGTH)
  
  // Generate SEO-optimized description for structured data
  const structuredDescription = generateSongDescription({
    entry: song,
    title: cleanTitle,
    snippet: lyricsSnippet,
    movie: movieName,
    singer: singerName,
    lyricist: lyricistName,
    music: musicName,
    actor: metadata.actorName
  })

  // Check if song has EnglishTranslation category - skip stanza splitting if true
  const hasEnglishTranslation = hasEnglishTranslationContent(song.category || []);

  // Parse content into sections (intro, easter-egg, lyrics, faq)
  let contentSections: ContentSections = { intro: '', easterEgg: '', lyrics: '', faq: '' };
  let stanzas: string[] = []
  
  if (fromBlob && blobData) {
    // console.log(`✅ Using stanzas from blob: ${blobData.stanzas.length} stanzas`)
    stanzas = blobData.stanzas
    // Use sections from blob data
    contentSections = blobData.sections;
  } else {
    // Fallback: Parse and split content from Blogger
    // First, parse the content into sections
    contentSections = splitAndSanitizeSections(safeContent, sanitizeHtml);
    
    // Then split only the lyrics section into stanzas
    if (contentSections.lyrics) {
      stanzas = splitAndSanitizeStanzas(contentSections.lyrics, sanitizeHtml, hasEnglishTranslation);
    }
  }
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
  const hashtagsStr = buildHashtags(song.category || []);
  const itemCat = getSongCategory(song.category || []) || '';

  // Prepare related songs for structured data (ItemList)
  // Use blob data if available, otherwise we'll fetch them later but won't include in structured data
  const relatedSongsForSEO = fromBlob && blobData ? blobData.relatedSongs : [];

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
            <li className="text-gray-900">{cleanTitle}</li>
          </ol>
        </nav>

        <header className="mb-8">
          {/* SEO-optimized H1 with consistent title */}
          <h1 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {fullTitle}
          </h1>
          
          {/* Published date on its own line */}
          {/* {publishedDate && (
            <div className="mb-4">
              <span className="text-gray-600 text-sm">
                Published: {publishedDate.toLocaleDateString()}
              </span>
            </div>
          )} */}
          
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
                    prefetch={false}
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
        
        {/* Combined structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "MusicRecording",
                  "name": cleanTitle,
                  "url": `https://www.tsonglyrics.com/${params.slug.replace('.html', '')}.html`,
                  "description": structuredDescription,
                  "keywords": generateKeywords(song, metadata),
                  ...(singerName && singerName !== 'Unknown Artist' && {
                    "byArtist": {
                      "@type": "Person",
                      "name": singerName
                    }
                  }),
                  ...(movieName && {
                    "inAlbum": {
                      "@type": "MusicAlbum",
                      "name": movieName
                    }
                  }),
                  "recordingOf": {
                    "@type": "MusicComposition",
                    "name": songName,
                    ...(lyricistName && {
                      "lyricist": {
                        "@type": "Person",
                        "name": lyricistName
                      }
                    }),
                    ...(musicName && {
                      "composer": {
                        "@type": "Person",
                        "name": musicName
                      }
                    }),
                    "lyrics": {
                      "@type": "CreativeWork",
                      "text": htmlToPlainText(safeContent || lyricsSnippet).replace(/<br\s*\/?>/gi, '\n'),
                     "inLanguage": ["ta", "en"],
                    }
                  },
                  "inLanguage": "ta",
                  "genre": "Tamil Music",
                  "datePublished": song.published?.$t,
                  "publisher": {
                    "@type": "Organization",
                    "name": "Tamil Song Lyrics",
                    "url": "https://www.tsonglyrics.com"
                  }
                },
                ...(relatedSongsForSEO.length > 0 ? [{
                  "@type": "ItemList",
                  "name": `Related Songs ${movieName ? `from ${movieName}` : ''}`,
                  "description": `More Tamil song lyrics${movieName ? ` from the movie ${movieName}` : ''} similar to ${cleanTitle}`,
                  "numberOfItems": relatedSongsForSEO.length,
                  "itemListElement": relatedSongsForSEO.map((relatedSong, index) => ({
                    "@type": "ListItem",
                    "position": index + 1,
                    "item": {
                      "@type": "MusicRecording",
                      "name": relatedSong.title,
                      "url": `https://www.tsonglyrics.com/${relatedSong.slug}.html`,
                      ...(relatedSong.movieName && {
                        "inAlbum": {
                          "@type": "MusicAlbum",
                          "name": relatedSong.movieName
                        }
                      }),
                      ...(relatedSong.thumbnail && {
                        "image": encodeURI(relatedSong.thumbnail),
                        "thumbnailUrl": encodeURI(relatedSong.thumbnail)
                      }),
                      "inLanguage": "ta",
                      "genre": "Tamil Music"
                    }
                  }))
                }] : []),
                {
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "name": "Home",
                      "item": "https://www.tsonglyrics.com"
                    },
                    ...(movieName ? [{
                      "@type": "ListItem",
                      "position": 2,
                      "name": movieName,
                      "item": `https://www.tsonglyrics.com/category?category=${encodeURIComponent(song.category?.find(cat => cat.term.startsWith('Movie:'))?.term || '')}`
                    }] : []),
                    {
                      "@type": "ListItem",
                      "position": movieName ? 3 : 2,
                      "name": cleanTitle,
                      "item": `https://www.tsonglyrics.com/${params.slug.replace('.html', '')}.html`
                    }
                  ]
                }
              ]
            })
          }}
        />
        
        {/* Google AdSense - Top of page after title */}
        {/* <div className="my-6">
          <ins 
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-4937682453427895"
            data-ad-slot="9268051369"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  (adsbygoogle = window.adsbygoogle || []).push({});
                } catch (e) {
                  console.error('AdSense error:', e);
                }
              `
            }}
          />
        </div> */}
        
        {/* Intro section - if present */}
        {contentSections.intro && (
          <div 
            className="intro-section mb-8 prose prose-lg max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: contentSections.intro }}
          />
        )}

        {/* Easter-egg section - if present */}
        {contentSections.easterEgg && (
          <div 
            className="easter-egg-section mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border border-yellow-200"
            dangerouslySetInnerHTML={{ __html: contentSections.easterEgg }}
          />
        )}
        
        {/* Lyrics content with tabs */}
        <LyricsTabs
          hasTamilLyrics={tamilStanzas.length > 0}
          tamilContent={
            <div
              className="lyrics-container prose prose-lg max-w-none leading-relaxed"
              style={{ lineHeight: '2', fontSize: '1.1rem' }}
              data-server-stanzas-count={String(tamilStanzas.length)}
            >
              {tamilStanzas.map((stanzaHtml, idx) => {
                // Build snippet and share URLs using utility functions
                const plainText = htmlToPlainText(stanzaHtml);
                const snippetWithStars = formatSnippetWithStars(plainText);
                const pageWithPath = `https://tsonglyrics.com/${params.slug.replace('.html','')}.html`;
                
                const twitterHref = buildTwitterShareUrl({
                  snippet: snippetWithStars,
                  hashtags: hashtagsStr,
                  pageUrl: pageWithPath
                });
                
                const whatsappHref = buildWhatsAppShareUrl({
                  snippet: snippetWithStars,
                  hashtags: hashtagsStr,
                  pageUrl: pageWithPath
                });
                
                return (
                  <div key={idx} className="mb-6">
                    <div dangerouslySetInnerHTML={{ __html: stanzaHtml }} />
                    <div className="mt-3 flex justify-end items-center gap-3 text-sm text-gray-600">
                      <a href={twitterHref} target="_blank" rel="noopener noreferrer" data-snippet={snippetWithStars} data-hashtags={hashtagsStr} data-itemcat={itemCat} className="share-pill twitter">Tweet !!!</a>
                      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" data-snippet={snippetWithStars} data-hashtags={hashtagsStr} data-itemcat={itemCat} className="whatsapp-only share-pill whatsapp">WhatsApp !!!</a>
                    </div>
                  </div>
                );
              })}
              <ShareEnhancer />
            </div>
          }
          tanglishContent={
            <div
              className="lyrics-container prose prose-lg max-w-none leading-relaxed"
              style={{ lineHeight: '2' }}
              data-server-stanzas-count={stanzas ? String(stanzas.length) : '0'}
            >
              {stanzas && stanzas.length > 0 ? (
                stanzas.map((stanzaHtml, idx) => {
                  // Build snippet and share URLs using utility functions
                  const plainText = htmlToPlainText(stanzaHtml);
                  const snippetWithStars = formatSnippetWithStars(plainText);
                  const pageWithPath = `https://tsonglyrics.com/${params.slug.replace('.html','')}.html`;
                  
                  const twitterHref = buildTwitterShareUrl({
                    snippet: snippetWithStars,
                    hashtags: hashtagsStr,
                    pageUrl: pageWithPath
                  });
                  
                  const whatsappHref = buildWhatsAppShareUrl({
                    snippet: snippetWithStars,
                    hashtags: hashtagsStr,
                    pageUrl: pageWithPath
                  });
                  
                  return (
                    <div key={idx} className="mb-6">
                      <div dangerouslySetInnerHTML={{ __html: stanzaHtml }} />
                      <div className="mt-3 flex justify-end items-center gap-3 text-sm text-gray-600">
                        <a href={twitterHref} target="_blank" rel="noopener noreferrer" data-snippet={snippetWithStars} data-hashtags={hashtagsStr} data-itemcat={itemCat} className="share-pill twitter">Tweet !!!</a>
                          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" data-snippet={snippetWithStars} data-hashtags={hashtagsStr} data-itemcat={itemCat} className="whatsapp-only share-pill whatsapp">WhatsApp !!!</a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(safeContent, DEFAULT_SANITIZE_OPTIONS) }} />
              )}
              <ShareEnhancer />
            </div>
          }
        />

        {/* FAQ section - if present */}
        {contentSections.faq && (
          <div 
            className="faq-section mt-8 mb-8 bg-blue-50 p-6 rounded-lg border border-blue-200"
            dangerouslySetInnerHTML={{ __html: contentSections.faq }}
          />
        )}

        {/* Google AdSense - After lyrics before related songs */}
        <div className="my-8">
          <ins 
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-4937682453427895"
            data-ad-slot="1535095956"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  (adsbygoogle = window.adsbygoogle || []).push({});
                } catch (e) {
                  console.error('AdSense error:', e);
                }
              `
            }}
          />
        </div>

        {/* Related songs section */}
        <RelatedSongs 
          currentSongId={song.id.$t} 
          categories={song.category || []} 
          blobRelatedSongs={fromBlob && blobData ? blobData.relatedSongs : undefined}
        />
      </article>
    </div>
  )
}
