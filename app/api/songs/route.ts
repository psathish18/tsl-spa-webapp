import { NextRequest, NextResponse } from 'next/server'
import { cachedBloggerFetch } from '@/lib/dateBasedCache'

// Enable Edge Runtime for better performance
export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    // Check for ?category= or ?song= in the query
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || searchParams.get('song')
    let url = ''
    if (category) {
      // Encode category for Blogger API (e.g., Song:Monica%20-%20Coolie)
      url = `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/${encodeURIComponent(category)}?alt=json&max-results=50`
    } else {
      url = 'https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&max-results=50'
    }

    console.log('Fetching from Blogger API:', url)

    // Use date-based cached fetch
    const data = await cachedBloggerFetch(url)

    console.log('Raw data entries count:', data.feed?.entry?.length || 0)

    // Process and filter the data to only include song posts
    const processedData = {
      ...data,
      feed: {
        ...data.feed,
        entry: data.feed?.entry?.filter((entry: any) => {
          // Only include posts that have a Song: category
          return entry.category?.some((cat: any) => cat.term?.startsWith('Song:'))
        }).map((entry: any) => {
          // Extract song title from categories (look for Song: prefix)
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

          // Add enhanced metadata to the entry
          return {
            ...entry,
            songTitle,
            movieName: movieCategory?.term?.replace('Movie:', '') || '',
            singerName: singerCategory?.term?.replace('Singer:', '') || '',
            lyricistName: lyricsCategory?.term?.replace('Lyrics:', '') || '',
          }
        }) || []
      }
    }

    console.log('Processed songs count:', processedData.feed.entry.length)

    // Add CORS and Cache-Control headers to the response
    const jsonResponse = NextResponse.json(processedData)
    jsonResponse.headers.set('Access-Control-Allow-Origin', '*')
    jsonResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    jsonResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    // Advanced caching headers optimized for Vercel CDN - 24hr cache for lyrics
    jsonResponse.headers.set('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    jsonResponse.headers.set('CDN-Cache-Control', 'max-age=86400')
    jsonResponse.headers.set('Vercel-CDN-Cache-Control', 'max-age=86400')
    jsonResponse.headers.set('Vary', 'Accept-Encoding')
    
    // Add cache info for debugging
    jsonResponse.headers.set('X-Cache-Layer', 'Application + Vercel CDN')
    jsonResponse.headers.set('X-Cache-TTL', '86400s (CDN) + Date-based (App)')
    jsonResponse.headers.set('X-Cache-Strategy', 'stale-while-revalidate')

    return jsonResponse
  } catch (error) {
    console.error('Error fetching songs:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch songs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
