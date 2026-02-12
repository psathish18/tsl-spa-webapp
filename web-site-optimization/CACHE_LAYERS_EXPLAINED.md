# Cache Configuration Explained

**Last Updated**: 2026-02-06  
**Purpose**: Clarify cache layer interactions (API vs CDN vs ISR)

---

## Your Question: "Would vercel.json cache affect API-level cache?"

**Short Answer**: No, they work at different layers and complement each other.

---

## 🎯 How Caching Works in Your App

### Layer 1: Next.js ISR (Server-Side Cache)
**Location**: Page-level code
```typescript
// app/[slug]/page.tsx
export const revalidate = REVALIDATE_SONG_PAGE // 30 days = 2,592,000 seconds
```

**What it does**:
- Next.js **regenerates the page** every 30 days on the server
- First request after 30 days → triggers regeneration
- Subsequent requests → serve cached page until next 30-day mark
- This is **ISR (Incremental Static Regeneration)**

**Cache location**: Next.js server / Vercel Functions

---

### Layer 2: Blogger API Fetch Cache (Data Fetch Cache)
**Location**: Inside page during render
```typescript
// app/[slug]/page.tsx
const data = await cachedBloggerFetch(url, {
  next: {
    revalidate: REVALIDATE_BLOGGER_FETCH, // 30 days
    tags: [`song-${cleanSlug}`]
  }
});
```

**What it does**:
- Caches the **Blogger API response** for 30 days
- When page regenerates, it checks this cache first
- Reduces external API calls to Blogger
- Uses Next.js Data Cache (separate from page cache)

**Cache location**: Next.js Data Cache (Vercel)

---

### Layer 3: CDN/Edge Cache (Vercel Edge Network)
**Location**: ~~vercel.json~~ (removed to avoid conflicts)
```json
// We REMOVED this to let Next.js control caching
{
  "source": "/:slug*.html",
  "headers": [
    { "key": "Cache-Control", "value": "..." }
  ]
}
```

**What it does**:
- Caches the **final HTML response** at Vercel's edge locations
- Serves cached pages from nearest edge location
- Controlled by `Cache-Control` headers in HTTP response

**Cache location**: Vercel Edge Network (CDN)

---

## 🔄 How They Work Together

```
User Request → Vercel Edge → Next.js Server → Blogger API
                   ↓              ↓              ↓
               [Layer 3]      [Layer 1]      [Layer 2]
               CDN Cache      ISR Cache      API Cache
```

### Example Flow:

**First Request (Cache Miss):**
1. User requests `/some-song-lyrics.html`
2. Edge CDN: ❌ MISS (no cached HTML)
3. Next.js ISR: ❌ MISS (page not generated yet)
4. Blogger API Cache: ❌ MISS (API data not cached)
5. **Fetches from Blogger** → Generates page → Caches at all 3 layers
6. Response time: **5-8 seconds** (slow)

**Second Request (Cache Hit):**
1. User requests same song
2. Edge CDN: ✅ HIT (HTML cached at edge)
3. Serves instantly from edge
4. Response time: **<50ms** (fast!)

**After 30 Days (ISR Revalidation):**
1. User requests same song
2. Edge CDN: 🟡 STALE (served while revalidating)
3. Next.js ISR: Regenerates page in background
4. Blogger API Cache: ✅ HIT (API data still cached)
5. Response time: **<100ms** (fast, using cached API data)

---

## ❓ Why Was Cache Hit Rate Only 10.97%?

Looking at your log analysis:

### Root Causes:

1. **Bot Traffic (56.65%)**
   - Each bot hits different songs
   - Bots don't respect cached pages well
   - Creates many cold starts

2. **3000+ Songs**
   - Not all songs are accessed frequently
   - Long-tail content gets cache eviction
   - Infrequently accessed songs = cache miss

3. **Query Parameters**
   - URLs like `?nxtPslug=song-name` create separate cache entries
   - Old Blogger URL patterns causing misses

4. **Cold Starts**
   - First visitor to any song = always cache miss
   - 3000 songs × first visit = 3000 cache misses minimum

5. **Cache Eviction**
   - Vercel has limited edge cache size
   - Less popular songs get evicted
   - Next visitor = cache miss again

---

## ✅ What We Fixed

### 1. Removed Conflicting Cache Headers
**Before:**
- vercel.json tried to set Cache-Control headers
- Middleware tried to set Cache-Control headers
- Next.js ISR sets Cache-Control headers
- **Result**: Confusion, possible conflicts

**After:**
- Let Next.js ISR control all caching
- No manual Cache-Control headers
- **Result**: Consistent caching behavior

### 2. Added force-cache Hint for Blogger API
**In lib/dateBasedCache.ts:**
```typescript
if (!isDev) {
  fetchOptions.cache = 'force-cache'  // Hint to edge
  if (options.next) {
    fetchOptions.next = options.next   // ISR config
  }
}
```

