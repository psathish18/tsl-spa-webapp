/**
 * Batch AI enrichment script for song JSON files in public/songs/
 *
 * Reads every JSON in public/songs/, calls Google Gemini (gemini-2.5-flash-lite)
 * to populate/update enrichedMetadata, then writes the result back in-place.
 *
 * Resume behaviour
 * ----------------
 * Songs that already have `enrichedMetadata` are SKIPPED automatically, so you
 * can interrupt at any time and re-run — it will continue from where it left off.
 * Use `--force` to re-enrich files that already have enrichedMetadata.
 *
 * Rate-limit handling
 * -------------------
 * - HTTP 429 "Too Many Requests" (RPM limit): exponential back-off, up to
 *   MAX_RETRIES retries per song before giving up on that song and moving on.
 * - Daily quota exhaustion (RPD limit, 429 with "quota" in the message): the
 *   script saves its place and exits cleanly.  Re-run tomorrow to continue.
 *
 * Usage
 * -----
 *   GOOGLE_AI_API_KEY=xxx tsx scripts/enrich-song-metadata.ts
 *   GOOGLE_AI_API_KEY=xxx tsx scripts/enrich-song-metadata.ts --force
 *   GOOGLE_AI_API_KEY=xxx tsx scripts/enrich-song-metadata.ts --limit=50
 *   tsx scripts/enrich-song-metadata.ts --dry-run   # no writes, no API calls
 */

import fs from 'fs/promises'
import path from 'path'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { ResponseSchema } from '@google/generative-ai'
import type { SongBlobData, EnrichedMetadata } from './types/song-blob.types'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SONGS_DIR = path.join(__dirname, '../public/songs')
const MODEL_NAME = 'gemini-2.5-flash-lite'

/** Milliseconds to wait between successful requests (~13 RPM, safely under the 15 RPM limit) */
const REQUEST_DELAY_MS = 4_500

/** Maximum retries on a 429 RPM error before skipping a song */
const MAX_RETRIES = 4

/** Base delay for exponential back-off (ms) */
const BACKOFF_BASE_MS = 15_000

// ---------------------------------------------------------------------------
// Gemini response schema
// ---------------------------------------------------------------------------

const ENRICHED_METADATA_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    actorName: {
      type: SchemaType.STRING,
      description: 'Lead actor / hero name for this Tamil movie. Use your Tamil cinema knowledge to fill this in accurately. Empty string if genuinely unknown.',
    },
    actressName: {
      type: SchemaType.STRING,
      description: 'Lead actress / heroine name for this Tamil movie. Use your Tamil cinema knowledge to fill this in accurately. Empty string if genuinely unknown.',
    },
    releaseYear: {
      type: SchemaType.STRING,
      description: 'Movie/song release year as a 4-digit string (YYYY). Empty string if unknown.',
    },
    mood: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        'Song moods: romantic, melancholic, upbeat, devotional, soothing, peppy, energetic, nostalgic, motivational, sad, happy, other',
    },
    songType: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        'Song type tags: duet, solo, melody, dance number, item number, folk, classical, bgm, lullaby, classic, devotional, theme, song',
    },
    occasions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "Occasions the song suits: valentine's day, anniversary, wedding, heartbreak, breakup, party, celebration, birthday, relaxation, festivals, morning, night drive, workout",
    },
    keywords: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Lowercase keywords for search/discovery (movie, artists, mood, genre, etc.)',
    },
  },
  required: ['mood', 'songType', 'occasions', 'keywords'],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags, returning plain text */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Extract a clean plain-text lyrics snippet from stanzas array */
function extractLyricsSnippet(stanzas: string[], maxLen = 400): string {
  const plainLines = stanzas
    .slice(0, 4)
    .map(s => stripHtml(s))
    .filter(s => s.length > 10)
  return plainLines.join(' | ').substring(0, maxLen)
}

/** Sleep for given milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** True if a 429 error looks like a daily quota (RPD) exhaustion */
function isDailyQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  return msg.includes('quota') || msg.includes('daily') || msg.includes('resource_exhausted')
}

