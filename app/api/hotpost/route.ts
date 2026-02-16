import { NextResponse } from 'next/server'

// Cache for 5 minutes (300 seconds) to reduce Blogger API calls
export const revalidate = 300

export async function GET() {
  try {
    // Fetch from Blogger API (server-side, no CORS issue)
    const response = await fetch(
      'https://tslappsetting.blogspot.com/feeds/posts/default/-/hotpost?alt=json&max-results=1',
      {
        next: {
          revalidate: 300 // Cache for 5 minutes
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Blogger API error: ${response.status}`)
    }

    const data = await response.json()

    // Return the data with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })
  } catch (error) {
    console.error('Error fetching from Blogger:', error)
    
    // Return error with appropriate status
    return NextResponse.json(
      { error: 'Failed to fetch hot post data' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      }
    )
  }
}
