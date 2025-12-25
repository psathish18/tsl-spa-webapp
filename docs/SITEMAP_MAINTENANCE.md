# Sitemap Maintenance Guide

## Overview

The application uses a **paginated sitemap architecture** to efficiently manage thousands of song URLs while staying within Google's sitemap limits (50,000 URLs per file).

## Architecture

### Sitemap Index (`/sitemap.xml`)
- **Location**: `app/sitemap.ts`
- **Purpose**: Acts as an index pointing to paginated sitemap files
- **URLs**: Points to `sitemap/0.xml`, `sitemap/1.xml`, `sitemap/2.xml`, `sitemap/3.xml`
- **Capacity**: Currently configured for up to 4,000 songs
- **Revalidation**: Every 7 days (automatic) + on-demand when new posts detected

### Paginated Sitemaps (`/sitemap/[page].xml`)
- **Location**: `app/sitemap/[page]/route.ts`
- **Items per page**: 1,000 URLs
- **Data source**: Blogger API (`max-results=3000`)
- **Caching**: Three-layer system
  1. `cachedBloggerFetch` - Intelligent date-based cache
  2. Next.js ISR - 7-day cache
  3. **Auto-revalidation** - Instant updates when new posts detected

### Distribution

| Sitemap | Contains | Capacity |
|---------|----------|----------|
| `sitemap/0.xml` | Static pages (5) + Songs 0-999 | 1,005 URLs max |
| `sitemap/1.xml` | Songs 1,000-1,999 | 1,000 URLs max |
| `sitemap/2.xml` | Songs 2,000-2,999 | 1,000 URLs max |
| `sitemap/3.xml` | Songs 3,000-3,999 | 1,000 URLs max |

**Static pages included in sitemap/0.xml:**
- Home page (/)
- About (`/about-tamil-song-lyrics.html`)
- Privacy Policy (`/privacy-policy-tamil-song-lyrics-app.html`)
- Disclaimer (`/disclaimer.html`)
- English Translations (`/tamil-song-lyrics-in-english.html`)

## Caching Behavior

### Two-Layer Caching System

#### Layer 1: Date-Based Cache (`cachedBloggerFetch`)
Located in `lib/dateBasedCache.ts`

```typescript
// TTL based on post age
New posts (< 24 hours):  2 minutes TTL
Recent posts (< 7 days): 1 hour TTL
Older posts:             7 days TTL
```

#### Layer 2: Next.js ISR
```typescript
export const revalidate = 604800 // 7 days
```

#### Layer 3: Auto-Revalidation (NEW!)
The application now **automatically detects new posts** and revalidates the sitemap without manual intervention.

**How it works:**
1. Home page loads (`/`)
2. Fetches latest songs from Blogger API
3. Compares latest post ID with last known post (stored in cookie)
4. If new post detected → Triggers sitemap revalidation automatically
5. Updates tracking cookie for next comparison
6. **Cooldown**: 5 minutes between auto-revalidations to prevent excessive rebuilds

**Tracking mechanism:**
- `last-post-id` cookie: ID of the most recent post processed
- `last-revalidation` cookie: Timestamp of last auto-revalidation
- Both cookies expire after 30 days

### What Happens During Revalidation

1. **Automatic (Every 7 days - Fallback)**:
   - Next.js ISR cache expires after 7 days
   - Next request triggers background regeneration
   - New sitemap cached for another 7 days

2. **Auto-Detection (On New Posts - Primary Method)**:
   - Home page detects new post (different latest post ID)
   - Immediately clears all sitemap caches
   - Next request rebuilds fresh sitemap with new songs
   - Updates tracking cookies

3. **Manual (On-demand - Optional)**:
   - POST to `/api/revalidate-sitemap` with secret
   - Immediately clears all sitemap caches
   - Next request rebuilds fresh sitemap

## Manual Revalidation

### Endpoint
```
POST https://tsonglyrics.com/api/revalidate-sitemap
```

