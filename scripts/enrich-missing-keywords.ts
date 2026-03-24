/**
 * Enrich missing keywords with AI-generated metadata (singer, lyricist, music director, YouTube video)
 *
 * Reads missing-keywords.json (produced by filter-with-ai.ts), takes the top 5,
 * and enriches each entry with additional song metadata using GitHub Copilot AI.
 *
 * Output: missing-keywords-enriched.json
 * Usage:  npm run enrich-missing
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const COPILOT_MODEL = 'gpt-4o';
const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com';

/** Maximum number of missing keywords to process */
const TOP_N = 5;

export interface MissingKeyword {
  keyword: string;
  movie: string;
}

export interface EnrichedMissingKeyword extends MissingKeyword {
  /** Tamil song title used as Blogger "Song:" category tag  e.g. "Uyir Naadi - Coolie" */
  bloggerSongCategory: string;
  singerName: string;
  lyricistName: string;
  musicDirectorName: string;
  /** YouTube video ID (11-char string) or empty string if unknown */
  youtubeVideoId: string;
  youtubeUrl: string;
  youtubeVideoTitle: string;
  releaseYear: string;
  language: string;
  /** Set to false until a human (or validation agent) confirms the data */
  validated: boolean;
  validationNote: string;
}

const ENRICH_SYSTEM_PROMPT = `You are an expert in Tamil cinema music.
Given a Tamil song keyword and movie name, return a JSON object with accurate metadata.

Your output MUST be a raw JSON object — no markdown fences, no explanation.

Fields required:
- "bloggerSongCategory": the song title formatted as "SongName - MovieName" (this is the exact Blogger category tag style, e.g. "Uyir Naadi Nanbane - Coolie")
- "singerName": singer(s) full name, comma-separated if multiple
- "lyricistName": lyricist full name
- "musicDirectorName": music director full name
- "youtubeVideoId": YouTube video ID (11-character string) of the official lyric/audio video, or "" if unknown
- "youtubeUrl": full YouTube URL or "" if unknown
- "youtubeVideoTitle": exact title of the YouTube video or "" if unknown
- "releaseYear": 4-digit year as string, e.g. "2024"
- "language": "Tamil" or "Tamil/Telugu" etc.

Be precise. If you are not confident about the youtubeVideoId, set it to "".
Do NOT make up a YouTube video ID — return "" instead.
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

async function enrichKeyword(
  client: OpenAI,
  item: MissingKeyword,
): Promise<EnrichedMissingKeyword> {
  const userMessage = `Keyword: "${item.keyword}"\nMovie: "${item.movie}"\n\nReturn only the JSON object.`;

  const response = await client.chat.completions.create({
    model: COPILOT_MODEL,
    temperature: 0.1,
    max_tokens: 512,
    messages: [
      { role: 'system', content: ENRICH_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  if (!raw) {
    console.warn(`  ⚠️  Empty AI response for "${item.keyword}". Using defaults.`);
    return defaultEnriched(item);
  }

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      keyword: item.keyword,
      movie: item.movie,
      bloggerSongCategory: parsed.bloggerSongCategory ?? '',
      singerName: parsed.singerName ?? '',
      lyricistName: parsed.lyricistName ?? '',
      musicDirectorName: parsed.musicDirectorName ?? '',
      youtubeVideoId: parsed.youtubeVideoId ?? '',
      youtubeUrl: parsed.youtubeUrl ?? '',
      youtubeVideoTitle: parsed.youtubeVideoTitle ?? '',
      releaseYear: parsed.releaseYear ?? '',
      language: parsed.language ?? 'Tamil',
      validated: false,
      validationNote: '',
    };
  } catch {
    console.warn(`  ⚠️  Failed to parse AI JSON for "${item.keyword}". Using defaults.`);
    return defaultEnriched(item);
  }
}

function defaultEnriched(item: MissingKeyword): EnrichedMissingKeyword {
  return {
    ...item,
    bloggerSongCategory: '',
    singerName: '',
    lyricistName: '',
    musicDirectorName: '',
    youtubeVideoId: '',
    youtubeUrl: '',
    youtubeVideoTitle: '',
    releaseYear: '',
    language: 'Tamil',
    validated: false,
    validationNote: 'AI enrichment failed — please fill manually',
  };
}

/**
 * Builds a GitHub Issue markdown body containing the enriched JSON
 * and a human-readable table for easy review.
 * Uses string concatenation (no template literals spanning multiple lines)
 * so the output can be safely embedded into GitHub Actions YAML scripts.
 */
export function buildIssueBody(enriched: EnrichedMissingKeyword[]): string {
  const tableHeader = '| # | Keyword | Movie | Singer | Lyricist | Music Director | YouTube | Year | Status |';
  const tableSep    = '|---|---------|-------|--------|----------|----------------|---------|------|--------|';
  const tableRows = enriched.map((e, i) => {
    const yt = e.youtubeVideoId ? '[▶](https://youtu.be/' + e.youtubeVideoId + ')' : '❌ missing';
    const status = e.validated ? '✅ validated' : '⏳ pending';
    return '| ' + (i + 1) + ' | ' + e.keyword + ' | ' + e.movie +
           ' | ' + (e.singerName || '—') + ' | ' + (e.lyricistName || '—') +
           ' | ' + (e.musicDirectorName || '—') + ' | ' + yt +
           ' | ' + (e.releaseYear || '—') + ' | ' + status + ' |';
  });
  const table = [tableHeader, tableSep, ...tableRows].join('\n');

  const lines: string[] = [
    '## 🎵 Missing Song Lyrics — Validation Required',
    '',
    'Google Trends identified **' + enriched.length + ' trending Tamil song(s)** that are not yet in our lyrics database.',
    'The AI has pre-filled the metadata below. **Please review each row** and correct any errors.',
    '',
    '### How to Validate',
    '',
    '1. Review the table and the JSON block below.',
    '2. Edit the JSON if any field is wrong (singer, lyricist, YouTube video, Blogger category, etc.).',
    '   - The `bloggerSongCategory` field is critical — it must match the **exact** Blogger `Song:` tag',
    '     (e.g., `"Uyir Naadi Nanbane - Coolie"`).',
    '   - Set `"validated": true` for each song you have confirmed.',
    '   - Leave `"validated": false` for songs you are unsure about — they will be skipped.',
    '3. **Edit this issue body** to update the JSON block with your corrections.',
    '4. Post a comment with `/generate-lyrics` to trigger automatic lyrics JSON generation.',
    '',
    '### Song Summary',
    '',
    table,
    '',
    '---',
    '',
    '### Enriched Keywords JSON (edit if needed)',
    '',
    '```json',
    JSON.stringify(enriched, null, 2),
    '```',
    '',
    '---',
    '',
    '> **Workflow:** Created automatically by the [Google Trends workflow](../../actions/workflows/google-trends.yaml).',
    '> **Next step:** After validation, comment `/generate-lyrics` on this issue to generate lyrics JSON files.',
  ];
  return lines.join('\n');
}

