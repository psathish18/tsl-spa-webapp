/**
 * Date-Based Caching Utility for Blogger Posts
 * Implements intelligent caching based on post publication dates
 */

interface DateBasedCacheItem<T> {
  data: T
  publishedDate: string
  cachedAt: number
  ttl: number
  hits: number
}

interface Song {
  id: { $t: string }
  title: { $t: string }
  content: { $t: string }
  published: { $t: string }
  category?: Array<{ term: string }>
  media$thumbnail?: { url: string }
  link?: Array<{ rel: string; href: string }>
}

interface BloggerResponse {
  feed: {
    entry: Song[]
  }
}

class DateBasedCache {
  private cache = new Map<string, DateBasedCacheItem<any>>()
  private maxSize = 200 // Increased for song data

  /**
   * Calculate TTL based on post publication date
   * Recent posts: shorter cache (5 minutes)
   * Older posts: longer cache (24 hours)
   */
  private calculateDateBasedTTL(publishedDate: string): number {
    const now = Date.now()
    const published = new Date(publishedDate).getTime()
    const daysSincePublished = (now - published) / (1000 * 60 * 60 * 24)
    const hoursSincePublished = (now - published) / (1000 * 60 * 60)

    // Optimized for song lyrics lifecycle: initial updates possible, then stable forever
    if (hoursSincePublished < 6) {
      // Very fresh content: 2 minutes (possible typo fixes, immediate corrections)
      return 2 * 60 * 1000
    } else if (hoursSincePublished < 24) {
      // Same-day content: 10 minutes (initial corrections, formatting fixes)
      return 10 * 60 * 1000
    } else if (daysSincePublished < 3) {
      // 3-day content: 1 hour (final adjustments, quality improvements)
      return 1 * 60 * 60 * 1000
    } else if (daysSincePublished < 7) {
      // Week-old content: 6 hours (content stabilizing)
      return 6 * 60 * 60 * 1000
    } else if (daysSincePublished < 30) {
      // Month-old content: 24 hours (stable content)
      return 24 * 60 * 60 * 1000
    } else {
      // Older content: 7 DAYS (permanent cache - lyrics rarely change after 1 month)
      return 7 * 24 * 60 * 60 * 1000
    }
  }

  /**
   * Set cache item with date-based TTL
   */
  set<T>(key: string, data: T, publishedDate?: string): void {
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    const ttl = publishedDate 
      ? this.calculateDateBasedTTL(publishedDate)
      : 5 * 60 * 1000 // Default 5 minutes

    this.cache.set(key, {
      data,
      publishedDate: publishedDate || new Date().toISOString(),
      cachedAt: Date.now(),
      ttl,
      hits: 0
    })
  }

  /**
   * Get cache item if not expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Check if expired
    if (Date.now() - item.cachedAt > item.ttl) {
      this.cache.delete(key)
      return null
    }

    // Increment hit counter
    item.hits++
    return item.data
  }

  /**
   * Cache songs with individual date-based TTLs
   */
  setSongs(songs: Song[]): void {
    songs.forEach(song => {
      const songKey = `song:${song.id.$t}`
      this.set(songKey, song, song.published.$t)
    })

    // Also cache the full list with the newest post's date
    const newestPost = songs[0] // Assuming sorted by date
    if (newestPost) {
      this.set('songs:latest', songs, newestPost.published.$t)
    }
  }

  /**
   * Get cached songs
   */
  getSongs(): Song[] | null {
    return this.get<Song[]>('songs:latest')
  }

