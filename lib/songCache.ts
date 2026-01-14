/**
 * In-Memory Song Cache for Sitemap Generation
 * Reduces CPU usage by fetching all songs once and sharing across sitemaps
 * Cache is shared within the same serverless instance (5-15 min lifetime)
 */

interface Song {
  id: { $t: string }
  title: { $t: string }
  content: { $t: string }
  published: { $t: string }
  category?: Array<{ term: string }>
  media$thumbnail?: { url: string }
  link?: Array<{ rel: string; href: string }>
}

// In-memory cache
let cachedSongs: Song[] | null = null
let cacheTime: number = 0
const CACHE_TTL = 3600000 // 1 hour in milliseconds

/**
 * Clear the in-memory song cache
 * Call this when new songs are posted to force fresh data fetch
 */
export function clearSongCache(): void {
  cachedSongs = null
  cacheTime = 0
  console.log('✓ Song cache cleared')
}

/**
 * Get all songs with in-memory caching
 * Fetches from Blogger API with pagination on cache miss
 */
export async function getAllSongs(): Promise<Song[]> {
  const now = Date.now()
  
  // Return cached data if valid
  if (cachedSongs && (now - cacheTime) < CACHE_TTL) {
    console.log(`✓ Using cached songs (${cachedSongs.length} songs, age: ${Math.round((now - cacheTime) / 1000)}s)`)
    return cachedSongs
  }
  
  console.log('⟳ Fetching all songs from Blogger API with pagination...')
  
  // Fetch all songs with pagination (Blogger API limit: 150 per request)
  let allSongs: any[] = []
  let fetchStartIndex = 1
  const maxResultsPerRequest = 150
  
  while (true) {
    const url = `https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&max-results=${maxResultsPerRequest}&start-index=${fetchStartIndex}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TamilSongLyrics/1.0)',
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 } // 1 hour
    })
    
    if (!response.ok) {
      throw new Error(`Blogger API error: ${response.status}`)
    }
    
    const data = await response.json()
    const entries = data.feed?.entry || []
    
    if (entries.length === 0) break
    
    allSongs = [...allSongs, ...entries]
    console.log(`  Fetched ${entries.length} entries (total: ${allSongs.length})`)
    
    // If we got less than 150, we've reached the end
    if (entries.length < maxResultsPerRequest) break
    
    fetchStartIndex += maxResultsPerRequest
  }
  
  // Filter to only song entries
  const songEntries = allSongs.filter((entry: any) =>
    entry.category?.some(
      (cat: any) =>
        cat.term?.startsWith('Song:') || cat.term?.startsWith('OldSong:')
    )
  )
  
  console.log(`✓ Fetched ${songEntries.length} songs (filtered from ${allSongs.length} total entries)`)
  
  // Cache the results
  cachedSongs = songEntries
  cacheTime = now
  
  return songEntries
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now()
  return {
    isCached: cachedSongs !== null,
    songCount: cachedSongs?.length || 0,
    cacheAge: cachedSongs ? Math.round((now - cacheTime) / 1000) : 0,
    ttl: CACHE_TTL / 1000,
    expiresIn: cachedSongs ? Math.max(0, Math.round((CACHE_TTL - (now - cacheTime)) / 1000)) : 0,
  }
}
