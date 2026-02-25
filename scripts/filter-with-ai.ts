import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const COPILOT_MODEL = 'gpt-4o';
const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com';

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

const FILTER_PROMPT = `Analyze the following list of keywords and filter them based on these strict rules:

1. Include ONLY keywords that represent a specific Tamil movie song title or track (e.g., 'roja roja song lyrics').
2. Exclude all religious, devotional, or God-related keywords (e.g., 'kavasam', 'sivapuranam', 'chalisa', 'thirupugal', 'sahasranamam').
3. Exclude generic/standalone phrases that do not name a specific song (e.g., 'song lyrics', 'tamil song lyrics', 'song lyrics in tamil').
4. Remove duplicates: if multiple keywords refer to the same song, keep only the most complete/descriptive version.
5. For each remaining keyword, identify the Tamil movie name the song belongs to.

Output ONLY a raw JSON array — no markdown fences, no explanation.
Each item must have exactly these two fields:
  - "keyword": the cleaned search keyword
  - "movie": the Tamil movie name this song is from

Example:
[
  { "keyword": "roja roja song lyrics", "movie": "Roja" },
  { "keyword": "kannaana kanney lyrics", "movie": "Viswasam" }
]

Keyword List:
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

async function filterKeywordsWithAI(): Promise<void> {
  const keywordsFile = path.join(process.cwd(), 'trends-keywords.txt');
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
  console.log('🤖 Calling GitHub Copilot SDK to filter song-related keywords...\n');

  const client = createCopilotClient();

  const response = await client.chat.completions.create({
    model: COPILOT_MODEL,
    temperature: 0.1,
    max_tokens: 3024,
    messages: [
      { role: 'user', content: FILTER_PROMPT + keywords },
    ],
  });

  const filteredText = response.choices[0]?.message?.content ?? '';

  if (!filteredText) {
    console.warn('⚠️  Copilot returned an empty response.');
    return;
  }

  // ── Parse JSON from AI response ──────────────────────────────────────────
  let filteredItems: Array<{ keyword: string; movie: string }> = [];
  try {
    const cleaned = filteredText.replace(/```json|```/g, '').trim();
    filteredItems = JSON.parse(cleaned);
  } catch {
    console.error('❌ Failed to parse JSON from Copilot response. Raw output:');
    console.error(filteredText);
    process.exit(1);
  }

  console.log(`\n=== Filtered Tamil Movie Song Keywords (${filteredItems.length}) ===`);
  filteredItems.forEach(item => console.log(`  • [${item.movie}] ${item.keyword}`));

  const outputPath = path.join(process.cwd(), 'filtered-keywords.json');
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

  const missingPath = path.join(process.cwd(), 'missing-keywords.json');
  fs.writeFileSync(missingPath, JSON.stringify(missing, null, 2), 'utf8');
  console.log(`\n💾 Missing keywords saved to missing-keywords.json`);

  // ── Generate social media posts for songs already in public/songs ─────────
  if (present.length === 0) {
    console.log('\nℹ️  No present songs to generate social media posts for.');
    return;
  }

  console.log(`\n📣 Generating social media posts for ${present.length} present song(s)...\n`);

  const agentFile = path.join(process.cwd(), '.github', 'agents', 'social-media-agent.md');
  const systemPrompt = fs.existsSync(agentFile)
    ? fs.readFileSync(agentFile, 'utf8')
    : 'You are a Social Media Manager. Generate engaging social media posts for the given song.';

  const allPosts: string[] = [];

  for (const song of present) {
    const songJsonPath = path.join(SONGS_DIR, song.matchedFile);
    let songData: object = {};
    try {
      songData = JSON.parse(fs.readFileSync(songJsonPath, 'utf8'));
    } catch {
      console.warn(`⚠️  Could not read ${song.matchedFile}, skipping.`);
      continue;
    }

    console.log(`  ✍️  Generating posts for: ${song.keyword} (${song.matchedFile})`);

    const postResponse = await client.chat.completions.create({
      model: COPILOT_MODEL,
      temperature: 0.7,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Generate social media posts for the following song JSON data. Return ONLY a raw JSON array of post strings — no markdown fences, no explanation.\n\n${JSON.stringify(songData, null, 2)}`,
        },
      ],
    });

    const postText = postResponse.choices[0]?.message?.content ?? '';
    if (!postText) {
      console.warn(`⚠️  Empty response for ${song.matchedFile}, skipping.`);
      continue;
    }

    try {
      const cleaned = postText.replace(/```json|```/g, '').trim();
      const posts: string[] = JSON.parse(cleaned);
      allPosts.push(...posts);
      console.log(`     → ${posts.length} posts generated`);
    } catch {
      console.warn(`⚠️  Could not parse posts for ${song.matchedFile}. Raw output:`);
      console.warn(postText);
    }
  }

  const postsPath = path.join(process.cwd(), 'social-media-posts.json');
  fs.writeFileSync(postsPath, JSON.stringify(allPosts, null, 2), 'utf8');
  console.log(`\n🎉 ${allPosts.length} total social media post(s) saved to social-media-posts.json`);
}

filterKeywordsWithAI().catch((err: unknown) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
