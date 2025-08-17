/**
 * Advanced Client-Side Cache Utility
 * Implements multi-layer caching strategy with TTL and memory management
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
}

class AdvancedCache {
  private cache = new Map<string, CacheItem<any>>()
  private maxSize = 100 // Maximum cache entries
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Set cache item with TTL (Time To Live)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // If cache is full, remove least recently used item
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
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
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    // Increment hit counter
    item.hits++
    return item.data
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    let expired = 0
    let total = 0
    let totalHits = 0

    this.cache.forEach((item, key) => {
      total++
      totalHits += item.hits
      if (now - item.timestamp > item.ttl) {
        expired++
      }
    })

    return {
      total,
      expired,
      active: total - expired,
      hitRate: totalHits / Math.max(total, 1),
      memoryUsage: this.cache.size
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
    
    if (keysToDelete.length > 0) {
      console.log(`Cache cleanup: Removed ${keysToDelete.length} expired entries`)
    }
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let lruKey = ''
    let minHits = Infinity
    let oldestTime = Date.now()

    this.cache.forEach((item, key) => {
      if (item.hits < minHits || (item.hits === minHits && item.timestamp < oldestTime)) {
        lruKey = key
        minHits = item.hits
        oldestTime = item.timestamp
      }
    })

    if (lruKey) {
      this.cache.delete(lruKey)
    }
  }

  /**
   * Destroy cache and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.cache.clear()
  }
}

// Create global cache instance
export const cache = new AdvancedCache()

/**
 * Cache decorator for async functions
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = 5 * 60 * 1000
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args)
    
    // Try to get from cache first
    const cached = cache.get(key)
    if (cached !== null) {
      return cached
    }

    // If not in cache, execute function and cache result
    try {
      const result = await fn(...args)
      cache.set(key, result, ttl)
      return result
    } catch (error) {
      // Don't cache errors
      throw error
    }
  }) as T
}

/**
 * Cache-aware fetch wrapper
 */
export async function cachedFetch(
  url: string, 
  options?: RequestInit, 
  ttl: number = 5 * 60 * 1000
): Promise<any> {
  const cacheKey = `fetch:${url}:${JSON.stringify(options)}`
  
  // Try cache first
  const cached = cache.get(cacheKey)
  if (cached !== null) {
    return cached
  }

  // Fetch and cache
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  cache.set(cacheKey, data, ttl)
  return data
}

// Browser-only localStorage backup cache
export const persistentCache = {
  set(key: string, data: any, ttl: number = 24 * 60 * 60 * 1000): void {
    if (typeof window === 'undefined') return
    
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl
      }
      localStorage.setItem(`tsl_cache_${key}`, JSON.stringify(item))
    } catch (error) {
      console.warn('Failed to set persistent cache:', error)
    }
  },

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    
    try {
      const item = localStorage.getItem(`tsl_cache_${key}`)
      if (!item) return null

      const parsed = JSON.parse(item)
      
      // Check if expired
      if (Date.now() - parsed.timestamp > parsed.ttl) {
        localStorage.removeItem(`tsl_cache_${key}`)
        return null
      }

      return parsed.data
    } catch (error) {
      console.warn('Failed to get persistent cache:', error)
      return null
    }
  },

  delete(key: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`tsl_cache_${key}`)
  },

  clear(): void {
    if (typeof window === 'undefined') return
    
    const keys = Object.keys(localStorage).filter(key => key.startsWith('tsl_cache_'))
    keys.forEach(key => localStorage.removeItem(key))
  }
}
