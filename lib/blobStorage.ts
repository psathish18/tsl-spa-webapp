/**
 * Vercel Blob Storage Utility - HYBRID CDN APPROACH
 * 
 * Cost optimization strategy:
 * - Static CDN files (/public/songs/*.json) serve 99% of traffic with ZERO cost
 * - Dynamic API (/api/songs/*) handles new songs with 1 invocation, then CDN cached
 * - Blogger API as final fallback for missing data
 * 
 * This reduces Vercel function invocations from ~2000 GB-seconds to near-zero.
 */

import type { SongBlobData } from '@/scripts/types/song-blob.types'

/**
 * Get the base URL for server-side fetches
 * Server-side fetch requires absolute URLs
 */
function getBaseUrl(): string {
  // In production (Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  // In development
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

/**
 * Fetch song data from Vercel Blob storage with Hybrid CDN approach
 * 
 * HYBRID STRATEGY (Cost Optimization):
 * 1. Try static CDN file (/songs/*.json) - FREE, instant, 99% of traffic
 * 2. Try dynamic API (/api/songs/*) - 1 invocation, CDN cached after, 1% of traffic
 * 3. Return null - caller will fallback to Blogger API
 * 
 * @param slug - Song slug (without .html extension)
 * @returns Song data from blob storage or null if not found
 */
export async function fetchFromBlob(slug: string): Promise<SongBlobData | null> {
  try {
    const cleanSlug = slug.replace('.html', '')
    const baseUrl = getBaseUrl()
    
    // STEP 1: Try static CDN file (99% of traffic - existing songs)
    console.log(`[Hybrid] 🚀 Trying CDN: ${baseUrl}/songs/${cleanSlug}.json`)
    
    const cdnResponse = await fetch(`${baseUrl}/songs/${cleanSlug}.json`, {
      next: { 
        revalidate: 2592000, // 30 days
        tags: [`cdn-${cleanSlug}`] 
      }
    })

    if (cdnResponse.ok) {
      const data: SongBlobData = await cdnResponse.json()
      
      // Validate data structure
      if (!data.slug || !data.title || !data.stanzas) {
        console.error('⚠️ Invalid CDN data structure:', data)
        return null
      }
      
      console.log(`[Hybrid] ✅ CDN hit (zero cost): ${cleanSlug}`)
      return data
    }

    // STEP 2: CDN miss, try dynamic API (1% of traffic - new songs)
    console.log(`[Hybrid] 📡 CDN miss, trying API: ${baseUrl}/api/songs/${cleanSlug}`)
    
    const apiResponse = await fetch(`${baseUrl}/api/songs/${cleanSlug}`, {
      next: { 
        revalidate: 2592000,
        tags: [`api-${cleanSlug}`] 
      }
    })

    if (apiResponse.ok) {
      const data: SongBlobData = await apiResponse.json()
      
      // Validate data structure
      if (!data.slug || !data.title || !data.stanzas) {
        console.error('⚠️ Invalid API data structure:', data)
        return null
      }
      
      console.log(`[Hybrid] ✅ API hit (1 invocation, CDN cached now): ${cleanSlug}`)
      return data
    }

    // STEP 3: Both failed - caller will use Blogger API fallback
    console.log(`[Hybrid] ❌ Not found in CDN or API, using Blogger fallback: ${cleanSlug}`)
    return null
  } catch (error) {
    console.error('[Hybrid] ❌ Error in hybrid fetch:', error)
    return null
  }
}

/**
 * Check if blob storage is available
 * In hybrid mode, we always return true since we have CDN + API fallback
 * @returns true (hybrid mode always available)
 */
export function isBlobStorageAvailable(): boolean {
  return true
}

/**
 * Convert Blogger API song data to match the structure needed by the page
 * This ensures backward compatibility when falling back to Blogger API
 */
export function normalizeBloggerSong(song: any) {
  return {
    id: song.id,
    title: song.title,
    content: song.content,
    published: song.published,
    author: song.author,
    category: song.category,
    media$thumbnail: song.media$thumbnail,
    songTitle: song.songTitle,
    movieName: song.movieName,
    singerName: song.singerName,
    lyricistName: song.lyricistName,
  }
}