### Authentication
Requires secret token in header:
```bash
x-revalidate-secret: YOUR_SECRET_TOKEN
```

### Environment Variable
Set in `.env.local` and Vercel:
```bash
REVALIDATE_SECRET=your-secure-random-token
```

### Usage Example

**Test endpoint (GET):**
```bash
curl https://tsonglyrics.com/api/revalidate-sitemap
```

**Trigger revalidation (POST):**
```bash
curl -X POST https://tsonglyrics.com/api/revalidate-sitemap \
  -H "x-revalidate-secret: YOUR_SECRET_TOKEN"
```

**Response:**
```json
{
  "revalidated": true,
  "timestamp": "2025-12-25T14:08:23.544Z",
  "message": "Sitemap index, paginated sitemaps (0-3), and home page revalidated successfully"
}
```

### When to Use Manual Revalidation

✅ **Use when:**
- Need immediate sitemap update (can't wait for next home page visit)
- Testing sitemap changes
- Debugging revalidation issues
- Want to force update without cooldown

❌ **Don't need to use when:**
- Normal posting workflow (auto-revalidation handles this automatically)
- Making non-content changes (CSS, JS updates)
- Modifying existing song content (URLs remain same)

## Auto-Revalidation System

### How Auto-Revalidation Works

The application **automatically detects new posts** and revalidates the sitemap without any manual intervention:

```
1. User visits home page (/)
2. Page fetches latest songs from Blogger API
3. Compares latest post ID with last known post (cookie)
4. If new post detected AND cooldown expired:
   ✅ Triggers sitemap revalidation
   ✅ Updates tracking cookies
   ✅ Logs event to console
5. If no new post OR cooldown active:
   ⏭️ Skips revalidation
```

### Benefits

✅ **Zero manual work** - No need to trigger revalidation after posting  
✅ **Instant detection** - New posts discovered on next home page visit  
✅ **Efficient** - Only revalidates when actual new content exists  
✅ **Rate limited** - 5-minute cooldown prevents excessive API calls  
✅ **Reliable** - Works as long as someone visits your home page  
✅ **SEO optimized** - Google discovers new content immediately on next crawl  

### Workflow Comparison

**Old workflow (Manual):**
1. Post song to Blogger ✅
2. Manually trigger revalidation endpoint ❌ (Extra step!)
3. Wait for sitemap update

**New workflow (Automatic):**
1. Post song to Blogger ✅
2. ~~Manually trigger revalidation~~ (automatic!) 🎉
3. Done! Next visitor triggers update automatically ✅

### Monitoring Auto-Revalidation

**Check Vercel/Server logs for:**
```
🎵 New song detected! Auto-revalidating sitemap...
   Previous post: tag:blogger.com,1999:blog-123.post-456
   New post: tag:blogger.com,1999:blog-123.post-789
   Title: Ennamo Nadakkirathe Song Lyrics
✅ Sitemap auto-revalidation completed successfully

🔄 Home page triggered sitemap revalidation: {
  newPost: 'Ennamo Nadakkirathe Song Lyrics',
  timestamp: '2025-12-25T14:30:00.000Z'
}
```

**During cooldown period:**
```
⏳ Sitemap revalidation cooldown active: 180s remaining
```

### Auto-Revalidation Triggers

**Triggers automatically when:**
- ✅ New song posted to Blogger
- ✅ Home page loaded by any visitor
- ✅ Latest post ID differs from last known post
- ✅ Cooldown period expired (5 minutes)

**Does NOT trigger when:**
- ❌ Same latest post (no new content)
- ❌ Cooldown period active (<5 minutes since last revalidation)
- ❌ Home page not loaded (but 7-day fallback handles this)

### Configuration

**Adjust cooldown period** in `lib/sitemapAutoRevalidate.ts`:
```typescript
const REVALIDATION_COOLDOWN = 5 * 60 * 1000 // 5 minutes (default)
// Change to 10 minutes: 10 * 60 * 1000
// Change to 1 minute: 1 * 60 * 1000
```

**Cookie settings:**
- Cookie names: `last-post-id`, `last-revalidation`
- Expiration: 30 days (automatically refreshed)
- Path: `/` (site-wide)
- SameSite: `lax` (secure)

### Triple-Layer Freshness Guarantee

Your sitemap stays fresh with three complementary mechanisms:

1. **Auto-revalidation** (Primary): On new post detection → Instant update
2. **Manual revalidation** (Optional): When you trigger it → Immediate update
3. **7-day ISR** (Fallback): Automatic weekly refresh → Backup safety net

This ensures your sitemap is always up-to-date, even if:
- No one visits the home page for days
- Auto-revalidation fails for some reason
- Cookies are cleared or expired

## Scaling Guide

### Current Capacity
- **Configured for**: 4,000 songs (4 sitemaps × 1,000 URLs)
- **Current usage**: ~150 songs
- **Plenty of room**: Can add 3,850+ more songs without changes

### When You Exceed 4,000 Songs

#### Step 1: Update Sitemap Index (`app/sitemap.ts`)

Add more sitemap entries:
```typescript
const sitemapIndexes: MetadataRoute.Sitemap = [
  { url: `${BASE_URL}/sitemap/0.xml`, lastModified: new Date() },
  { url: `${BASE_URL}/sitemap/1.xml`, lastModified: new Date() },
  { url: `${BASE_URL}/sitemap/2.xml`, lastModified: new Date() },
  { url: `${BASE_URL}/sitemap/3.xml`, lastModified: new Date() },
  { url: `${BASE_URL}/sitemap/4.xml`, lastModified: new Date() }, // Add this
  { url: `${BASE_URL}/sitemap/5.xml`, lastModified: new Date() }, // And this
  // Add more as needed
]
```

#### Step 2: Update Revalidation Loop (`app/api/revalidate-sitemap/route.ts`)

```typescript
// Change from 3 to match your max page number
for (let i = 0; i <= 5; i++) {  // Updated from 3 to 5
  revalidatePath(`/sitemap/${i}.xml`)
}
```

#### Step 3: Update Blogger API Limit

If you exceed 3,000 songs, increase `max-results`:
```typescript
// In app/sitemap/[page]/route.ts
const data = await cachedBloggerFetch(
  'https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&max-results=5000',
  { next: { revalidate: 86400 } }
)
```

**Note**: Blogger API has practical limits. Consider alternative strategies for 10,000+ songs.

### Sitemap Limits (Google Guidelines)

| Limit Type | Value | Your Status |
|------------|-------|-------------|
| Max URLs per sitemap | 50,000 | ✅ 1,000 per file |
| Max file size | 50 MB | ✅ ~100 KB per file |
| Max sitemap index files | No limit | ✅ 1 index file |
| Recommended URLs per file | 10,000-25,000 | ✅ 1,000 (conservative) |

## Google Search Console Setup

### Submission

1. Go to Google Search Console
2. Navigate to **Sitemaps** section
3. Submit: `https://tsonglyrics.com/sitemap.xml`
4. Google automatically discovers paginated sitemaps

**Do NOT submit individual paginated sitemaps** - the index handles this.

### Monitoring

Check these metrics regularly:
- **Discovered URLs**: Should match your total songs + static pages
- **Coverage errors**: Should be 0 (or minimal)
- **Last read date**: Should update within 24-48 hours of changes

### Troubleshooting

**Issue**: Sitemap not updating in GSC
- **Solution**: Trigger manual revalidation, wait 24-48 hours

**Issue**: 404 errors on song URLs
- **Solution**: Check WordPress redirects in `next.config.js`

**Issue**: Duplicate content warnings
- **Solution**: Verify canonical URLs in page metadata

## Robots.txt Configuration

**Location**: `public/robots.txt`

```txt
# Allow all crawlers
User-agent: *
Allow: /

# Sitemap location (points to index)
Sitemap: https://tsonglyrics.com/sitemap.xml

# Block unnecessary paths
Disallow: /api/
Disallow: /_next/
Disallow: /admin/
```

The sitemap URL in robots.txt should always point to the **index** (`/sitemap.xml`), not individual paginated files.

## Performance Considerations

### Response Times

| Scenario | Response Time | Notes |
|----------|---------------|-------|
| Cached sitemap | ~1-5ms | Served from Next.js cache |
| First request after revalidation | ~500-2000ms | Rebuilds from Blogger API |
| Blogger API down | ~50ms | Returns fallback static pages |

### Optimization Tips

1. **Keep revalidation at 24 hours** - Good balance between freshness and performance
2. **Use manual revalidation sparingly** - Only when immediate update needed
3. **Monitor Blogger API quotas** - 3,000 requests/day typical limit
4. **Batch song posts** - Post multiple songs, then trigger one revalidation

## Maintenance Checklist

### Weekly
- [ ] Check Google Search Console for coverage errors
- [ ] Verify sitemap accessible at `/sitemap.xml`
- [ ] Monitor total URL count

### Monthly
- [ ] Review sitemap capacity (current vs. max)
- [ ] Check for 404 errors in GSC
- [ ] Verify canonical URLs are correct

### When Posting New Songs
- [ ] Post song(s) to Blogger
- [ ] Wait 2-5 minutes (for Blogger indexing)
- [ ] Trigger manual revalidation (optional)
- [ ] Verify new songs appear in sitemap/0.xml (if <1000 total)

### When Approaching Capacity
- [ ] Monitor song count approaching 1,000, 2,000, 3,000, 4,000
- [ ] Plan to add new sitemap pages if approaching 4,000
- [ ] Test pagination before reaching limits

## Troubleshooting

### Sitemap Returns Empty

**Symptoms**: `sitemap.xml` or `sitemap/[page].xml` returns no URLs

**Possible Causes**:
1. Blogger API error
2. Cache corruption
3. Network timeout

**Solution**:
```bash
# Clear cache and revalidate
curl -X POST http://localhost:3000/api/revalidate-sitemap \
  -H "x-revalidate-secret: YOUR_SECRET"
```

### New Songs Not Appearing

**Symptoms**: Posted new songs but not in sitemap

**Checklist**:
1. ✅ Song published in Blogger (not draft)
2. ✅ Song has `Song:` or `OldSong:` category
3. ✅ Wait 2-5 minutes for Blogger indexing
4. ✅ Trigger manual revalidation
5. ✅ Check if cache expired (24 hours)

### Pagination Not Working

**Symptoms**: All songs in sitemap/0.xml, others empty

**This is normal** if you have <1,000 total songs.

**If you have >1,000 songs**:
1. Check `ITEMS_PER_SITEMAP` constant (should be 1000)
2. Verify pagination logic in `app/sitemap/[page]/route.ts`
3. Test with: `curl http://localhost:3000/sitemap/1.xml`

### Revalidation Not Working

**Symptoms**: POST returns success but sitemap unchanged

**Debug steps**:
1. Verify `REVALIDATE_SECRET` environment variable set
2. Check token matches in request header
3. Look for errors in Vercel logs
4. Test locally first: `npm run dev`

## File Structure

```
app/
├── sitemap.ts                          # Sitemap index (main entry)
├── sitemap/
│   └── [page]/
│       └── route.ts                    # Paginated sitemap generator
└── api/
    └── revalidate-sitemap/
        └── route.ts                    # Manual revalidation endpoint

public/
└── robots.txt                          # Points to sitemap index

lib/
└── dateBasedCache.ts                   # Intelligent caching layer

.env.local
└── REVALIDATE_SECRET=your-token        # Secret for revalidation
```

## Related Documentation

- [Next.js Sitemap Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Google Sitemap Guidelines](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Vercel ISR Documentation](https://vercel.com/docs/incremental-static-regeneration)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-25 | Initial paginated sitemap implementation |

---

**Last Updated**: December 25, 2025  
**Maintained By**: TSongLyrics Team
