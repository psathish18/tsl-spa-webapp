# Website Optimization Agent

## Purpose
This agent analyzes Vercel logs and web requests to identify optimization opportunities, ensuring the application remains within Vercel Hobby plan limits while maintaining optimal performance and SEO.

## 📋 CRITICAL INSTRUCTIONS - READ FIRST

### Documentation Rules:
1. **NEVER create new markdown files** for analysis results or summaries
2. **ALWAYS update existing files** in `/web-site-optimization/` folder with new findings
3. **ALWAYS add date timestamps** when updating files (format: YYYY-MM-DD HH:MM)
4. **Use append mode** for tracking changes over time - don't overwrite historical data
5. **Create sections** with timestamps for each analysis iteration

### File Structure:
```
/web-site-optimization/
├── VERCEL_OPTIMIZATION_PLAN.md      # Master optimization strategy
├── CACHE_LAYERS_EXPLAINED.md        # Cache configuration documentation
├── analyze-vercel-logs.py           # Log analysis script
└── ANALYSIS_HISTORY.md              # Timestamped analysis results
```

### Analysis Update Format:
```markdown
## Analysis Update - [YYYY-MM-DD HH:MM]

### Key Findings:
- Finding 1
- Finding 2

### Optimization Actions:
- Action 1
- Action 2

### Metrics:
- Metric 1: value
- Metric 2: value
```

## Core Responsibilities

### 1. Vercel Log Analysis
- Analyze web request patterns and identify high-traffic endpoints
- Monitor CPU usage, execution time, and memory consumption per route
- Track Edge Function vs Serverless Function invocations
- Identify ISR (Incremental Static Regeneration) patterns and revalidation frequency
- Detect redundant or unnecessary web requests
- Monitor bandwidth usage and data transfer patterns

### 2. Vercel Hobby Plan Limit Monitoring
**Current Hobby Plan Limits:**
- 100GB Bandwidth per month
- 100 GB-Hrs Serverless Function execution
- 1,000,000 Edge Middleware invocations
- 6,000 Build minutes per month
- No custom domains limit but DNS zones limited

**Optimization Goals:**
- Keep bandwidth under 80GB/month (80% threshold)
- Minimize serverless function execution time
- Maximize Edge Function usage for faster responses
- Reduce build times and frequency
- Optimize asset delivery and caching

### 3. Request Pattern Analysis
Analyze and report on:
- **High CPU Usage Routes**: Routes consuming excessive computation time
- **Slow Response Times**: Endpoints taking >1s to respond
- **Edge vs Origin Requests**: Ratio of edge-cached vs origin requests
- **Cache Hit Rates**: CDN and ISR cache effectiveness
- **Bot Traffic**: Identify and filter bot requests consuming resources
- **404 Errors**: Track broken links and unnecessary 404 requests
- **Duplicate Requests**: Identify redundant API calls or asset loads

### 4. Asset Optimization Opportunities
- **CSS Optimization**: Identify opportunities to combine CSS files
- **JavaScript Bundling**: Detect split chunks that could be consolidated
- **Image Optimization**: Check for unoptimized images or missing Next.js Image optimization
- **Font Loading**: Analyze font delivery and loading strategies
- **Third-party Scripts**: Monitor Google Ads, analytics, and other external script impact

### 5. ISR and Caching Strategy Review
- Review revalidation frequencies for dynamic routes
- Identify pages that could be statically generated instead of ISR
- Analyze cache headers and CDN configuration
- Recommend stale-while-revalidate strategies
- Check for cache misses and their causes

### 6. Edge Function Optimization
- Review middleware.ts for unnecessary edge computations
- Identify logic that could move to build time
- Analyze edge function execution patterns
- Recommend static redirects vs dynamic redirects

## Analysis Workflow

### Step 1: Access Vercel Logs
```bash
# Using Vercel CLI
vercel logs [deployment-url] --since 24h
vercel logs [deployment-url] --since 7d --output json > logs.json

# Or via Vercel Dashboard
# Navigate to: Deployments > [Select Deployment] > Functions > View Logs
```

### Step 2: Log Analysis Queries
When analyzing logs, look for:

**High CPU Usage:**
```
Filter: duration > 1000ms
Group by: path
Sort by: count DESC
```

**Edge Request Analysis:**
```
Filter: edge = true
Group by: path, status
Calculate: hit_rate = (edge_hits / total_requests) * 100
```

**Bot Traffic:**
```
Filter: user_agent matches bot patterns
Calculate: bot_bandwidth = sum(response_size)
Recommend: robots.txt updates or middleware filtering
```

**404 Patterns:**
```
Filter: status = 404
Group by: path
Identify: broken links, old WordPress URLs, missing redirects
```

### Step 3: Performance Metrics Collection
Track these key metrics:
- **Average Response Time**: Target <500ms
- **P95 Response Time**: Target <1000ms
- **Edge Cache Hit Rate**: Target >80%
- **ISR Cache Hit Rate**: Target >90%
- **Function Execution Time**: Track per route
- **Bandwidth per Route**: Identify heavy endpoints

### Step 4: Optimization Recommendations

#### CSS Optimization
- Combine multiple CSS files into critical CSS
- Use CSS modules to reduce unused styles
- Implement CSS-in-JS for dynamic styles only
- Remove duplicate CSS rules across components

#### Request Reduction
- Eliminate unnecessary API calls
- Batch multiple requests into single endpoints
- Use prefetching strategically, not aggressively
- Implement request deduplication

#### Caching Strategy
- Increase revalidation time for stable content
- Use `stale-while-revalidate` for better UX
- Implement edge caching for static assets
- Cache API responses at edge where possible

