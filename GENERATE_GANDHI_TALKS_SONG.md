# Generate JSON for Song: Yetho Yetho - Gandhi Talks

## Quick Command

To generate the JSON file for the song "Yetho Yetho - Gandhi Talks", run the following command in your local environment (with internet access):

**Option 1: Using npm command directly**
```bash
npm run generate-song-json -- --category="Song:Yetho Yetho - Gandhi Talks"
```

**Option 2: Using helper script**
```bash
# Make sure the script is executable (only needed once)
chmod +x scripts/generate-specific-song.sh

# Run the script
./scripts/generate-specific-song.sh "Song:Yetho Yetho - Gandhi Talks"
```

## What This Does

1. Fetches the song data from Blogger API for the category "Song:Yetho Yetho - Gandhi Talks"
2. Processes the lyrics, metadata, and related information
3. Generates a JSON file in the `blob-data/` directory
4. The filename will be based on the song's slug (e.g., `yetho-yetho-gandhi-talks-lyrics.json`)

## Expected Output

The command will:
- Fetch the song from: `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/Song:Yetho%20Yetho%20-%20Gandhi%20Talks?alt=json`
- Generate a JSON file with the following structure:
  - Song metadata (title, movie, singer, lyricist, music director, actor)
  - Lyrics stanzas (both Tanglish and Tamil if available)
  - Related songs from the same movie
  - SEO metadata
  - Thumbnail image

## After Generation

Once the JSON file is generated:

1. Verify the file was created:
   ```bash
   ls -lh blob-data/*.json | grep gandhi
   ```

2. Upload to Vercel Blob (if needed):
   ```bash
   npm run upload-to-blob
   ```

3. Commit the changes:
   ```bash
   git add blob-data/
   git commit -m "Add JSON for Song: Yetho Yetho - Gandhi Talks"
   git push
   ```

## Troubleshooting

If the command fails:
- Ensure you have internet access
- Verify the song is published on Blogger with the exact category "Song:Yetho Yetho - Gandhi Talks"
- Check that dependencies are installed: `npm install`
- Verify the Blogger API is accessible: try opening `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/Song:Yetho%20Yetho%20-%20Gandhi%20Talks?alt=json` in your browser

## Alternative: Generate with Limit

If you want to also generate other songs along with this one:

```bash
# Generate this song plus others in the same category/timeframe
npm run generate-song-json -- --category="Movie:Gandhi Talks" --limit=10
```

---

**Note:** This command must be run in an environment with access to the Blogger API (tsonglyricsapp.blogspot.com). The sandboxed CI/CD environment does not have access to external APIs for security reasons.
