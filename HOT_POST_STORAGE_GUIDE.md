# Hot Post Configuration Guide

## How to Store and Retrieve Post Details

### Storage Options

#### Option 1: Static JSON File (Current Implementation) ✅
**Location:** `/public/hot-post.json`

**Pros:**
- ✅ Zero server/edge requests (CDN cached)
- ✅ Simple to update (just edit JSON file)
- ✅ Fast loading (static asset)
- ✅ No database needed
- ✅ Works within Vercel Hobby plan limits

**Cons:**
- ⚠️ Requires deployment to update
- ⚠️ No real-time updates

**Example:**
```json
{
  "enabled": true,
  "slug": "uyirnaadi-nanbane-lyrics-tamil",
  "title": "Uyirnaadi Nanbane Lyrics Tamil - Coolie",
  "movieName": "Coolie",
  "singerName": "Anirudh, Sai Smriti"
}
```

**Update Process:**
1. Edit `/public/hot-post.json`
2. Commit and push changes
3. Vercel automatically deploys
4. CDN serves updated file

---

#### Option 2: Vercel Blob Storage (Alternative)
**Implementation:** Store hot post config in Vercel Blob

**Pros:**
- ✅ Update without deployment
- ✅ Can be updated via API
- ✅ CDN cached

**Cons:**
- ⚠️ Additional API calls
- ⚠️ More complex setup
- ⚠️ May impact Hobby plan limits

**Example Implementation:**
```typescript
// Upload to blob
await put('hot-post.json', JSON.stringify(config), {
  access: 'public',
  addRandomSuffix: false,
});

// Client-side fetch
const response = await fetch('https://[blob-url]/hot-post.json');
```

---

#### Option 3: Environment Variables
**Implementation:** Store slug in environment variable

**Pros:**
- ✅ Simple configuration
- ✅ No extra files

**Cons:**
- ⚠️ Requires rebuild to update
- ⚠️ Limited flexibility
- ⚠️ Not recommended for frequent changes

---

#### Option 4: Existing Songs JSON (Recommended for Dynamic Selection)
**Implementation:** Pick a song from existing `/public/songs/*.json` files

**Pros:**
- ✅ No additional storage needed
- ✅ Reuses existing data
- ✅ Can implement smart selection (latest, trending, random)

**Example:**
```typescript
// Read from existing song JSON
const slug = 'uyirnaadi-nanbane-lyrics-tamil';
const song = await fetch(`/songs/${slug}.json`).then(r => r.json());

// Display in overlay
{
  slug: song.slug,
  title: song.title,
  movieName: song.movieName,
  singerName: song.singerName
}
```

---

### Recommendation

**Current Implementation (Option 1)** is best for your requirements because:

1. **Client-Side Only:** No server/edge requests (meets strict requirement)
2. **Vercel Hobby Friendly:** Static files don't count toward function invocations
3. **CDN Optimized:** Cached globally for fast loading
4. **Simple Updates:** Edit one file and deploy
5. **No Database:** Works within hobby plan limits

### Manual Update Workflow

1. **Identify Hot Post:**
   - Choose a trending song from `/public/songs/` directory
   - Note the slug (filename without .json)

2. **Update Configuration:**
   ```bash
   # Edit /public/hot-post.json
   {
     "enabled": true,
     "slug": "new-song-slug",
     "title": "New Song Title Lyrics",
     "movieName": "Movie Name",
     "singerName": "Singer Name"
   }
   ```

3. **Deploy:**
   ```bash
   git add public/hot-post.json
   git commit -m "Update hot post: New Song Title"
   git push
   ```

4. **Verify:**
   - Visit your site after deployment
   - Check bottom overlay shows new song
   - Test click navigation

### Automated Selection (Future Enhancement)

For automatic hot post rotation, you could:

1. **Create a selection script:**
   ```bash
   # scripts/select-hot-post.js
   # - Read all songs from /public/songs/
   # - Pick latest or most viewed
   # - Update /public/hot-post.json
   ```

2. **Run via GitHub Actions:**
   ```yaml
   # .github/workflows/update-hot-post.yml
   # - Trigger daily or on new song addition
   # - Auto-commit and deploy
   ```

3. **Smart Selection Criteria:**
   - Latest published song
   - Most shared on social media
   - Trending based on page views
   - Featured by admin

### Browser Caching

The static JSON file benefits from:
- **CDN Caching:** Edge locations serve file
- **Browser Caching:** Cached for 1 hour (configurable)
- **Instant Updates:** New deployments purge CDN cache

### Cost Considerations

Using static JSON file:
- ✅ Free: Included in Vercel Hobby plan
- ✅ No bandwidth charges (static assets)
- ✅ No function invocations
- ✅ No database costs

Total cost: **$0** (within Hobby plan limits)