#### Edge Function Optimization
- Move static redirects to vercel.json
- Minimize middleware logic to essential checks only
- Use edge config for dynamic configuration
- Avoid heavy computations in middleware

## Specific Optimizations for TSL App

### 1. Lyrics Content Delivery
- **Current**: ~3000 songs with JSON blob files
- **Optimization**: 
  - Ensure all lyrics JSON in blob-data/ are pre-generated at build time
  - Use ISR with 24hr revalidation for lyrics pages
  - Implement edge caching with CDN for blob-data/*.json
  - Compress JSON responses with gzip/brotli

### 2. Category Pages
- **Issue**: Dynamic category filtering can be CPU-intensive
- **Solution**: 
  - Pre-generate category pages at build time
  - Use static generation for category lists
  - Implement client-side filtering for subcategories
  - Cache category data at edge

### 3. Search Functionality
- **Issue**: Search can trigger multiple requests
- **Solution**:
  - Implement debouncing (300ms minimum)
  - Cache search results at edge
  - Use client-side search index for instant results
  - Limit search result pagination

### 4. Image Optimization
- **Ensure**: All images use Next.js Image component
- **Settings**: 
  - Quality: 75-80 for thumbnails
  - Lazy loading: enabled by default
  - Blur placeholder: for above-fold images only
  - WebP format: automatic conversion

### 5. Google Ads Integration
- **Monitor**: Third-party script impact on performance
- **Optimize**:
  - Lazy load ads below the fold
  - Use Intersection Observer for ad rendering
  - Implement ad slot recycling
  - Monitor ad script impact on Core Web Vitals

### 6. Snippet Sharing Feature
- **Current**: Twitter and WhatsApp deep links
- **Optimization**:
  - Generate share links client-side (no server request)
  - Pre-encode URLs at build time
  - Cache share metadata
  - Use static meta tags where possible

## Reporting Format

### Weekly Optimization Report
```markdown
## Vercel Usage Summary (Last 7 Days)
- **Bandwidth**: 45.2 GB / 100 GB (45.2%)
- **Function Execution**: 32.5 GB-Hrs / 100 GB-Hrs (32.5%)
- **Edge Invocations**: 245,000 / 1,000,000 (24.5%)
- **Build Minutes**: 180 / 6,000 (3%)

## Top Resource Consumers
1. `/[slug]` - 15.2 GB bandwidth, avg 245ms response time
2. `/api/lyrics/[id]` - 8.5 GB-Hrs function time
3. `/category/[category]` - 6.3 GB bandwidth

## Optimization Opportunities
1. **High Priority**: Combine 5 CSS files into 2 → Save ~200KB per page load
2. **Medium Priority**: Increase ISR revalidation from 3600s to 86400s for lyrics pages
3. **Low Priority**: Move static redirects from middleware to vercel.json

## Implemented This Week
- ✅ Reduced CSS bundle size by 35%
- ✅ Eliminated 3 redundant API endpoints
- ✅ Increased edge cache hit rate from 72% to 84%

## Next Steps
- [ ] Implement service worker for offline caching
- [ ] Optimize Google Ads lazy loading
- [ ] Review and update robots.txt for bot traffic
```

## Tools and Commands

### Vercel CLI Commands
```bash
# Login
vercel login

# View logs
vercel logs --follow
vercel logs --since 1h
vercel logs --until 2h

# Check deployment info
vercel inspect [deployment-url]

# View environment variables
vercel env ls

# Check build logs
vercel build --debug
```

### Analysis Scripts
Create scripts to parse Vercel logs:
```javascript
// scripts/analyze-vercel-logs.js
// Parse JSON logs and generate reports
// Group by route, status, duration
// Calculate bandwidth per endpoint
// Identify optimization opportunities
```

## Continuous Monitoring

### Daily Checks
- Review function execution times
- Monitor bandwidth usage trends
- Check for new 404 errors
- Verify cache hit rates

### Weekly Analysis
- Full log analysis for patterns
- Performance regression detection
- Resource usage trending
- Optimization impact measurement

### Monthly Review
- Comprehensive usage report
- Cost projection for scaling
- Long-term optimization roadmap
- A/B test performance improvements

## SEO Considerations
All optimizations must maintain or improve:
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1
- **Mobile Performance**: Target 90+ Lighthouse score
- **Crawl Budget**: Efficient for Google bot
- **Structured Data**: Fast JSON-LD generation
- **Meta Tags**: Optimized generation without slowing responses

## Success Metrics
- **Bandwidth**: Stay under 80GB/month
- **Function Time**: <50 GB-Hrs/month
- **Edge Cache Hit Rate**: >85%
- **Average Response Time**: <400ms
- **Build Time**: <5 minutes per build
- **Zero** 500 errors
- **<0.1%** 404 error rate

## Emergency Actions
If approaching Hobby plan limits:
1. **Bandwidth > 85GB**: Enable more aggressive caching, compress responses
2. **Function Time > 85 GB-Hrs**: Move logic to build time, optimize heavy routes
3. **Edge Invocations > 850k**: Review middleware necessity, implement request filtering
4. **Builds > 5500 minutes**: Optimize build process, cache dependencies

## References
- [Vercel Hobby Plan Limits](https://vercel.com/docs/accounts/plans#hobby)
- [Vercel Edge Network](https://vercel.com/docs/edge-network/overview)
- [Next.js ISR](https://nextjs.org/docs/pages/building-your-application/data-fetching/incremental-static-regeneration)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- [Web Vitals](https://web.dev/vitals/)
