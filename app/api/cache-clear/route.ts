import { NextRequest, NextResponse } from 'next/server'
import { dateBasedCache } from '@/lib/dateBasedCache'

// Using Node.js runtime (default) instead of Edge to reduce edge requests

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const pattern = searchParams.get('pattern')
    const songId = searchParams.get('songId')
    const url = searchParams.get('url')

    let result = { action: '', cleared: 0, message: '' }

    switch (action) {
      case 'all':
        dateBasedCache.clear()
        result = {
          action: 'clear_all',
          cleared: -1,
          message: 'All cache cleared successfully'
        }
        break

      case 'pattern':
        if (!pattern) {
          return NextResponse.json(
            { error: 'Pattern parameter required for pattern action' },
            { status: 400 }
          )
        }
        const cleared = dateBasedCache.clearByPattern(pattern)
        result = {
          action: 'clear_pattern',
          cleared,
          message: `Cleared ${cleared} entries matching pattern: ${pattern}`
        }
        break

      case 'song':
        if (!songId) {
          return NextResponse.json(
            { error: 'songId parameter required for song action' },
            { status: 400 }
          )
        }
        dateBasedCache.clearSong(songId)
        result = {
          action: 'clear_song',
          cleared: -1,
          message: `Cleared all cache entries for song: ${songId}`
        }
        break

      case 'songs':
        dateBasedCache.clearAllSongs()
        result = {
          action: 'clear_all_songs',
          cleared: -1,
          message: 'Cleared all songs cache'
        }
        break

      case 'url':
        if (!url) {
          return NextResponse.json(
            { error: 'url parameter required for url action' },
            { status: 400 }
          )
        }
        await dateBasedCache.forceRefresh(url)
        result = {
          action: 'force_refresh',
          cleared: 1,
          message: `Force refreshed URL: ${url}`
        }
        break

      default:
        return NextResponse.json(
          { 
            error: 'Invalid action. Supported actions: all, pattern, song, songs, url',
            examples: {
              'Clear all cache': '/api/cache-clear?action=all',
              'Clear by pattern': '/api/cache-clear?action=pattern&pattern=blogger:*songs*',
              'Clear specific song': '/api/cache-clear?action=song&songId=12345',
              'Clear all songs': '/api/cache-clear?action=songs',
              'Force refresh URL': '/api/cache-clear?action=url&url=https://example.com/api'
            }
          },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
      stats: dateBasedCache.getStats(),
      vercelCDN: {
        applicationCacheCleared: true,
        cdnCacheStatus: 'Not cleared (separate layer)',
        toClearCDN: 'Use: vercel --prod --scope your-team',
        note: 'CDN will refresh naturally via stale-while-revalidate headers',
        emergencyOnly: 'Manual CDN clearing recommended only for urgent updates'
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: (error as Error).message 
      },
      { status: 500 }
    )
  }
}
