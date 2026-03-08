/**
 * Batch AI enrichment script for song JSON files in public/songs/
 *
 * Reads every JSON in public/songs/, calls an OpenAI-compatible API (GPT-4o)
 * to populate/update enrichedMetadata, then writes the result back in-place.
 *
 * Authentication — choose ONE of the following (in priority order):
 * ---------------------------------------------------------------
 * 1. GITHUB_TOKEN=ghp_...        → GitHub Models API (recommended; standard PAT works)
 *       GITHUB_TOKEN=ghp_xxx tsx scripts/enrich-song-metadata.ts
 *       Same pattern as filter-with-ai.ts
 *
 * 2. OPENAI_API_KEY=sk-...       → OpenAI API
 *       OPENAI_API_KEY=sk-xxx tsx scripts/enrich-song-metadata.ts
 *
 * 3. COPILOT_API_KEY=<oauth-token> → GitHub Copilot API
 *       Obtain with: gh auth token  (needs `gh` CLI logged in with Copilot access)
 *       NOTE: Standard PATs (ghp_...) are NOT supported by the Copilot endpoint.
 *
 * Resume behaviour
 * ----------------
 * Songs that already have `enrichedMetadata.high_ctr_intro` are SKIPPED
 * automatically, so you can interrupt at any time and re-run.
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
 *   GITHUB_TOKEN=ghp_xxx npm run enrich-song-metadata
 *   GITHUB_TOKEN=ghp_xxx npm run enrich-song-metadata -- --force
 *   GITHUB_TOKEN=ghp_xxx npm run enrich-song-metadata -- --limit=50
 *   npm run enrich-song-metadata -- --dry-run   # no writes, no API calls
 */

import { execSync } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import OpenAI from 'openai'
import type { SongBlobData, EnrichedMetadata } from './types/song-blob.types'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SONGS_DIR = path.join(__dirname, '../public/songs')
const MODEL_NAME = 'gpt-4o'

/** GitHub Models endpoint — accepts standard GITHUB_TOKEN (PAT). Same pattern as filter-with-ai.ts */
const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com'

/** GitHub Copilot OpenAI-compatible base URL (requires OAuth token, not PAT) */
const COPILOT_BASE_URL = 'https://api.githubcopilot.com'

/** Milliseconds to wait between successful requests (~13 RPM, well under the rate limit) */
const REQUEST_DELAY_MS = 4_500

/** Maximum retries on a 429 RPM error before skipping a song */
const MAX_RETRIES = 4

/** Base delay for exponential back-off (ms) */
const BACKOFF_BASE_MS = 15_000

// ---------------------------------------------------------------------------
// API client factory — resolves credentials and chooses the right endpoint
// ---------------------------------------------------------------------------

interface ApiClientConfig {
  client: OpenAI
  /** Human-readable label shown in startup log */
  label: string
}

/**
 * Priority order:
 *  1. GITHUB_TOKEN            → GitHub Models endpoint (models.inference.ai.azure.com)
 *                               Standard PATs (ghp_...) work here — same as filter-with-ai.ts
 *  2. OPENAI_API_KEY          → standard OpenAI endpoint (sk-... key)
 *  3. COPILOT_API_KEY         → GitHub Copilot endpoint (must be an OAuth token,
 *                               NOT a PAT — obtain via `gh auth token`)
 *  4. gh auth token (auto)    → fetches the OAuth token from the GitHub CLI and
 *                               uses the Copilot endpoint automatically
 *
 * Standard GitHub PATs (ghp_...) are rejected by api.githubcopilot.com but work fine
 * with the GitHub Models endpoint — use GITHUB_TOKEN for the simplest setup.
 */
function resolveApiClient(): ApiClientConfig {
  // Option 1: GITHUB_TOKEN → GitHub Models (works with standard PAT)
  if (process.env.GITHUB_TOKEN) {
    return {
      client: new OpenAI({ baseURL: GITHUB_MODELS_ENDPOINT, apiKey: process.env.GITHUB_TOKEN }),
      label: 'GitHub Models API (GITHUB_TOKEN)',
    }
  }

  // Option 2: standard OpenAI key
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      label: 'OpenAI API (OPENAI_API_KEY)',
    }
  }

  // Option 3: explicit Copilot OAuth token
  if (process.env.COPILOT_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.COPILOT_API_KEY, baseURL: COPILOT_BASE_URL }),
      label: 'GitHub Copilot API (COPILOT_API_KEY)',
    }
  }

  // Option 4: auto-fetch OAuth token via `gh auth token`
  try {
    const oauthToken = execSync('gh auth token', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
    // GitHub OAuth tokens start with 'gho_'; accept any non-empty token the CLI returns
    if (oauthToken && (oauthToken.startsWith('gho_') || oauthToken.startsWith('github_'))) {
      return {
        client: new OpenAI({ apiKey: oauthToken, baseURL: COPILOT_BASE_URL }),
        label: 'GitHub Copilot API (gh auth token)',
      }
    }
    if (oauthToken) {
      console.warn('  ⚠️  `gh auth token` returned an unexpected token format — skipping Copilot auth path')
    }
  } catch (ghErr) {
    const hint = ghErr instanceof Error ? ghErr.message.split('\n')[0] : String(ghErr)
    console.warn(`  ⚠️  gh CLI unavailable or not authenticated (${hint}) — skipping Copilot auth path`)
  }

  console.error('❌  No API credentials found. Set one of:')
  console.error('   GITHUB_TOKEN=ghp_...          (recommended — standard PAT, uses GitHub Models API)')
  console.error('   OPENAI_API_KEY=sk-...          (standard OpenAI key)')
  console.error('   COPILOT_API_KEY=<oauth-token>  (GitHub Copilot — run: gh auth token)')
  console.error('')
  console.error('   Tip: GITHUB_TOKEN is the easiest option and works with any GitHub PAT.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// JSON schema for structured output (OpenAI JSON mode)
// ---------------------------------------------------------------------------

const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    actorName: { type: 'string', description: 'Lead actor / hero name. Use Tamil cinema knowledge. Empty string if unknown.' },
    actressName: { type: 'string', description: 'Lead actress / heroine name. Use Tamil cinema knowledge. Empty string if unknown.' },
    releaseYear: { type: 'string', description: 'Movie/song release year as YYYY. Empty string if unknown.' },
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
      description: "Occasions the song suits: valentine's day, anniversary, wedding, heartbreak, breakup, party, celebration, birthday, relaxation, festivals, morning, night drive, workout",
    },
    keywords: {
      type: 'array',
      items: { type: 'string' },
      description: 'Lowercase keywords for search/discovery (movie, artists, mood, genre, etc.)',
    },
    high_ctr_intro: {
      type: 'string',
      description: 'A powerful 3-sentence intro paragraph for the blog header. Highlight the vibe of the song and mention the unique collaboration (e.g., Anirudh\'s mass beats with Vijay\'s vocals). Use <strong> tags for the song name and <em> for the movie.',
    },
  },
  // actorName, actressName, releaseYear are required in the schema so the API always
  // returns these fields; the description instructs the model to use an empty string
  // when the value is genuinely unknown, so "required" ≠ "non-empty" here.
  required: ['actorName', 'actressName', 'releaseYear', 'mood', 'songType', 'occasions', 'keywords', 'high_ctr_intro'],
  additionalProperties: false,
} as const