async function main(): Promise<void> {
  const missingPath = path.join(process.cwd(), 'missing-keywords.json');
  if (!fs.existsSync(missingPath)) {
    console.error('❌ missing-keywords.json not found. Run "npm run trends-ai" first.');
    process.exit(1);
  }

  const all: MissingKeyword[] = JSON.parse(fs.readFileSync(missingPath, 'utf8'));
  if (all.length === 0) {
    console.log('✅ No missing keywords to enrich. All trending songs already have lyrics!');
    // Write empty files so downstream steps don't fail
    const outputPath = path.join(process.cwd(), 'missing-keywords-enriched.json');
    fs.writeFileSync(outputPath, JSON.stringify([], null, 2), 'utf8');
    fs.writeFileSync(path.join(process.cwd(), 'missing-keywords-issue-body.md'), '', 'utf8');
    return;
  }

  const topN = all.slice(0, TOP_N);
  console.log(`\n🔍 Enriching top ${topN.length} missing keyword(s) (of ${all.length} total)...\n`);

  const client = createCopilotClient();
  const enriched: EnrichedMissingKeyword[] = [];

  for (let i = 0; i < topN.length; i++) {
    const item = topN[i];
    console.log(`  [${i + 1}/${topN.length}] Enriching: "${item.keyword}" (${item.movie})`);
    const result = await enrichKeyword(client, item);
    console.log(`        → Singer: ${result.singerName || '(unknown)'}`);
    console.log(`        → Lyricist: ${result.lyricistName || '(unknown)'}`);
    console.log(`        → YouTube: ${result.youtubeVideoId ? `https://youtu.be/${result.youtubeVideoId}` : '(unknown)'}`);
    console.log(`        → Blogger category: ${result.bloggerSongCategory || '(unknown)'}`);
    enriched.push(result);

    // Small delay to avoid rate limiting
    if (i < topN.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  const outputPath = path.join(process.cwd(), 'missing-keywords-enriched.json');
  fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2), 'utf8');
  console.log(`\n💾 Enriched data saved to missing-keywords-enriched.json`);

  // Write the pre-formatted GitHub Issue body so the workflow step can read it as a file
  const issueBodyPath = path.join(process.cwd(), 'missing-keywords-issue-body.md');
  fs.writeFileSync(issueBodyPath, buildIssueBody(enriched), 'utf8');
  console.log(`💾 Issue body saved to missing-keywords-issue-body.md`);

  console.log(`\n📋 Summary:`);
  enriched.forEach(e => {
    const ytStatus = e.youtubeVideoId ? `✅ ${e.youtubeVideoId}` : '❌ missing';
    console.log(`   • [${e.movie}] ${e.keyword} — YT: ${ytStatus}`);
  });
  console.log('\n⏳ Action required: Review missing-keywords-enriched.json and set "validated": true for confirmed songs.');
  console.log('   Then trigger the "generate-lyrics-from-missing" workflow or comment /generate-lyrics on the GitHub Issue.');
}

main().catch((err: unknown) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
