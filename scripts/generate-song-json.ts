/**
 * Script to generate JSON files for song pages from Blogger API
 * Usage: ts-node scripts/generate-song-json.ts [--test-one]
 */

import fs from 'fs/promises'
import path from 'path'
import sanitizeHtml from 'sanitize-html'
import OpenAI from 'openai'
import type { SongBlobData, RelatedSong, SEOMetadata, BlobContentSections, EnrichedMetadata } from './types/song-blob.types'

// Import utility functions from lib
import {
  stripImagesFromHtml,
  htmlToPlainText,
  formatSnippetWithStars,
  buildHashtags,
  getSongCategory,
  buildTwitterShareUrl,
  buildWhatsAppShareUrl,
  splitAndSanitizeStanzas,
  splitAndSanitizeSections,
  DEFAULT_SANITIZE_OPTIONS,
} from '../lib/lyricsUtils'

import {
  extractSnippet,
  generateSongDescription,
  cleanCategoryLabel,
  SONG_DESCRIPTION_SNIPPET_LENGTH,
  extractSongMetadata,
  hasEnglishTranslationContent,
  generateKeywords
} from '../lib/seoUtils'

import { getSlugFromSong } from '../lib/slugUtils'

// Constants
const BLOGGER_API_BASE = 'https://tsonglyricsapp.blogspot.com/feeds/posts/default'
const BLOGGER_TAMIL_API_BASE = 'https://tsonglyricsapptamil.blogspot.com/feeds/posts/default'
const BLOGGER_ENGLISH_API_BASE = 'https://tslmeaning.blogspot.com/feeds/posts/default'
const OUTPUT_DIR = './blob-data'
const SCHEMA_VERSION = 1

