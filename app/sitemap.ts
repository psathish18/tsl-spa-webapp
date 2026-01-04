import { MetadataRoute } from 'next'

const BASE_URL = 'https://tsonglyrics.com'

/**
 * Sitemap Index
 * Fixed sitemap configuration for ~2000 songs
 * - sitemap/0.xml: Static pages (5) + Songs 0-999 (1,005 URLs max)
 * - sitemap/1.xml: Songs 1,000-1,999 (1,000 URLs)
 * - sitemap/2.xml: Songs 2,000-2,999 (1,000 URLs)
 * 
 * Total capacity: 3,005 URLs
 * 
 * To update after posting new songs:
 * curl -X POST https://tsonglyrics.com/api/revalidate-sitemap \
 *   -H "x-revalidate-secret: YOUR_SECRET"
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fixed 3 sitemaps for ~2000 songs (can handle up to 3000)
  return [
    {
      url: `${BASE_URL}/sitemap/0.xml`,
      lastModified: new Date(),
    },
    {
      url: `${BASE_URL}/sitemap/1.xml`,
      lastModified: new Date(),
    },
    {
      url: `${BASE_URL}/sitemap/2.xml`,
      lastModified: new Date(),
    },
  ]
}

// Revalidate sitemap index every 7 days (auto-revalidation handles immediate updates)
export const revalidate = 604800
