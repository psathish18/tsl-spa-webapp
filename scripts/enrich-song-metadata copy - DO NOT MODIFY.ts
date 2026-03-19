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
const ENRICHMENT_MODEL = 'gpt-4o'      // Use full model for metadata enrichment
const TRANSLATION_MODEL = 'gpt-4o-mini' // Use mini model for translation (cost optimization)

/** GitHub Models endpoint — accepts standard GITHUB_TOKEN (PAT). Same pattern as filter-with-ai.ts */
const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com'

/** GitHub Copilot OpenAI-compatible base URL (requires OAuth token, not PAT) */
const COPILOT_BASE_URL = 'https://api.githubcopilot.com'

/** Milliseconds to wait between successful requests (~13 RPM, well under the rate limit) */
const REQUEST_DELAY_MS = 4_500

/** Milliseconds to wait between the two API calls made for a single song (enrichment + translation) */
const INTRA_SONG_DELAY_MS = 2_000

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
    faq: {
      type: 'string',
      description: 'FAQ section as an HTML string. Generate 3–5 question/answer pairs relevant to the song, movie, and artists. Format as: <div class="faq-section"><h3>Frequently Asked Questions</h3><div class="faq-item"><h4>First question?</h4><p>First answer.</p></div><div class="faq-item"><h4>Second question?</h4><p>Second answer.</p></div></div>. Use <strong> for key terms inside answers.',
    },
    summary: {
      type: 'string',
      description: 'A 4 to 5 sentence summary of the song ( include actor name, actress name and release year) based on the situation in the movie, the theme / mood of the song, what the song conveys, and the emotions it evokes.'
    }
  },
  // actorName, actressName, releaseYear are required in the schema so the API always
  // returns these fields; the description instructs the model to use an empty string
  // when the value is genuinely unknown, so "required" ≠ "non-empty" here.
  required: ['actorName', 'actressName', 'releaseYear', 'mood', 'songType', 'occasions', 'keywords', 'high_ctr_intro', 'faq', 'summary'],
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

  return `You are an expert in Tamil cinema and music with deep knowledge of Tamil movies including old Tamil movies (from 1950s to present), actors, and actresses.

Analyze the following Tamil song details and return enriched metadata as JSON. Use your extensive knowledge of Tamil cinema to identify the lead actor and actress accurately. If the movie name is provided, cross-reference it with your knowledge to ensure correctness. If the movie name is unknown, use the singer, lyricist, or music director details as hints to infer the actor/actress.

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
- actorName: the lead actor/hero of the Tamil movie "${song.movieName || 'this movie'}". Do NOT leave blank if you know it.
- actressName: the lead actress/heroine of the Tamil movie "${song.movieName || 'this movie'}". Do NOT leave blank if you know it.
- releaseYear: the release year of the Tamil movie/song.

Return a JSON object with:
- actorName   : lead actor name (string — use your Tamil film knowledge, empty only if truly unknown)
- actressName : lead actress name (string — use your Tamil film knowledge, empty only if truly unknown)
- releaseYear : release year YYYY (string, empty if unknown)
- mood        : array of moods (romantic, melancholic, upbeat, devotional, soothing, peppy, energetic, nostalgic, motivational, sad, happy, other)
- songType    : array of song type tags (duet, solo, melody, dance number, item number, folk, classical, bgm, lullaby, classic, devotional, theme, song)
- occasions   : array of suitable occasions (valentine's day, anniversary, wedding, heartbreak, breakup, party, celebration, birthday, relaxation, festivals, morning, night drive, workout)
- keywords    : array of 8–15 lowercase search keywords (include movie, artists, mood, genre, year if known)
- high_ctr_intro : a powerful 3-sentence intro paragraph for the blog header. Highlight the vibe of the song and mention the unique collaboration (e.g., "Anirudh's mass beats with Vijay's energy"). Use <strong> tags around the song name and <em> tags around the movie name. Make it compelling enough to drive clicks from search results.
- faq         : 3 to 5 frequently asked questions about the song as an HTML string. Use this exact format (include all Q&A pairs inline):
  <div class="faq-section"><h3>Frequently Asked Questions</h3><div class="faq-item"><h4>First question?</h4><p>First answer.</p></div><div class="faq-item"><h4>Second question?</h4><p>Second answer.</p></div></div>
  Include questions about the song's meaning, the movie plot context, the singer/music director, actor/actress, and release year. Use <strong> for key terms in answers.
- summary     : a 4 to 5 sentence summary of the song based on the situation in the movie, the theme of the song, what the song conveys, and the emotions it evokes.

Strict rules:
1. Base all metadata on the song details and your knowledge of Tamil cinema. Do NOT make up information.
2. If the movie name is unknown but you can infer the actor/actress from the song details, provide those names based on your Tamil cinema knowledge.
3. If you cannot confidently identify the lead actor or actress, return an empty string for that field instead of guessing.
4. For keywords, include a mix of movie name, singer, lyricist, music director, mood, genre, and release year (if known). Use only lowercase keywords without special characters.
5. Ensure the high_ctr_intro is engaging and highlights what makes the song special. Use HTML tags as instructed.
6. The faq field must be a valid HTML string following the exact format specified — do not return JSON objects or any other format.

Respond with ONLY a JSON object matching this schema — no explanations or additional text.`;
}

