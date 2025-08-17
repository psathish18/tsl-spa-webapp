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

### Understanding the Two-Layer System

**🚨 IMPORTANT**: We have TWO separate cache layers:

1. **Our Application Cache** (in-memory, date-based TTL)
2. **Vercel CDN Cache** (global edge locations)

**They are INDEPENDENT!** Clearing one does NOT clear the other.

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

### 3. Clear Vercel CDN (Emergency Only)

For immediate global cache clearing:
```bash
# Using Vercel CLI
vercel --prod --scope your-team

# Or via API (if configured)
curl -X PURGE "https://your-app.vercel.app/" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

**Result**: ✅ Immediate global cache clear, but impacts performance

### 4. Clear Multiple Songs Cache

Remove cache for all songs:
```bash
curl -X DELETE "http://localhost:3000/api/cache-clear?action=songs"
```

### 5. Pattern-based Cache Clearing

Remove cache entries matching a pattern:
```bash
# Clear all Coolie movie songs
curl -X DELETE "http://localhost:3000/api/cache-clear?action=pattern&pattern=*Coolie*"

# Clear all song lists
curl -X DELETE "http://localhost:3000/api/cache-clear?action=pattern&pattern=songs_*"
```

### 6. Force Refresh Specific URL

Force refresh and update cache for a specific endpoint:
```bash
curl -X DELETE "http://localhost:3000/api/cache-clear?action=url&url=https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json%26max-results=50"
```

## Cache Management API Reference

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

### Scenario 1: New Song Posted (RECOMMENDED)
```bash
# Step 1: Clear our application cache only
curl -X DELETE "http://localhost:3000/api/cache-clear?action=pattern&pattern=*songs*"

# Step 2: Let Vercel CDN refresh naturally (via stale-while-revalidate)
# No manual action needed - happens automatically on next request
```
**Result**: ✅ Smooth user experience, background refresh

### Scenario 2: Song Lyrics Updated (RECOMMENDED)
```bash
# Clear specific song from our application cache
curl -X DELETE "http://localhost:3000/api/cache-clear?action=song&category=Song:Updated%20Song%20Title"

# Vercel CDN refreshes automatically on next request
```
**Result**: ✅ Updated content appears quickly, no performance impact

### Scenario 3: Emergency Content Update (USE SPARINGLY)
```bash
# Step 1: Clear our application cache
curl -X DELETE "http://localhost:3000/api/cache-clear?action=all"

# Step 2: Force clear Vercel CDN
vercel --prod --scope your-team
```
**Result**: ✅ Immediate global effect, ⚠️ temporary performance impact

### Scenario 4: Performance Issues
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