**What this does:**
- Tells Vercel Edge to cache API responses
- Works with Next.js revalidate
- Reduces external API calls

### 3. Optimized robots.txt
**Added crawl delays:**
- Friendly bots: 1-2 seconds
- Aggressive bots: 10 seconds

**What this does:**
- Reduces bot request rate
- Gives cache time to warm up
- Less cache churn from bots

### 4. Added WordPress URL Blocks
**In vercel.json:**
```json
{
  "source": "/wp-content/uploads/:path*",
  "destination": "/",
  "statusCode": 410
}
```

**What this does:**
- Blocks 1,207 wasted requests (1.87%)
- Handled at edge, not middleware
- Saves function execution time

---

## 📊 Expected Improvement

### Why Cache Hit Rate Will Improve:

1. **Bot optimization**: 30% less bot churn
2. **WordPress blocks**: 1.87% fewer wasted requests  
3. **Consistent caching**: No header conflicts
4. **force-cache hint**: Better edge caching

### Realistic Expectations:

| Metric | Before | Realistic After | Ideal |
|--------|--------|----------------|-------|
| Cache Hit Rate | 10.97% | **40-50%** | 70%+ |
| Why not higher? | - | Long-tail content, bots, cold starts | - |

**Reality Check:**
- You have 3000 songs, not all are popular
- Bots will always cause some cache misses
- Long-tail content naturally has lower hit rates
- **40-50% is actually good** for this content distribution

---

## 🎯 What Actually Matters for Hobby Plan

### Don't Focus on Cache Hit Rate Alone

**Focus on these instead:**

1. **Function Execution Time**
   - Current: 72.61% serverless (too high)
   - Target: <40% serverless
   - **Solution**: ISR caching reduces this

2. **Average Response Time**
   - Current: 5-8 seconds (slow routes)
   - Target: <1 second (cached routes)
   - **Solution**: Once cached, instant

3. **Bandwidth Usage**
   - Current: ~80GB/month (80% limit)
   - Target: <60GB/month
   - **Solution**: Better caching = less data transfer

4. **410/404 Errors**
   - Current: 1,874 (1.87%)
   - Target: <100
   - **Solution**: WordPress redirects ✅

---

## 💡 Key Insights

### What You Should Know:

1. **ISR = Your Primary Cache**
   - Page-level `revalidate = 30 days` is the most important setting
   - This controls when pages regenerate
   - Don't override with manual headers

2. **API Cache = Secondary**
   - `cachedBloggerFetch` with `revalidate: 30 days`
   - Caches Blogger API responses
   - Reduces external API calls

3. **CDN Cache = Automatic**
   - Vercel Edge Network caches automatically
   - Based on Cache-Control headers from Next.js
   - Don't need to configure manually

4. **Low Hit Rate ≠ Bad Performance**
   - Your content is long-tail (3000 songs)
   - Once a song is accessed, subsequent requests are fast
   - Focus on popular songs being cached

5. **Force-cache Hint Helps**
   - `fetchOptions.cache = 'force-cache'` in production
   - Tells edge to cache API responses
   - Works WITH Next.js ISR, not against it

---

## ✅ Final Recommendations

### Do This:
1. ✅ Keep `revalidate = 30 days` at page level
2. ✅ Let Next.js control Cache-Control headers
3. ✅ Use `force-cache` hint for Blogger API
4. ✅ Monitor function execution time, not just cache hit rate
5. ✅ Deploy and measure for 3-5 days

### Don't Do This:
1. ❌ Don't add Cache-Control headers in vercel.json
2. ❌ Don't add Cache-Control headers in middleware
3. ❌ Don't pre-generate all 3000 songs (wastes build minutes)
4. ❌ Don't worry if cache hit rate stays at 40-50%
5. ❌ Don't override Next.js caching system

---

## 🔧 To Verify Changes Working

After deployment, check these metrics:

1. **Vercel Analytics**
   - Function execution time should decrease
   - Edge requests should increase
   - 410 errors should drop to <100

2. **Response Times**
   - First visit to a song: 1-2s (acceptable)
   - Second visit: <100ms (fast!)
   - Popular songs: Always fast

3. **Build Time**
   - Should stay <5 minutes
   - Should stay <100 minutes/month total

4. **Bandwidth**
   - Should decrease from 80GB to 50-60GB

---

## 📝 Summary

**Your original question**: "Would vercel.json cache affect API-level cache?"

**Answer**: No, they're independent layers:
- **vercel.json** (removed) = CDN cache headers
- **API-level revalidate** = Data fetch cache (30 days)
- **Page-level revalidate** = ISR cache (30 days)

**Best practice**: Let Next.js ISR handle everything. Don't manually override.

**Expected result**: 40-50% cache hit rate is realistic and good enough for your use case. Focus on function execution time and bandwidth instead.
