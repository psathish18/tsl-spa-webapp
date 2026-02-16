import { NextResponse } from 'next/server'

// No server-side cache to avoid edge function invocations
// Browser will cache responses based on Cache-Control headers
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch from Blogger API (server-side, no CORS issue)
    // No Next.js caching - each request is fresh
    const response = await fetch(
      'https://tslappsetting.blogspot.com/feeds/posts/default/-/hotpost?alt=json&max-results=1',
      {
        cache: 'no-store' // Disable Next.js fetch cache
      }
    )

    if (!response.ok) {
      throw new Error(`Blogger API error: ${response.status}`)
    }

    const data = await response.json()

    // Return the data with CORS headers and browser cache control
    // Browser will cache for 5 minutes, but no server-side caching
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'public, max-age=300' // Browser caches for 5 minutes
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
