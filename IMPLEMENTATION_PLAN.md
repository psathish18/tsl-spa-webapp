# Edge Request Reduction - Implementation Plan

## Phase 1: Critical Optimizations (Immediate Impact)

### 1. Self-Host Fonts ✓
**Files to modify:**
- Create `public/fonts/` directory
- Add font files (Inter, Poppins) as static assets
- Update `app/globals.css` with @font-face declarations
- Remove Next.js font imports from `app/layout.tsx`

**Impact:** -2 edge requests per page view

### 2. Remove Vercel Analytics ✓
**Files to modify:**
- `package.json` - Remove @vercel/analytics dependency
- `app/layout.tsx` - Remove Analytics component
- Run `npm uninstall @vercel/analytics`

**Impact:** -1 edge request per page view

### 3. Convert API Routes from Edge to Node Runtime ✓
**Files to modify:**
- `app/api/song/route.ts` - Remove Edge runtime
- `app/api/search/route.ts` - Remove Edge runtime (if exists)
- `app/api/category/route.ts` - Remove Edge runtime (if exists)
- All other API routes with Edge runtime

**Impact:** Edge→Node = better for Hobby plan, enables ISR caching

### 4. Use Static JSON Files for Songs ✓
**Implementation:**
- Songs already pre-generated in `/public/songs/`
- Update components to fetch from `/songs/*.json` instead of API
- Remove API calls for song data where possible

**Impact:** -1-2 edge requests per page view

## Phase 2: Build Configuration Optimizations

### 5. Enhanced JavaScript Bundling
**Files to modify:**
- `next.config.js` - Add more packages to optimizePackageImports

### 6. Configure Output Standalone
**Files to modify:**
- `next.config.js` - Add output: 'standalone' for Vercel optimization

## Phase 3: Testing & Validation

### Build Test
```bash
npm run build
```

### Deployment Test
- Deploy to Vercel
- Monitor edge requests in dashboard
- Validate all pages load correctly

## Success Metrics

- **Before:** ~15 edge requests per page view
- **Target:** ~3-5 edge requests per page view  
- **Reduction:** 60-70%

## Notes

- Maintain all existing functionality
- No breaking changes
- Preserve SEO optimizations
- Keep Google Analytics (more important than Vercel Analytics)
- Keep AdSense integration
- Keep OneSignal notifications
