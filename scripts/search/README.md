# Song Search and Metadata Enrichment Scripts

This folder contains two powerful scripts for managing your Tamil song lyrics collection:

1. **search-songs.ts** - Search songs by keywords
2. **enrich-songs-metadata.ts** - Add AI-powered metadata to songs

## 🔍 Song Search Script

### Features
- Search songs by multiple criteria:
  - Song title
  - Movie name
  - Actor name (male lead)
  - Actress name (female lead)
  - Singer name
  - Lyricist name
  - Music director name
  - Release year
  - Mood (if enriched)
  - Song type (if enriched)
  - Keywords (if enriched)
  - Occasions (if enriched) - birthday, wedding, valentines day, etc.
- Case-insensitive search
- Shows where matches were found
- Collection statistics

### Usage

```bash
# Search by actor name
npm run search-songs vijay

# Search by actress name
npm run search-songs trisha
npm run search-songs samantha

# Search by movie name
npm run search-songs mersal

# Search by singer
npm run search-songs "AR Rahman"

# Search by year
npm run search-songs 2017

# Search by mood (after enrichment)
npm run search-songs sad
npm run search-songs energetic
npm run search-songs romantic

# Search by song type (after enrichment)
npm run search-songs "mother song"
npm run search-songs duet
npm run search-songs kuthu

# Search by occasion (after enrichment)
npm run search-songs birthday
npm run search-songs "valentines day"
npm run search-songs wedding
npm run search-songs anniversary

# View collection statistics
npm run search-songs -- --stats
```

### Multi-Filter Search (AND Logic)

Combine multiple field-specific filters to narrow down results. All filters must match:

```bash
# Find Vijay's sad songs
npm run search-songs actor:vijay mood:sad

# Find Trisha's romantic songs
npm run search-songs actress:trisha mood:romantic

# Find Vijay's 2017 songs
npm run search-songs actor:vijay year:2017

# Find happy birthday songs
npm run search-songs mood:happy occasion:birthday

# Find Suriya's duet songs
npm run search-songs actor:suriya type:duet
```

### Natural Language Search (AI-Powered)

Use natural language to search - AI will extract the structured filters automatically:

```bash
# Find sad songs of actor Vijay
npm run search-songs "find sad songs of actor vijay"

# Show romantic Trisha songs
npm run search-songs "show me romantic trisha songs"

# Vijay birthday energetic songs
npm run search-songs "today is vijay birthday find energetic songs"

# AR Rahman sad songs from 2017
npm run search-songs "AR Rahman sad songs from 2017"
```

**How Natural Language Search Works:**
- AI (GPT-4o) parses your query to extract structured filters
- Understands actors, actresses, moods, occasions, years, song types
- Falls back to literal search if AI parsing fails
- Requires `GITHUB_TOKEN` environment variable (same as enrichment)
- Free to use (GitHub Models free tier)

### Example Output

```
🔍 Search results for: "vijay"
Found 234 matching songs

1. Aalaporaan Thamizhan Lyrics Mersal
   File: aalaporaan-thamizhan-lyrics-mersal.json
   Movie: Mersal
   Singer: Sathya Prakash
   Music: AR Rahman
   ✓ Matched in: actorName

2. KuActor Name**: Male lead actor (if missing and identifiable)
   - Examples: Vijay, Ajith, Rajinikanth, Suriya, Dhanush

2. **Actress Name**: Female lead actress (if missing and identifiable)
   - Examples: Nayanthara, Trisha, Samantha, Keerthy Suresh

3. **Release Year**: Movie release year (if identifiable)

4. **Mood**: Emotional tone of the song
   - Examples: `romantic`, `sad`, `energetic`, `devotional`, `patriotic`, `happy`, `melancholic`, `inspirational`, `celebratory`, `motivational`

5. **Song Type**: Category and style
   - Examples: `love song`, `item song`, `mother song`, `friendship song`, `family song`, `duet`, `solo`, `celebration song`, `kuthu`, `melody`

6. **Occasions**: When people might search for this song
   - Examples: `birthday`, `wedding`, `anniversary`, `valentines day`, `mothers day`, `diwali`, `party`, `workout`, `driving`, `romantic date`

7. **Keywords**: Searchable terms
   - Actor and actressdata Enrichment Script

This script uses GitHub Copilot SDK (GPT-4o) to automatically analyze and add metadata to your song collection.

### Metadata Added

For each song, the AI analyzes and adds:

1. **Mood**: Emotional tone of the song
   - Examples: `romantic`, `sad`, `energetic`, `devotional`, `patriotic`, `happy`, `melancholic`, `inspirational`, `celebratory`, `motivational`

2. **Song Type**: Category and style
   - Examples: `love song`, `item song`, `mother song`, `friendship song`, `family song`, `duet`, `solo`, `celebration song`, `kuthu`, `melody`

3. **Keywords**: Searchable terms
   - Actor names
   - Movie name
   - Singer/composer names
   - Genre descriptors
   - Mood descriptors

### Usage

```bash
# Preview enrichment without saving (dry run)
npm run enrich-songs -- --dry-run