  /**
   * Get single song by ID
   */
  getSong(songId: string): Song | null {
    return this.get<Song>(`song:${songId}`)
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let lruKey = ''
    let lruHits = Infinity

    this.cache.forEach((item, key) => {
      if (item.hits < lruHits) {
        lruHits = item.hits
        lruKey = key
      }
    })

    if (lruKey) {
      this.cache.delete(lruKey)
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    this.cache.forEach((item, key) => {
      if (now - item.cachedAt > item.ttl) {
        toDelete.push(key)
      }
    })

    toDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    let expired = 0
    let total = 0
    let totalHits = 0
    const ttlDistribution = {
      '2min': 0,      // Very fresh (< 6 hours)
      '10min': 0,     // Same day (< 24 hours)  
      '1hour': 0,     // 3-day content
      '6hour': 0,     // Week-old content
      '24hour': 0,    // Month-old content
      '7days': 0      // Permanent cache (> 1 month)
    }

    this.cache.forEach((item, key) => {
      total++
      totalHits += item.hits
      
      if (now - item.cachedAt > item.ttl) {
        expired++
      }

      // Categorize by TTL (lyrics-optimized)
      if (item.ttl === 2 * 60 * 1000) ttlDistribution['2min']++
      else if (item.ttl === 10 * 60 * 1000) ttlDistribution['10min']++
      else if (item.ttl === 1 * 60 * 60 * 1000) ttlDistribution['1hour']++
      else if (item.ttl === 6 * 60 * 60 * 1000) ttlDistribution['6hour']++
      else if (item.ttl === 24 * 60 * 60 * 1000) ttlDistribution['24hour']++
      else if (item.ttl === 7 * 24 * 60 * 60 * 1000) ttlDistribution['7days']++
    })

    return {
      total,
      expired,
      hitRate: total > 0 ? (totalHits / total).toFixed(2) : '0',
      memoryUsage: `${this.cache.size}/${this.maxSize}`,
      ttlDistribution,
      vercelCDN: {
        note: "Vercel CDN cache is separate from application cache",
        clearCDN: "Use 'vercel --prod --scope your-team' to clear CDN cache",
        integration: "Our cache headers control CDN behavior via stale-while-revalidate",
        recommendation: "Normal updates: clear app cache only. Emergency: clear both."
      }
    }
  }

  /**
   * Get detailed cache contents (for debugging)
   */
  getDetailedContents() {
    const contents: any[] = []
    const now = Date.now()

    this.cache.forEach((item, key) => {
      const timeLeft = item.ttl - (now - item.cachedAt)
      const isExpired = timeLeft <= 0

      contents.push({
        key,
        publishedDate: item.publishedDate,
        cachedAt: new Date(item.cachedAt).toISOString(),
        ttl: `${item.ttl / 1000}s`,
        timeLeft: isExpired ? 'EXPIRED' : `${Math.round(timeLeft / 1000)}s`,
        hits: item.hits,
        expired: isExpired
      })
    })

    return contents.sort((a, b) => b.hits - a.hits) // Sort by hit count
  }

  /**
   * Get all cache keys (for pattern matching)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clear cache by pattern (supports wildcards)
   */
  clearByPattern(pattern: string): number {
    const keys = Array.from(this.cache.keys())
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    let cleared = 0

    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key)
        cleared++
      }
    })

    console.log(`🗑️ Cleared ${cleared} cache entries matching pattern: ${pattern}`)
    return cleared
  }

  /**
   * Clear cache for specific song/category
   */
  clearSong(songId: string): void {
    const patterns = [
      `song:${songId}`,
      `blogger:*${songId}*`,
      'songs:latest' // Clear latest list as it might contain this song
    ]
    
    patterns.forEach(pattern => this.clearByPattern(pattern))
  }

  /**
   * Clear all songs cache (useful when new content is posted)
   */
  clearAllSongs(): void {
    this.clearByPattern('song:*')
    this.clearByPattern('songs:*')
    this.clearByPattern('blogger:*/feeds/posts/default*')
  }

  /**
   * Force refresh specific URL (clear and re-fetch)
   */
  async forceRefresh(url: string): Promise<any> {
    const cacheKey = `blogger:${url}`
    this.cache.delete(cacheKey)
    console.log(`🔄 Force refreshing: ${url}`)
    return cachedBloggerFetch(url)
  }
}

// Create global instance
const dateBasedCache = new DateBasedCache()

/**
 * Enhanced fetch function with date-based caching for Blogger API
 */
export async function cachedBloggerFetch(
  url: string, 
  options: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {}
): Promise<BloggerResponse> {
  // In development, add cache-busting parameter to force fresh data from Blogger
  const isDev = process.env.NODE_ENV === 'development'
  const fetchUrl = isDev ? `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}` : url
  
  console.log(`Fetching from Blogger API (${isDev ? 'DEV - cache bust' : 'PROD'}):`, fetchUrl)
  
  // Use Next.js native cache with tags for proper revalidation support
  const fetchOptions: RequestInit = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TamilSongLyrics/1.0)',
      'Accept': 'application/json',
      ...options.headers
    },
    ...options
  }
  
  // In development, use no-store; in production, let Next.js handle caching via revalidate
  if (isDev) {
    fetchOptions.cache = 'no-store'
  } else if (options.next) {
    // In production, only set next options (revalidate, tags)
    // Don't set cache: 'force-cache' as it conflicts with revalidate
    fetchOptions.next = options.next
  }
  
  const response = await fetch(fetchUrl, fetchOptions)

  if (!response.ok) {
    throw new Error(`Blogger API error: ${response.status}`)
  }

  // Check if response came from cache
  const cacheStatus = response.headers.get('x-vercel-cache') || 
                      response.headers.get('x-nextjs-cache') || 
                      'UNKNOWN'
  
  if (cacheStatus === 'HIT' || cacheStatus === 'STALE') {
    console.log('✅ Cache HIT for:', url)
  } else {
    console.log('❌ Cache MISS for:', url, `(status: ${cacheStatus})`)
  }

  const data: BloggerResponse = await response.json()
  
  // MEMORY OPTIMIZATION: Strip unnecessary feed metadata to reduce cache size
  // Keep only feed.entry (songs) which is what we actually use
  // Exception: If max-results=0, we're fetching categories only, so keep feed.category
  const isCategoryRequest = url.includes('max-results=0')
  
  if (data.feed) {
    
    if (!isCategoryRequest) {
      // For regular requests: only keep feed.entry, remove everything else
      const entries = data.feed.entry
      data.feed = { entry: entries } as any
      
    } else {
      // For category requests (max-results=0): only keep feed.category
      const categories = (data.feed as any).category
      data.feed = { category: categories } as any
    }
  }
  
  return data
}

/**
 * Get cached song by search terms
 */
export function getCachedSong(searchTerms: string): Song | null {
  // This would require implementing a search index, for now return null
  // to fallback to API call
  return null
}

export { dateBasedCache }
export default dateBasedCache
