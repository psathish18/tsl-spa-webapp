import { NextRequest } from 'next/server'
import { getAllSongs } from '@/lib/songCache'
import { REVALIDATE_SITEMAP } from '@/lib/cacheConfig'

const BASE_URL = 'https://www.tsonglyrics.com'
const ITEMS_PER_SITEMAP = 1000

// Helper function to generate song slug (same logic as app/page.tsx)
function getSongSlug(song: any): string {
  const apiTitle = song.title?.$t || song.title
  if (apiTitle) {
    return apiTitle.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }
  
  if (song.songTitle) {
    return song.songTitle.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }
  
  if (song.category && Array.isArray(song.category)) {
    for (const cat of song.category) {
      if (cat.term && cat.term.startsWith('Song:')) {
        return cat.term.replace(/^Song:/, '').trim()
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
      }
    }
  }
  
  return 'unknown-song'
}

// Static pages (included in sitemap 0 only)
function getStaticPages() {
  return [
    {
      url: BASE_URL,
      lastModified: new Date().toISOString(),
      changefreq: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/about-tamil-song-lyrics.html`,
      lastModified: new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/privacy-policy-tamil-song-lyrics-app.html`,
      lastModified: new Date().toISOString(),
      changefreq: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/disclaimer.html`,
      lastModified: new Date().toISOString(),
      changefreq: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/tamil-song-lyrics-in-english.html`,
      lastModified: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.7,
    },
  ]
}

export async function GET(
  request: NextRequest,
  { params }: { params: { page: string } }
) {
  const page = parseInt(params.page)

  if (isNaN(page) || page < 0) {
    return new Response('Invalid page number', { status: 400 })
  }

  try {
    // Fetch all songs using in-memory cache (reduces CPU by ~66%)
    const songEntries = await getAllSongs()

    // Calculate pagination
    const startIndex = page * ITEMS_PER_SITEMAP
    const endIndex = startIndex + ITEMS_PER_SITEMAP
    const paginatedSongs = songEntries.slice(startIndex, endIndex)

    // Generate URLs for this page
    let urls = paginatedSongs.map((song: any) => {
      const slug = getSongSlug(song)
      const publishedDate = song.published?.$t
        ? new Date(song.published.$t).toISOString()
        : new Date().toISOString()

      return {
        url: `${BASE_URL}/${slug}.html`,
        lastModified: publishedDate,
        changefreq: 'monthly',
        priority: 0.8,
      }
    })

    // Include static pages in first sitemap only
    if (page === 0) {
      urls = [...getStaticPages(), ...urls]
    }

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (item) => `  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.lastModified}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // 24 hours
      },
    })
  } catch (error) {
    console.error('Error generating paginated sitemap:', error)

    // Return empty sitemap on error
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
      },
      status: 500,
    })
  }
}

// Revalidate every 30 days to minimize CPU usage
// Use manual revalidation API for immediate updates: /api/revalidate-sitemap
export const revalidate = REVALIDATE_SITEMAP
