import { MetadataRoute } from 'next'

const BASE_URL = 'https://tsonglyrics.com'

/**
 * Sitemap Index
 * Points to paginated sitemap files (sitemap/0.xml, sitemap/1.xml, etc.)
 * Each paginated sitemap contains up to 1000 URLs
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Generate sitemap index entries
  // Assuming max 3000 songs = 3 paginated sitemaps (0, 1, 2)
  // Each contains 1000 songs + static pages in sitemap/0.xml
  const sitemapIndexes: MetadataRoute.Sitemap = [
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
    {
      url: `${BASE_URL}/sitemap/3.xml`,
      lastModified: new Date(),
    },
  ]

  return sitemapIndexes
}

// Revalidate sitemap index every 7 days (auto-revalidation handles immediate updates)
export const revalidate = 604800
