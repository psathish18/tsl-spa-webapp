# Edge Request Analysis and Optimization Plan

## Problem Statement
- **Google Analytics:** 65,000 page views
- **Vercel Metrics:** 1,000,000 edge requests
- **Ratio:** ~15.4 edge requests per page view
- **Target:** Reduce to 2-3 edge requests per page view

## Root Cause Analysis

### 1. **Static Asset Multiplication** (CRITICAL ISSUE)
Each page load currently triggers multiple edge requests:
- Multiple CSS chunks from Tailwind/Next.js
- Multiple JavaScript chunks
- Font files (Inter, Poppins via Next.js font optimization)
- Vercel Analytics script
- Google Analytics script
- OneSignal SDK script
- Google AdSense script
- Favicon and manifest files

**Estimated Impact:** 8-12 edge requests per page

### 2. **API Routes Using Edge Runtime** (HIGH IMPACT)
Multiple API routes are configured with `export const runtime = 'edge'`:
- `/api/song` - Edge runtime
- `/api/trending` - Node runtime but frequently called
- `/api/search` - Likely edge
- `/api/category` - Likely edge
- `/api/songs/[slug]` - Likely edge

Each API call = 1 edge request
**Estimated Impact:** 2-4 edge requests per page (depending on page type)

### 3. **Sitemap Generation** (MEDIUM IMPACT)
- Sitemap index at `/sitemap.xml`
- 3 dynamic sitemap pages at `/sitemap/0.xml`, `/sitemap/1.xml`, `/sitemap/2.xml`
- Each crawler request triggers edge functions
- Revalidation: 30 days (good)

**Estimated Impact:** Crawler-driven, not user-facing

### 4. **Third-Party Scripts** (MEDIUM IMPACT)
Multiple third-party scripts loaded:
- Google Analytics (gtag.js)
- Vercel Analytics
- OneSignal SDK
- Google AdSense

These may be proxied through Vercel's edge network.
**Estimated Impact:** 2-4 edge requests per page

### 5. **Middleware Execution** (LOW-MEDIUM IMPACT)
Middleware runs on EVERY request (including static assets):
- Processes all paths except API routes and _next/static
- Blocks malicious patterns
- Adds headers
- Handles redirects

**Estimated Impact:** 1 edge request per page + assets

## Current Edge Request Breakdown (Per Page View)

Assuming a typical song detail page visit:

1. **HTML Page:** 1 request (Edge-rendered or ISR)
2. **CSS Chunks:** 2-3 requests (multiple Tailwind chunks)
3. **JavaScript Chunks:** 4-6 requests (React, Next.js runtime, page chunks, shared chunks)
4. **Fonts:** 2 requests (Inter and Poppins WOFF2 files)
5. **Images:** 0 requests (using external CDN - blogger.googleusercontent.com)
6. **Vercel Analytics:** 1 request
7. **API Calls:** 1-2 requests (song data, trending data)
8. **Favicon/Manifest:** 1-2 requests
9. **Service Workers:** 1 request (OneSignal)

**Total:** ~14-18 edge requests per page view

## Optimization Strategy

### Phase 1: Critical Optimizations (Target: 50% reduction)

#### 1.1 Self-Host Critical Fonts (HIGH PRIORITY)
**Current:** Next.js font optimization fetches from Google Fonts
**Problem:** Each font variant = separate edge request
**Solution:** Self-host fonts as static files

```typescript
// Instead of:
const inter = Inter({ subsets: ['latin'] })
const poppins = Poppins({ weight: ['400', '500', '600', '700'] })

// Use:
// fonts stored in public/fonts/
// CSS @font-face declarations
```

**Impact:** Reduce 2 edge requests → 0 (fonts served as static assets from CDN)

#### 1.2 Inline Critical CSS (HIGH PRIORITY)
**Current:** Multiple CSS chunks loaded separately
**Problem:** Each CSS file = edge request
**Solution:** Use Critters to inline critical CSS

```javascript
// next.config.js - Already has Critters installed!
experimental: {
  optimizeCss: true, // Already enabled
}
// Ensure Critters is properly configured
```

**Impact:** Reduce 2-3 CSS edge requests → 1

#### 1.3 Reduce JavaScript Chunks (MEDIUM PRIORITY)
**Current:** Multiple JS chunks from code splitting
**Problem:** Each chunk = edge request
**Solution:** Optimize chunk strategy

```javascript
// next.config.js
experimental: {
  optimizePackageImports: ['lucide-react', '@vercel/analytics', 'react', 'react-dom'],
}
```

**Impact:** Reduce 4-6 JS edge requests → 3-4

#### 1.4 Disable Vercel Analytics (MEDIUM PRIORITY)
**Current:** Vercel Analytics enabled
**Problem:** Adds edge request + may trigger additional tracking
**Solution:** Already have Google Analytics, remove Vercel Analytics

```typescript
// Remove from app/layout.tsx:
// <Analytics />
```

**Impact:** Reduce 1 edge request

#### 1.5 Consolidate Third-Party Scripts (MEDIUM PRIORITY)
**Current:** Multiple third-party scripts loaded separately
**Solution:** Use Next.js Script component with proper strategy

```typescript
import Script from 'next/script'

// Load non-critical scripts with lazyOnload
<Script src="..." strategy="lazyOnload" />
```

