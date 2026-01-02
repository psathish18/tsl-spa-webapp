import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'
import { dateBasedCache } from '@/lib/dateBasedCache'

// Set a secret token for security (change this to a strong value and keep it secret)
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || '9cQqqaV6l6OPYhslilv1RCXhsVRZ4CVQ3wTYV3Vcck5axiU4BPcCApHV9aT0yUhO'

// Helper to create no-cache response
function createNoCacheResponse(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'CDN-Cache-Control': 'no-store'
    }
  })
}

// Helper to clear cache by path
function clearCacheByPath(path: string) {
  if (path === '/' || path === '/home') {
    dateBasedCache.clearByPattern('songs:latest')
    console.log('  ✓ Cleared custom cache for home page')
  } else if (path === '/search') {
    // Clear search-related caches
    dateBasedCache.clearByPattern('search:*')
    dateBasedCache.clearByPattern('popular:*')
    console.log('  ✓ Cleared custom cache for search')
    // Also clear trending API cache
    revalidatePath('/api/trending', 'route')
    console.log('  ✓ Cleared trending API cache')
  } else if (path === '/api/trending') {
    // Manual clear for trending API
    revalidatePath('/api/trending', 'route')
    console.log('  ✓ Cleared trending API cache')
  } else if (path === '/api/search/autocomplete') {
    // Manual clear for autocomplete cache
    dateBasedCache.clearByPattern('search:*')
    console.log('  ✓ Cleared autocomplete cache')
  } else if (path === '/api/search/popular') {
    // Manual clear for popular posts cache
    dateBasedCache.clearByPattern('popular:*')
    console.log('  ✓ Cleared popular posts cache')
  } else if (path.includes('.html')) {
    // Specific song page
    const slug = path.replace(/^\//, '').replace('.html', '')
    dateBasedCache.clearByPattern(`*${slug}*`)
    console.log(`  ✓ Cleared custom cache for song: ${slug}`)
  }
}

export async function POST(req: NextRequest) {
  const { tag, path, secret, clearAll } = await req.json()

  if (secret !== REVALIDATE_SECRET) {
    return createNoCacheResponse({ error: 'Invalid secret' }, 401)
  }

  // Clear ALL caches (emergency option)
  if (clearAll) {
    try {
      console.log('🔥 CLEARING ALL CACHES')
      
      // Clear custom date-based cache
      dateBasedCache.clear()
      
      // Clear Next.js cache for common paths
      const paths = ['/', '/search']
      paths.forEach(p => {
        revalidatePath(p, 'page')
        console.log(`  ✓ Cleared path: ${p}`)
      })
      
      // Clear trending cache
      await revalidateTag('trending-posts')
      
      return createNoCacheResponse({ 
        revalidated: true, 
        type: 'all', 
        message: 'All caches cleared',
        now: Date.now() 
      })
    } catch (err) {
      console.error('Clear all error:', err)
      return createNoCacheResponse({ error: 'Failed to clear all caches', details: String(err) }, 500)
    }
  }

  // Revalidate by tag (for song pages)
  if (tag) {
    try {
      console.log(`Revalidating tag: ${tag}`)
      
      // Clear from custom cache if it's a song tag
      if (tag.startsWith('song-')) {
        const slug = tag.replace('song-', '')
        dateBasedCache.clearByPattern(`*${slug}*`)
        console.log(`  ✓ Cleared custom cache for: ${slug}`)
      }
      
      await revalidateTag(tag)
      console.log(`  ✓ Cleared Next.js tag: ${tag}`)
      
      return createNoCacheResponse({ revalidated: true, type: 'tag', tag, now: Date.now() })
    } catch (err) {
      console.error('Tag revalidation error:', err)
      return createNoCacheResponse({ error: 'Failed to revalidate tag', details: String(err) }, 500)
    }
  }

  // Revalidate by path (for home page and other pages)
  if (path) {
    try {
      console.log(`Revalidating path: ${path}`)
      
      // Clear custom cache based on path
      clearCacheByPath(path)
      
      // Use 'route' type for API paths, 'page' type for page paths
      const pathType = path.startsWith('/api/') ? 'route' : 'page'
      revalidatePath(path, pathType)
      console.log(`  ✓ Cleared Next.js path: ${path} (type: ${pathType})`)
      
      return createNoCacheResponse({ revalidated: true, type: 'path', path, now: Date.now() })
    } catch (err) {
      console.error('Path revalidation error:', err)
      return createNoCacheResponse({ error: 'Failed to revalidate path', details: String(err) }, 500)
    }
  }

  return createNoCacheResponse({ error: 'Missing tag, path, or clearAll parameter' }, 400)
}

// GET endpoint for easy browser testing (development only)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  const path = searchParams.get('path')
  const tag = searchParams.get('tag')
  const clearAll = searchParams.get('clearAll') === 'true'

  if (secret !== REVALIDATE_SECRET) {
    return createNoCacheResponse({ 
      error: 'Invalid or missing secret',
      usage: 'Add ?secret=YOUR_SECRET&path=/ or ?secret=YOUR_SECRET&clearAll=true'
    }, 401)
  }

  // Same logic as POST
  if (clearAll) {
    try {
      console.log('🔥 CLEARING ALL CACHES (via GET)')
      dateBasedCache.clear()
      
      const paths = ['/', '/search']
      paths.forEach(p => {
        revalidatePath(p, 'page')
        console.log(`  ✓ Cleared path: ${p}`)
      })
      
      await revalidateTag('trending-posts')
      
      return createNoCacheResponse({ 
        revalidated: true, 
        type: 'all', 
        message: 'All caches cleared (GET)',
        now: Date.now() 
      })
    } catch (err) {
      return createNoCacheResponse({ error: 'Failed to clear all', details: String(err) }, 500)
    }
  }

  if (tag) {
    try {
      if (tag.startsWith('song-')) {
        const slug = tag.replace('song-', '')
        dateBasedCache.clearByPattern(`*${slug}*`)
      }
      await revalidateTag(tag)
      return createNoCacheResponse({ revalidated: true, type: 'tag', tag, now: Date.now() })
    } catch (err) {
      return createNoCacheResponse({ error: 'Failed to revalidate tag', details: String(err) }, 500)
    }
  }

  if (path) {
    try {
      clearCacheByPath(path)
      // Use 'route' type for API paths, 'page' type for page paths
      const pathType = path.startsWith('/api/') ? 'route' : 'page'
      revalidatePath(path, pathType)
      return createNoCacheResponse({ revalidated: true, type: 'path', path, now: Date.now() })
    } catch (err) {
      return createNoCacheResponse({ error: 'Failed to revalidate path', details: String(err) }, 500)
    }
  }

  return createNoCacheResponse({ 
    error: 'Missing parameter',
    usage: 'Use ?secret=SECRET&path=/ or ?secret=SECRET&tag=song-slug or ?secret=SECRET&clearAll=true'
  }, 400)
}

export const dynamic = 'force-dynamic' // Ensure this route is always dynamic