// ---------------------------------------------------------------------------
// Category filter
// ---------------------------------------------------------------------------

/**
 * Returns true for individual song files (categories include a `Song:` or
 * `OldSong:` prefix) while excluding tracklist / collection pages that carry
 * the `MovieLyrics` category.
 */
function isSongFile(category: string[]): boolean {
  // Normalise once to lowercase for all comparisons
  const lower = category.map(c => c.toLowerCase())
  return (
    !lower.includes('movielyrics') &&
    lower.some(c => c.startsWith('song:') || c.startsWith('oldsong:'))
  )
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
- keywords    : array of 8–15 lowercase search keywords (include movie, artists, mood, genre, year if known)
- high_ctr_intro : a powerful 3-sentence intro paragraph for the blog header. Highlight the vibe of the song and mention the unique collaboration (e.g., "Anirudh's mass beats with Vijay's energy"). Use <strong> tags around the song name and <em> tags around the movie name. Make it compelling enough to drive clicks from search results.`
}

// ---------------------------------------------------------------------------
// Core enrichment with retry
// ---------------------------------------------------------------------------

async function callCopilotWithRetry(
  client: OpenAI,
  prompt: string,
  slug: string,
): Promise<Partial<EnrichedMetadata> | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL_NAME,
        temperature: 0.2,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'enriched_metadata',
            strict: true,
            schema: RESPONSE_JSON_SCHEMA,
          },
        },
        messages: [
          {
            role: 'system',
            content: 'You are an expert in Tamil cinema and music. Always respond with valid JSON matching the requested schema.',
          },
          { role: 'user', content: prompt },
        ],
      })
      const text = response.choices[0]?.message?.content ?? ''
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
      console.warn(`  ⚠️  Copilot API error for "${slug}": ${(err as Error).message}`)
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
  if (aiData.high_ctr_intro || base.high_ctr_intro) {
    merged.high_ctr_intro = aiData.high_ctr_intro || base.high_ctr_intro
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

  // Initialise the API client (resolves credentials; exits if none available)
  // In dry-run mode we skip this so the script can run without any API key.
  let client: OpenAI | null = null
  if (!dryRun) {
    const resolved = resolveApiClient()
    client = resolved.client
    console.log(`   API    : ${resolved.label}`)
    console.log()
  }

  // Read all JSON files
  const allFiles = (await fs.readdir(SONGS_DIR))
    .filter(f => f.endsWith('.json'))
    .sort()

  console.log(`📂 Found ${allFiles.length} JSON files in public/songs/\n`)

  // Stats
  const stats = { processed: 0, enriched: 0, skipped: 0, failed: 0, total: 0 }

  // Collect files to process (apply category filter, then --skip and --limit)
  const pendingFiles: string[] = []
  let notSongFile = 0
  for (const filename of allFiles) {
    const filepath = path.join(SONGS_DIR, filename)
    const raw = await fs.readFile(filepath, 'utf-8')
    const song: SongBlobData = JSON.parse(raw)

    // Only process individual song files (Song: / OldSong: category, not MovieLyrics)
    if (!isSongFile(song.category)) {
      notSongFile++
      continue
    }

    if (!force && song.enrichedMetadata?.high_ctr_intro) {
      // Already fully enriched (has high_ctr_intro) — skip unless --force
      stats.skipped++
      continue
    }
    pendingFiles.push(filename)
  }

  const filesToProcess = pendingFiles.slice(skipN, limit ? skipN + limit : undefined)
  stats.total = filesToProcess.length

  console.log(`📋 To process: ${stats.total} | Already enriched (skipped): ${stats.skipped} | Non-song files (excluded): ${notSongFile}`)
  if (stats.total === 0) {
    console.log('\n✅ Nothing to do — all songs already have complete enrichedMetadata (including high_ctr_intro).')
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
      aiData = await callCopilotWithRetry(client!, buildPrompt(song), song.slug)
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
      if (enrichedMetadata.high_ctr_intro) {
        console.log(`       📝 Intro: ${enrichedMetadata.high_ctr_intro.substring(0, 100)}…`)
      }
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
