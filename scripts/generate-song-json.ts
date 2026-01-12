/**
 * Script to generate JSON files for song pages from Blogger API
 * Usage: ts-node scripts/generate-song-json.ts [--test-one]
 */

import fs = require('fs/promises')
import path = require('path')
import sanitizeHtml = require('sanitize-html')
import type { SongBlobData, RelatedSong, SEOMetadata } from './types/song-blob.types'

// Import utility functions from lib
const {
  stripImagesFromHtml,
  htmlToPlainText,
  formatSnippetWithStars,
  buildHashtags,
  getSongCategory,
  buildTwitterShareUrl,
  buildWhatsAppShareUrl,
  splitAndSanitizeStanzas,
} = require('../lib/lyricsUtils')

const {
  extractSnippet,
  getMeaningfulLabels,
  generateSongDescription,
  cleanCategoryLabel,
  SONG_DESCRIPTION_SNIPPET_LENGTH
} = require('../lib/seoUtils')

// Constants
const BLOGGER_API_BASE = 'https://tsonglyricsapp.blogspot.com/feeds/posts/default'
const BLOGGER_TAMIL_API_BASE = 'https://tsonglyricsapptamil.blogspot.com/feeds/posts/default'
const OUTPUT_DIR = './blob-data'
const SCHEMA_VERSION = 1

// Blogger API response types
interface BloggerEntry {
  id: { $t: string }
  title: { $t: string }
  content: { $t: string }
  published: { $t: string }
  author: Array<{ name: { $t: string } }>
  category?: Array<{ term: string }>
  media$thumbnail?: { url: string }
}

interface BloggerResponse {
  feed: {
    entry?: BloggerEntry[]
  }
}

/**
 * Create slug from title (matching song page logic at line 250)
 */
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\b\d+\b/g, '')           // Remove standalone digits (e.g., "2" in "2 Point 0")
    .replace(/[^a-z0-9\s-]/g, '')      // Remove special characters
    .replace(/\s+/g, '-')              // Convert spaces to hyphens
    .replace(/-+/g, '-')               // Clean up multiple hyphens
    .replace(/^-+|-+$/g, '')           // Remove leading/trailing hyphens
}

/**
 * Get enhanced thumbnail URL
 */
