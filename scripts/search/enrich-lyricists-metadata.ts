import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { resolveAiClient } from './resolve-ai-client';

const VERCEL_MODEL = 'openai/gpt-4o-mini';
const GITHUB_MODEL = 'gpt-4o-mini';
const SONGS_DIR = path.join(process.cwd(), 'public', 'songs');
const OUTPUT_FILE = path.join(process.cwd(), 'lib', 'data', 'lyricists-mini-bios.json');
const BATCH_SIZE = 3;
const REQUEST_DELAY_MS = 500;
const BATCH_DELAY_MS = 1500;

function parseBoolEnv(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

interface SongData {
  slug?: string;
  title?: string;
  lyricistName?: string;
  stanzas?: string[];
}

interface LyricistSongRef {
  title: string;
  slug: string;
}

interface LyricistBase {
  name: string;
  description: string;
  topSongs: TopSong[];
  songCount: number;
  sampleSongs: LyricistSongRef[];
}

interface TopSong {
  title: string;
  htmlPageUrl: string;
}

interface LyricistEnriched {
  description: string;
  popularSongTitles: string[];
}

const LYRICIST_ENRICH_PROMPT = `You are writing mini-bio box content for Tamil film lyricists.

Task:
Given one lyricist and the available songs from a dataset, return a raw JSON object with:

1) description:
- Write 4 to 5 short lines total.
- First 2 lines: who the lyricist is and what type/style of lyrics they are best known for.
- Next 2 to 3 lines: popular songs they have written and what they are known/celebrated for.
- Keep it factual and neutral. Do not invent unverifiable awards.
- If awards are uncertain, use wording like "widely appreciated" or "critically praised".

2) topSongs:
- Top songs are managed by the calling application from local DB. Do not return topSongs.

3) popularSongTitles:
- Return up to 10 song titles ranked by global popularity/recognition for this lyricist.
- Choose ONLY from the provided candidateSongs list.
- Order must be most popular to least popular.

Rules:
- Return ONLY a JSON object, no markdown fences and no extra text.
- Output format:
{
  "description": "line1\nline2\nline3\nline4",
  "popularSongTitles": ["song 1", "song 2", "song 3"]
}

Input Data:
`;

function normalizeName(name: string): string {
  return name.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitLyricistNames(value: string): string[] {
  if (!value) return [];

  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .split(/,|&| and |\/|\|/i)
    .map(part => part.replace(/^lyrics\s*[:\-]?\s*/i, '').trim())
    .map(normalizeName)
    .filter(Boolean)
    .filter(name => !/^(unknown|na|n\/a|-|lyrics)$/i.test(name));
}

function getLyricistsFromStanzas(stanzas: string[] | undefined): string[] {
  if (!Array.isArray(stanzas) || stanzas.length === 0) return [];

  const htmlText = stanzas.join('\n');
  const matches: string[] = [];
  const regex = /Lyrics\s*:\s*([^<\n]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(htmlText)) !== null) {
    matches.push(...splitLyricistNames(match[1] || ''));
  }

  return matches;
}

function toSongRef(song: SongData, fileName: string): LyricistSongRef {
  const fallbackSlug = fileName.replace(/\.json$/, '');
  return {
    title: (song.title || fallbackSlug).trim(),
    slug: (song.slug || fallbackSlug).trim(),
  };
}

function extractLyricists(topLimit: number | null): LyricistBase[] {
  if (!fs.existsSync(SONGS_DIR)) {
    console.error(`❌ Songs directory not found: ${SONGS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SONGS_DIR).filter(file => file.endsWith('.json'));
  const lyricistsMap = new Map<string, LyricistBase>();

  for (const fileName of files) {
    const filePath = path.join(SONGS_DIR, fileName);
    let songData: SongData;

    try {
      songData = JSON.parse(fs.readFileSync(filePath, 'utf8')) as SongData;
    } catch {
      continue;
    }

    const songRef = toSongRef(songData, fileName);
    const rawNames = [
      ...splitLyricistNames(songData.lyricistName || ''),
      ...getLyricistsFromStanzas(songData.stanzas),
    ];

    for (const rawName of rawNames) {
      const name = normalizeName(rawName);
      const key = name.toLowerCase();

      if (!lyricistsMap.has(key)) {
        lyricistsMap.set(key, {
          name,
          description: '',
          topSongs: [],
          songCount: 0,
          sampleSongs: [],
        });
      }

      const lyricist = lyricistsMap.get(key)!;
      lyricist.songCount += 1;

      if (!lyricist.sampleSongs.some(song => song.slug === songRef.slug)) {
        lyricist.sampleSongs.push(songRef);
      }
    }
  }

  const sorted = [...lyricistsMap.values()].sort((a, b) => {
    if (b.songCount !== a.songCount) return b.songCount - a.songCount;
    return a.name.localeCompare(b.name);
  });

  return topLimit ? sorted.slice(0, topLimit) : sorted;
}

function parseModelJson(raw: string): LyricistEnriched | null {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  if (!cleaned) return null;

  try {
    const parsed = JSON.parse(cleaned) as Partial<LyricistEnriched>;
    const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';
    const popularSongTitles = Array.isArray(parsed.popularSongTitles)
      ? parsed.popularSongTitles.map(title => String(title).trim()).filter(Boolean).slice(0, 10)
      : [];

    if (!description) return null;

    return {
      description,
      popularSongTitles,
    };
  } catch {
    return null;
  }
}

function buildHtmlPageUrl(slug: string): string {
  const cleanSlug = slug.replace(/\.html$/, '');
  return `https://www.tsonglyrics.com/${cleanSlug}.html`;
}

function normalizeTitleForMatch(title: string): string {
  return title
    .toLowerCase()
    .replace(/lyrics/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function orderSongsByPopularity(sampleSongs: LyricistSongRef[], rankedTitles: string[]): LyricistSongRef[] {
  if (!rankedTitles.length) return sampleSongs;

  const remaining = [...sampleSongs];
  const ordered: LyricistSongRef[] = [];

  for (const rankedTitle of rankedTitles) {
    const rankedNorm = normalizeTitleForMatch(rankedTitle);
    if (!rankedNorm) continue;

    const idx = remaining.findIndex(song => {
      const songNorm = normalizeTitleForMatch(song.title);
      return songNorm === rankedNorm || songNorm.includes(rankedNorm) || rankedNorm.includes(songNorm);
    });

    if (idx >= 0) {
      ordered.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
  }

  return [...ordered, ...remaining];
}

function getTopSongsFromDb(sampleSongs: LyricistSongRef[], rankedTitles: string[]): TopSong[] {
  const orderedSongs = orderSongsByPopularity(sampleSongs, rankedTitles);
  return orderedSongs.slice(0, 10).map(song => ({
    title: song.title,
    htmlPageUrl: buildHtmlPageUrl(song.slug),
  }));
}

async function enrichLyricist(
  client: OpenAI,
  model: string,
  lyricist: LyricistBase,
  force: boolean
): Promise<LyricistBase> {
  if (!force && lyricist.description.trim()) {
    return lyricist;
  }

  const payload = {
    lyricistName: lyricist.name,
    songCountInDataset: lyricist.songCount,
    candidateSongs: lyricist.sampleSongs.slice(0, 30),
    requiredTopSongsCount: 10,
  };

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.3,
      max_tokens: 700,
      messages: [
        {
          role: 'user',
          content: LYRICIST_ENRICH_PROMPT + JSON.stringify(payload, null, 2),
        },
      ],
    });

    const responseText = response.choices[0]?.message?.content ?? '';
    const enriched = parseModelJson(responseText);

    if (!enriched) {
      console.warn(`   ⚠️ Could not parse AI response for ${lyricist.name}`);
      return lyricist;
    }

    return {
      ...lyricist,
      description: enriched.description,
      topSongs: getTopSongsFromDb(lyricist.sampleSongs, enriched.popularSongTitles),
    };
  } catch (error) {
    console.warn(`   ⚠️ Error enriching ${lyricist.name}:`, error);
    return lyricist;
  }
}

function writeOutput(data: LyricistBase[], dryRun: boolean): void {
  const output = data.map(item => ({
    name: item.name,
    description: item.description,
    topSongs: item.topSongs,
  }));

  if (dryRun) {
    console.log('\n🔍 DRY RUN - Output preview (first 3):');
    console.log(JSON.stringify(output.slice(0, 3), null, 2));
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n✅ Wrote ${output.length} lyricists to ${OUTPUT_FILE}`);
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const topArg = args.find(arg => arg.startsWith('--top='));
  const topLimit = topArg ? Number.parseInt(topArg.split('=')[1], 10) : null;

  if (args.includes('--help')) {
    console.log('\n📖 Usage:');
    console.log('  npm run enrich-lyricists                  # Process all lyricists');
    console.log('  npm run enrich-lyricists -- --top=50      # Process top 50 lyricists by occurrence');
    console.log('  npm run enrich-lyricists -- --dry-run     # Preview output without writing file');
    console.log('  npm run enrich-lyricists -- --force       # Regenerate even if description exists\n');
    console.log('Provider selection (boolean based, via reusable resolver):');
    console.log('  USE_VERCEL_AI_GATEWAY=true  + VERCEL_AI_GATEWAY_API_KEY=...');
    console.log('  USE_GITHUB_MODELS=true      + GITHUB_TOKEN=...');
    console.log('  Do not set both booleans to true at the same time.');
    console.log('  If both are false, OPENAI_API_KEY is used as fallback.\n');
    console.log('Examples:');
    console.log('  USE_VERCEL_AI_GATEWAY=true VERCEL_AI_GATEWAY_API_KEY=xxx npm run enrich-lyricists -- --top=10');
    console.log('  USE_GITHUB_MODELS=true GITHUB_TOKEN=ghp_xxx npm run enrich-lyricists -- --top=10');
    console.log('  OPENAI_API_KEY=sk-xxx npm run enrich-lyricists -- --top=10\n');
    process.exit(0);
  }

  const lyricists = extractLyricists(topLimit);
  console.log(`📚 Found ${lyricists.length} unique lyricists${topLimit ? ` (top ${topLimit})` : ''}`);

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - API calls will still run, output file will not be written');
  }

  let resolved;
  try {
    const useVercelGateway = true // parseBoolEnv(process.env.USE_VERCEL_AI_GATEWAY);
    const useGithubModels = false //parseBoolEnv(process.env.USE_GITHUB_MODELS);

    resolved = resolveAiClient({
      useVercelGateway,
      useGithubModels,
      vercelModel: VERCEL_MODEL,
      githubModel: GITHUB_MODEL,
      openAiModel: GITHUB_MODEL,
    });
    console.log(`🤖 Provider: ${resolved.providerLabel}`);
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log(`🧠 Model: ${resolved.model}`);
  console.log(`⚙️  USE_VERCEL_AI_GATEWAY=${resolved.useVercelGateway}`);
  console.log(`⚙️  USE_GITHUB_MODELS=${resolved.useGithubModels}`);

  const client = resolved.client;
  const model = resolved.model;
  const enriched: LyricistBase[] = [];

  for (let i = 0; i < lyricists.length; i += BATCH_SIZE) {
    const batch = lyricists.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(lyricists.length / BATCH_SIZE)}`);

    for (const lyricist of batch) {
      console.log(`   🔄 ${lyricist.name} (${lyricist.songCount} songs)`);
      const item = await enrichLyricist(client, model, lyricist, force);
      enriched.push(item);
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
    }

    if (i + BATCH_SIZE < lyricists.length) {
      console.log('   ⏳ Waiting before next batch...');
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  writeOutput(enriched, dryRun);
}

run().catch((error: unknown) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});