// Category terms excluded from enriched keywords
const EXCLUDED_KEYWORD_CATEGORIES = ['MovieLyrics', 'AllOldSongs']

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
async function fetchAllSongs(category?: string,testOne?: boolean, limitIndex?: number): Promise<BloggerEntry[]> {
  console.log('📡 Fetching all songs from Blogger API...' + limitIndex)
  
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
        if (entries.length < maxResults || testOne || (limitIndex &&  limitIndex < maxResults)) {
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
 * Fetch English translation for a song
 */
async function fetchEnglishTranslation(songCategory: string): Promise<BloggerEntry | null> {
  try {
    console.log(`  🌐 Fetching English translation for: ${songCategory}`)
    const response = await fetch(
      `${BLOGGER_ENGLISH_API_BASE}/-/${encodeURIComponent(songCategory)}?alt=json&max-results=5`
    )
    const data = await response.json() as BloggerResponse
    return data.feed?.entry?.[0] || null
  } catch (error) {
    console.warn(`  ⚠️  No English translation found for: ${songCategory}`)
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
        const metadata = extractSongMetadata(entry.category, entry.title.$t)
        
        return {
          id: entry.id.$t,
          title: entry.title.$t,
          slug: getSlugFromSong(entry),
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
  content: string,
  slug: string
): SEOMetadata {
  const title = entry.title.$t
  const snippet = extractSnippet(content, SONG_DESCRIPTION_SNIPPET_LENGTH)
  
  const description = generateSongDescription({
    entry: entry,
    title: metadata.songTitle,
    snippet,
    movie: metadata.movieName,
    singer: metadata.singerName,
    lyricist: metadata.lyricistName,
    music: metadata.musicName,
    actor: metadata.actorName
  })
  
  const keywords = generateKeywords(entry, metadata)

  // Generate structured data (JSON-LD) - enhanced schema for rich search results
  // const structuredData: SEOMetadata['structuredData'] = {
  //   "@context": "https://schema.org",
  //   "@type": "MusicRecording",
  //   "name": title,
  //   "url": `https://www.tsonglyrics.com/${slug}.html`,
  //   "keywords": [
  //     `${title} lyrics meaning`,
  //     `${title} Tamil to English translation`,
  //     `${metadata.movieName} movie songs lyrics`,
  //     `${title} WhatsApp status lyrics`,
  //     `${metadata.movieName} ${title} song credits`
  //   ].filter(Boolean),
  //   ...(metadata.singerName && metadata.singerName !== 'Unknown Artist' && {
  //     "byArtist": {
  //       "@type": "Person",
  //       "name": metadata.singerName
  //     }
  //   }),
  //   ...(metadata.movieName && {
  //     "inAlbum": {
  //       "@type": "MusicAlbum",
  //       "name": metadata.movieName
  //     }
  //   }),
  //   "recordingOf": {
  //     "@type": "MusicComposition",
  //     "name": title,
  //     ...(metadata.lyricistName && {
  //       "lyricist": {
  //         "@type": "Person", 
  //         "name": metadata.lyricistName
  //       }
  //     }),
  //     ...(metadata.musicName && {
  //       "composer": {
  //         "@type": "Person",
  //         "name": metadata.musicName
  //       }
  //     }),
  //     "lyrics": {
  //       "@type": "CreativeWork",
  //       "text": content || snippet,
  //       "inLanguage": "ta"
  //     }
  //   },
  //   "inLanguage": "ta",
  //   "genre": "Tamil Music",
  //   "datePublished": entry.published.$t,
  //   "publisher": {
  //     "@type": "Organization",
  //     "name": "Tamil Song Lyrics",
  //     "url": "https://www.tsonglyrics.com"
  //   }
  // }
  
  return {
    title,
    description,
    keywords: `${keywords}, Tamil lyrics, Tamil songs`
  }
}

/**
 * Process categories (optimized - just term strings)
 */
function processCategories(categories: Array<{ term: string }> = []): string[] {
  return categories.map(cat => cat.term)
}

/**
 * Generate enriched metadata by analyzing song data (rule-based)
 */
function generateEnrichedMetadata(
  entry: BloggerEntry,
  metadata: ReturnType<typeof extractSongMetadata>,
  categories: string[]
): EnrichedMetadata {
  // Release year: prefer year embedded in movie name (e.g. "Coolie - 2024"),
  // fall back to the published (blog post) year as an approximation
  const yearFromMovie = metadata.movieName?.match(/\b(19|20)\d{2}\b/)?.[0]
  const releaseYear = yearFromMovie
    ?? (entry.published?.$t ? new Date(entry.published.$t).getFullYear().toString() : undefined)

  const titleLower = entry.title.$t.toLowerCase()
  const lowerCats = categories.map(c => c.toLowerCase())

  // Actress from optional "Actress:" category prefix
  const actressCategory = (entry.category || []).find(c => c.term?.startsWith('Actress:'))
  const actressName = actressCategory?.term?.replace('Actress:', '').trim() || undefined

  // --- Mood detection (rule-based keyword matching) ---
  const moodRules: Record<string, string[]> = {
    romantic: ['love', 'kadhal', 'kaadhal', 'anbae', 'anbe', 'nenjil', 'romantic', 'priya', 'idhayam', 'heart'],
    melancholic: ['sad', 'vilag', 'piriv', 'pain', 'tears', 'azhuge', 'kadavule', 'vizhiye', 'nenje', 'thanimai'],
    upbeat: ['dance', 'beats', 'kuthu', 'mass', 'thala', 'vibe', 'item', 'fun', 'party', 'festive'],
    devotional: ['devi', 'amman', 'murugan', 'ayya', 'siva', 'ganesha', 'prayer', 'temple', 'god'],
    soothing: ['lullaby', 'thalattu', 'baby', 'sleep', 'cradle', 'soft'],
    peppy: ['peppy', 'jolly', 'comedy', 'happy', 'celebration'],
  }

  const mood: string[] = []
  for (const [moodType, keywords] of Object.entries(moodRules)) {
    if (keywords.some(kw => titleLower.includes(kw) || lowerCats.some(c => c.includes(kw)))) {
      mood.push(moodType)
    }
  }
  if (mood.length === 0) mood.push('other')

  // --- Song type detection ---
  // Note: 'SInger:' (capital I) is a known typo present in some Blogger category data
  const singerCount = (entry.category || []).filter(
    c => c.term?.startsWith('Singer:') || c.term?.startsWith('SInger:')
  ).length
  const songType: string[] = []
  if (singerCount > 1) songType.push('duet')
  if (lowerCats.some(c => c === 'lyricsintamil')) songType.push('tamil lyrics')
  if (lowerCats.some(c => c.includes('englishtranslation'))) songType.push('translation')
  if (
    titleLower.includes('melody') ||
    titleLower.includes('kadhal') ||
    titleLower.includes('love')
  ) songType.push('melody')
  if (
    lowerCats.some(c => c.startsWith('oldmovie:') || c.startsWith('oldsong:') || c === 'alloldsongs')
  ) songType.push('classic')
  if (titleLower.includes('dance') || lowerCats.some(c => c.includes('dance'))) songType.push('dance')
  if (songType.length === 0) songType.push('song')

  // --- Occasions mapped from moods ---
  const occasionMap: Record<string, string[]> = {
    romantic: ["valentine's day", 'romantic date', 'anniversary', 'wedding'],
    melancholic: ['heartbreak', 'breakup'],
    devotional: ['festivals', 'puja', 'religious occasion'],
    soothing: ['bedtime', 'relaxation'],
    upbeat: ['party', 'celebration'],
    peppy: ['celebration', 'birthday'],
  }
  const occasions: string[] = []
  for (const m of mood) {
    for (const occ of occasionMap[m] || []) {
      if (!occasions.includes(occ)) occasions.push(occ)
    }
  }

  // --- Keywords array ---
  const keywordsSet = new Set<string>()
  if (metadata.movieName) keywordsSet.add(metadata.movieName.toLowerCase())
  if (metadata.singerName) {
    metadata.singerName.split(',').forEach(s => {
      const t = s.trim().toLowerCase()
      if (t) keywordsSet.add(t)
    })
  }
  if (metadata.lyricistName) keywordsSet.add(metadata.lyricistName.toLowerCase())
  if (metadata.musicName) keywordsSet.add(metadata.musicName.toLowerCase())
  if (metadata.actorName) keywordsSet.add(metadata.actorName.toLowerCase())
  if (actressName) keywordsSet.add(actressName.toLowerCase())
  categories
    .filter(c => !c.startsWith('Song:') && !EXCLUDED_KEYWORD_CATEGORIES.includes(c))
    .forEach(c => {
      const cleaned = c.replace(/^[^:]*:/, '').trim().toLowerCase()
      if (cleaned) keywordsSet.add(cleaned)
    })
  mood.forEach(m => keywordsSet.add(m))
  const keywords = Array.from(keywordsSet).filter(Boolean)

  return {
    ...(metadata.actorName ? { actorName: metadata.actorName } : {}),
    ...(actressName ? { actressName } : {}),
    ...(releaseYear ? { releaseYear } : {}),
    mood,
    songType,
    occasions,
    keywords,
  }
}

/** GitHub Models endpoint — accepts standard GITHUB_TOKEN (PAT). Same pattern as filter-with-ai.ts */
const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com'
const GITHUB_MODELS_MODEL = 'gpt-4o'

// JSON schema for structured output (OpenAI json_schema response format)
const ENRICHED_METADATA_JSON_SCHEMA = {
  type: 'object',
  properties: {
    actorName: { type: 'string', description: 'Lead actor name, or empty string if unknown' },
    actressName: { type: 'string', description: 'Lead actress name, or empty string if unknown' },
    releaseYear: { type: 'string', description: 'Song/movie release year (YYYY), or empty string if unknown' },
    mood: {
      type: 'array',
      items: { type: 'string' },
      description: 'Song moods: romantic, melancholic, upbeat, devotional, soothing, peppy, energetic, nostalgic, motivational, sad, happy, other',
    },
    songType: {
      type: 'array',
      items: { type: 'string' },
      description: 'Song type tags: duet, solo, melody, dance number, item number, folk, classical, bgm, lullaby, classic, devotional, theme, song',
    },
    occasions: {
      type: 'array',
      items: { type: 'string' },
      description: "Occasions: valentine's day, anniversary, wedding, heartbreak, breakup, party, celebration, birthday, relaxation, festivals, morning, night drive, workout",
    },
    keywords: {
      type: 'array',
      items: { type: 'string' },
      description: 'Lowercase keywords for search/discovery (movie, artists, mood, genre, etc.)',
    },
  },
  required: ['actorName', 'actressName', 'releaseYear', 'mood', 'songType', 'occasions', 'keywords'],
  additionalProperties: false,
}

/**
 * Use GitHub Models (GPT-4o via GITHUB_TOKEN) to enrich song metadata.
 * Falls back to the rule-based baseline on any error or when GITHUB_TOKEN is not set.
 */
async function enrichMetadataWithAI(
  entry: BloggerEntry,
  metadata: ReturnType<typeof extractSongMetadata>,
  categories: string[],
  lyricsSnippet: string,
  baseline: EnrichedMetadata
): Promise<EnrichedMetadata> {
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) {
    console.log('  ℹ️  GITHUB_TOKEN not set — skipping AI enrichment')
    return baseline
  }

  try {
    const client = new OpenAI({ baseURL: GITHUB_MODELS_ENDPOINT, apiKey: githubToken })

    const prompt = `You are an expert in Tamil cinema and music. Analyze the following Tamil song and return enriched metadata as JSON.

Song title: ${entry.title.$t}
Movie: ${metadata.movieName || 'Unknown'}
Singer(s): ${metadata.singerName || 'Unknown'}
Lyricist: ${metadata.lyricistName || 'Unknown'}
Music director: ${metadata.musicName || 'Unknown'}
Actor: ${metadata.actorName || 'Unknown'}
Categories: ${categories.join(', ')}
Lyrics snippet (Tanglish/Tamil): ${lyricsSnippet}

Return a JSON object with:
- actorName: lead actor (string — use your Tamil cinema knowledge; empty string only if truly unknown)
- actressName: lead actress (string — use your Tamil cinema knowledge; empty string only if truly unknown)
- releaseYear: release year YYYY (string, empty string if unknown)
- mood: array of moods that describe the song (romantic, melancholic, upbeat, devotional, soothing, peppy, energetic, nostalgic, motivational, sad, happy, other)
- songType: array describing the song type (duet, solo, melody, dance number, item number, folk, classical, bgm, lullaby, classic, devotional, theme, song)
- occasions: array of occasions this song suits (valentine's day, anniversary, wedding, heartbreak, breakup, party, celebration, birthday, relaxation, festivals, morning, night drive, workout)
- keywords: array of 8–15 lowercase search keywords (include movie, artists, mood, genre, year if known)`

    console.log('  🤖 Calling GitHub Models (GPT-4o) for enrichment...')
    const response = await client.chat.completions.create({
      model: GITHUB_MODELS_MODEL,
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'enriched_metadata',
          strict: true,
          schema: ENRICHED_METADATA_JSON_SCHEMA,
        },
      },
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.choices[0]?.message?.content ?? ''
    if (!text) throw new Error('GitHub Models returned an empty response')
    const aiData = JSON.parse(text) as Partial<EnrichedMetadata>

    // Merge AI result over baseline; skip empty string values from AI
    const merged: EnrichedMetadata = {
      ...baseline,
      mood: aiData.mood?.length ? aiData.mood : baseline.mood,
      songType: aiData.songType?.length ? aiData.songType : baseline.songType,
      occasions: aiData.occasions?.length ? aiData.occasions : baseline.occasions,
      keywords: aiData.keywords?.length ? aiData.keywords : baseline.keywords,
    }
    if (aiData.actorName || baseline.actorName) {
      merged.actorName = aiData.actorName || baseline.actorName
    }
    if (aiData.actressName || baseline.actressName) {
      merged.actressName = aiData.actressName || baseline.actressName
    }
    if (aiData.releaseYear || baseline.releaseYear) {
      merged.releaseYear = aiData.releaseYear || baseline.releaseYear
    }
    console.log('  ✅ AI enrichment complete')
    return merged
  } catch (error) {
    console.warn('  ⚠️  AI enrichment failed, using rule-based fallback:', (error as Error).message)
    return baseline
  }
}

/**
 * Generate complete JSON data for a single song (optimized)
 */
async function generateSongJSON(entry: BloggerEntry, useAI: boolean = false): Promise<SongBlobData> {
  const slug = getSlugFromSong(entry)
  const metadata = extractSongMetadata(entry.category, entry.title.$t)
  
  console.log(`\n🎵 Processing: ${entry.title.$t}`)
  console.log(`   Slug: ${slug}`)
  
  // Fetch related data in parallel
  const [tamilSong, relatedSongs, englishSong] = await Promise.all([
    metadata.songCategory ? fetchTamilLyrics(metadata.songCategory) : Promise.resolve(null),
    metadata.movieTerm ? fetchRelatedSongs(metadata.movieTerm, entry.id.$t) : Promise.resolve([]),
    metadata.songCategory ? fetchEnglishTranslation(metadata.songCategory) : Promise.resolve(null)
  ])
  
  // Process main content
  const safeContent = stripImagesFromHtml(entry.content.$t)
  const categories = processCategories(entry.category)
  
  // Split content into sections (intro, easter egg, lyrics, faq)
  const sections = splitAndSanitizeSections(safeContent, sanitizeHtml)
  
  // Process stanzas only from the lyrics section
  const stanzas = processStanzas(sections.lyrics, categories)
  
  // Create optimized sections for blob data (exclude lyrics since we have stanzas)
  const optimizedSections: BlobContentSections = {
    intro: sections.intro,
    easterEgg: sections.easterEgg,
    faq: sections.faq
  }
  
  // Process Tamil content
  let tamilStanzas: string[] = []
  let tamilContent = '';
  if (tamilSong) {
    tamilContent = stripImagesFromHtml(tamilSong.content.$t)
    const tamilSections = splitAndSanitizeSections(tamilContent, sanitizeHtml)
    tamilStanzas = processStanzas(tamilSections.lyrics, categories)
  }
  
  // Process English translation content
  let englishStanzas: string[] = []
  let englishContent = '';
  if (englishSong) {
    englishContent = stripImagesFromHtml(englishSong.content.$t)
    const englishSections = splitAndSanitizeSections(englishContent, sanitizeHtml)
    englishStanzas = processStanzas(englishSections.lyrics, categories)
  }
  
  // Generate SEO data
  const thumbnail = getEnhancedThumbnail(entry.media$thumbnail?.url)
  const seo = generateSEOData(entry, metadata, tamilSong ? tamilContent : safeContent, slug)

  // Generate enriched metadata (rule-based baseline, optionally upgraded with AI)
  const baseline = generateEnrichedMetadata(entry, metadata, categories)
  const enrichedMetadata = useAI
    ? await enrichMetadataWithAI(
        entry, metadata, categories,
        htmlToPlainText(stanzas.slice(0, 2).join(' ')).substring(0, 300),
        baseline
      )
    : baseline

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
    sections: optimizedSections,
    stanzas,
    hasTamilLyrics: !!tamilSong,
    tamilStanzas,
    hasEnglishLyrics: !!englishSong,
    englishStanzas,
    category: categories,
    relatedSongs,
    seo,
    thumbnail,
    enrichedMetadata,
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
  const useAI = args.includes('--use-ai')
  
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
  if (useAI) {
    if (process.env.GOOGLE_AI_API_KEY) {
      console.log('🤖 AI enrichment enabled (Gemini gemini-2.5-flash-lite)\n')
    } else {
      console.warn('⚠️  --use-ai flag set but GOOGLE_AI_API_KEY is not set. Falling back to rule-based enrichment.\n')
    }
  }
  
  // Fetch all songs (with optional category filter)
  const songs = await fetchAllSongs(category,testOne, limit)
  console.log(`✅ Found ${songs.length} songs\n`)
  
  if (songs.length === 0) {
    console.error('❌ No songs found!')
    process.exit(1)
  }
  
  // Create output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  console.log(`📁 Output directory: ${OUTPUT_DIR}\n`)
  
  // Process songs (just first one if --test-one flag, or limit if specified)
  let songsToProcess = testOne ? songs.slice(0, 20) : songs
  if (limit && !testOne) {
    songsToProcess = songs.slice(0, limit)
    console.log(`📌 Limiting to first ${limit} songs\n`)
  }
  
  for (let i = 0; i < songsToProcess.length; i++) {
    const song = songsToProcess[i]
    
    try {
      const songData = await generateSongJSON(song, useAI)
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
