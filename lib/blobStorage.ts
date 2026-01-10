/**
 * Vercel Blob Storage Utility
 * 
 * Provides functions to fetch song data from Vercel Blob storage.
 * Falls back to Blogger API if blob data is not available.
 */

import type { SongBlobData } from '@/scripts/types/song-blob.types'

/**
 * Get the Vercel Blob storage base URL
 * @returns Blob base URL from environment variable
 */
function getBlobBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BLOB_BASE_URL || ''
}

/**
 * Fetch song data from Vercel Blob storage
 * @param slug - Song slug (without .html extension)
 * @returns Song data from blob storage or null if not found
 */
export async function fetchFromBlob(slug: string): Promise<SongBlobData | null> {
  // If blob URL is not configured, skip blob fetch
  const BLOB_BASE_URL = getBlobBaseUrl()
  
  if (!BLOB_BASE_URL) {
    console.log('Blob storage URL not configured, skipping blob fetch')
    return null
  }

  try {
    const cleanSlug = slug.replace('.html', '')
    const blobUrl = `${BLOB_BASE_URL}/songs/${cleanSlug}.json`
    
    console.log(`Attempting to fetch from blob: ${blobUrl}`)
    
    const response = await fetch(blobUrl, {
      next: {
        revalidate: 2592000, // 30 days - blob data is static
        tags: [`blob-${cleanSlug}`]
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Blob not found for slug: ${cleanSlug}`)
        return null
      }
      throw new Error(`Blob fetch failed: ${response.status} ${response.statusText}`)
    }

    const data: SongBlobData = await response.json()
    
    // Validate the blob data structure
    if (!data.slug || !data.title || !data.stanzas) {
      console.error('Invalid blob data structure:', data)
      return null
    }

    console.log(`✅ Successfully fetched from blob: ${cleanSlug}`)
    return data
  } catch (error) {
    console.error('Error fetching from blob storage:', error)
    return null
  }
}

/**
 * Check if blob storage is available
 * @returns true if blob storage is configured
 */
export function isBlobStorageAvailable(): boolean {
  return !!getBlobBaseUrl()
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
