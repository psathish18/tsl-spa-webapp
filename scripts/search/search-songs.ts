import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

const SONGS_DIR = path.join(process.cwd(), 'public', 'songs');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const COPILOT_MODEL = 'gpt-4o';
const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com';

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
  // Enriched metadata (if available)
  mood?: string[];
  songType?: string[];
  keywords?: string[];
  occasions?: string[];
  releaseYear?: string;
}

interface SearchResult {
  filename: string;
  song: SongData;
  matchedFields: string[];
}

interface SearchFilter {
  field?: string;
  value: string;
}

interface ParsedQuery {
  filters: SearchFilter[];
  originalQuery: string;
}

/**
 * Normalize string for case-insensitive search
 */
function normalize(str: string): string {
  return str.toLowerCase().trim();
}

/**
 * Check if a field contains the keyword
 */
function fieldMatches(field: string | undefined, keyword: string): boolean {
  if (!field) return false;
  return normalize(field).includes(normalize(keyword));
}

/**
 * Check if an array field contains the keyword
 */
function arrayFieldMatches(field: string[] | undefined, keyword: string): boolean {
  if (!field || !Array.isArray(field)) return false;
  return field.some(item => normalize(item).includes(normalize(keyword)));
}

/**
 * Parse search query to extract field filters
 * Supports multiple filters: actor:vijay mood:sad actress:trisha
 */
function parseSearchQuery(query: string): SearchFilter[] {
  const filters: SearchFilter[] = [];
  const parts = query.split(/\s+/);
  
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    
    if (part.includes(':')) {
      const [field, ...valueParts] = part.split(':');
      let value = valueParts.join(':');
      
      // Handle quoted values: mood:"very sad"
      if (value.startsWith('"')) {
        const quotedParts = [value];
        i++;
        while (i < parts.length && !parts[i].endsWith('"')) {
          quotedParts.push(parts[i]);
          i++;
        }
        if (i < parts.length) {
          quotedParts.push(parts[i]);
        }
        value = quotedParts.join(' ').replace(/^"|"$/g, '');
      }
      
      filters.push({ field: field.toLowerCase(), value: value.trim() });
    } else {
      // No field prefix, treat as general search
      filters.push({ value: part });
    }
    
    i++;
  }
  
  return filters;
}

/**
 * Parse natural language query using AI
 * Converts "find sad songs of actor vijay" to structured filters
 */
