# Song Search & Enrichment - Quick Reference

## ✅ What's Been Created

### 1. Search Script (`scripts/search-songs.ts`)
- ✅ Search 2,598 songs by keyword
- ✅ Searches: title, movie, actor, singer, lyricist, music director, mood, type, keywords
- ✅ Case-insensitive matching
- ✅ Shows collection statistics
- ✅ **READY TO USE NOW**

### 2. Enrichment Script (`scripts/enrich-songs-metadata.ts`)
- ✅ Uses GitHub Copilot SDK (GPT-4o) 
- ✅ Adds metadata: mood, songType, keywords
- ✅ Batch processing with rate limiting
- ✅ Skips already enriched songs
- ✅ Dry-run mode for testing
- ✅ **READY TO USE** (needs GITHUB_TOKEN)

## 🚀 Quick Start

### Search Songs (Works Right Now!)

```bash
# Search by actor
npm run search-songs vijay
npm run search-songs ajith

# Search by actress  
npm run search-songs trisha
npm run search-songs samantha

# Search by movie
npm run search-songs mersal

# Search by singer
npm run search-songs "AR Rahman"

# Search by year
npm run search-songs 2017

# View statistics
npm run search-songs -- --stats
```

### Enrich Songs (One-Time Setup)

```bash
# 1. Test with 3 songs (dry run)
npm run enrich-songs -- --limit=3 --dry-run

# 2. Actually enrich 3 songs
npm run enrich-songs -- --limit=3

# 3. Search the enriched songs
npm run search-songs romantic

# 4. If results look good, run full enrichment
npm run enrich-songs
```

## 📊 Current Collection

- **2,598 songs** total
- **756 unique movies**
- **1,026 unique singers**
- **0% enriched** (no metadata yet)

## 🎯 After Enrichment, You Can Search By:

- **Actor/Actress**: vijay, trisha, samantha, ajith, nayanthara
- **Year**: 2017, 2018, 2019
- **Mood**: sad, happy, romantic, energetic, devotional, patriotic
- **Type**: mother song, love song, duet, kuthu, melody, item song
- **Occasions**: birthday, wedding, anniversary, valentines day, mothers day, party, workout
- **Keywords**: Combined search terms for better discovery

## 💡 Example Use Cases

```bash
# Find all Trisha songs (after enrichment)
npm run search-songs trisha

# Find songs from 2017
npm run search-songs 2017

# Find sad songs (after enrichment)
npm run search-songs sad

# Find mother songs (after enrichment)
npm run search-songs "mother song"

# Find birthday songs (after enrichment) 
npm run search-songs birthday

# Find wedding songs (after enrichment)
npm run search-songs wedding

# Find mother songs (after enrichment)
npm run search-songs "mother song"

# Find energetic kuthu songs (after enrichment) 
npm run search-songs energetic

# Find AR Rahman melodies (after enrichment)
npm run search-songs "AR Rahman" | grep melody
```

## ⚠️ Important Notes

1. **Search works immediately** - No setup needed
2. **Enrichment requires GITHUB_TOKEN** - Already set in your environment
3. **Enrichment is one-time** - Takes ~2-3 hours for all songs
4. **Rate limits** - Script handles them automatically
5. **Backup recommended** - Before running full enrichment

## 📖 Full Documentation

See [README_SONG_SCRIPTS.md](./README_SONG_SCRIPTS.md) for complete documentation.