/** True if the error is a retriable per-minute rate limit (RPM) */
function isRpmError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  return (
    (msg.includes('429') || msg.includes('rate') || msg.includes('too many')) &&
    !isDailyQuotaError(err)
  )
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(song: SongBlobData): string {
  const lyricsSnippet = extractLyricsSnippet(song.stanzas)
  const categories = song.category.join(', ')
  const actorHint = song.actorName ? `\nKnown actor from song data: ${song.actorName}` : ''

  return `You are an expert in Tamil cinema and music with deep knowledge of Tamil movies, actors, and actresses.

Analyze the following Tamil song details and return enriched metadata as JSON.

Song title : ${song.title}
Movie      : ${song.movieName || 'Unknown'}
Singer(s)  : ${song.singerName || 'Unknown'}
Lyricist   : ${song.lyricistName || 'Unknown'}
Music dir  : ${song.musicName || 'Unknown'}${actorHint}
Published  : ${song.published ? song.published.substring(0, 10) : 'Unknown'}
Categories : ${categories}
Lyrics snippet (Tanglish/Tamil):
${lyricsSnippet}

IMPORTANT: Use your knowledge of Tamil cinema to identify:
- actorName: the lead actor/hero of the movie "${song.movieName || 'this movie'}". Do NOT leave blank if you know it.
- actressName: the lead actress/heroine of the movie "${song.movieName || 'this movie'}". Do NOT leave blank if you know it.
- releaseYear: the release year of the movie/song.

Return a JSON object with:
- actorName   : lead actor name (string — use your Tamil film knowledge, empty only if truly unknown)
- actressName : lead actress name (string — use your Tamil film knowledge, empty only if truly unknown)
- releaseYear : release year YYYY (string, empty if unknown)
- mood        : array of moods (romantic, melancholic, upbeat, devotional, soothing, peppy, energetic, nostalgic, motivational, sad, happy, other)
- songType    : array of song type tags (duet, solo, melody, dance number, item number, folk, classical, bgm, lullaby, classic, devotional, theme, song)
- occasions   : array of suitable occasions (valentine's day, anniversary, wedding, heartbreak, breakup, party, celebration, birthday, relaxation, festivals, morning, night drive, workout)
- keywords    : array of 8–15 lowercase search keywords (include movie, artists, mood, genre, year if known)`
}

// ---------------------------------------------------------------------------
// Core enrichment with retry
// ---------------------------------------------------------------------------

