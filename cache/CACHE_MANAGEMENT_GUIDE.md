# Cache Management Gui### Age-based TTL Algorithm (Optimized for Song Lyrics)

1. **Very Fresh Content (< 6 hours)**: 2-minute cache
   - New songs that might get immediate typo fixes
   - High responsiveness for corrections

2. **Same-day Content (6-24 hours)**: 10-minute cache
   - Initial feedback and corrections period
   - Balanced responsiveness

3. **3-day Content (1-3 days)**: 1-hour cache
   - Quality improvements and final adjustments
   - Lower update frequency

4. **Week-old Content (3-7 days)**: 6-hour cache
   - Content stabilizing period
   - Rare updates expected

5. **Month-old Content (1-4 weeks)**: 24-hour cache
   - Stable content phase
   - Very rare updates

6. **Permanent Content (> 1 month)**: **7-day cache**
   - **Lyrics are immutable after this point**
   - **Maximum performance optimization**
   - **95%+ API call reduction for old content**telligent Caching System Works

### Automatic Cache Decision Making

Yes, our caching system **automatically decides cache TTL based on content publication date**:

```javascript
// Date-based TTL calculation
function calculateDateBasedTTL(publishedDate) {
  const now = new Date();
  const published = new Date(publishedDate);
  const ageInHours = (now - published) / (1000 * 60 * 60);
  
  if (ageInHours < 24) return 5 * 60;        // 5 minutes for very recent content
  if (ageInHours < 168) return 30 * 60;      // 30 minutes for week-old content
  if (ageInHours < 720) return 2 * 60 * 60;  // 2 hours for month-old content
  return 24 * 60 * 60;                       // 24 hours for older content
}
```

### Cache Decision Logic

1. **Recent Content (< 24 hours)**: 5-minute cache
   - New songs that might get frequent updates
   - High user interest, needs fresh data

2. **Week-old Content (1-7 days)**: 30-minute cache
   - Moderate traffic, occasional updates
   - Balance between performance and freshness

3. **Month-old Content (1-4 weeks)**: 2-hour cache
   - Stable content, fewer updates expected
   - Performance optimization focus

4. **Older Content (> 1 month)**: 24-hour cache
   - Very stable content, rarely changes
   - Maximum performance optimization

## Manual Cache Management

### Understanding the Cache Layers

**🚨 IMPORTANT**: We have THREE cache layers in the hybrid CDN architecture:

1. **Application Cache** (in-memory, date-based TTL)
2. **CDN Static Files** (`/public/songs/*.json` - served by Vercel CDN)
3. **API Route Cache** (`/api/songs/*` - Next.js cache + Vercel CDN)
4. **Vercel CDN Cache** (global edge locations for all assets)

**They are INDEPENDENT!** Clearing one does NOT automatically clear the others.

### 1. Cache Statistics and Monitoring

Check current cache status:
```bash
curl http://localhost:3000/api/cache-stats
```

**Response includes:**
- Total cached items
- Cache hit/miss rates
- Memory usage
- Detailed cache contents
- Management links
- **Vercel CDN integration notes**

### 2. Clear Application Cache (Normal Operations)

Remove all our application cached data:
```bash
curl -X DELETE "http://localhost:3000/api/cache-clear?action=all"
```

**Result**: ✅ Clears our app cache, Vercel CDN refreshes naturally

### 3. Clear Hybrid CDN Caches (NEW - For Song Updates)

#### 3a. Clear All Caches for a Song (Recommended after updates)
```bash
# Clear page + CDN static file + API route caches
curl "https://tsonglyrics.com/api/revalidate?secret=YOUR_SECRET&path=/monica-coolie-lyrics.html&type=all"
```

**Result**: ✅ Clears all three cache layers for this song

#### 3b. Clear Only CDN Static File Cache
```bash
# After updating /public/songs/*.json files
curl "https://tsonglyrics.com/api/revalidate?secret=YOUR_SECRET&path=/monica-coolie-lyrics.html&type=cdn"
```

