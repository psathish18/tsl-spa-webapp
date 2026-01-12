# Song JSON Generation - Usage Guide

## Overview
Generate optimized JSON files for song pages from Blogger API with category filtering and limit options.

---

## 📋 Command Options

### Basic Commands

```bash
# Generate all songs (fetches ALL songs using pagination)
# Uses start-index pagination in batches of 150 songs
npm run generate-song-json

# Test with one song
npm run generate-song-json:test

# Generate top 10 songs
npm run generate-song-json -- --limit 10
```

---

## 🎯 Advanced Options

### 1. Limit Number of Songs

**Important**: When using `--limit`, it limits the number of JSONs generated, not the API fetch.
- With category filter: Fetches all songs in that category, then limits JSON generation
- Without category: Fetches ALL songs using pagination, then limits JSON generation

```bash
# Generate first 50 songs (fetches all, generates 50 JSONs)
npm run generate-song-json -- --limit 50

# Generate first 100 songs
npm run generate-song-json -- --limit=100
```

### 2. Filter by Category

**Important**: Category filtering happens at API level - only fetches songs in that category.

Generate songs for specific movies, actors, singers, or other categories:

#### Movie Category
```bash
# All songs from Coolie movie
npm run generate-song-json -- --category="Movie:Coolie - 2024"

# All songs from Jana Nayagan movie (with limit)
npm run generate-song-json -- --category="Movie:Jana Nayagan" --limit=5
```

#### Actor Category
```bash
# All songs featuring Vijay
npm run generate-song-json -- --category="Actor:Vijay" --limit=10

# All songs featuring Rajinikanth
npm run generate-song-json -- --category="Actor:Rajinikanth"
```

#### Singer Category
```bash
# All songs by Anirudh
npm run generate-song-json -- --category="Singer:Anirudh"

# All songs by AR Rahman (with limit)
npm run generate-song-json -- --category="Singer:AR Rahman" --limit=20
```

#### Music Director Category
```bash
# All songs with music by Ilayaraja
npm run generate-song-json -- --category="Music:Ilayaraja"
```

#### Lyricist Category
```bash
# All songs with lyrics by Vairamuthu
npm run generate-song-json -- --category="Lyrics:Vairamuthu"
```

---

## 🔄 Automated Workflow for New Songs

### Workflow 1: Generate All Songs (Initial Setup)

```bash
# Generate ALL songs using pagination
npm run generate-song-json

# This will:
# 1. Fetch all songs in batches of 150
# 2. Generate JSON for each song
# 3. Save to blob-data/ directory

# Upload to Vercel Blob
npm run upload-to-blob

echo "✅ All songs uploaded!"
```

### Workflow 2: Update Songs for a New Movie Release

When a new movie is released:

```bash
# 1. Generate all songs for the new movie (API filters by category)
npm run generate-song-json -- --category="Movie:NewMovie"

# 2. Review generated files
ls -lh blob-data/*.json | tail -5

# 3. Upload to Vercel Blob (skips existing files)
npm run upload-to-blob

echo "✅ New movie songs uploaded!"
```

### Workflow 3: Update Songs for Popular Actor

```bash
# Generate recent songs for an actor
npm run generate-song-json -- --category="Actor:Thalapathy Vijay" --limit=20

# Upload new songs
npm run upload-to-blob
```

---

## 📊 How Fetching Works

### With Category Filter
```bash
npm run generate-song-json -- --category="Movie:Coolie - 2024"
```
- ✅ API fetches ONLY songs in that category (single request)
- ✅ Efficient - no pagination needed
- ✅ Fast - typically 5-20 songs per movie

### Without Category Filter (All Songs)
```bash
npm run generate-song-json
```
- 📄 API fetches ALL songs using pagination
- 📄 Fetches in batches of 150 songs per request
- 📄 Continues until all songs retrieved
- 📄 500ms delay between batches to avoid rate limiting

**Example output:**
```
📡 Fetching all songs from Blogger API...
   📄 Fetching all songs with pagination...
      Fetching batch: start-index=1
      ✅ Fetched 150 songs (total: 150)
      Fetching batch: start-index=151
      ✅ Fetched 150 songs (total: 300)
      Fetching batch: start-index=301
      ✅ Fetched 120 songs (total: 420)
      ✅ Last batch retrieved
   ✅ Total songs fetched: 420
```

### With Limit Flag
```bash
npm run generate-song-json -- --limit=10
```
- Fetches all songs (or category songs)
- Then generates JSON for first 10 only
- Useful for testing before full generation

---

## 📊 Usage Examples

### Example 1: New Movie Release
```bash
# Movie "Leo" just released with 5 songs
npm run generate-song-json -- --category="Movie:Leo"

# Upload to blob storage
npm run upload-to-blob
```

### Example 2: Complete Singer Discography
```bash
# Generate all songs by Sid Sriram
npm run generate-song-json -- --category="Singer:Sid Sriram"

# Upload all
npm run upload-to-blob
```