function getEnhancedThumbnail(url: string | undefined): string | null {
  if (!url) return null
  try {
    const decoded = decodeURIComponent(url)
    return decoded.replace(/\/s\d+-c\//, '/s400-c/')
  } catch {
    return url
  }
}

/**
 * Fetch all songs from Blogger API
 * @param category - Category to filter by (e.g., "Movie:Coolie", "Song:Test")
 */
async function fetchAllSongs(category?: string): Promise<BloggerEntry[]> {
  console.log('📡 Fetching all songs from Blogger API...')
  
  if (category) {
    // Category filtering - single request (max 9999 results)
    const url = `${BLOGGER_API_BASE}/-/${encodeURIComponent(category)}?alt=json&max-results=9999`
    console.log(`   🏷️  Filtering by category: ${category}`)
    
    const response = await fetch(url)
    const data = await response.json() as BloggerResponse
    return data.feed?.entry || []
  } else {
    // No category - fetch all songs using pagination with start-index
    console.log(`   📄 Fetching all songs with pagination...`)
    const allEntries: BloggerEntry[] = []
    let startIndex = 1
    const maxResults = 150 // Blogger API limit per request
    let hasMore = true
    
    while (hasMore) {
      const url = `${BLOGGER_API_BASE}?alt=json&start-index=${startIndex}&max-results=${maxResults}`
      console.log(`      Fetching batch: start-index=${startIndex}`)
      
      const response = await fetch(url)
      const data = await response.json() as BloggerResponse
      const entries = data.feed?.entry || []
      
      if (entries.length === 0) {
        hasMore = false
        console.log(`      ✅ Reached end of feed`)
      } else {
        allEntries.push(...entries)
        console.log(`      ✅ Fetched ${entries.length} songs (total: ${allEntries.length})`)
        
        // Check if we got fewer results than requested (last page)
        if (entries.length < maxResults) {
          hasMore = false
          console.log(`      ✅ Last batch retrieved`)
        } else {
          startIndex += maxResults
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }
    
    console.log(`   ✅ Total songs fetched: ${allEntries.length}`)
    return allEntries
  }
}

/**
 * Fetch Tamil lyrics for a song
 */
async function fetchTamilLyrics(songCategory: string): Promise<BloggerEntry | null> {
  try {
    console.log(`  📖 Fetching Tamil lyrics for: ${songCategory}`)
    const response = await fetch(
      `${BLOGGER_TAMIL_API_BASE}/-/${encodeURIComponent(songCategory)}?alt=json&max-results=5`
    )
    const data = await response.json() as BloggerResponse
    return data.feed?.entry?.[0] || null
  } catch (error) {
    console.warn(`  ⚠️  No Tamil lyrics found for: ${songCategory}`)
    return null
  }
}

/**
 * Fetch related songs from same movie (optimized - minimal data)
 */
async function fetchRelatedSongs(movieTerm: string, currentSongId: string): Promise<RelatedSong[]> {
  try {
    const movieName = movieTerm.replace('Movie:', '')
    console.log(`  🎬 Fetching related songs for movie: ${movieName}`)
    
    const response = await fetch(
      `${BLOGGER_API_BASE}/-/${encodeURIComponent(movieTerm)}?alt=json&max-results=15`
    )
    const data = await response.json() as BloggerResponse
    const entries = data.feed?.entry || []
    
    return entries
      .filter(entry => entry.id.$t !== currentSongId)
      .slice(0, 10)
      .map(entry => {
        const metadata = extractSongMetadata(entry)
        
        return {
          id: entry.id.$t,
          title: entry.title.$t,
          slug: createSlug(entry.title.$t),
          thumbnail: getEnhancedThumbnail(entry.media$thumbnail?.url),
          movieName: metadata.movieName,
          singerName: metadata.singerName,
          published: entry.published.$t
        }
      })
  } catch (error) {
    console.warn(`  ⚠️  Failed to fetch related songs:`, error)
    return []
  }
}

/**
 * Extract metadata from Blogger entry categories
 */
function extractSongMetadata(entry: BloggerEntry) {
  const songCategory = entry.category?.find(cat => cat.term?.startsWith('Song:'))
  const movieCategory = entry.category?.find(cat => cat.term?.startsWith('Movie:'))
  const singerCategory = entry.category?.find(cat => cat.term?.startsWith('Singer:'))
  const lyricsCategory = entry.category?.find(cat => cat.term?.startsWith('Lyrics:') || cat.term?.startsWith('Lyricist:'))
  const musicCategory = entry.category?.find(cat => cat.term?.startsWith('Music:'))
  const actorCategory = entry.category?.find(cat => cat.term?.startsWith('Actor:'))
  
  return {
    songTitle: songCategory ? songCategory.term.replace('Song:', '') : entry.title.$t,
    movieName: movieCategory?.term?.replace('Movie:', '') || '',
    singerName: singerCategory?.term?.replace('Singer:', '') || entry.author?.[0]?.name?.$t || 'Unknown Artist',
    lyricistName: lyricsCategory?.term?.replace(/^(Lyrics|Lyricist):/, '') || '',
    musicName: musicCategory?.term?.replace('Music:', '') || '',
    actorName: actorCategory?.term?.replace('Actor:', '') || '',
    songCategory: songCategory?.term || '',
    movieTerm: movieCategory?.term || ''
  }
}

/**
 * Process stanzas (optimized - no share links, just HTML)
 */
function processStanzas(
  content: string,
  categories: string[]
): string[] {
  const hasEnglishTranslation = categories.some(cat => 
    cat.toLowerCase().includes('englishtranslation')
  )
  
  return splitAndSanitizeStanzas(content, sanitizeHtml, hasEnglishTranslation)
}

/**
 * Generate SEO metadata (optimized - minimal fields)
 */
function generateSEOData(
  entry: BloggerEntry,
  metadata: ReturnType<typeof extractSongMetadata>,
  content: string
): SEOMetadata {
  const title = entry.title.$t
  const labels = getMeaningfulLabels(entry.category || [])
  const snippet = extractSnippet(content, SONG_DESCRIPTION_SNIPPET_LENGTH)
  
  const description = generateSongDescription({
    title,
    snippet,
    movie: labels.movie,
    singer: labels.singer,
    lyricist: labels.lyricist,
    music: labels.music,
    actor: labels.actor
  })
  
  const keywords = (entry.category || [])
    .filter(cat => !cat.term.startsWith('Song:'))
    .map(cat => cat.term.replace(/^[^:]*:/, '').trim())
    .filter(Boolean)
    .join(', ')
  
  // Generate structured data (JSON-LD) - minimal fields only
  const structuredData: SEOMetadata['structuredData'] = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": title,
    "description": description,
    "inLanguage": "ta",
    "genre": "Tamil Music",
    "datePublished": entry.published.$t,
    "publisher": {
      "@type": "Organization",
      "name": "Tamil Song Lyrics",
      "url": "https://www.tsonglyrics.com"
    }
  }
  
  // Add optional fields only if they exist
  if (metadata.movieName) {
    structuredData.inAlbum = {
      "@type": "MusicAlbum",
      "name": metadata.movieName
    }
  }
  
  if (metadata.singerName && metadata.singerName !== 'Unknown Artist') {
    structuredData.byArtist = {
      "@type": "Person",
      "name": metadata.singerName
    }
  }
  
  if (metadata.lyricistName) {
    structuredData.lyricist = {
      "@type": "Person",
      "name": metadata.lyricistName
    }
  }
  
  if (metadata.musicName) {
    structuredData.composer = {
      "@type": "Person",
      "name": metadata.musicName
    }
  }
  
  return {
    title,
    description,
    keywords: `${keywords}, Tamil lyrics, Tamil songs`,
    structuredData
  }
}

/**
 * Process categories (optimized - just term strings)
 */
function processCategories(categories: Array<{ term: string }> = []): string[] {
  return categories.map(cat => cat.term)
}

/**
 * Generate complete JSON data for a single song (optimized)
 */
async function generateSongJSON(entry: BloggerEntry): Promise<SongBlobData> {
  const slug = createSlug(entry.title.$t)
  const metadata = extractSongMetadata(entry)
  
  console.log(`\n🎵 Processing: ${entry.title.$t}`)
  console.log(`   Slug: ${slug}`)
  
  // Fetch related data in parallel
  const [tamilSong, relatedSongs] = await Promise.all([
    metadata.songCategory ? fetchTamilLyrics(metadata.songCategory) : Promise.resolve(null),
    metadata.movieTerm ? fetchRelatedSongs(metadata.movieTerm, entry.id.$t) : Promise.resolve([])
  ])
  
  // Process main content
  const safeContent = stripImagesFromHtml(entry.content.$t)
  const categories = processCategories(entry.category)
  const stanzas = processStanzas(safeContent, categories)
  
  // Process Tamil content
  let tamilStanzas: string[] = []
  if (tamilSong) {
    const tamilContent = stripImagesFromHtml(tamilSong.content.$t)
    tamilStanzas = processStanzas(tamilContent, categories)
  }
  
  // Generate SEO data
  const thumbnail = getEnhancedThumbnail(entry.media$thumbnail?.url)
  const seo = generateSEOData(entry, metadata, safeContent)
  
  const songData: SongBlobData = {
    slug,
    id: entry.id.$t,
    title: entry.title.$t,
    movieName: metadata.movieName,
    singerName: metadata.singerName,
    lyricistName: metadata.lyricistName,
    musicName: metadata.musicName,
    actorName: metadata.actorName,
    published: entry.published.$t,
    stanzas,
    hasTamilLyrics: !!tamilSong,
    tamilStanzas,
    category: categories,
    relatedSongs,
    seo,
    thumbnail,
    generatedAt: new Date().toISOString(),
    version: SCHEMA_VERSION
  }
  
  return songData
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  const testOne = args.includes('--test-one')
  
  // Check for --limit flag
  const limitIndex = args.findIndex(arg => arg.startsWith('--limit'))
  let limit: number | null = null
  if (limitIndex !== -1) {
    const limitArg = args[limitIndex]
    if (limitArg.includes('=')) {
      limit = parseInt(limitArg.split('=')[1])
    } else if (args[limitIndex + 1]) {
      limit = parseInt(args[limitIndex + 1])
    }
  }
  
  // Check for --category flag
  const categoryIndex = args.findIndex(arg => arg.startsWith('--category'))
  let category: string | undefined
  if (categoryIndex !== -1) {
    const categoryArg = args[categoryIndex]
    if (categoryArg.includes('=')) {
      category = categoryArg.split('=')[1]
    } else if (args[categoryIndex + 1]) {
      category = args[categoryIndex + 1]
    }
  }
  
  console.log('🚀 Starting song JSON generation...\n')
  
  // Fetch all songs (with optional category filter)
  const songs = await fetchAllSongs(category)
  console.log(`✅ Found ${songs.length} songs\n`)
  
  if (songs.length === 0) {
    console.error('❌ No songs found!')
    process.exit(1)
  }
  
  // Create output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  console.log(`📁 Output directory: ${OUTPUT_DIR}\n`)
  
  // Process songs (just first one if --test-one flag, or limit if specified)
  let songsToProcess = testOne ? songs.slice(0, 1) : songs
  if (limit && !testOne) {
    songsToProcess = songs.slice(0, limit)
    console.log(`📌 Limiting to first ${limit} songs\n`)
  }
  
  for (let i = 0; i < songsToProcess.length; i++) {
    const song = songsToProcess[i]
    
    try {
      const songData = await generateSongJSON(song)
      const filename = `${songData.slug}.json`
      const filepath = path.join(OUTPUT_DIR, filename)
      
      await fs.writeFile(filepath, JSON.stringify(songData, null, 2))
      
      console.log(`✅ Created: ${filename}`)
      console.log(`   Size: ${(JSON.stringify(songData).length / 1024).toFixed(2)} KB`)
      
      if (testOne) {
        console.log(`\n📊 Sample output saved to: ${filepath}`)
        console.log(`\n✨ Test complete! Review the JSON file and adjust structure if needed.`)
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${song.title.$t}:`, error)
      if (testOne) throw error // Fail fast in test mode
    }
    
    // Rate limiting (avoid overwhelming Blogger API)
    if (!testOne && i < songsToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  if (!testOne) {
    console.log(`\n✨ All ${songsToProcess.length} JSON files generated!`)
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