**Result**: ✅ Clears `/songs/monica-coolie-lyrics.json` cache only

#### 3c. Clear Only API Route Cache
```bash
# After updating blob storage
curl "https://tsonglyrics.com/api/revalidate?secret=YOUR_SECRET&path=/monica-coolie-lyrics.html&type=api"
```

**Result**: ✅ Clears `/api/songs/monica-coolie-lyrics` cache only

#### 3d. Clear Only Page Cache
```bash
# For page-specific updates
curl "https://tsonglyrics.com/api/revalidate?secret=YOUR_SECRET&path=/monica-coolie-lyrics.html&type=page"
```

**Result**: ✅ Clears song page HTML cache only

### 4. Clear Vercel CDN (Emergency Only)

For immediate global cache clearing:
```bash
# Using Vercel CLI
vercel --prod --scope your-team

# Or via API (if configured)
curl -X PURGE "https://your-app.vercel.app/" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

**Result**: ✅ Immediate global cache clear, but impacts performance

### 5. Clear Homepage and Category Caches

```bash
# Clear homepage
curl "https://tsonglyrics.com/api/revalidate?secret=YOUR_SECRET&path=/home"

# Clear category page
curl -X POST "https://tsonglyrics.com/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_SECRET","path":"/","clearAll":false}'
```

### 6. Clear Multiple Songs Cache

Remove cache for all songs:
```bash
curl -X DELETE "http://localhost:3000/api/cache-clear?action=songs"
```

### 7. Pattern-based Cache Clearing

Remove cache entries matching a pattern:
```bash
# Clear all Coolie movie songs
curl -X DELETE "http://localhost:3000/api/cache-clear?action=pattern&pattern=*Coolie*"

