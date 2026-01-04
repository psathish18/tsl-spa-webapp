import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { clearSongCache } from '@/lib/songCache'

/**
 * On-demand sitemap revalidation endpoint
 * Call this manually after posting new songs to Blogger
 * 
 * Usage:
 * curl -X POST https://tsonglyrics.com/api/revalidate-sitemap \
 *   -H "x-revalidate-secret: YOUR_SECRET_TOKEN"
 * 
 * Set REVALIDATE_SECRET in your .env.local and Vercel environment variables
 */
export async function POST(request: NextRequest) {
  try {
    // Get the secret from headers
    const secret = request.headers.get('x-revalidate-secret')
    
    // Check if secret is valid
    if (!secret || secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json(
        { error: 'Invalid or missing secret token' },
        { status: 401 }
      )
    }
    
    // Clear in-memory song cache FIRST
    clearSongCache()
    
    // Revalidate the sitemap index
    revalidatePath('/sitemap.xml')
    
    // Revalidate all existing paginated sitemaps (0-3 for up to 4000 songs)
    // With 2000+ songs, we'll have sitemap/0.xml, /1.xml, and /2.xml
    for (let i = 0; i <= 3; i++) {
      revalidatePath(`/sitemap/${i}.xml`)
    }
    
    // Also revalidate home page to show latest songs
    revalidatePath('/')
    
    return NextResponse.json({
      revalidated: true,
      timestamp: new Date().toISOString(),
      message: 'Sitemap index, paginated sitemaps (0-3), and home page revalidated successfully'
    })
  } catch (error) {
    console.error('Revalidation error:', error)
    return NextResponse.json(
      { 
        error: 'Error revalidating sitemap',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Optional: GET request to check if endpoint is working
export async function GET() {
  return NextResponse.json({
    message: 'Sitemap revalidation endpoint is active',
    usage: 'Send POST request with x-revalidate-secret header',
    timestamp: new Date().toISOString()
  })
}
