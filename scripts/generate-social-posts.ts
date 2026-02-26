/**
 * generate-social-posts.ts
 *
 * Reads filtered-keywords.json (output of filter-with-ai.ts), finds the
 * matching song JSON files in public/songs, then runs each song's data
 * through the Social Media Agent (social-media-agent.md) via Gemini AI to
 * produce 15 ready-to-publish posts per song.
 *
 * Output: social-posts.json
 *
 * Usage:
 *   npm run social-posts
 */

import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash-lite'; // fallback model
//gemini-2.5-flash-lite
// if 2.5-flash quota exceeded
const SONGS_DIR = path.join(process.cwd(), 'public', 'songs');
const SITE_BASE_URL = 'https://www.tsonglyrics.com';

// ── Delay helper ─────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ── Types ─────────────────────────────────────────────────────────────────────

interface FilteredKeyword {
  keyword: string;
  movie: string;
}

/** Subset of a song JSON file relevant for social post generation */
interface SongPayload {
  slug: string;
  title: string;
  movieName: string;
  singerName: string;
  lyricistName: string;
  musicName: string;
  actorName: string;
  category: string[];
  stanzas: string[];
  tamilStanzas: string[];
  easterEgg?: string;
  faq?: unknown;
  englishStanzas?: string[];
}

interface SocialPostGroup {
  twitter: string[]; // 2 punchy Tanglish posts for X/Twitter
}

export interface SongSocialResult {
  keyword: string;
  movie: string;
  slug: string;
  matchedFile: string;
  url: string;
  posts: SocialPostGroup;
}

// ── Song-index helpers (same logic as filter-with-ai.ts) ─────────────────────

const NOISE_WORDS = new Set([
  'song', 'songs', 'lyrics', 'lyric', 'tamil', 'english', 'in', 'the',
  'a', 'an', 'full', 'official', 'video', 'hd', 'mp3', 'audio',
]);

