# Vercel Hobby Plan Optimization Strategy

**Last Updated**: 2026-02-06 (Initial Analysis)  
**Based on**: 100,000 Request Analysis from Production Logs

---

## 📅 Update History

### 2026-02-06 - Initial Analysis
- Analyzed 100,000 production requests
- Identified critical issues with cache hit rate (10.97%)
- Created optimization plan with 3-week implementation timeline
- Set up analysis framework and documentation structure

---

## 🚨 Critical Issues Found

1. **ISR Cache Hit Rate: 10.97%** (Target: >80%)
2. **Serverless Usage: 72.61%** (Too high for Hobby plan)
3. **Bot Traffic: 56.65%** (Consuming resources unnecessarily)
4. **WordPress 410 Errors: 1,874 requests** (Wasting bandwidth)
5. **Slow Response Times: 714 routes >3 seconds**

---

## ✅ Optimization Plan (No Pre-generation Required)

### Priority 1: Fix Cache Headers & CDN Configuration

**Problem**: Low cache hit rate despite 30-day ISR revalidation  
**Root Cause**: Missing or incorrect cache headers for CDN

**Solution**: Add proper cache headers in Next.js responses

```typescript
// app/[slug]/page.tsx - Add to every page export
export const dynamic = 'force-static' // Try to force static when possible

// For API routes, add cache headers
export async function GET(request: Request) {
  const res = NextResponse.json(data)
  res.headers.set('Cache-Control', 's-maxage=2592000, stale-while-revalidate=5184000')
  return res
}
```

**Impact**: Should increase cache hit rate to 60-70%

---

### Priority 2: Add WordPress URL Redirects in vercel.json

**Current**: 1,207 requests hitting middleware for 410 errors  
**Solution**: Handle at edge with static redirects

```json
{
  "redirects": [
    {
      "source": "/wp-content/uploads/:path*",
      "destination": "/",
      "statusCode": 410,
      "permanent": true
    },
    {
      "source": "/wp-json/:path*",
      "destination": "/",
      "statusCode": 410,
      "permanent": true
    }
  ]
}
```

**Impact**: Eliminates 1,874 middleware invocations per 100k requests

---

### Priority 3: Optimize Blogger API Calls

**Current**: 18,052 API calls with 50% cache hit rate  
**Problem**: Still making 9,000+ external API calls

**Solution**: Implement edge caching for Blogger responses

```typescript
// lib/dateBasedCache.ts - Add to cachedBloggerFetch
export async function cachedBloggerFetch(url: string, options?: RequestInit) {
  return fetch(url, {
    ...options,
    next: { 
      revalidate: REVALIDATE_BLOGGER_FETCH,
      tags: ['blogger-api'] 
    },
    // Add cache header hint for edge
    cache: 'force-cache'
  })
}
```

**Alternative**: Use Vercel Edge Config (free tier)
- Store top 100-200 most popular songs in Edge Config
- Instant response without Blogger API call
- Update once per day via cron job

**Impact**: Reduce API calls by 80%, faster responses

---

### Priority 4: Optimize Bot Traffic with robots.txt

**Current**: 56.65% bot traffic, many hitting un-cacheable routes  
**Solution**: Better robots.txt + meta tags

```txt
# robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /search?
Disallow: /*?nxtP*
Crawl-delay: 2

# Friendly bots
User-agent: Googlebot
Crawl-delay: 1

User-agent: Bingbot
Crawl-delay: 2

User-agent: facebookexternalhit
Crawl-delay: 1

# Aggressive bots
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: DotBot
Crawl-delay: 10
```

**Impact**: Reduce bot requests by 20-30%, better crawl efficiency

---

### Priority 5: Implement Stale-While-Revalidate

**Problem**: Cold cache misses trigger slow serverless functions  
**Solution**: Serve stale content while revalidating in background

```typescript
// middleware.ts - Add cache headers
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // For HTML pages
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=2592000, stale-while-revalidate=5184000'
    )
  }
  
  return response
}
```

**Impact**: Reduce perceived load time, better UX, less function time

---

### Priority 6: Optimize Slow Routes (Sitemap)

**Current**: Sitemap routes averaging 8-10 seconds  
**Problem**: Generating sitemap on-demand from Blogger API

**Solution**: Generate sitemap at build time OR cache aggressively

```typescript
// app/sitemap/[page]/route.ts
export const revalidate = 86400 * 7 // 7 days instead of 30

// Or use Edge Runtime for better performance
export const runtime = 'edge'
```