# Process only first 10 songs (for testing)
npm run enrich-songs -- --limit=10

# Enrich all songs (this will take time!)
npm run enrich-songs
```

### Important Notes

- **Rate Limits**: The script processes songs in batches of 5 with delays to respect API rate limits
- **TimeActor: Vijay
      ✓ Actress: Samantha
      ✓ Year: 2017
      ✓ Mood: patriotic, energetic, inspirational
      ✓ Type: celebration song, solo, kuthu
      ✓ Occasions: birthday, party, celebration, workout
      ✓ Keywords: vijay, mersal, ar rahman, patriotic
- **Backup**: Consider backing up your songs folder before running

### Example Output

```
📦 Processing batch 1/520

   🔄 Aalaporaan Thamizhan Lyrics Mersal
      ✓ Mood: patriotic, energetic, inspirational
      ✓ Type: celebration song, solo, kuthu
      ✓ Keywords: vijay, mersal, ar rahman, patriotic, tamil, celebration...
```

### Environment Setup

Make sure yoactor: `npm run search-songs vijay`
- Search by actress: `npm run search-songs trisha`
- Search by year: `npm run search-songs 2017`
- Search by mood: `npm run search-songs sad`
- Search by type: `npm run search-songs "mother song"`
- Search by occasion: `npm run search-songs birthday`
- Find energetic songs: `npm run search-songs energetic`
- Find wedding songs: `npm run search-songs wedding
export GITHUB_TOKEN=your_github_token_here
```

## 📊 Collection Statistics

Current status:
- **Total songs**: 2,598
- **Enriched**: 0 (0.0%)
- **Unique movies**: 756
- **Unique singers**: 1,026

After enrichment, you'll be able to:
- Search by mood: `npm run search-songs sad`
- Search by type: `npm run search-songs "mother song"`
- Find energetic songs: `npm run search-songs energetic`
- Discover duets: `npm run search-songs duet`

## 🎯 Recommended Workflow

1. **Test with small sample**:
   ```bash
   npm run enrich-songs -- --limit=10 --dry-run
   ```

2. **Verify results look good**:
   ```bash
   npm run search-songs -- --stats
   ```

3. **Run full enrichment** (consider running overnight):
   npm run search-songs birthday
   npm run search-songs "valentines day"
   ```bash
   npm run enrich-songs
   ```

4. **Search enriched collection**:
   ```bash
   npm run search-songs romantic
   npm run search-songs "AR Rahman"
   npm run search-songs vijay
   ```

## 🔧 Script Options

### search-songs.ts
- `<keyword>` - Search term
- `--stats` - Show collection statistics
- `--help` - Show usage information

### enrich-songs-metadata.ts
- `--dry-run` - Preview without saving changes
- `--limit=N` - Process only first N songs
- `actressName": "Actress Name",
  "releaseYear": "2017",
  "mood": ["romantic", "melancholic"],
  "songType": ["love song", "duet", "melody"],
  "occasions": ["valentines day", "romantic date", "anniversary"],
  "keywords": ["actor", "actresser Enrichment

```json
{
  "slug": "song-slug",
  "title": "Song Title",
  "movieName": "Movie Name",
  "singerName": "Singer Name",
  "actorName": "Actor Name",
  "mood": ["romantic", "melancholic"],
  "songType": ["love song", "duet", "melody"],
  "keywords": ["actor", "movie", "singer", "romantic", "melody"]
}
```
