import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const COPILOT_MODEL = 'gpt-4o';
const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com';
const SONGS_DIR = path.join(process.cwd(), 'public', 'songs');
const BATCH_SIZE = 5; // Process songs in batches to avoid overwhelming the API

interface SongData {
  slug: string;
  title: string;
  movieName?: string;
  singerName?: string;
  lyricistName?: string;
  musicName?: string;
  actorName?: string;
  actressName?: string;
  published?: string;
  stanzas?: string[];
  // New enriched fields
  mood?: string[];
  songType?: string[];
  keywords?: string[];
  occasions?: string[];
  releaseYear?: string;
}

interface EnrichedMetadata {
  actorName?: string;
  actressName?: string;
  releaseYear?: string;
  mood: string[];
  songType: string[];
  keywords: string[];
  occasions: string[];
}

const ENRICHMENT_PROMPT = `Analyze the following Tamil song data and provide metadata in JSON format.

Based on the song title, movie name, singer, lyricist, music director, and existing data, determine:

1. **actorName**: Lead male actor name (if identifiable). Common: Vijay, Ajith, Rajinikanth, Kamal Haasan, Suriya, Vikram, Dhanush, Sivakarthikeyan, Vishal, Karthi, etc. Return empty string if not identifiable.

2. **actressName**: Lead female actress name (if identifiable). Common: Nayanthara, Trisha, Samantha, Anushka, Kajal Aggarwal, Tamanna, Keerthy Suresh, Jyothika, Aishwarya Rai, Shruti Haasan, etc. Return empty string if not identifiable.

3. **releaseYear**: Movie release year (if identifiable from context or movie name). Return empty string if not known.

4. **mood**: Array of moods (e.g., "romantic", "sad", "energetic", "devotional", "patriotic", "happy", "melancholic", "inspirational", "celebratory", "motivational")

5. **songType**: Array of song types (e.g., "love song", "item song", "mother song", "friendship song", "family song", "situational", "montage", "duet", "solo", "celebration song", "sad song", "introduction song", "fight song", "dance number", "folk", "kuthu", "melody")

6. **occasions**: Array of occasions this song might be suitable for (e.g., "birthday", "wedding", "anniversary", "friendship day", "mothers day", "valentines day", "new year", "pongal", "diwali", "party", "workout", "driving", "romantic date", "breakup", "motivation", "celebration"). Think about when people might want to search for this song.

7. **keywords**: Array of searchable keywords including:
   - Actor and actress names
   - Movie name
   - Singer name
   - Music director name
   - Genre descriptors
   - Mood descriptors
   - Any notable characteristics

Return ONLY a raw JSON object. No markdown fences, no explanation.

Example:
{
  "actorName": "Vijay",
  "actressName": "Samantha",
  "releaseYear": "2017",
  "mood": ["romantic", "melancholic"],
  "songType": ["love song", "duet", "melody"],
  "occasions": ["valentines day", "romantic date", "anniversary"],
  "keywords": ["vijay", "samantha", "mersal", "ar rahman", "romantic", "melody", "duet"]
}

Song Data:
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

async function enrichSongMetadata(
  songData: SongData,
  client: OpenAI
): Promise<EnrichedMetadata | null> {
  try {
    // Prepare song info (without lyrics to reduce token usage)
    const songInfo = {
      title: songData.title,
      movieName: songData.movieName || '',
      singerName: songData.singerName || '',
      lyricistName: songData.lyricistName || '',
      musicName: songData.musicName || '',
      actorName: songData.actorName || '',
      actressName: songData.actressName || '',
      published: songData.published || '',
    };

    const response = await client.chat.completions.create({
      model: COPILOT_MODEL,
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: ENRICHMENT_PROMPT + JSON.stringify(songInfo, null, 2),
        },
      ],
    });

    const responseText = response.choices[0]?.message?.content ?? '';
    if (!responseText) return null;

    // Parse JSON response
    const cleaned = responseText.replace(/```json|```/g, '').trim();
    const metadata: EnrichedMetadata = JSON.parse(cleaned);

    return metadata;
  } catch (error) {
    console.error(`   ⚠️  Error enriching metadata:`, error);
    return null;
  }
}

async function enrichAllSongs(dryRun: boolean = false): Promise<void> {
  if (!fs.existsSync(SONGS_DIR)) {
    console.error(`❌ Songs directory not found: ${SONGS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SONGS_DIR).filter(f => f.endsWith('.json'));
  console.log(`📚 Found ${files.length} song files to enrich\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  const client = createCopilotClient();
  let processedCount = 0;
  let enrichedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process in batches with delay to respect rate limits
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)}`);
    
    for (const file of batch) {
      const filePath = path.join(SONGS_DIR, file);
      
      try {
        const songData: SongData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        processedCount++;

        // Skip if already enriched
        if (songData.mood && songData.songType && songData.keywords) {
          console.log(`   ⏭️  ${songData.title || file} - Already enriched`);
          skippedCount++;
          continue;
        }

        console.log(`   🔄 ${songData.title || file}`);

        const metadata = await enrichSongMetadata(songData, client);

        if (metadata) {
          // Always prefer enriched metadata for actor name when AI identifies it
          if (metadata.actorName && metadata.actorName.trim()) {
            const isNew = !songData.actorName;
            songData.actorName = metadata.actorName;
            console.log(`      ✓ Actor: ${metadata.actorName}${isNew ? ' (new)' : ' (updated)'}`);
          }
          
          // Always prefer enriched metadata for actress name when AI identifies it
          if (metadata.actressName && metadata.actressName.trim()) {
            const isNew = !songData.actressName;
            songData.actressName = metadata.actressName;
            console.log(`      ✓ Actress: ${metadata.actressName}${isNew ? ' (new)' : ' (updated)'}`);
          }
          
          // Update release year if identified
          if (metadata.releaseYear && metadata.releaseYear.trim()) {
            songData.releaseYear = metadata.releaseYear;
            console.log(`      ✓ Year: ${metadata.releaseYear}`);
          }
          
          // Update all enriched metadata fields
          songData.mood = metadata.mood;
          songData.songType = metadata.songType;
          songData.keywords = metadata.keywords;
          songData.occasions = metadata.occasions;

          if (!dryRun) {
            fs.writeFileSync(filePath, JSON.stringify(songData, null, 2), 'utf8');
          }

          console.log(`      ✓ Mood: ${metadata.mood.join(', ')}`);
          console.log(`      ✓ Type: ${metadata.songType.join(', ')}`);
          console.log(`      ✓ Occasions: ${metadata.occasions.join(', ')}`);
          console.log(`      ✓ Keywords: ${metadata.keywords.slice(0, 5).join(', ')}${metadata.keywords.length > 5 ? '...' : ''}`);
          enrichedCount++;
        } else {
          console.log(`      ✗ Failed to enrich`);
          errorCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`   ❌ Error processing ${file}:`, error);
        errorCount++;
      }
    }

    // Longer delay between batches
    if (i + BATCH_SIZE < files.length) {
      console.log('\n   ⏳ Waiting before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Enrichment Summary:');
  console.log(`   Total processed: ${processedCount}`);
  console.log(`   Successfully enriched: ${enrichedCount}`);
  console.log(`   Already enriched (skipped): ${skippedCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log('='.repeat(60) + '\n');
}

// Main execution
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitStr = args.find(arg => arg.startsWith('--limit='));
const limit = limitStr ? parseInt(limitStr.split('=')[1]) : null;

if (args.includes('--help')) {
  console.log('\n📖 Usage:');
  console.log('   npm run enrich-songs              # Enrich all songs');
  console.log('   npm run enrich-songs --dry-run    # Preview without saving');
  console.log('   npm run enrich-songs --limit=10   # Process only first 10 songs\n');
  process.exit(0);
}

if (limit) {
  console.log(`🎯 Limiting to first ${limit} songs\n`);
  const files = fs.readdirSync(SONGS_DIR).filter(f => f.endsWith('.json')).slice(0, limit);
  fs.readdirSync(SONGS_DIR)
    .filter(f => f.endsWith('.json') && !files.includes(f))
    .forEach(f => fs.renameSync(path.join(SONGS_DIR, f), path.join(SONGS_DIR, f)));
}

enrichAllSongs(dryRun).catch((err: unknown) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
