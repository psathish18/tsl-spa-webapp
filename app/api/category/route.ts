import { NextRequest, NextResponse } from 'next/server'

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

// Helper function to create slug from title
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Helper function to extract song metadata
function extractSongData(entry: any): BloggerEntry {
  const title = entry.title?.$t || ''
  
  // Extract metadata from categories (same logic as main songs API)
  const songCategory = entry.category?.find((cat: any) => 
    cat.term?.startsWith('Song:')
  )
  const movieCategory = entry.category?.find((cat: any) => 
    cat.term?.startsWith('Movie:')
  )
  const singerCategory = entry.category?.find((cat: any) => 
    cat.term?.startsWith('Singer:')
  )
  const lyricsCategory = entry.category?.find((cat: any) => 
    cat.term?.startsWith('Lyrics:')
  )

  const songTitle = songCategory ? songCategory.term.replace('Song:', '') : title
  const movieName = movieCategory?.term?.replace('Movie:', '') || ''
  const singerName = singerCategory?.term?.replace('Singer:', '') || ''
  const lyricistName = lyricsCategory?.term?.replace('Lyrics:', '') || ''
  
  return {
    ...entry,
    songTitle,
    movieName,
    singerName,
    lyricistName
  }
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
    
    // Fetch from Blogger API with category filter
    const response = await fetch(`https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/${encodeURIComponent(categoryTerm)}?alt=json&max-results=50`, {
      next: { revalidate: 86400 } // Cache for 24 hour
    })
    
    if (!response.ok) {
      throw new Error(`Blogger API responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log(`Blogger API response status: ${response.status}`)
    
    const entries = data.feed?.entry || []
    console.log(`Raw data entries count: ${entries.length}`)
    
    // Process and enhance each song entry
    const songs = entries.map((entry: any) => {
      const processedSong = extractSongData(entry)
      const thumbnail = getThumbnail(processedSong)
      
      // Generate slug for the song
      const slug = createSlug(processedSong.title?.$t || processedSong.songTitle || '')
      
      return {
        id: processedSong.id.$t,
        title: processedSong.title?.$t || processedSong.songTitle,
        slug: slug,
        thumbnail: thumbnail,
        movieName: processedSong.movieName,
        singerName: processedSong.singerName,
        lyricistName: processedSong.lyricistName,
        published: processedSong.published.$t,
        category: processedSong.category,
        excerpt: processedSong.content?.$t?.replace(/<[^>]*>/g, '').substring(0, 150) + '...' || ''
      }
    })
    
    console.log(`Processed songs count: ${songs.length}`)
    
    const jsonResponse = NextResponse.json({
      category: categoryTerm,
      songs: songs,
      total: songs.length
    })
    
    // Advanced caching headers for category pages
    jsonResponse.headers.set('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600')
    jsonResponse.headers.set('CDN-Cache-Control', 'max-age=1800')
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
