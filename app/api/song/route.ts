import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category')
  
  if (!category) {
    return NextResponse.json({ error: 'Category is required' }, { status: 400 })
  }

  try {
    const url = `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/Song:${encodeURIComponent(category)}?alt=json`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TamilSongLyrics/1.0)'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch song: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching song:', error)
    return NextResponse.json(
      { error: 'Failed to fetch song details' },
      { status: 500 }
    )
  }
}
