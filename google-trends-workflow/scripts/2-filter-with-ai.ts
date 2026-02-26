import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';

const SONGS_DIR = path.join(process.cwd(), 'public', 'songs');

/** Normalise a string for fuzzy matching: lowercase, strip punctuation/extra spaces */
function normalise(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Words stripped before matching — too generic to identify a specific song
const NOISE_WORDS = new Set([
  'song', 'songs', 'lyrics', 'lyric', 'tamil', 'english', 'in', 'the',
  'a', 'an', 'full', 'official', 'video', 'hd', 'mp3', 'audio',
]);

function meaningfulWords(str: string): string[] {
  return normalise(str)
    .split(' ')
    .filter(w => w.length > 1 && !NOISE_WORDS.has(w));
}

interface SongEntry {
  slug: string;
  words: Set<string>;
}

/**
 * Build index from song TITLES and SLUGS only — NOT movieName.
 * movieName alone is too broad: a movie called "Kalyani" would
 * false-match any keyword that contains the word "kalyani".
 */
function buildSongIndex(): SongEntry[] {
  const entries: SongEntry[] = [];

  if (!fs.existsSync(SONGS_DIR)) {
    console.warn(`⚠️  Songs directory not found: ${SONGS_DIR}`);
    return entries;
  }

  for (const file of fs.readdirSync(SONGS_DIR).filter(f => f.endsWith('.json'))) {
    const slug = file.replace('.json', '');
    const words = new Set<string>();

    meaningfulWords(slug.replace(/-/g, ' ')).forEach(w => words.add(w));

    try {
      const data = JSON.parse(fs.readFileSync(path.join(SONGS_DIR, file), 'utf8'));
      if (data.title) meaningfulWords(data.title).forEach(w => words.add(w));
    } catch {
      // skip unreadable files
    }

    if (words.size > 0) entries.push({ slug, words });
  }

  return entries;
}

/**
 * Returns the matched slug filename if ALL meaningful words of the keyword
 * exist in the song's word set. Returns null if no match.
 *
 * Using strict word-intersection prevents false positives like
 * "kalyani song lyrics" matching a song whose movieName was "Kalyani".
 */
function findInSongIndex(keyword: string, index: SongEntry[]): string | null {
  const kwWords = meaningfulWords(keyword);
  if (kwWords.length === 0) return null;

  for (const entry of index) {
    if (kwWords.every(w => entry.words.has(w))) {
      return entry.slug;
    }
  }
  return null;
}

const FILTER_PROMPT = `Act as a Tamil Cinema Researcher. Your task is to output a raw JSON array of Tamil movie songs.

### STRICT FILTERING RULES:
1. Include ONLY specific Tamil film song titles.
2. REMOVE all devotional/God songs (Kavasam, Sivapuranam, etc.).
3. REMOVE all generic terms (Tamil song lyrics, etc.).
4. REMOVE duplicates (keep only the most descriptive version).

### DATA VERIFICATION RULES:
For each song, verify the movie using these 2024-2026 facts:
- "Mutta Kalakki" is from the movie 'Youth' (2026).
- "Neelothi" is from the movie 'Sirai' (2025).
- "Theekkoluthi" is from 'Bison'.
- "Kanne Kanmaniye" (2025) is from 'Tere Ishk Mein'.
- "Vittu Pona Vasalile" is from 'Dude'.
- "Akkam Pakkam" is from 'Kireedam'.
- "Aval" is from 'Manithan'.
- "Kadhal Aasai" is from 'Anjaan'.
- "Unna Vida" is from 'Virumaandi'.

DO NOT use "Maaran" as a placeholder for songs you don't know. If the song is NOT from Maaran, do not label it as such.

### OUTPUT FORMAT:
Raw JSON array only: [{"keyword": "...", "movie": "..."}]

### KEYWORDS:
[PASTE YOUR LIST HERE]
`;

async function filterKeywordsWithAI(): Promise<void> {
  if (!GOOGLE_AI_API_KEY) {
    console.error('❌ GOOGLE_AI_API_KEY environment variable is not set.');
    process.exit(1);
  }

  const keywordsFile = path.join(__dirname, '../data/trends-keywords.txt');
  if (!fs.existsSync(keywordsFile)) {
    console.error('❌ trends-keywords.txt not found. Run "npm run trends" first.');
    process.exit(1);
  }

  const keywords = fs.readFileSync(keywordsFile, 'utf8').trim();
  if (!keywords) {
    console.warn('⚠️  trends-keywords.txt is empty. Nothing to filter.');
    return;
  }

  console.log(`📋 Loaded ${keywords.split('\n').length} keywords from trends-keywords.txt`);
  console.log('🤖 Calling Google Gemini API to filter song-related keywords...\n');

  const prompt = FILTER_PROMPT + keywords;

  const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { 
      temperature: 0.0, // Force absolute determinism
  topP: 0.1,        // Restrict the vocabulary even more
  maxOutputTokens: 10024 },
  });

  const result = await model.generateContent(prompt);
  const filteredText: string = result.response.text();

  if (!filteredText) {
    console.warn('⚠️  Gemini returned an empty response.');
    return;
  }

  // ── Parse JSON from AI response ──────────────────────────────────────────
  let filteredItems: Array<{ keyword: string; movie: string }> = [];
  try {
    const cleaned = filteredText.replace(/```json|```/g, '').trim();
    filteredItems = JSON.parse(cleaned);
  } catch {
    console.error('❌ Failed to parse JSON from Gemini response. Raw output:');
    console.error(filteredText);
    process.exit(1);
  }

  console.log(`\n=== Filtered Tamil Movie Song Keywords (${filteredItems.length}) ===`);
  filteredItems.forEach(item => console.log(`  • [${item.movie}] ${item.keyword}`));

  const outputPath = path.join(__dirname, '../data/filtered-keywords.json');
  fs.writeFileSync(outputPath, JSON.stringify(filteredItems, null, 2), 'utf8');
  console.log(`\n✅ Filtered keywords saved to filtered-keywords.json`);

  // ── Cross-check against existing song JSON files ──────────────────────────
  console.log('\n🔍 Checking which keywords are already in public/songs...\n');
  const songIndex = buildSongIndex();
  const totalFiles = fs.readdirSync(SONGS_DIR).filter(f => f.endsWith('.json')).length;
  console.log(`   Song index: ${songIndex.length} songs from ${totalFiles} files\n`);

  const missing: Array<{ keyword: string; movie: string }> = [];
  const present: Array<{ keyword: string; movie: string; matchedFile: string }> = [];

  for (const item of filteredItems) {
    const matchedSlug = findInSongIndex(item.keyword, songIndex);
    if (matchedSlug) {
      present.push({ ...item, matchedFile: `${matchedSlug}.json` });
    } else {
      missing.push(item);
    }
  }

  if (present.length) {
    console.log(`✅ Already have lyrics for (${present.length}):`);
    present.forEach(p => console.log(`   ✔ [${p.movie}] ${p.keyword}  →  ${p.matchedFile}`));
  }

  console.log(`\n🆕 NOT in public/songs — needs lyrics post (${missing.length}):`);
  if (missing.length === 0) {
    console.log('   (all trending songs are already covered!)');
  } else {
    missing.forEach(m => console.log(`   ✘ [${m.movie}] ${m.keyword}`));
  }

  const missingPath = path.join(__dirname, '../data/missing-keywords.json');
  fs.writeFileSync(missingPath, JSON.stringify(missing, null, 2), 'utf8');
  console.log(`\n💾 Missing keywords saved to google-trends-workflow/data/missing-keywords.json`);
}

filterKeywordsWithAI().catch((err: unknown) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
