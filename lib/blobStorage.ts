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
  // In production (Vercel) - use production domain
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  // In development - use configured base URL or localhost
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

/**
 * Retry helper function with exponential backoff
 * Retries only on network errors (fetch failures), not on HTTP status errors (404, 500, etc.)
 */
async function retryFetch(
  url: string,
  options: RequestInit,
  maxRetries: number = 2,
  initialDelay: number = 100
): Promise<Response> {
  let lastNetworkError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      // Return the response regardless of status - caller will check response.ok
      return response
    } catch (error) {
      lastNetworkError = error as Error
      console.error(`[Hybrid] Fetch attempt ${attempt + 1} failed for ${url}:`, error)
      
      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt)
        console.log(`[Hybrid] Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  // If all retries failed, throw the last error
  throw lastNetworkError || new Error('All fetch attempts failed')
}

/**
 * Validate song blob data structure
 * Only checks required fields to be lenient with optional fields
 */
function validateBlobData(data: any, cleanSlug: string): data is SongBlobData {
  const isValid = !!(data.slug && data.title && Array.isArray(data.stanzas))
  
  if (!isValid) {
    console.error('⚠️ Invalid blob data structure (missing required fields):', {
      slug: cleanSlug,
      hasSlug: !!data.slug,
      hasTitle: !!data.title,
      hasStanzas: Array.isArray(data.stanzas),
      stanzasLength: Array.isArray(data.stanzas) ? data.stanzas.length : 0
    })
  }
  
  return isValid
}

/**
 * Fetch song data from Vercel Blob storage with Hybrid CDN approach
 * 
 * HYBRID STRATEGY (Cost Optimization):
 * 1. Try static CDN file (/songs/*.json) - FREE, instant, 99% of traffic
 * 2. Try blob storage API (optional, controlled by env) - For new songs not yet in CDN
 * 3. Return null - caller will fallback to Blogger API
 * 
 * @param slug - Song slug (without .html extension)
 * @returns Song data from blob storage or null if not found
 */
export async function fetchFromBlob(slug: string): Promise<SongBlobData | null> {
  const cleanSlug = slug.replace('.html', '')
  const baseUrl = getBaseUrl()
  
  // Check if blob storage API is enabled (default: disabled to save costs)
  const enableBlobStorageAPI = process.env.ENABLE_BLOB_STORAGE_API === 'true'
  
  // STEP 1: Try static CDN file (99% of traffic - existing songs)
  const cdnUrl = `${baseUrl}/songs/${cleanSlug}.json`
  console.log(`[Hybrid] 🚀 Trying CDN: ${cdnUrl} [NODE_ENV=${process.env.NODE_ENV}]`)
  
  try {
    const cdnResponse = await retryFetch(
      `${baseUrl}/songs/${cleanSlug}.json`,
      {
        next: { 
          revalidate: 2592000, // 30 days
          tags: [`cdn-${cleanSlug}`] 
        }
      },
      2, // Max 2 retries (3 total attempts)
      100 // Start with 100ms delay
    )

    console.log(`[Hybrid] CDN response status: ${cdnResponse.status} for ${cleanSlug}`)

    if (cdnResponse.ok) {
      try {
        const data: SongBlobData = await cdnResponse.json()
        
        // Validate required fields using shared validation function
        if (validateBlobData(data, cleanSlug)) {
          console.log(`[Hybrid] ✅ CDN hit (zero cost): ${cleanSlug}`)
          return data
        } else {
          console.error(`[Hybrid] ⚠️ Validation failed for ${cleanSlug}, continuing to fallback`)
        }
        // Validation failed, continue to API fallback
      } catch (jsonError) {
        console.error(`[Hybrid] ❌ Failed to parse CDN JSON for ${cleanSlug}:`, jsonError)
        // Continue to try API fallback
      }
    } else if (cdnResponse.status === 404) {
      // Legitimate 404 - file doesn't exist, no need to retry or check API
      console.log(`[Hybrid] ℹ️ CDN 404 (file doesn't exist): ${cleanSlug}`)
    } else {
      // Other HTTP errors (5xx, etc.)
      console.error(`[Hybrid] ⚠️ CDN returned error status ${cdnResponse.status} for ${cleanSlug}`)
    }
  } catch (cdnError) {
    console.error(`[Hybrid] ❌ CDN fetch failed after retries for ${cleanSlug}:`, cdnError)
  }

  // STEP 2 (OPTIONAL): Try dynamic API from blob storage (disabled by default)
  if (enableBlobStorageAPI) {
    console.log(`[Hybrid] 📡 CDN miss, trying Blob Storage API: ${baseUrl}/api/songs/${cleanSlug}`)
    
    try {
      const apiResponse = await retryFetch(
        `${baseUrl}/api/songs/${cleanSlug}`,
        {
          next: { 
            revalidate: 2592000,
            tags: [`api-${cleanSlug}`] 
          }
        },
        2, // Max 2 retries
        100 // Start with 100ms delay
      )

      if (apiResponse.ok) {
        try {
          const data: SongBlobData = await apiResponse.json()
          
          // Validate required fields using shared validation function
          if (validateBlobData(data, cleanSlug)) {
            console.log(`[Hybrid] ✅ Blob Storage API hit: ${cleanSlug}`)
            return data
          }
          // Validation failed, continue to Blogger fallback
        } catch (jsonError) {
          console.error(`[Hybrid] ❌ Failed to parse API JSON for ${cleanSlug}:`, jsonError)
        }
      }
    } catch (apiError) {
      console.error(`[Hybrid] ❌ API fetch failed after retries for ${cleanSlug}:`, apiError)
    }
  } else {
    console.log(`[Hybrid] ⏭️  Blob Storage API disabled (ENABLE_BLOB_STORAGE_API not set)`)
  }

  // STEP 3: All failed - caller will use Blogger API fallback
  console.log(`[Hybrid] ❌ Not found in CDN/API - using Blogger fallback: ${cleanSlug}`)
  return null
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
