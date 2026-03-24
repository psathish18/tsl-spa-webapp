/**
 * Generate full song lyrics JSON files from validated missing keywords using AI.
 *
 * Unlike generate-song-json.ts (which fetches from Blogger API), this script
 * uses GitHub Copilot to synthesise the complete SongBlobData JSON from scratch
 * for songs that do NOT yet exist on the Blogger blog.
 *
 * Input:  validated-keywords.json  (array of EnrichedMissingKeyword with validated:true)
 * Output: blob-data/<slug>.json    (one file per song, matching SongBlobData structure)
 *
 * Usage:  npm run generate-lyrics-from-keywords
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const COPILOT_MODEL = 'gpt-4o';
const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com';
const OUTPUT_DIR = path.join(process.cwd(), 'blob-data');
const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Types (mirrors EnrichedMissingKeyword from enrich-missing-keywords.ts)
// ---------------------------------------------------------------------------
interface ValidatedKeyword {
  keyword: string;
  movie: string;
  bloggerSongCategory: string;
  singerName: string;
  lyricistName: string;
  musicDirectorName: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  youtubeVideoTitle: string;
  releaseYear: string;
  language: string;
  validated: boolean;
  validationNote: string;
}

// ---------------------------------------------------------------------------
// Slug generation (mirrors the fallback in lib/slugUtils.ts)
// ---------------------------------------------------------------------------
function generateSlug(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Build the category array (matches the format used by existing songs)
// ---------------------------------------------------------------------------
function buildCategory(item: ValidatedKeyword): string[] {
  const categories: string[] = [];
  if (item.lyricistName) categories.push(`Lyrics:${item.lyricistName}`);
  if (item.musicDirectorName) categories.push(`Music:${item.musicDirectorName}`);
  // Multiple singers
  item.singerName.split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
    categories.push(`Singer:${s}`);
  });
  if (item.movie) categories.push(`Movie:${item.movie}`);
  if (item.bloggerSongCategory) categories.push(`Song:${item.bloggerSongCategory}`);
  return categories;
}

// ---------------------------------------------------------------------------
// YouTube thumbnail URL helper
// ---------------------------------------------------------------------------
function buildThumbnail(youtubeVideoId: string): string | null {
  if (!youtubeVideoId) return null;
  return `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;
}

// ---------------------------------------------------------------------------
// AI prompt for full lyrics generation
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are an expert in Tamil cinema music and Tamil lyrics.
Your task is to generate a complete song lyrics JSON file for a Tamil movie song.

Return ONLY a raw JSON object — no markdown fences, no explanation, no preamble.

The JSON must have exactly these fields:

{
  "tanglishStanzas": [
    "Line1<br />Line2<br />Line3",
    "Chorus Line1<br />Chorus Line2"
  ],
  "tamilStanzas": [
    "தமிழ் வரி1<br />தமிழ் வரி2",
    "தமிழ் கோரஸ்1<br />தமிழ் கோரஸ்2"
  ],
  "seoTitle": "SongName Lyrics Tamil | MovieName",
  "seoDescription": "Full SongName lyrics (first tamil stanza snippet...) with sharable snippets.",
  "seoKeywords": "SongName, SingerName, MusicDirector, Lyricist, MovieName, lyrics",
  "intro": "<p>Brief HTML intro paragraph about the song (2-3 sentences, SEO-optimised)</p>",
  "mood": ["romantic", "melancholic"],
  "songType": ["melody", "duet"],
  "occasions": ["love", "anniversary"],
  "keywords": ["songname", "moviename", "singername", "year"],
  "faq": "<div class=\\"faq-section\\"><h3>Frequently Asked Questions</h3><div class=\\"faq-item\\"><h4>Question?</h4><p>Answer.</p></div></div>",
  "summary": "<p>2-3 sentence summary of what the song is about (HTML allowed)</p>",
  "high_ctr_intro": "<strong>SongName</strong> is a ... (3 sentence SEO intro with HTML formatting)",
  "stanzaMeanings": [
    "English meaning of first stanza",
    "English meaning of second stanza"
  ]
}

Rules:
1. tanglishStanzas: lyrics written in Tamil words using English script (Tanglish), each stanza as a single string with <br /> between lines. Include ALL stanzas.
2. tamilStanzas: exact same lyrics in Tamil Unicode script, parallel array (same number of stanzas as tanglishStanzas).
3. stanzaMeanings: one English meaning per stanza — same length as tanglishStanzas.
4. faq must contain exactly 4 FAQ items: (a) meaning of the song, (b) which movie, (c) singer and music director, (d) release year.
5. Do not invent facts you don't know. If you are unsure about a lyric, write your best attempt.
6. Each stanza string MUST use <br /> (with space before slash) between lines.
7. intro should be a plain HTML paragraph without stanza text, just introductory info.
`;

function createCopilotClient(): OpenAI {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is not set.');
    process.exit(1);
  }
  return new OpenAI({
    baseURL: GITHUB_MODELS_ENDPOINT,
    apiKey: GITHUB_TOKEN,
  });
}

interface AILyricsResult {
  tanglishStanzas: string[];
  tamilStanzas: string[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  intro: string;
  mood: string[];
  songType: string[];
  occasions: string[];
  keywords: string[];
  faq: string;
  summary: string;
  high_ctr_intro: string;
  stanzaMeanings: string[];
}

async function generateLyricsWithAI(
  client: OpenAI,
  item: ValidatedKeyword,
): Promise<AILyricsResult | null> {
  const userMessage = [
    'Generate full song lyrics JSON for the following Tamil movie song:',
    '',
    `Song keyword: "${item.keyword}"`,
    `Movie: ${item.movie}`,
    `Singer(s): ${item.singerName}`,
    `Lyricist: ${item.lyricistName}`,
    `Music Director: ${item.musicDirectorName}`,
    `Release Year: ${item.releaseYear}`,
    `Blogger Song Category tag: "${item.bloggerSongCategory}"`,
    `Language: ${item.language}`,
    ...(item.youtubeVideoTitle ? [`YouTube Video Title: "${item.youtubeVideoTitle}"`] : []),
    '',
    'Return ONLY the raw JSON object described in the system prompt.',
  ].join('\n');

  const response = await client.chat.completions.create({
    model: COPILOT_MODEL,
    temperature: 0.6,  // Higher temp for more natural/varied lyrics generation
    max_tokens: 6000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  if (!raw) {
    console.warn(`  ⚠️  Empty AI response for "${item.keyword}"`);
    return null;
  }

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned) as AILyricsResult;
  } catch {
    console.warn(`  ⚠️  Failed to parse AI JSON for "${item.keyword}". Raw output (first 500 chars):`);
    console.warn(raw.substring(0, 500));
    return null;
  }
}

// ---------------------------------------------------------------------------
// Assemble the SongBlobData object
// ---------------------------------------------------------------------------
function assembleSongData(item: ValidatedKeyword, ai: AILyricsResult, slug: string): object {
  const category = buildCategory(item);
  const thumbnail = buildThumbnail(item.youtubeVideoId);

  // Derive a clean song title from the bloggerSongCategory or keyword
  const rawTitle = item.bloggerSongCategory
    ? item.bloggerSongCategory.split(' - ')[0].trim()
    : item.keyword;

  const title = ai.seoTitle || `${rawTitle} Lyrics Tamil | ${item.movie}`;
  const now = new Date().toISOString();

  return {
    slug,
    id: `ai-generated-${slug}-${Date.now()}`,
    title,
    movieName: item.movie,
    singerName: item.singerName,
    lyricistName: item.lyricistName,
    musicName: item.musicDirectorName,
    actorName: '',
    published: now,
    sections: {
      intro: ai.intro || '',
      easterEgg: '',
      faq: ai.faq || '',
    },
    stanzas: ai.tanglishStanzas || [],
    hasTamilLyrics: (ai.tamilStanzas || []).length > 0,
    tamilStanzas: ai.tamilStanzas || [],
    hasEnglishLyrics: false,
    englishStanzas: [],
    category,
    relatedSongs: [],
    seo: {
      title: ai.seoTitle || title,
      description: ai.seoDescription || '',
      keywords: ai.seoKeywords || '',
    },
    thumbnail,
    enrichedMetadata: {
      mood: ai.mood || [],
      songType: ai.songType || [],
      occasions: ai.occasions || [],
      keywords: ai.keywords || [],
      faq: ai.faq || '',
      summary: ai.summary || '',
      releaseYear: item.releaseYear || '',
      high_ctr_intro: ai.high_ctr_intro || '',
      stanzaMeanings: ai.stanzaMeanings || [],
    },
    generatedAt: now,
    version: SCHEMA_VERSION,
    _aiGenerated: true,
    _requiresBloggerPost: true,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const validatedPath = path.join(process.cwd(), 'validated-keywords.json');
  if (!fs.existsSync(validatedPath)) {
    console.error('❌ validated-keywords.json not found. The extract step should have created it.');
    process.exit(1);
  }

  const validated: ValidatedKeyword[] = JSON.parse(fs.readFileSync(validatedPath, 'utf8'));
  if (validated.length === 0) {
    console.log('✅ No validated keywords to process.');
    return;
  }

  console.log(`\n🎵 Generating full lyrics JSON for ${validated.length} validated song(s)...\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const client = createCopilotClient();

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < validated.length; i++) {
    const item = validated[i];
    console.log(`\n[${i + 1}/${validated.length}] ${item.keyword} (${item.movie})`);
    console.log(`  Singer: ${item.singerName} | Lyricist: ${item.lyricistName} | Music: ${item.musicDirectorName}`);

    const ai = await generateLyricsWithAI(client, item);
    if (!ai) {
      console.error(`  ❌ Skipping "${item.keyword}" — AI generation failed`);
      failed++;
      continue;
    }

    const slug = generateSlug(item.keyword);
    if (!slug) {
      console.error(`  ❌ Could not derive slug for "${item.keyword}" — skipping`);
      failed++;
      continue;
    }

    const songData = assembleSongData(item, ai, slug);
    const outputFile = path.join(OUTPUT_DIR, `${slug}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(songData, null, 2), 'utf8');

    const stanzaCount = ai.tanglishStanzas?.length ?? 0;
    const tamilCount = ai.tamilStanzas?.length ?? 0;
    console.log(`  ✅ ${slug}.json — ${stanzaCount} stanzas, ${tamilCount} Tamil stanzas`);
    generated++;

    // Delay between songs to avoid rate limiting
    if (i < validated.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // Write a summary file so the shell step can read counts reliably
  const summaryPath = path.join(OUTPUT_DIR, '_generation-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({ generated, failed }, null, 2), 'utf8');

  console.log(`\n📊 Summary: ${generated} generated, ${failed} failed`);
  if (generated > 0) {
    console.log(`📁 Output files saved to: ${OUTPUT_DIR}`);
    console.log('\n⚠️  IMPORTANT: These JSON files were generated by AI.');
    console.log('   • The lyrics are AI-generated and may not be 100% accurate.');
    console.log('   • You should also post the song to your Blogger blog for consistency.');
    console.log('   • The "_aiGenerated": true flag in each JSON marks them as AI-generated.');
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
