import { NextResponse } from 'next/server'
import { createClient } from '@vercel/edge-config'

const edgeConfig = createClient(process.env.EDGE_CONFIG!)

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
 * Retries only on network errors (fetch failures), not on HTTP status errors
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
      console.error(`[Hotpost] Fetch attempt ${attempt + 1} failed for ${url}:`, error)

      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt)
        console.log(`[Hotpost] Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // If all retries failed, throw the last error
  throw lastNetworkError || new Error('All fetch attempts failed')
}

export async function GET() {
  const baseUrl = getBaseUrl()

  // STEP 1: Try Edge Config first (no operation limits, primary storage)
  console.log(`[Hotpost] 🔄 Trying Edge Config first`)

  try {
    const hotpostData = await edgeConfig.get('hotpost')

    if (hotpostData) {
      console.log(`[Hotpost] ✅ Edge Config hit`)
      return NextResponse.json(hotpostData, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Cache-Control': 'public, max-age=2592000' // 30 days
        }
      })
    }
  } catch (edgeError) {
    console.error(`[Hotpost] ❌ Edge Config failed:`, edgeError)
  }

  // STEP 2: Try static CDN file (FREE, instant, like blobStorage.ts approach)
  console.log(`[Hotpost] 🚀 Trying CDN: ${baseUrl}/songs/hotpost.json`)

  try {
    const cdnResponse = await retryFetch(
      `${baseUrl}/songs/hotpost.json`,
      {
        next: {
          revalidate: 2592000, // 30 days
          tags: ['hotpost']
        }
      },
      2, // Max 2 retries
      100 // Start with 100ms delay
    )

    console.log(`[Hotpost] CDN response status: ${cdnResponse.status}`)

    if (cdnResponse.ok) {
      try {
        const data = await cdnResponse.json()
        console.log(`[Hotpost] ✅ CDN hit (zero cost)`)
        return NextResponse.json(data, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Cache-Control': 'public, max-age=2592000' // 30 days
          }
        })
      } catch (jsonError) {
        console.error(`[Hotpost] ❌ Failed to parse CDN JSON:`, jsonError)
      }
    } else if (cdnResponse.status === 404) {
      console.log(`[Hotpost] ℹ️ CDN 404 (file doesn't exist)`)
    } else {
      console.error(`[Hotpost] ⚠️ CDN returned error status ${cdnResponse.status}`)
    }
  } catch (cdnError) {
    console.error(`[Hotpost] ❌ CDN fetch failed after retries:`, cdnError)
  }

  // STEP 3: Try blob storage directly (avoid head() operation like blobStorage.ts)
  console.log(`[Hotpost] 📦 Trying blob storage directly`)

  try {
    // Try to construct blob URL directly (similar to blobStorage.ts CDN approach)
    // Vercel blob URLs follow pattern: https://[project].public.blob.vercel-storage.com/[key]
    const projectName = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace('https://', '') || 'tsl-spa-webapp'
    const blobUrl = `https://${projectName}.public.blob.vercel-storage.com/hotpost.json`

    console.log(`[Hotpost] Trying direct blob URL: ${blobUrl}`)

    const blobResponse = await retryFetch(
      blobUrl,
      {
        next: {
          revalidate: 2592000, // 30 days
          tags: ['hotpost']
        }
      },
      2, // Max 2 retries
      100 // Start with 100ms delay
    )

    if (blobResponse.ok) {
      try {
        const data = await blobResponse.json()
        console.log(`[Hotpost] ✅ Direct blob URL hit`)
        return NextResponse.json(data, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Cache-Control': 'public, max-age=2592000' // 30 days
          }
        })
      } catch (jsonError) {
        console.error(`[Hotpost] ❌ Failed to parse blob JSON:`, jsonError)
      }
    }
  } catch (blobError) {
    console.error(`[Hotpost] ❌ Direct blob URL failed:`, blobError)
  }

  // STEP 4: All failed - return empty array
  console.log(`[Hotpost] ❌ All sources failed - returning empty array`)
  return NextResponse.json([], {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  })
}