**Impact**: 80% faster sitemap generation

---

### Priority 7: Reduce Middleware Logic

**Current**: 16,216 middleware invocations (16.22%)  
**Problem**: Middleware runs on every request, consuming Edge invocations

**Solution**: Move logic to static configuration where possible

```typescript
// middleware.ts - Only run on specific paths
export const config = {
  matcher: [
    // Only run middleware on routes that need it
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // Exclude API routes if not needed
    '/((?!api/).*)',
  ],
}
```

**Impact**: Reduce Edge invocations by 30-40%

---

## 📊 Expected Results After Implementation

| Metric | Before | Target | Savings |
|--------|--------|--------|---------|
| Cache Hit Rate | 10.97% | 70%+ | 6x improvement |
| Serverless % | 72.61% | <40% | 40% reduction |
| Avg Response Time | 5-8s | <1s | 80% faster |
| Bot Traffic Impact | 56.65% | 40% | 30% reduction |
| 410 Errors | 1,874 | <100 | 95% reduction |
| Build Time | N/A | <3 min | Stays within limits |

---

## 🔧 Implementation Order

### Week 1: Quick Wins (2-3 hours)
1. ✅ Add WordPress redirects to vercel.json
2. ✅ Update robots.txt
3. ✅ Add cache headers to API routes
4. ✅ Deploy and monitor

**Expected**: 30% improvement in cache hit rate

### Week 2: Caching Optimization (3-4 hours)
1. ✅ Implement stale-while-revalidate headers
2. ✅ Optimize middleware matcher
3. ✅ Add edge caching hints to Blogger API
4. ✅ Deploy and monitor

**Expected**: 50% improvement in cache hit rate, 30% faster responses

### Week 3: Advanced Optimization (4-5 hours)
1. ✅ Set up Edge Config for top 100 songs (optional)
2. ✅ Optimize sitemap generation
3. ✅ Fine-tune cache durations based on analytics
4. ✅ Deploy and monitor

**Expected**: 70%+ cache hit rate, <1s avg response time

---

## 💰 Hobby Plan Resource Usage Projection

### Current Monthly Usage (extrapolated):
- **Bandwidth**: ~80GB/month (80% of 100GB limit) ⚠️
- **Function Execution**: ~85 GB-Hrs (85% of 100 GB-Hrs limit) ⚠️
- **Edge Invocations**: ~400k (40% of 1M limit) ✅
- **Build Minutes**: <100/month (1.6% of 6,000 limit) ✅

### After Optimization:
- **Bandwidth**: ~50GB/month (50% of limit) ✅
- **Function Execution**: ~35 GB-Hrs (35% of limit) ✅
- **Edge Invocations**: ~250k (25% of limit) ✅
- **Build Minutes**: <100/month (1.6% of limit) ✅

**Result**: Comfortable margin for 3x traffic growth

---

## 🎯 Monitoring & Validation

### After Each Deployment:
1. Check Vercel Analytics for cache hit rate
2. Monitor function execution time in logs
3. Verify bot traffic patterns
4. Check 410 error count
5. Measure avg response time

### Tools:
- Vercel Analytics Dashboard
- Custom log analysis script (scripts/analyze-vercel-logs.py)
- Lighthouse for Core Web Vitals

---

## ❌ What NOT to Do (Hobby Plan Constraints)

1. ❌ **Don't pre-generate all 3000 songs** - Wastes build minutes
2. ❌ **Don't use external databases** - No free tier support, adds complexity
3. ❌ **Don't over-optimize build process** - Keep builds <5 minutes
4. ❌ **Don't add heavy dependencies** - Increases function size/memory
5. ❌ **Don't fetch data at build time** - Moves load to build instead of runtime

---

## ✅ Best Practices for Hobby Plan

1. ✅ **Maximize CDN caching** - Let Vercel's edge network do the work
2. ✅ **Use ISR with long revalidation** - 30 days is good for stable content
3. ✅ **Implement stale-while-revalidate** - Better UX, less function time
4. ✅ **Optimize for first-visit performance** - Subsequent visits will be fast from cache
5. ✅ **Monitor and iterate** - Use analytics to guide optimization efforts

---

## 🔗 Next Steps

1. Review this plan
2. Prioritize based on business impact
3. Implement Week 1 changes first
4. Monitor results for 3-5 days
5. Continue with Week 2 and 3 based on data

**Goal**: Stay within Hobby plan limits while serving 100k-300k requests/month efficiently