**Impact:** Scripts won't block rendering, may reduce edge requests if cached properly

### Phase 2: Architectural Optimizations (Target: Additional 20% reduction)

#### 2.1 Convert Edge API Routes to Static/Node Runtime (HIGH PRIORITY)
**Current:** API routes use Edge runtime
**Problem:** Every API call = expensive edge request
**Solution:** 
- Use Node.js runtime for API routes
- Pre-generate song data at build time
- Use static JSON files in /public

```typescript
// Instead of Edge runtime:
export const runtime = 'edge' // REMOVE THIS

// Use ISR with Node.js runtime (default)
export const revalidate = 86400 // 24 hours
```

**Impact:** Reduce 2-4 API edge requests per page

#### 2.2 Static Song Data Generation (HIGHEST PRIORITY)
**Current:** Songs fetched via API routes at runtime
**Problem:** Each song page triggers API edge request
**Solution:** Pre-generate all song JSON files at build time

You already have this infrastructure:
- `/public/songs/*.json` - 3000+ song files
- Script: `scripts/generate-song-json.ts`

**Implementation:**
1. Generate all song JSON files at build time
2. Serve from /public/songs/ (static, no edge function)
3. Use `getStaticProps` instead of client-side API calls

**Impact:** Reduce 1-2 API edge requests per page to 0

#### 2.3 Static Site Generation (SSG) for Song Pages (HIGH PRIORITY)
**Current:** Song pages use ISR (Incremental Static Regeneration)
**Problem:** ISR can trigger edge functions on revalidation
**Solution:** Use `generateStaticParams` to pre-render all pages

```typescript
// app/[slug]/page.tsx
export async function generateStaticParams() {
  // Generate all song slugs at build time
  const songs = await getAllSongs()
  return songs.map(song => ({
    slug: getSlugFromSong(song)
  }))
}
```

**Impact:** All song pages served as static HTML from CDN, 0 edge requests

### Phase 3: Advanced Optimizations (Target: Additional 10% reduction)

#### 3.1 Optimize Middleware
**Current:** Middleware runs on all requests
**Solution:** 
- Make middleware more selective
- Use static edge middleware for simple rules
- Cache middleware results

#### 3.2 Reduce Sitemap Edge Requests
**Current:** Dynamic sitemap generation
**Solution:** Generate static sitemap files at build time

```bash
# Generate static sitemaps during build
npm run generate-sitemap
```

#### 3.3 Service Worker for Asset Caching
**Solution:** Implement service worker to cache assets client-side

```javascript
// Cache CSS, JS, fonts locally
// Reduce repeat edge requests for returning users
```

## Expected Results

### Before Optimization
- Page views: 65,000
- Edge requests: 1,000,000
- Ratio: 15.4 requests/page

### After Phase 1 (Critical)
- Edge requests: ~500,000 (50% reduction)
- Ratio: 7.7 requests/page

### After Phase 2 (Architectural)
- Edge requests: ~200,000 (80% total reduction)
- Ratio: 3.1 requests/page

### After Phase 3 (Advanced)
- Edge requests: ~130,000 (87% total reduction)
- Ratio: 2.0 requests/page

## Implementation Priority

### Immediate (1-2 hours)
1. ✅ Self-host fonts
2. ✅ Remove Vercel Analytics
3. ✅ Convert API routes from Edge to Node.js runtime
4. ✅ Use pre-generated static JSON files for songs

### Short-term (2-4 hours)
5. ⏳ Implement SSG for all song pages
6. ⏳ Optimize JavaScript bundling
7. ⏳ Inline critical CSS

### Medium-term (4-8 hours)
8. ⏳ Generate static sitemaps
9. ⏳ Optimize middleware
10. ⏳ Implement service worker

## Vercel Hobby Plan Considerations

- **Edge Request Limit:** 100,000/day on Hobby plan (free tier)
- **Current Usage:** ~27,400/day (1M / 30 days = 33,333/day)
- **Target Usage:** ~3,500/day (80% reduction)
- **Bandwidth:** Static assets don't count as edge requests
- **ISR:** Counts as edge request only on revalidation
- **SSG:** No edge requests, just CDN serving

## Monitoring & Validation

1. **Vercel Dashboard**
   - Monitor edge requests before/after
   - Check function invocations
   - Verify bandwidth usage

2. **Build Output**
   - Check bundle sizes
   - Verify static page generation
   - Confirm chunk counts

3. **Browser DevTools**
   - Network tab: count requests
   - Performance tab: check rendering
   - Lighthouse: validate scores

## Files to Modify

1. `app/layout.tsx` - Remove Vercel Analytics, self-host fonts
2. `next.config.js` - Enhance bundling optimization
3. `app/api/*/route.ts` - Remove Edge runtime
4. `app/[slug]/page.tsx` - Add generateStaticParams
5. `public/fonts/` - Add self-hosted font files
6. `app/globals.css` - Add @font-face declarations
7. `package.json` - Remove @vercel/analytics

## Conclusion

The primary cause of high edge requests is the combination of:
1. Multiple static assets (CSS, JS, fonts) served through edge
2. Edge runtime API routes
3. Third-party scripts
4. Dynamic page generation

By implementing static generation, self-hosting assets, and removing Edge runtime, we can reduce edge requests by 80-87%, bringing usage well within Vercel Hobby plan limits.