# Clear all song lists
curl -X DELETE "http://localhost:3000/api/cache-clear?action=pattern&pattern=songs_*"
```

### 8. Force Refresh Specific URL

Force refresh and update cache for a specific endpoint:
```bash
curl -X DELETE "http://localhost:3000/api/cache-clear?action=url&url=https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json%26max-results=50"
```

## Revalidation API Reference (Hybrid CDN)

### Endpoint: `/api/revalidate`

**Methods:** `GET` or `POST`

**Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `secret` | string | ✅ Yes | Revalidation secret token | From `REVALIDATE_SECRET` env |
| `path` | string | One of path/tag | Path to revalidate | `/monica-coolie-lyrics.html` |
| `tag` | string | One of path/tag | Cache tag to revalidate | `song-monica-coolie-lyrics` |
| `type` | string | No | Cache layer to clear | `all` (default), `page`, `cdn`, `api` |
| `clearAll` | boolean | No | Clear all caches | `true` or `false` |

**Type Options:**
- `page` - Clear song page HTML cache only
- `cdn` - Clear CDN static file (`/songs/*.json`) only
- `api` - Clear API route (`/api/songs/*`) only  
- `all` - Clear all three caches (default)

**GET Examples:**
```bash
# Clear all caches for a song
curl "https://tsonglyrics.com/api/revalidate?secret=SECRET&path=/song.html&type=all"

# Clear only CDN cache
curl "https://tsonglyrics.com/api/revalidate?secret=SECRET&path=/song.html&type=cdn"

# Clear by tag
curl "https://tsonglyrics.com/api/revalidate?secret=SECRET&tag=song-slug"

# Clear everything
curl "https://tsonglyrics.com/api/revalidate?secret=SECRET&clearAll=true"
```

**POST Examples:**
```bash
# Clear all caches for a song
curl -X POST "https://tsonglyrics.com/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"SECRET","path":"/song.html","type":"all"}'

# Clear only API cache
curl -X POST "https://tsonglyrics.com/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"SECRET","path":"/song.html","type":"api"}'
```

**Response:**
```json
{
  "revalidated": true,
  "type": "all",
  "path": "/monica-coolie-lyrics.html",
  "results": [
    "Cleared song page cache: monica-coolie-lyrics",
    "Cleared CDN static file: /songs/monica-coolie-lyrics.json",
    "Cleared API route: /api/songs/monica-coolie-lyrics"
  ],
  "now": 1704988800000
}
```

## Cache Clear API Reference (Legacy)

### Endpoint: `/api/cache-clear`

**Method:** `DELETE`

**Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `action` | string | Type of cache operation | `all`, `pattern`, `song`, `songs`, `url` |
| `pattern` | string | Pattern for pattern-based clearing | `*Coolie*`, `songs_*` |
| `category` | string | Song category for specific song clearing | `Song:Monica%20-%20Coolie` |
| `url` | string | Specific URL to refresh | Full blogger API URL |

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully",
  "action": "all",
  "clearedKeys": ["songs_list", "song_Monica - Coolie"],
  "remainingKeys": []
}
```

## Content Management Scenarios

### Scenario 1: Update Existing Song in CDN (RECOMMENDED)
```bash
# Step 1: Update JSON file locally
npm run generate-song-json -- --category="Movie:Coolie" --limit=1

# Step 2: Copy to /public/songs
cp blob-data/monica-coolie-lyrics.json public/songs/

# Step 3: Deploy (auto-clears CDN cache)
git add public/songs/monica-coolie-lyrics.json
git commit -m "Update Monica lyrics"
git push

# Step 4: Clear page cache for immediate effect (optional)
curl "https://tsonglyrics.com/api/revalidate?secret=SECRET&path=/monica-coolie-lyrics.html&type=page"
```
**Result**: ✅ Updated content live in 2-3 minutes, zero cost forever

### Scenario 2: Add New Song via Blob Storage (RECOMMENDED)
```bash
# Step 1: Generate JSON
npm run generate-song-json -- --category="Song:NewSong"

# Step 2: Upload to blob
npm run upload-to-blob

# Step 3: Clear API cache (forces refetch from blob)
curl "https://tsonglyrics.com/api/revalidate?secret=SECRET&path=/new-song-lyrics.html&type=api"
```
**Result**: ✅ Song instantly available, will be CDN cached after first request

### Scenario 3: Emergency Content Update (USE SPARINGLY)
```bash
# Step 1: Clear all caches for the song
curl "https://tsonglyrics.com/api/revalidate?secret=SECRET&path=/urgent-song.html&type=all"

# Step 2: If needed, clear all site caches
curl "https://tsonglyrics.com/api/revalidate?secret=SECRET&clearAll=true"
```
**Result**: ✅ Immediate effect, next request fetches fresh data

### Scenario 4: Weekly Batch Update (AUTOMATED)
```bash
# Step 1: Generate all new songs
npm run generate-song-json

# Step 2: Move to CDN
cp blob-data/*.json public/songs/

# Step 3: Deploy once
git add public/songs
git commit -m "Weekly CDN update"
git push

# No cache clearing needed - deployment handles it
```
**Result**: ✅ All new songs on CDN, zero cost, automated

### Scenario 5: Song Lyrics Updated (RECOMMENDED - Legacy)
```bash
# Clear specific song from our application cache
curl -X DELETE "http://localhost:3000/api/cache-clear?action=song&category=Song:Updated%20Song%20Title"

# Vercel CDN refreshes automatically on next request
```
**Result**: ✅ Updated content appears quickly, no performance impact

### Scenario 6: Performance Issues
```bash
# Check our cache statistics first
curl http://localhost:3000/api/cache-stats

# Then clear problematic patterns from our cache
curl -X DELETE "http://localhost:3000/api/cache-clear?action=pattern&pattern=*problematic_pattern*"

# CDN will refresh naturally
```

## Cache Management in Code

### Using the Cache Management Functions

```javascript
import { clearByPattern, clearSong, clearAllSongs, forceRefresh } from '@/lib/dateBasedCache';

// Clear by pattern
await clearByPattern('*Coolie*');

// Clear specific song
await clearSong('Song:Monica - Coolie');

// Clear all songs
await clearAllSongs();

// Force refresh a URL
await forceRefresh('https://api-url.com');
```

### Cache Statistics

```javascript
import { getCacheStats, getDetailedContents } from '@/lib/dateBasedCache';

// Get basic stats
const stats = getCacheStats();

// Get detailed contents for debugging
const contents = getDetailedContents();
```

## Best Practices

### 1. Regular Monitoring
- Check `/api/cache-stats` regularly
- Monitor hit/miss ratios
- Watch for memory usage patterns

### 2. Strategic Clearing
- Use pattern-based clearing for related content
- Clear specific songs after updates
- Avoid clearing all cache unless necessary

### 3. Performance Optimization
- Let automatic TTL handle most scenarios
- Use manual clearing for immediate updates
- Consider user impact when clearing cache

### 4. Content Publishing Workflow
1. Post new content to Blogger
2. Clear relevant cache patterns
3. Verify new content appears
4. Monitor cache performance

### 5. Emergency Procedures
- Keep cache clearing commands ready
- Have monitoring alerts set up
- Document clearing patterns for team use

## Cache Architecture Summary

### Complete Vercel Integration Stack

```
👤 USER REQUEST
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│              🌐 VERCEL EDGE CDN (Global)                       │
│  ┌─────────────────────────────────────────────────────────────┤
│  │ • 100+ global edge locations                               │
│  │ • Respects our Cache-Control headers                       │  
│  │ • s-maxage=300, stale-while-revalidate=3600               │
│  │ • Vercel-CDN-Cache-Control: max-age=1800                  │
│  │ • Geographic user distribution                             │
│  └─────────────────────────────────────────────────────────────┤
└─────────────────────────┬───────────────────────────────────────┘
                          │ (Cache Miss / Stale)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│        ⚡ VERCEL SERVERLESS FUNCTIONS (Regional)               │
│  ┌─────────────────────────────────────────────────────────────┤
│  │ • Edge Runtime (our API routes)                            │
│  │ • Next.js ISR (Incremental Static Regeneration)           │
│  │ • Static page generation                                   │
│  │ • Geographic optimization                                  │
│  └─────────────────────────────────────────────────────────────┤
└─────────────────────────┬───────────────────────────────────────┘
                          │ (Cache Miss)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│          🧠 OUR DATE-BASED CACHE (Application Memory)          │
│  ┌─────────────────────────────────────────────────────────────┤
│  │ • Intelligent TTL: 5min → 24hr based on content age       │
│  │ • Manual clearing via /api/cache-clear                    │
│  │ • Pattern-based management                                 │
│  │ • Statistics and monitoring                                │
│  │ • LRU eviction for memory management                      │
│  └─────────────────────────────────────────────────────────────┤
└─────────────────────────┬───────────────────────────────────────┘
                          │ (Cache Miss)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                📡 EXTERNAL API (Blogger)                       │
│                 • Source of truth                              │
│                 • Always fresh data                            │
│                 • Rate limiting applies                        │
└─────────────────────────────────────────────────────────────────┘
```

### Cache Header Strategy

Our API responses include optimized headers for Vercel CDN:

```javascript
// Response headers from our API
'Cache-Control': 's-maxage=300, stale-while-revalidate=3600'
'CDN-Cache-Control': 'max-age=300'  
'Vercel-CDN-Cache-Control': 'max-age=1800'
'X-Cache-Layer': 'Application + Vercel CDN'
'X-Cache-Strategy': 'stale-while-revalidate'
```

**What this means:**
- **CDN caches for 5 minutes** (300s)
- **Serves stale content** while fetching fresh data in background
- **Extended CDN cache** up to 30 minutes (1800s) 
- **Smooth user experience** with background updates

## Monitoring Dashboard (Future Enhancement)

Consider building a dashboard with:
- Real-time cache statistics
- Performance metrics
- One-click cache management
- Usage analytics
- Automated alerts

This completes the cache management system with both automatic intelligence and comprehensive manual control capabilities.
