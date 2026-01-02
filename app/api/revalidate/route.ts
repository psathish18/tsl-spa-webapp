import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'

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
    // Clear homepage data cache (Blogger API responses)
    revalidateTag('songs-latest')
    revalidateTag('homepage')
    // Also clear the page render itself
    revalidatePath('/')
    console.log('  ✓ Cleared homepage (data + page render)')
  } else if (path === '/search') {
    // Clear trending API cache (has x-vercel-cache-tags for CDN)
    revalidateTag('trending-api')
    console.log('  ✓ Cleared trending API cache (Next.js + CDN)')
    // Note: /api/search uses cache: 'no-store', so no cache to clear
  } else if (path === '/api/trending') {
    // Manual clear for trending API (has x-vercel-cache-tags for CDN)
    revalidateTag('trending-api')
    console.log('  ✓ Cleared trending API cache (Next.js + CDN)')
  } else if (path === '/api/search/autocomplete') {
    // Note: Autocomplete uses in-memory cache with 1hr TTL in /api/search route
    // No Next.js cache to clear - it will refresh automatically after 1hr
    console.log('  ✓ Autocomplete uses in-memory cache (will auto-refresh in 1hr)')
  } else if (path === '/api/search/popular') {
    // Note: Popular uses cache: 'no-store' in /api/search route
    console.log('  ✓ Popular posts use no-store (no cache to clear)')
  } else if (path === '/related') {
    // Clear all related songs caches (used across multiple song pages)
    // Note: This clears all related-* tags, which might affect multiple pages
    // Related songs auto-refresh after 24hr, so manual clearing rarely needed
    console.log('  ⚠️  Related songs use individual tags per category (related-Movie:*, related-Singer:*)')
    console.log('  ⚠️  To clear specific category, use revalidateTag("related-Category:Name")')
    console.log('  ⚠️  Or wait 24hr for auto-refresh')
  } else if (path.includes('.html')) {
    // Specific song page - clear both data and page render
    const slug = path.replace(/^\//, '').replace('.html', '')
    revalidateTag(`song-${slug}`)  // Clear Blogger API data for this song
    revalidatePath(path)            // Clear the page HTML render
    console.log(`  ✓ Cleared cache for song: ${slug} (data + page render)`)
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
      
      // Clear Next.js cache for the entire site
      revalidatePath('/', 'layout')
      console.log('  ✓ Cleared all pages')
      
      // Clear specific cache tags
      revalidateTag('songs-latest')
      revalidateTag('homepage')
      revalidateTag('trending-api')
      console.log('  ✓ Cleared all cache tags (including CDN)')
      
      return createNoCacheResponse({ 
        revalidated: true, 
        type: 'all', 
        message: 'All Next.js caches cleared',
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
      
      // Clear cache based on path (uses revalidateTag internally)
      clearCacheByPath(path)
      
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
      
      // Clear Next.js cache for the entire site
      revalidatePath('/', 'layout')
      console.log('  ✓ Cleared all pages')
      
      // Clear specific cache tags
      revalidateTag('songs-latest')
      revalidateTag('homepage')
      revalidateTag('trending-api')
      console.log('  ✓ Cleared all cache tags (including CDN)')
      
      return createNoCacheResponse({ 
        revalidated: true, 
        type: 'all', 
        message: 'All Next.js caches cleared (GET)',
        now: Date.now() 
      })
    } catch (err) {
      return createNoCacheResponse({ error: 'Failed to clear all', details: String(err) }, 500)
    }
  }

  if (tag) {
    try {
      await revalidateTag(tag)
      return createNoCacheResponse({ revalidated: true, type: 'tag', tag, now: Date.now() })
    } catch (err) {
      return createNoCacheResponse({ error: 'Failed to revalidate tag', details: String(err) }, 500)
    }
  }

  if (path) {
    try {
      clearCacheByPath(path)
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
