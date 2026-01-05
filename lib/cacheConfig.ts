/**
 * Centralized cache configuration for the entire application
 * All revalidation periods are set to 30 days to minimize CPU usage on Vercel free tier
 * Use manual revalidation APIs for immediate updates after posting new content
 */

// 30 days in seconds (2,592,000 seconds)
export const REVALIDATE_30_DAYS = 2592000

// Default revalidation period for all pages and APIs
export const DEFAULT_REVALIDATE = REVALIDATE_30_DAYS

// Page-specific revalidation periods (all 30 days for free tier optimization)
export const REVALIDATE_HOMEPAGE = REVALIDATE_30_DAYS
export const REVALIDATE_SONG_PAGE = REVALIDATE_30_DAYS
export const REVALIDATE_SEARCH_PAGE = REVALIDATE_30_DAYS
export const REVALIDATE_CATEGORY_PAGE = REVALIDATE_30_DAYS

// API-specific revalidation periods
export const REVALIDATE_TRENDING_API = REVALIDATE_30_DAYS
export const REVALIDATE_SITEMAP = REVALIDATE_30_DAYS
export const REVALIDATE_CATEGORY_API = REVALIDATE_30_DAYS
export const REVALIDATE_SEARCH_API = REVALIDATE_30_DAYS
export const REVALIDATE_AUTOCOMPLETE = REVALIDATE_30_DAYS

// Data fetch revalidation (should match page revalidation to avoid unnecessary API calls)
export const REVALIDATE_BLOGGER_FETCH = REVALIDATE_30_DAYS
export const REVALIDATE_TAMIL_LYRICS = REVALIDATE_30_DAYS
export const REVALIDATE_RELATED_SONGS = REVALIDATE_30_DAYS

// 404 page suggestions (can be shorter since it's not hit as often)
export const REVALIDATE_404_SEARCH = 3600 // 1 hour
export const REVALIDATE_POPULAR_POSTS = 3600 // 1 hour

// In-memory cache for sitemap (1 hour TTL)
export const SITEMAP_CACHE_TTL = 3600000 // 1 hour in milliseconds

// CDN cache control headers (30 days)
export const CDN_MAX_AGE = REVALIDATE_30_DAYS
export const CDN_STALE_WHILE_REVALIDATE = REVALIDATE_30_DAYS * 2 // 60 days

/**
 * Manual revalidation APIs:
 * - /api/revalidate?path=/song-slug.html (revalidate specific page)
 * - /api/revalidate?tag=trending-api (revalidate trending API)
 * - /api/revalidate-sitemap (revalidate sitemap + clear in-memory cache)
 */