### Example 3: Selective Generation with Limit
```bash
# Get top 10 songs from a movie
npm run generate-song-json -- --category="Movie:Varisu" --limit=10

# Check what was generated
ls -lh blob-data/*.json | grep varisu

# Upload
npm run upload-to-blob
```

### Example 4: Generate by Music Director
```bash
# All songs composed by Yuvan Shankar Raja (limit to 50)
npm run generate-song-json -- --category="Music:Yuvan Shankar Raja" --limit=50

# Upload to blob
npm run upload-to-blob
```

---

## 🎯 Common Workflows

### Workflow 1: New Movie Release (Recommended)

```bash
# Step 1: Generate JSONs for the new movie (category filter - fast)
npm run generate-song-json -- --category="Movie:MovieName"

# Step 2: Verify files created
ls -lh blob-data/*.json | tail -10

# Step 3: Upload to Vercel Blob
npm run upload-to-blob

# Step 4: Deploy (if needed)
git add blob-data/
git commit -m "Add songs from MovieName"
git push
```

### Workflow 2: Bulk Update by Category

```bash
# Generate for multiple categories
npm run generate-song-json -- --category="Actor:Suriya" --limit=30
npm run generate-song-json -- --category="Actor:Vikram" --limit=30

# Upload all at once (skips existing)
npm run upload-to-blob
```

### Workflow 3: Generate Everything (Full Site)

**Use this for initial setup or complete refresh:**

```bash
# Generate ALL songs (uses pagination automatically)
npm run generate-song-json

# Expected behavior:
# - Fetches songs in batches of 150
# - Continues until all songs retrieved
# - Generates JSON for each song
# - Takes 5-15 minutes depending on total songs

# Upload all to Vercel Blob
npm run upload-to-blob
```

### Workflow 4: Test Before Full Generation

```bash
# Test with small limit first
npm run generate-song-json -- --limit=10

# Check what was generated
ls -lh blob-data/*.json | tail -10

# Test upload (dry-run)
npm run upload-to-blob:dry-run

# If all looks good, generate all
npm run generate-song-json

# Upload all
npm run upload-to-blob
```

---

## 🔍 Finding Category Names

Categories follow this format: `CategoryType:CategoryName`

**Common Category Types:**
- `Movie:` - Movie name (e.g., "Movie:Coolie - 2024")
- `Actor:` - Actor name (e.g., "Actor:Vijay")
- `Singer:` - Singer name (e.g., "Singer:Anirudh")
- `Music:` - Music director (e.g., "Music:AR Rahman")
- `Lyrics:` or `Lyricist:` - Lyricist name (e.g., "Lyrics:Vairamuthu")
- `Song:` - Specific song (not recommended for bulk generation)

**How to Find Categories:**
1. Go to your Blogger site
2. Check the categories/labels on any post
3. Copy the exact format including the prefix

---

## 🧪 Testing

```bash
# Test with one song
npm run generate-song-json:test

# Test category filter
npm run generate-song-json -- --category="Movie:TestMovie" --limit=1

# Verify output
cat blob-data/test-song.json | jq '.category'
```

---

## ⚡ Quick Reference

| Task | Command |
|------|---------|
| Test one song | `npm run generate-song-json:test` |
| By movie | `npm run generate-song-json -- --category="Movie:Name"` |
| By actor | `npm run generate-song-json -- --category="Actor:Name"` |
| By singer | `npm run generate-song-json -- --category="Singer:Name"` |
| Top 10 songs | `npm run generate-song-json -- --limit=10` |
| All songs | `npm run generate-song-json` |
| Upload | `npm run upload-to-blob` |
| Upload (dry run) | `npm run upload-to-blob:dry-run` |

---

## 💡 Pro Tips

1. **Use quotes for categories with spaces**: `--category="Movie:Leo - 2023"`
2. **Combine category + limit for testing**: `--category="Actor:Vijay" --limit=5`
3. **Category filter is fast**: Fetches only matching songs (5-20 songs typically)
4. **No category = pagination**: Fetches ALL songs in batches of 150
5. **Upload is smart**: Automatically skips existing files
6. **Use dry-run first**: Always test with `upload-to-blob:dry-run`
7. **Initial setup**: Run without category/limit to generate all songs
8. **Incremental updates**: Use category filter for new movie releases

---

## ⚡ Performance Notes

### Category Filtering (Recommended for incremental updates)
- **Speed**: Fast (single API request)
- **Use case**: New movie releases, specific actor songs
- **Example**: `--category="Movie:Leo"` → Fetches ~8 songs in 1 request

### Full Generation (Initial setup)
- **Speed**: Moderate (multiple API requests with pagination)
- **Use case**: Initial setup, complete refresh
- **Example**: `npm run generate-song-json` → Fetches all songs in batches of 150
- **Time estimate**: 5-15 minutes for 1000-4000 songs

### With Limit Flag
- **Speed**: Same as above (fetches all, limits generation)
- **Use case**: Testing, preview before full generation
- **Example**: `--limit=10` → Fetches all, generates 10 JSONs

---

**Last Updated:** January 9, 2026