function normalise(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function meaningfulWords(str: string): string[] {
  return normalise(str)
    .split(' ')
    .filter(w => w.length > 1 && !NOISE_WORDS.has(w));
}

interface SongEntry {
  slug: string;
  words: Set<string>;
}

function buildSongIndex(): SongEntry[] {
  const entries: SongEntry[] = [];
  if (!fs.existsSync(SONGS_DIR)) return entries;

  for (const file of fs.readdirSync(SONGS_DIR).filter(f => f.endsWith('.json'))) {
    const slug = file.replace('.json', '');
    const words = new Set<string>();
    meaningfulWords(slug.replace(/-/g, ' ')).forEach(w => words.add(w));

    try {
      const data = JSON.parse(fs.readFileSync(path.join(SONGS_DIR, file), 'utf8'));
      if (data.title) meaningfulWords(data.title).forEach(w => words.add(w));
    } catch { /* skip unreadable */ }

    if (words.size > 0) entries.push({ slug, words });
  }
  return entries;
}

function findInSongIndex(keyword: string, index: SongEntry[]): string | null {
  const kwWords = meaningfulWords(keyword);
  if (kwWords.length === 0) return null;

  for (const entry of index) {
    if (kwWords.every(w => entry.words.has(w))) return entry.slug;
  }
  return null;
}

// ── AI prompt ─────────────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are a specialist Social Media Manager for tsonglyrics.com.
Your goal is to drive CTR by creating viral-style posts from Tamil song JSON data.

Task: produce exactly 2 Twitter/X posts for the given song.

REQUIRED POST STRUCTURE (follow exactly):

Line 1: [Artist/Music Director] + [Actor if notable] + emoji (include Twitter handles if known)
Line 2: (blank)
Line 3: Tamil lyric snippet in double quotes (from tamilStanzas if available, else translate from stanzas)
Line 4: (blank)
Line 5: Hype line with emoji that matches song vibe (Mass/Melody/Folk)
Line 6: (blank)
Line 7: Read full Tamil + English lyrics 👇
Line 8: ${SITE_BASE_URL}/[slug].html
Line 9: (blank)
Line 10: Hashtags + Twitter handles (derive from category array, add known Twitter handles)

KNOWN TWITTER HANDLES (use when these names appear in singerName, musicName, lyricistName, actorName, or movieName):
- Anirudh: @anirudhofficial
- AR Rahman: @arrahman
- Yuvan Shankar Raja: @thisisysr
- Thalapathy Vijay: @actorvijay
- Ajith Kumar: @ajithkumarfans (fan account)
- Dhanush: @dhanushkraja
- Suriya: @Suriya_offl
- Sivakarthikeyan: @Siva_Kartikeyan
- Vijay Sethupathi: @VijaySethuOffl
- GV Prakash: @gvprakash
- Santhosh Narayanan: @Santhosh_Naray
- Shan Shankar: @shankarshanmugh
- Vignesh Shivan: @VigneshShivN
- Atlee: @Atlee_dir
- Lokesh Kanagaraj: @Dir_Lokesh
- Sid Sriram: @sidsriram
- Shreya Ghoshal: @shreyaghoshal

EXAMPLE FORMAT:
@anirudhofficial + Thalapathy Vijay @actorvijay + Arivu = FIRE! 🔥

"தளபதி கச்சேரி எங்க அண்ணன் V கச்சேரி"

This song is PURE MASS energy! Slowmo therikkuthuda! 💥

Read full Tamil + English lyrics 👇
${SITE_BASE_URL}/thalapathy-kacheri-song-lyrics-tamil-jana-nayagan.html

#ThalapathyKacheri #JanaNayagan @actorvijay @anirudhofficial #Arivu

RULES:
- Line 1: Add @ handles for known artists/actors (check list above)
- Line 3 MUST be actual Tamil lyrics from the song (use tamilStanzas if present)
- Line 5 should reference a catchy phrase from the lyrics
- Use 🔥 for Mass songs, 💖 for Melody, 🎵 for Folk
- Line 10: Include both hashtags AND Twitter handles from the list above
- Hashtags: take from category array, remove everything before colon and any spaces
- Always pull slug from the JSON for the URL

Output Format:
Return ONLY a valid JSON object. No markdown. No code fences. No trailing commas.
Exactly this shape: {"twitter":["post one with structure above","post two with structure above"]}`;

// ── Robust extraction: two-strategy parser ────────────────────────────────────
// Strategy 1: clean JSON.parse after stripping markdown fences.
// Strategy 2: character-walk to extract string literals from the twitter array,
//             handles truncated responses and embedded escaped quotes.

function extractTwitterPosts(raw: string): string[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  console.log('  [DEBUG] Cleaned response length:', cleaned.length);
  console.log('  [DEBUG] First 500 chars:', cleaned.slice(0, 500));

  try {
    const parsed = JSON.parse(cleaned) as { twitter?: unknown };
    if (Array.isArray(parsed.twitter) && parsed.twitter.length > 0) {
      console.log('  ✅ JSON.parse SUCCESS - extracted', parsed.twitter.length, 'posts');
      parsed.twitter.forEach((p, i) => {
        console.log(`  Post ${i + 1} length:`, (p as string).length, 'chars');
      });
      return (parsed.twitter as string[]).slice(0, 2);
    }
  } catch (err) {
    console.log('  ⚠️  JSON.parse FAILED, trying character-walk fallback');
  }

  const blockMatch = cleaned.match(/"twitter"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
  const block = blockMatch?.[1] ?? '';

  if (!block.trim()) {
    console.warn('  ❌ Could not locate twitter array in response');
    return [];
  }

  console.log('  [DEBUG] Twitter array block length:', block.length);

  const posts: string[] = [];
  let i = 0;
  while (i < block.length && posts.length < 2) {
    if (block[i] !== '"') { i++; continue; }

    let str = '';
    i++;
    while (i < block.length) {
      const ch = block[i];
      if (ch === '\\' && i + 1 < block.length) {
        const esc = block[i + 1];
        if (esc === '"') str += '"';
        else if (esc === 'n') str += '\n';
        else if (esc === 't') str += '\t';
        else if (esc === '\\') str += '\\';
        else str += esc;
        i += 2;
        continue;
      }
      if (ch === '"') { i++; break; }
      str += ch;
      i++;
    }
    if (str.trim()) {
      console.log(`  [DEBUG] Character-walk extracted post ${posts.length + 1}, length:`, str.length);
      posts.push(str.trim());
    }
  }

  if (posts.length === 0) {
    console.warn('  ❌ Character-walk found no posts');
  } else {
    console.log('  ✅ Character-walk SUCCESS - extracted', posts.length, 'posts');
  }
  return posts;
}

// ── Core: generate posts for one song via Gemini ──────────────────────────────

async function generatePostsForSong(
  model: ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']>,
  songPayload: SongPayload,
): Promise<SocialPostGroup> {
  const userMessage = `Generate 2 Twitter posts for this song:\n\n${JSON.stringify(songPayload, null, 2)}`;
  const result = await model.generateContent(userMessage);
  const raw = result.response.text().trim();
  
  // Debug: log raw AI response
  console.log('  [AI Response]:', raw.slice(0, 300) + (raw.length > 300 ? '...' : ''));
  
  const twitter = extractTwitterPosts(raw);
  return { twitter };
}

// ── Build a trimmed song payload (avoid sending full HTML noise to AI) ─────────

function buildSongPayload(filePath: string): SongPayload | null {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    return {
      slug: raw.slug ?? '',
      title: raw.title ?? '',
      movieName: raw.movieName ?? '',
      singerName: raw.singerName ?? '',
      lyricistName: raw.lyricistName ?? '',
      musicName: raw.musicName ?? '',
      actorName: raw.actorName ?? '',
      category: Array.isArray(raw.category) ? raw.category : [],
      // Strip HTML from stanzas; keep first 8 stanzas max to limit tokens
      stanzas: (Array.isArray(raw.stanzas) ? raw.stanzas : [])
        .slice(0, 8)
        .map((s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()),
      tamilStanzas: Array.isArray(raw.tamilStanzas) ? raw.tamilStanzas.slice(0, 8) : [],
      ...(raw.easterEgg ? { easterEgg: raw.easterEgg } : {}),
      ...(raw.faq ? { faq: raw.faq } : {}),
      ...(raw.englishStanzas ? { englishStanzas: (raw.englishStanzas as string[]).slice(0, 8) } : {}),
    };
  } catch (err) {
    console.error(`  ❌ Could not read/parse ${filePath}:`, err);
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!GOOGLE_AI_API_KEY) {
    console.error('❌ GOOGLE_AI_API_KEY environment variable is not set.');
    process.exit(1);
  }

  // 1. Load filtered keywords
  const filteredKeywordsPath = path.join(process.cwd(), 'filtered-keywords.json');
  if (!fs.existsSync(filteredKeywordsPath)) {
    console.error('❌ filtered-keywords.json not found. Run "npm run trends-ai" first.');
    process.exit(1);
  }

  const filteredKeywords: FilteredKeyword[] = JSON.parse(
    fs.readFileSync(filteredKeywordsPath, 'utf8'),
  );
  console.log(`📋 Loaded ${filteredKeywords.length} filtered keywords`);

  // 2. Build song index and find matched songs
  const songIndex = buildSongIndex();
  console.log(`🎵 Song index built: ${songIndex.length} songs\n`);

  const matchedSongs: Array<FilteredKeyword & { slug: string; matchedFile: string }> = [];

  for (const item of filteredKeywords) {
    const slug = findInSongIndex(item.keyword, songIndex);
    if (slug) {
      matchedSongs.push({ ...item, slug, matchedFile: `${slug}.json` });
    }
  }

  if (matchedSongs.length === 0) {
    console.warn('⚠️  No matched songs found in public/songs. Nothing to process.');
    return;
  }

  console.log(`✅ Found ${matchedSongs.length} matching song file(s):`);
  matchedSongs.forEach(s => console.log(`   • [${s.movie}] ${s.keyword}  →  ${s.matchedFile}`));
  console.log();

  // DEBUG: limit to 5 songs to save quota
  const songsToProcess = matchedSongs.slice(0, 2);
  console.log(`⚠️  Processing only ${songsToProcess.length} songs (quota-saving mode)\n`);

  // 3. Initialise Gemini
  const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 4096,
    },
  });

  // 4. Generate posts for each matched song
  const results: SongSocialResult[] = [];

  for (let i = 0; i < songsToProcess.length; i++) {
    const { keyword, movie, slug, matchedFile } = songsToProcess[i];
    const filePath = path.join(SONGS_DIR, matchedFile);
    const url = `${SITE_BASE_URL}/${slug}.html`;

    console.log(`[${i + 1}/${songsToProcess.length}] 🚀 Generating posts for: "${keyword}" (${movie})`);

    const payload = buildSongPayload(filePath);
    if (!payload) {
      console.log(`  ⏭️  Skipped (could not read file)\n`);
      continue;
    }

    try {
      const posts = await generatePostsForSong(model, payload);
      console.log(`  🐦 ${posts.twitter.length} Twitter post(s) generated\n`);

      results.push({ keyword, movie, slug, matchedFile, url, posts });
    } catch (err) {
      console.error(`  ❌ AI call failed for "${keyword}":`, err);
    }

    // Respect Gemini rate limits — 1 req/s is safe on free tier
    if (i < songsToProcess.length - 1) await sleep(30000); // 30s delay to respect rate limits
  }

  // 5. Write output — flat array of post strings, ready to copy-paste to Twitter
  const flatPosts: string[] = results.flatMap(r => r.posts.twitter);
  const outputPath = path.join(process.cwd(), 'social-posts.json');
  fs.writeFileSync(outputPath, JSON.stringify(flatPosts, null, 2), 'utf8');

  console.log(`\n🎉 Done! ${results.length} song(s) processed.`);
  console.log(`📊 Total Twitter posts: ${flatPosts.length}`);
  console.log(`💾 Results saved to social-posts.json`);
}

main().catch((err: unknown) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
