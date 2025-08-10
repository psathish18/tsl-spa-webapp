import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Remove the problematic label filter and fetch all posts, then filter on our side
    const url = 'https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&max-results=50'
    
    console.log('Fetching from Blogger API...')
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      mode: 'cors',
      cache: 'no-store'
    })

    console.log('Blogger API response status:', response.status)

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`)
      throw new Error(`Failed to fetch songs: ${response.status}`)
    }

    const data = await response.json()
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
            movieName: movieCategory?.term?.replace('Movie:', '').trim() || '',
            singerName: singerCategory?.term?.replace('Singer:', '').trim() || '',
            lyricistName: lyricsCategory?.term?.replace('Lyrics:', '').trim() || '',
          }
        }) || []
      }
    }

    console.log('Processed songs count:', processedData.feed.entry.length)
    
    // Add CORS headers to the response
    const jsonResponse = NextResponse.json(processedData)
    jsonResponse.headers.set('Access-Control-Allow-Origin', '*')
    jsonResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    jsonResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
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
