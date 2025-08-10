import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const url = 'https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/~/?alt=json'
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TamilSongLyrics/1.0)'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch songs: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching songs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch songs' },
      { status: 500 }
    )
  }
}
