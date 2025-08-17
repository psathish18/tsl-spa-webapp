import { NextRequest, NextResponse } from 'next/server'
import { cachedBloggerFetch } from '@/lib/dateBasedCache'

// Enable Edge Runtime for better performance
export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const slug = searchParams.get('slug')
  const category = searchParams.get('category')
  
  if (!slug && !category) {
    return NextResponse.json({ error: 'Either slug or category is required' }, { status: 400 })
  }

  try {
    let targetSong = null;
    
    if (category) {
      // Direct category lookup - use the full category tag as provided
      const url = `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/${encodeURIComponent(category)}?alt=json`
      
      // Use date-based cached fetch
      const data = await cachedBloggerFetch(url)

      if (data.feed?.entry && data.feed.entry.length > 0) {
        targetSong = data.feed.entry[0]
      }
    } else if (slug) {
      // Slug-based lookup: use search API instead of fetching latest 50
      const cleanSlug = slug.replace('.html', '')
      const searchTerms = cleanSlug.replace(/-/g, ' ')
      
      // Use date-based cached fetch
      const data = await cachedBloggerFetch(
        `https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&q=${encodeURIComponent(searchTerms)}&max-results=10`
      )

      const songs = data.feed?.entry || []
        
      // Filter songs and find matching slug
      const songPosts = songs.filter((entry: any) => {
        return entry.category?.some((cat: any) => cat.term?.startsWith('Song:'))
      })
      
      targetSong = songPosts.find((song: any) => {
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
        
        return songSlug === cleanSlug;
      })
    }

    if (!targetSong) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
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
    }
    
    // Add CORS and Cache-Control headers to the response
    const jsonResponse = NextResponse.json(processedSong)
    jsonResponse.headers.set('Access-Control-Allow-Origin', '*')
    jsonResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    jsonResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    // Advanced caching headers for individual songs (longer cache since content is static)
    jsonResponse.headers.set('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
    jsonResponse.headers.set('CDN-Cache-Control', 'max-age=3600')
    jsonResponse.headers.set('Vary', 'Accept-Encoding')
    
    return jsonResponse
  } catch (error) {
    console.error('Error fetching song:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch song details',
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