// ---------------------------------------------------------------------------
// JSON schema for structured output — per-stanza translation
// ---------------------------------------------------------------------------

const TRANSLATION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    meanings: {
      type: 'array',
      items: { type: 'string' },
      description: 'English meaning of each stanza, one entry per stanza in the same order as input.',
    },
  },
  required: ['meanings'],
  additionalProperties: false,
} as const

// ---------------------------------------------------------------------------
// Translation prompt builder
// ---------------------------------------------------------------------------

/**
 * Builds a prompt that asks GPT-4o to translate every Tanglish stanza in
 * `song.stanzas` to simple English.  Each entry in the returned "meanings"
 * array must correspond to the stanza at the same index.
 */
function buildTranslationPrompt(song: SongBlobData): string {
  const stanzaTexts = song.stanzas
    .map((s, i) => `Stanza ${i + 1}:\n${stripHtml(s)}`)
    .join('\n\n')

  return `You are a Tamil song translator specialising in Tanglish (Tamil written in English letters) lyrics.

Translate each stanza below into simple, natural English.
- Preserve the original mood and feeling of the song.
- Keep the language basic and easy for a general audience to understand.
- Do NOT romanticise or over-poetise — stay true to the literal meaning.
- Return one English meaning per stanza in the same order as the input.
- If a stanza is already in English, return it as-is.

Song title : ${song.title}
Movie      : ${song.movieName || 'Unknown'}
Singer(s)  : ${song.singerName || 'Unknown'}

${stanzaTexts}

Return a JSON object with a "meanings" array where meanings[i] is the English translation of Stanza i+1.
The array must have exactly ${song.stanzas.length} elements.`;
}

async function callCopilotWithRetry(
  client: OpenAI,
  prompt: string,
  slug: string,
  model: string = ENRICHMENT_MODEL,
): Promise<Partial<EnrichedMetadata> | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
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
// Translation with retry
// ---------------------------------------------------------------------------

/**
 * Calls the AI to translate all stanzas of a song into English.
 * Returns a `string[]` (one entry per stanza) or `null` on failure.
 */