async function parseNaturalLanguage(query: string): Promise<SearchFilter[]> {
  if (!GITHUB_TOKEN) {
    console.log('⚠️  GITHUB_TOKEN not set, falling back to literal search\n');
    return [{ value: query }];
  }

  const client = new OpenAI({
    baseURL: GITHUB_MODELS_ENDPOINT,
    apiKey: GITHUB_TOKEN,
  });

  const prompt = `You are a search query parser for a Tamil song lyrics database. Parse the user's natural language query and extract structured search filters.

Available fields:
- actor: Lead male actor (e.g., Vijay, Ajith, Rajinikanth, Suriya, Dhanush, Sivakarthikeyan)
- actress: Lead female actress (e.g., Nayanthara, Trisha, Samantha, Kajal Aggarwal)
- movie: Movie name
- singer: Singer name
- music: Music director name
- lyricist: Lyricist name
- year: Release year
- mood: Song mood (romantic, sad, happy, energetic, devotional, melancholic, inspirational)
- type: Song type (love song, duet, item song, mother song, friendship, kuthu, melody)
- occasion: Suitable occasions (birthday, wedding, anniversary, valentines day, mothers day, party)

User query: "${query}"

Extract all relevant filters. Return ONLY a JSON array of filter objects. Each filter should have "field" and "value" properties.
If a word doesn't match any field, include it as a general search with no field.

Examples:
Query: "find sad songs of actor vijay"
Response: [{"field":"actor","value":"vijay"},{"field":"mood","value":"sad"}]

Query: "today is vijay birthday find energetic songs"
Response: [{"field":"actor","value":"vijay"},{"field":"mood","value":"energetic"},{"field":"occasion","value":"birthday"}]

Query: "romantic trisha songs"
Response: [{"field":"actress","value":"trisha"},{"field":"mood","value":"romantic"}]

Query: "AR Rahman 2017 songs"
Response: [{"field":"singer","value":"AR Rahman"},{"field":"year","value":"2017"}]

Return ONLY the JSON array, no explanation, no markdown fences.`;

  try {
    const response = await client.chat.completions.create({
      model: COPILOT_MODEL,
      temperature: 0.1,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = response.choices[0]?.message?.content ?? '';
    if (!responseText) return [{ value: query }];

    const cleaned = responseText.replace(/```json|```/g, '').trim();
    const filters: SearchFilter[] = JSON.parse(cleaned);
    
    return filters.length > 0 ? filters : [{ value: query }];
  } catch (error) {
    console.log('⚠️  AI parsing failed, using literal search\n');
    return [{ value: query }];
  }
}

/**
 * Detect if query is natural language or structured syntax
 */
function isNaturalLanguage(query: string): boolean {
  // If contains colon syntax like "actor:vijay", it's structured
  if (/\w+:\w+/.test(query)) return false;
  
  // If contains common natural language words, it's natural language
  const naturalWords = /\b(find|show|get|search|give|today|birthday|songs?|of|the|me|for|with|from|in)\b/i;
  return naturalWords.test(query);
}

/**
 * Search songs using filters (supports both structured and natural language)
 */
async function searchSongsWithFilters(keyword: string, filters: SearchFilter[]): Promise<SearchResult[]> {
  if (!fs.existsSync(SONGS_DIR)) {
    console.error(`❌ Songs directory not found: ${SONGS_DIR}`);
    return [];
  }

  const results: SearchResult[] = [];
  const files = fs.readdirSync(SONGS_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const filePath = path.join(SONGS_DIR, file);
      const songData: SongData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const matchedFields: string[] = [];
      let allFiltersMatch = true;

      // Check each filter - ALL must match (AND logic)
      for (const filter of filters) {
        let filterMatched = false;
        
        if (filter.field) {
          // Field-specific search
          switch (filter.field) {
            case 'actor':
              if (fieldMatches(songData.actorName, filter.value)) {
                matchedFields.push('actorName');
                filterMatched = true;
              }
              break;
            case 'actress':
              if (fieldMatches(songData.actressName, filter.value)) {
                matchedFields.push('actressName');
                filterMatched = true;
              }
              break;
            case 'movie':
              if (fieldMatches(songData.movieName, filter.value)) {
                matchedFields.push('movieName');
                filterMatched = true;
              }
              break;
            case 'singer':
              if (fieldMatches(songData.singerName, filter.value)) {
                matchedFields.push('singerName');
                filterMatched = true;
              }
              break;
            case 'lyricist':
              if (fieldMatches(songData.lyricistName, filter.value)) {
                matchedFields.push('lyricistName');
                filterMatched = true;
              }
              break;
            case 'music':
              if (fieldMatches(songData.musicName, filter.value)) {
                matchedFields.push('musicName');
                filterMatched = true;
              }
              break;
            case 'year':
              if (fieldMatches(songData.releaseYear, filter.value)) {
                matchedFields.push('releaseYear');
                filterMatched = true;
              }
              break;
            case 'mood':
              if (arrayFieldMatches(songData.mood, filter.value)) {
                matchedFields.push('mood');
                filterMatched = true;
              }
              break;
            case 'type':
              if (arrayFieldMatches(songData.songType, filter.value)) {
                matchedFields.push('songType');
                filterMatched = true;
              }
              break;
            case 'occasion':
              if (arrayFieldMatches(songData.occasions, filter.value)) {
                matchedFields.push('occasions');
                filterMatched = true;
              }
              break;
          }
        } else {
          // Search in all fields (any match counts)
          if (fieldMatches(songData.title, filter.value)) { matchedFields.push('title'); filterMatched = true; }
          if (fieldMatches(songData.movieName, filter.value)) { matchedFields.push('movieName'); filterMatched = true; }
          if (fieldMatches(songData.actorName, filter.value)) { matchedFields.push('actorName'); filterMatched = true; }
          if (fieldMatches(songData.actressName, filter.value)) { matchedFields.push('actressName'); filterMatched = true; }
          if (fieldMatches(songData.singerName, filter.value)) { matchedFields.push('singerName'); filterMatched = true; }
          if (fieldMatches(songData.lyricistName, filter.value)) { matchedFields.push('lyricistName'); filterMatched = true; }
          if (fieldMatches(songData.musicName, filter.value)) { matchedFields.push('musicName'); filterMatched = true; }
          if (fieldMatches(songData.slug, filter.value)) { matchedFields.push('slug'); filterMatched = true; }
          if (fieldMatches(songData.releaseYear, filter.value)) { matchedFields.push('releaseYear'); filterMatched = true; }
          if (arrayFieldMatches(songData.mood, filter.value)) { matchedFields.push('mood'); filterMatched = true; }
          if (arrayFieldMatches(songData.songType, filter.value)) { matchedFields.push('songType'); filterMatched = true; }
          if (arrayFieldMatches(songData.keywords, filter.value)) { matchedFields.push('keywords'); filterMatched = true; }
          if (arrayFieldMatches(songData.occasions, filter.value)) { matchedFields.push('occasions'); filterMatched = true; }
        }
        
        // If this filter didn't match, the song doesn't qualify
        if (!filterMatched) {
          allFiltersMatch = false;
          break;
        }
      }

      // Only include if ALL filters matched
      if (allFiltersMatch && matchedFields.length > 0) {
        results.push({ filename: file, song: songData, matchedFields });
      }
    } catch (error) {
      // Skip files that can't be parsed
      continue;
    }
  }

  return results;
}

/**
 * Display search results
 */
function displayResults(keyword: string, results: SearchResult[]): void {
  console.log(`\n🔍 Search results for: "${keyword}"`);
  console.log(`Found ${results.length} matching songs\n`);

  if (results.length === 0) {
    console.log('   No songs found matching your search criteria.');
    return;
  }

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.song.title || 'Untitled'}`);
    console.log(`   File: ${result.filename}`);
    if (result.song.movieName) console.log(`   Movie: ${result.song.movieName}`);
    if (result.song.actorName) console.log(`   Actor: ${result.song.actorName}`);
    if (result.song.actressName) console.log(`   Actress: ${result.song.actressName}`);
    if (result.song.singerName) console.log(`   Singer: ${result.song.singerName}`);
    if (result.song.musicDirector) console.log(`   Music: ${result.song.musicDirector}`);
    if (result.song.lyricist) console.log(`   Lyricist: ${result.song.lyricist}`);
    if (result.song.releaseYear) console.log(`   Year: ${result.song.releaseYear}`);
    if (result.song.mood) console.log(`   Mood: ${result.song.mood}`);
    if (result.song.songType) console.log(`   Type: ${result.song.songType}`);
    if (result.song.occasions && result.song.occasions.length > 0) {
      console.log(`   Occasions: ${result.song.occasions.join(', ')}`);
    }
    if (result.song.keywords && result.song.keywords.length > 0) {
      console.log(`   Keywords: ${result.song.keywords.slice(0, 5).join(', ')}`);
    }
    console.log('');
  });
}

/**
 * Get statistics about the song collection
 */
function getStats(): void {
  if (!fs.existsSync(SONGS_DIR)) {
    console.error(`❌ Songs directory not found: ${SONGS_DIR}`);
    return;
  }

  const files = fs.readdirSync(SONGS_DIR).filter(f => f.endsWith('.json'));
  let enrichedCount = 0;
  const actors = new Set<string>();
  const actresses = new Set<string>();
  const movies = new Set<string>();
  const singers = new Set<string>();
  const occasions = new Set<string>();

  for (const file of files) {
    try {
      const filePath = path.join(SONGS_DIR, file);
      const songData: SongData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (songData.mood || songData.songType || songData.keywords) {
        enrichedCount++;
      }
      
      if (songData.actorName) actors.add(songData.actorName);
      if (songData.actressName) actresses.add(songData.actressName);
      if (songData.movieName) movies.add(songData.movieName);
      if (songData.singerName) singers.add(songData.singerName);
      if (songData.occasions) songData.occasions.forEach(o => occasions.add(o));
    } catch {
      continue;
    }
  }

  console.log('\n📊 Song Collection Statistics:');
  console.log(`   Total songs: ${files.length}`);
  console.log(`   Enriched with metadata: ${enrichedCount} (${((enrichedCount / files.length) * 100).toFixed(1)}%)`);
  console.log(`   Unique actors: ${actors.size}`);
  console.log(`   Unique actresses: ${actresses.size}`);
  console.log(`   Unique movies: ${movies.size}`);
  console.log(`   Unique singers: ${singers.size}`);
  console.log(`   Unique occasions: ${occasions.size}`);
  console.log('');
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  console.log('\n📖 Usage:');
  console.log('   npm run search-songs <keyword>');
  console.log('   npm run search-songs <field>:<value> [<field>:<value> ...]');
  console.log('   npm run search-songs "<natural language query>"');
  console.log('   npm run search-songs --stats\n');
  console.log('Simple Search (any field):');
  console.log('   npm run search-songs vijay               # Find "vijay" in any field');
  console.log('   npm run search-songs "AR Rahman"         # Find "AR Rahman" in any field\n');
  console.log('Field-Specific Search:');
  console.log('   npm run search-songs actor:vijay         # Find Vijay movies');
  console.log('   npm run search-songs actress:trisha      # Find Trisha movies');
  console.log('   npm run search-songs movie:mersal        # Find songs from Mersal');
  console.log('   npm run search-songs year:2017           # Find 2017 songs\n');
  console.log('Multi-Filter Search (AND logic):');
  console.log('   npm run search-songs actor:vijay mood:sad          # Vijay\'s sad songs');
  console.log('   npm run search-songs actress:trisha mood:romantic  # Trisha\'s romantic songs');
  console.log('   npm run search-songs mood:happy occasion:birthday  # Happy birthday songs\n');
  console.log('Natural Language Search (AI-powered):');
  console.log('   npm run search-songs "find sad songs of actor vijay"');
  console.log('   npm run search-songs "show me romantic trisha songs"');
  console.log('   npm run search-songs "vijay birthday energetic songs"');
  console.log('   npm run search-songs "AR Rahman sad songs from 2017"\n');
  console.log('Available Fields:');
  console.log('   actor, actress, movie, singer, music, lyricist, year');
  console.log('   mood, type, occasion (requires enrichment)\n');
  console.log('Other:');
  console.log('   npm run search-songs --stats             # View collection stats\n');
  process.exit(0);
}

async function main() {
  if (args[0] === '--stats') {
    getStats();
  } else {
    const query = args.join(' ');
    let filters: SearchFilter[];
    
    // Detect if natural language or structured syntax
    if (isNaturalLanguage(query)) {
      console.log('🤖 Parsing natural language query with AI...\n');
      filters = await parseNaturalLanguage(query);
      
      // Show parsed filters
      const filterDesc = filters
        .map(f => f.field ? `${f.field}:${f.value}` : f.value)
        .join(', ');
      console.log(`   Detected filters: ${filterDesc}\n`);
    } else {
      // Use structured syntax parser
      filters = parseSearchQuery(query);
    }
    
    const results = await searchSongsWithFilters(query, filters);
    displayResults(query, results);
  }
}

main().catch((err: unknown) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
