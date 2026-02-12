import { NextRequest, NextResponse } from 'next/server'
import { dateBasedCache } from '@/lib/dateBasedCache'

// Using Node.js runtime (default) instead of Edge to reduce edge requests

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'
    
    // Get cache statistics
    const stats = dateBasedCache.getStats()
    
    const response: any = {
      message: 'Date-based Cache Statistics',
      stats,
      timestamp: new Date().toISOString(),
      endpoints: {
        clearCache: '/api/cache-clear',
        forceRefresh: '/api/cache-clear?action=url&url=<URL>',
        clearAllSongs: '/api/cache-clear?action=songs'
      }
    }

    // Add detailed cache contents if requested
    if (detailed) {
      response.contents = dateBasedCache.getDetailedContents()
      response.keys = dateBasedCache.getKeys()
    }
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error getting cache stats:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: (error as Error).message },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    )
  }
}