async function callTranslationWithRetry(
  client: OpenAI,
  song: SongBlobData,
  model: string = TRANSLATION_MODEL,
): Promise<string[] | null> {
  const prompt = buildTranslationPrompt(song)
  const slug = song.slug

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.1,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'stanza_translations',
            strict: true,
            schema: TRANSLATION_JSON_SCHEMA,
          },
        },
        messages: [
          {
            role: 'system',
            content: 'You are a Tamil song translator. Always respond with valid JSON matching the requested schema.',
          },
          { role: 'user', content: prompt },
        ],
      })
      const text = response.choices[0]?.message?.content ?? ''
      const parsed = JSON.parse(text) as { meanings: string[] }
      const meanings = parsed.meanings ?? []
      // Guard: returned array must exactly match stanza count
      if (meanings.length !== song.stanzas.length) {
        console.warn(`  ⚠️  Translation length mismatch for "${slug}": expected ${song.stanzas.length}, got ${meanings.length} — skipping`)
        return null
      }
      return meanings
    } catch (err) {
      if (isDailyQuotaError(err)) {
        throw err
      }
      if (isRpmError(err) && attempt < MAX_RETRIES) {
        const waitMs = BACKOFF_BASE_MS * Math.pow(2, attempt)
        console.warn(`  ⏳ RPM limit hit (translation) for "${slug}" — waiting ${waitMs / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await sleep(waitMs)
        continue
      }
      console.warn(`  ⚠️  Translation API error for "${slug}": ${(err as Error).message}`)
      return null
    }
  }
  console.warn(`  ⚠️  Exhausted translation retries for "${slug}", skipping`)
  return null
}

// ---------------------------------------------------------------------------
// Merge AI result with existing / baseline enrichedMetadata
// ---------------------------------------------------------------------------

function mergeEnrichedMetadata(
  existing: EnrichedMetadata | undefined,
  aiData: Partial<EnrichedMetadata>,
): EnrichedMetadata {
  const base: EnrichedMetadata = existing ?? { mood: ['other'], songType: ['song'], occasions: [], keywords: [], faq: '', summary: '' }

  const merged: EnrichedMetadata = {
    ...base,
    mood: aiData.mood?.length ? aiData.mood : base.mood,
    songType: aiData.songType?.length ? aiData.songType : base.songType,
    occasions: aiData.occasions?.length ? aiData.occasions : base.occasions,
    keywords: aiData.keywords?.length ? aiData.keywords : base.keywords,
    faq: aiData.faq ? aiData.faq : base.faq,
    summary: aiData.summary?.length ? aiData.summary : base.summary,
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
    merged.high_ctr_intro =  base.high_ctr_intro || aiData.high_ctr_intro
  }
  if (aiData.stanzaMeanings?.length) {
    merged.stanzaMeanings = aiData.stanzaMeanings
  } else if (base.stanzaMeanings?.length) {
    merged.stanzaMeanings = base.stanzaMeanings
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
  console.log(`   Enrichment Model : ${ENRICHMENT_MODEL}`)
  console.log(`   Translation Model: ${TRANSLATION_MODEL}`)
  console.log(`   Source           : ${SONGS_DIR}`)
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
      // Already fully enriched — skip unless --force or any field is missing/incomplete
      const meaningsComplete =
        Array.isArray(song.enrichedMetadata.stanzaMeanings) &&
        song.enrichedMetadata.stanzaMeanings.length === song.stanzas.length
      const faqComplete = !!song.enrichedMetadata.faq
      const summaryComplete = !!song.enrichedMetadata.summary
      const introComplete = !!song.enrichedMetadata.high_ctr_intro
      if (meaningsComplete && introComplete) {
        stats.skipped++
        continue
      }
      // high_ctr_intro present but other fields missing — still needs processing
    }
    pendingFiles.push(filename)
  }

  const filesToProcess = pendingFiles.slice(skipN, limit ? skipN + limit : undefined)
  stats.total = filesToProcess.length

  console.log(`📋 To process: ${stats.total} | Already enriched (skipped): ${stats.skipped} | Non-song files (excluded): ${notSongFile}`)
  if (stats.total === 0) {
    console.log('\n✅ Nothing to do — all songs already have complete enrichedMetadata (high_ctr_intro, faq, summary, and stanzaMeanings).')
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
      console.log('       ✓ DRY RUN — would call AI here (enrichment + translation)')
      stats.enriched++
      stats.processed++
      continue
    }

    // ── Step 1: Metadata enrichment (skip if already complete) ──────────────
    let aiData: Partial<EnrichedMetadata> | null = null
    const needsEnrichment = force || !song.enrichedMetadata?.high_ctr_intro
    if (needsEnrichment) {
      try {
        aiData = await callCopilotWithRetry(client!, buildPrompt(song), song.slug, ENRICHMENT_MODEL)
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
    } else {
      console.log(`       ✓ Using existing enrichment data (high_ctr_intro, faq, summary)`)
    }

    // ── Step 2: Per-stanza English translation ────────────────────────────
    const existingMeanings = song.enrichedMetadata?.stanzaMeanings
    const needsTranslation =
      force ||
      !Array.isArray(existingMeanings) ||
      existingMeanings.length !== song.stanzas.length

    let translatedMeanings: string[] | null = null

    if (needsTranslation && song.stanzas.length > 0) {
      // Brief pause between the two API calls made for the same song
      if (needsEnrichment) await sleep(INTRA_SONG_DELAY_MS)
      try {
        translatedMeanings = await callTranslationWithRetry(client!, song, TRANSLATION_MODEL)
      } catch (err) {
        if (isDailyQuotaError(err)) {
          console.error('\n🔴 Daily quota (RPD) exhausted during translation!')
          console.error(`   Processed ${stats.processed} songs this run (${stats.enriched} enriched, ${stats.failed} failed).`)
          console.error(`   Re-run tomorrow to continue automatically.`)
          process.exit(0)
        }
        throw err
      }
    } else if (!needsTranslation && existingMeanings) {
      // Use existing translations instead of re-translating
      translatedMeanings = existingMeanings
      console.log(`       ✓ Using existing ${existingMeanings.length} stanza translations`)
    }

    // ── Merge and write ────────────────────────────────────────────────────
    const mergeInput: Partial<EnrichedMetadata> = {
      ...(aiData ?? {}),
      ...(translatedMeanings ? { stanzaMeanings: translatedMeanings } : {}),
    }

    if (aiData || translatedMeanings) {
      const enrichedMetadata = mergeEnrichedMetadata(song.enrichedMetadata, mergeInput)
      const updated: SongBlobData = { ...song, enrichedMetadata }
      await fs.writeFile(filepath, JSON.stringify(updated, null, 2) + '\n')
      if (aiData) {
        console.log(
          `       ✅ Enriched  actor="${enrichedMetadata.actorName || '—'}"  actress="${enrichedMetadata.actressName || '—'}"  mood=${JSON.stringify(enrichedMetadata.mood)}`,
        )
        if (enrichedMetadata.high_ctr_intro) {
          console.log(`       📝 Intro: ${enrichedMetadata.high_ctr_intro.substring(0, 100)}…`)
        }
      }
      if (translatedMeanings) {
        console.log(`       🌐 Translated ${translatedMeanings.length} stanzas to English`)
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
