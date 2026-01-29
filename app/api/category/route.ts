import { NextRequest, NextResponse } from 'next/server'
import { REVALIDATE_CATEGORY_API, CDN_MAX_AGE, CDN_STALE_WHILE_REVALIDATE } from '@/lib/cacheConfig'
import { cachedBloggerFetch } from '@/lib/dateBasedCache'
import { extractSongMetadata, extractSnippet } from '@/lib/seoUtils'
import { getSlugFromSong } from '@/lib/slugUtils'

// DEPRECATED: This API route is no longer used by the category page.
// The category page now fetches data directly from the Blogger API via the proxy
// to reduce CPU usage and function invocations.
// This endpoint is kept for backward compatibility but may be removed in the future.

// Enable Edge Runtime for better performance
export const runtime = 'edge'

interface BloggerEntry {
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

// Helper function to get thumbnail URL
function getThumbnail(song: any): string | null {
  if (song.media$thumbnail && song.media$thumbnail.url) {
    let imageUrl = decodeURIComponent(song.media$thumbnail.url)
    imageUrl = imageUrl.replace(/\/s\d+-c\//, '/s400-c/')
    return imageUrl
  }
  return null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const categoryTerm = searchParams.get('category')
  
  if (!categoryTerm) {
    return NextResponse.json({ error: 'Category parameter is required' }, { status: 400 })
  }
  
  try {
    console.log(`Fetching songs for category: ${categoryTerm}`)
    
    // Fetch from Blogger API with category filter using cached fetch
    const data = await cachedBloggerFetch(
      `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/${encodeURIComponent(categoryTerm)}?alt=json&max-results=50`,
      {
        next: {
          revalidate: REVALIDATE_CATEGORY_API, // Cache for 30 days
          tags: [`related-${categoryTerm}`] // Same tag as RelatedSongs for shared cache
        }
      }
    )
    
    console.log(`Blogger API data fetched successfully`)
    
    const entries = data.feed?.entry || []
    console.log(`Raw data entries count: ${entries.length}`)
    
    // Process and enhance each song entry
    const songs = entries.map((entry: any) => {
      const metadata = extractSongMetadata(entry.category, entry.title?.$t || '')
      const thumbnail = getThumbnail(entry)
      
      // Generate slug for the song from the alternate link
      const slug = getSlugFromSong(entry)
      
      return {
        id: entry.id.$t,
        title: entry.title?.$t || metadata.songTitle,
        slug: slug,
        thumbnail: thumbnail,
        movieName: metadata.movieName,
        singerName: metadata.singerName,
        lyricistName: metadata.lyricistName,
        published: entry.published.$t,
        category: entry.category,
        excerpt: extractSnippet(entry.content?.$t || '', 150)
      }
    })
    
    console.log(`Processed songs count: ${songs.length}`)
    
    const jsonResponse = NextResponse.json({
      category: categoryTerm,
      songs: songs,
      total: songs.length
    })
    
    // Advanced caching headers for category pages - 30 days
    jsonResponse.headers.set('Cache-Control', `s-maxage=${CDN_MAX_AGE}, stale-while-revalidate=${CDN_STALE_WHILE_REVALIDATE}`)
    jsonResponse.headers.set('CDN-Cache-Control', `max-age=${CDN_MAX_AGE}`)
    jsonResponse.headers.set('Vary', 'Accept-Encoding')
    
    return jsonResponse
    
  } catch (error) {
    console.error('Error fetching category songs:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch songs for category',
      category: categoryTerm,
      songs: [],
      total: 0
    }, { status: 500 })
  }
}
