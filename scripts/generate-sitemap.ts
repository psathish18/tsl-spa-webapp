/**
 * Script to generate static sitemap XML files at build time
 * Usage: tsx scripts/generate-sitemap.ts
 */

import fs from 'fs/promises'
import path from 'path'
import { getAllSongs } from '../lib/songCache'
import { getSlugFromSong } from '../lib/slugUtils'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tsonglyrics.com'
const ITEMS_PER_SITEMAP = 1000
const PUBLIC_DIR = path.join(process.cwd(), 'public')

async function generateSitemapIndex(totalPages: number): Promise<string> {
  const sitemapUrls = []

  for (let page = 0; page < totalPages; page++) {
    sitemapUrls.push({
      url: `${BASE_URL}/sitemap/${page}.xml`,
      lastModified: new Date().toISOString(),
    })
  }

  // Generate XML sitemap index
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (sitemap) => `  <sitemap>
    <loc>${sitemap.url}</loc>
    <lastmod>${sitemap.lastModified}</lastmod>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>`

  return xml
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
      url: `${BASE_URL}/about-tamil-song-lyrics`,
      lastModified: new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/privacy-policy-tamil-song-lyrics-app`,
      lastModified: new Date().toISOString(),
      changefreq: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/disclaimer`,
      lastModified: new Date().toISOString(),
      changefreq: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms-of-service`,
      lastModified: new Date().toISOString(),
      changefreq: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/tamil-song-lyrics-in-english.html`,
      lastModified: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.7,
    },
  ]
}

async function generateSitemapXML(page: number, songs: any[], isFirstPage: boolean = false): Promise<string> {
  let urls: any[] = []

  if (isFirstPage) {
    // First page includes static pages
    urls = [...getStaticPages()]
  }

  // Calculate which songs go in this page
  const staticPagesCount = isFirstPage ? getStaticPages().length : 0
  const songsPerPage = ITEMS_PER_SITEMAP - staticPagesCount

  if (page === 0 && isFirstPage) {
    // First page: most recent songs (after static pages)
    const recentSongs = songs.slice(0, songsPerPage)
    urls = [
      ...urls,
      ...recentSongs.map((song: any) => {
        const slug = getSlugFromSong(song)
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
    ]
  } else {
    // Subsequent pages: older songs
    const startIndex = (page - 1) * ITEMS_PER_SITEMAP + songsPerPage
    const endIndex = startIndex + ITEMS_PER_SITEMAP
    const pageSongs = songs.slice(startIndex, endIndex)

    urls = pageSongs.map((song: any) => {
      const slug = getSlugFromSong(song)
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

  return xml
}

async function generateSitemaps() {
  try {
    console.log('Fetching all songs for sitemap generation...')
    const songEntries = await getAllSongs()
    console.log(`Found ${songEntries.length} songs`)

    // Sort songs by published date (most recent first)
    const sortedSongs = songEntries.sort((a: any, b: any) => {
      const dateA = new Date(a.published?.$t || a.updated?.$t || 0)
      const dateB = new Date(b.published?.$t || b.updated?.$t || 0)
      return dateB.getTime() - dateA.getTime() // Most recent first
    })

    console.log('Sorted songs by publication date (most recent first)')

    // Calculate number of sitemap pages needed
    const staticPages = getStaticPages()
    const staticPagesCount = staticPages.length
    const songsPerFirstPage = ITEMS_PER_SITEMAP - staticPagesCount
    const remainingSongs = sortedSongs.length - songsPerFirstPage
    const additionalPages = Math.ceil(remainingSongs / ITEMS_PER_SITEMAP)
    const totalPages = 1 + additionalPages // 1 for first page + additional pages

    console.log(`Generating ${totalPages} sitemap pages...`)
    console.log(`- sitemap/0.xml: ${staticPagesCount} static pages + ${songsPerFirstPage} most recent songs`)
    console.log(`- sitemap/1.xml+: ${remainingSongs} older songs across ${additionalPages} files`)
    console.log(`Using sitemap base URL: ${BASE_URL}`)

    // Generate each sitemap page
    for (let page = 0; page < totalPages; page++) {
      const isFirstPage = page === 0
      const xml = await generateSitemapXML(page, sortedSongs, isFirstPage)
      const filename = `sitemap/${page}.xml`
      const filepath = path.join(PUBLIC_DIR, filename)

      // Ensure directory exists
      await fs.mkdir(path.dirname(filepath), { recursive: true })

      // Write XML file
      await fs.writeFile(filepath, xml, 'utf-8')
      const urlCount = xml.split('<url>').length - 1 // Count URL entries
      console.log(`Generated ${filename} (${urlCount} URLs)`)
    }

    // Generate main sitemap index
    const indexXml = await generateSitemapIndex(totalPages)
    const indexPath = path.join(PUBLIC_DIR, 'sitemap.xml')
    await fs.writeFile(indexPath, indexXml, 'utf-8')
    console.log(`Generated sitemap.xml (${totalPages} sitemaps indexed)`)

    console.log('Sitemap generation completed successfully!')
  } catch (error) {
    console.error('Error generating sitemaps:', error)
    process.exit(1)
  }
}

// Run the script
generateSitemaps()