async function callGeminiWithRetry(
  model: ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']>,
  prompt: string,
  slug: string,
): Promise<Partial<EnrichedMetadata> | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      return JSON.parse(text) as Partial<EnrichedMetadata>
    } catch (err) {
      if (isDailyQuotaError(err)) {
        // Propagate up — caller will handle graceful shutdown
        throw err
      }
      if (isRpmError(err) && attempt < MAX_RETRIES) {
        const waitMs = BACKOFF_BASE_MS * Math.pow(2, attempt)
        console.warn(`  ⏳ RPM limit hit for "${slug}" — waiting ${waitMs / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await sleep(waitMs)
        continue
      }
      // Non-retriable error: log and return null (skip this song)
      console.warn(`  ⚠️  Gemini error for "${slug}": ${(err as Error).message}`)
      return null
    }
  }
  console.warn(`  ⚠️  Exhausted retries for "${slug}", skipping`)
  return null
}

// ---------------------------------------------------------------------------
// Merge AI result with existing / baseline enrichedMetadata
// ---------------------------------------------------------------------------

function mergeEnrichedMetadata(
  existing: EnrichedMetadata | undefined,
  aiData: Partial<EnrichedMetadata>,
): EnrichedMetadata {
  const base: EnrichedMetadata = existing ?? { mood: ['other'], songType: ['song'], occasions: [], keywords: [] }

  const merged: EnrichedMetadata = {
    ...base,
    mood: aiData.mood?.length ? aiData.mood : base.mood,
    songType: aiData.songType?.length ? aiData.songType : base.songType,
    occasions: aiData.occasions?.length ? aiData.occasions : base.occasions,
    keywords: aiData.keywords?.length ? aiData.keywords : base.keywords,
  }
  if (aiData.actorName || base.actorName) {
    merged.actorName = aiData.actorName || base.actorName
  }
  if (aiData.actressName || base.actressName) {
    merged.actressName = aiData.actressName || base.actressName
  }
  if (aiData.releaseYear || base.releaseYear) {
    merged.releaseYear = aiData.releaseYear || base.releaseYear
  }
  return merged
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const dryRun = args.includes('--dry-run')

  // --limit=N  or  --limit N
  let limit: number | null = null
  const limitIndex = args.findIndex(a => a.startsWith('--limit'))
  if (limitIndex !== -1) {
    const raw = args[limitIndex]
    const rawValue = raw.includes('=') ? raw.split('=')[1] : (limitIndex + 1 < args.length ? args[limitIndex + 1] : '')
    limit = parseInt(rawValue, 10) || null
  }

  // --skip=N  — skip first N files (useful for manual offset)
  let skipN = 0
  const skipIndex = args.findIndex(a => a.startsWith('--skip'))
  if (skipIndex !== -1) {
    const raw = args[skipIndex]
    const rawValue = raw.includes('=') ? raw.split('=')[1] : (skipIndex + 1 < args.length ? args[skipIndex + 1] : '')
    skipN = parseInt(rawValue, 10) || 0
  }

  console.log('🎵 Tamil Song Lyrics — Batch AI Metadata Enrichment')
  console.log(`   Model  : ${MODEL_NAME}`)
  console.log(`   Source : ${SONGS_DIR}`)
  console.log(`   Mode   : ${dryRun ? 'DRY RUN (no writes)' : force ? 'FORCE (re-enrich all)' : 'INCREMENTAL (skip already enriched)'}`)
  if (limit) console.log(`   Limit  : ${limit} songs`)
  if (skipN) console.log(`   Skip   : first ${skipN} files`)
  console.log()

  if (!dryRun && !process.env.GOOGLE_AI_API_KEY) {
    console.error('❌  GOOGLE_AI_API_KEY environment variable is not set.')
    console.error('   Set it and re-run:  GOOGLE_AI_API_KEY=your_key npm run enrich-song-metadata')
    process.exit(1)
  }

  // Initialise Gemini model
  const genAI = dryRun ? null : new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  const model = genAI
    ? genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: ENRICHED_METADATA_SCHEMA,
          temperature: 0.2,
        },
      })
    : null

  // Read all JSON files
  const allFiles = (await fs.readdir(SONGS_DIR))
    .filter(f => f.endsWith('.json'))
    .sort()

  console.log(`📂 Found ${allFiles.length} JSON files in public/songs/\n`)

  // Stats
  const stats = { processed: 0, enriched: 0, skipped: 0, failed: 0, total: 0 }

  // Collect files to process (apply --skip and --limit after filtering)
  const pendingFiles: string[] = []
  for (const filename of allFiles) {
    const filepath = path.join(SONGS_DIR, filename)
    const raw = await fs.readFile(filepath, 'utf-8')
    const song: SongBlobData = JSON.parse(raw)

    if (!force && song.enrichedMetadata) {
      stats.skipped++
      continue
    }
    pendingFiles.push(filename)
  }

  const filesToProcess = pendingFiles.slice(skipN, limit ? skipN + limit : undefined)
  stats.total = filesToProcess.length

  console.log(`📋 To process: ${stats.total} | Already enriched (skipped): ${stats.skipped}`)
  if (stats.total === 0) {
    console.log('\n✅ Nothing to do — all songs already have enrichedMetadata.')
    console.log('   Use --force to re-enrich existing data.')
    return
  }
  console.log()

  for (let i = 0; i < filesToProcess.length; i++) {
    const filename = filesToProcess[i]
    const filepath = path.join(SONGS_DIR, filename)
    const raw = await fs.readFile(filepath, 'utf-8')
    const song: SongBlobData = JSON.parse(raw)

    const progress = `[${i + 1}/${stats.total}]`
    console.log(`${progress} 🎵 ${song.title}`)
    console.log(`       Movie: ${song.movieName || '—'}  |  Singer: ${song.singerName || '—'}`)

    if (dryRun) {
      console.log('       ✓ DRY RUN — would call AI here')
      stats.enriched++
      stats.processed++
      continue
    }

    let aiData: Partial<EnrichedMetadata> | null = null
    try {
      aiData = await callGeminiWithRetry(model!, buildPrompt(song), song.slug)
    } catch (err) {
      if (isDailyQuotaError(err)) {
        console.error('\n🔴 Daily quota (RPD) exhausted!')
        console.error(`   Processed ${stats.processed} songs this run (${stats.enriched} enriched, ${stats.failed} failed).`)
        console.error(`   ${stats.total - stats.processed} songs remain — re-run tomorrow to continue automatically.`)
        console.error(`   (Songs already enriched are skipped on re-run.)`)
        process.exit(0) // exit 0 — not an error, just daily limit reached
      }
      throw err // unexpected — let Node crash with stack trace
    }

    if (aiData) {
      const enrichedMetadata = mergeEnrichedMetadata(song.enrichedMetadata, aiData)
      const updated: SongBlobData = { ...song, enrichedMetadata }
      await fs.writeFile(filepath, JSON.stringify(updated, null, 2) + '\n')
      console.log(
        `       ✅ Enriched  actor="${enrichedMetadata.actorName || '—'}"  actress="${enrichedMetadata.actressName || '—'}"  mood=${JSON.stringify(enrichedMetadata.mood)}`,
      )
      stats.enriched++
    } else {
      console.log('       ⚠️  Skipped (AI returned no data)')
      stats.failed++
    }

    stats.processed++

    // Polite delay between requests
    if (i < filesToProcess.length - 1) {
      await sleep(REQUEST_DELAY_MS)
    }
  }

  console.log('\n─────────────────────────────────────────')
  console.log(`✨ Done!  Enriched: ${stats.enriched}  |  Failed: ${stats.failed}  |  Previously skipped: ${stats.skipped}`)
  if (pendingFiles.length - filesToProcess.length > 0) {
    console.log(`   Remaining (not yet processed): ${pendingFiles.length - filesToProcess.length}`)
    console.log('   Re-run the script to continue (or use --limit to process a batch per day).')
  }
}

main().catch(err => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})
