# CDN URL Fix Verification Guide

## Problem Fixed
The CDN was using preview branch URLs instead of the production domain (`www.tsonglyrics.com`) when fetching JSON blob data.

## Solution Summary
Added `metadataBase` to Next.js configuration and centralized all URL generation to use a constant production URL.

## How to Verify the Fix

### 1. After Deployment to Production

Once this PR is merged and deployed to production, verify the fix using these methods:

#### A. Check JSON Blob URLs in Browser DevTools

1. Visit any song page (e.g., `https://www.tsonglyrics.com/some-song-lyrics.html`)
2. Open Browser DevTools (F12)
3. Go to the Network tab
4. Filter by `.json` files
5. Navigate to another song page using internal links
6. Observe the JSON blob URLs being fetched
7. ✅ **Verify**: All JSON URLs should start with `https://www.tsonglyrics.com/` NOT a Vercel preview URL

#### B. Check Metadata in HTML Source

1. Visit any page on the site
2. View page source (Ctrl+U or Right-click → View Page Source)
3. Search for `<meta` tags
4. ✅ **Verify**: 
   - `og:url` should be `https://www.tsonglyrics.com/...`
   - `canonical` link should be `https://www.tsonglyrics.com/...`
   - No references to `vercel.app` URLs

#### C. Check Structured Data

1. Visit a song page
2. View page source
3. Search for `application/ld+json`
4. ✅ **Verify**: The `url` field in structured data should be `https://www.tsonglyrics.com`

#### D. Test Client-Side Navigation

1. Start on the home page
2. Click on multiple song links
3. Use browser back/forward buttons
4. Open DevTools Network tab and filter for `.json`
5. ✅ **Verify**: All Next.js data fetches use `www.tsonglyrics.com` domain

### 2. Check Sitemap

1. Visit `https://www.tsonglyrics.com/sitemap.xml`
2. ✅ **Verify**: All URLs in sitemap use `https://www.tsonglyrics.com/` prefix

### 3. SEO Tools Verification

Use these tools to verify proper URL configuration:

- **Google Search Console**: Check for any canonical URL issues
- **Rich Results Test**: https://search.google.com/test/rich-results
  - Test a song page URL
  - ✅ **Verify**: No URL errors in structured data
- **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
  - Test a song page URL
  - ✅ **Verify**: og:url shows production domain

## Expected Behavior After Fix

### Before (❌ Incorrect)
```
// Preview URLs in JSON blobs
https://tsl-spa-webapp-7hh8sklq3-sathishkumars-projects-cdd6d66c.vercel.app/songs/theendi-theendi-lyrics-bala.json

// Mixed URLs in metadata
<meta property="og:url" content="https://tsl-spa-webapp-preview.vercel.app/..." />
```

### After (✅ Correct)
```
// Production URLs in JSON blobs
https://www.tsonglyrics.com/_next/data/BUILD_ID/song-title.json

// Consistent production URLs in metadata
<meta property="og:url" content="https://www.tsonglyrics.com/..." />
<link rel="canonical" href="https://www.tsonglyrics.com/..." />
```

## Technical Details

### Root Cause
Next.js uses the `metadataBase` configuration to determine the base URL for:
- Generated JSON blob files
- Metadata URLs (canonical, Open Graph)
- Sitemap URLs
- Asset URLs

Without `metadataBase`, Next.js defaults to using the `VERCEL_URL` environment variable, which points to the preview deployment URL during builds.

### Fix Applied
1. Added `metadataBase: new URL('https://www.tsonglyrics.com')` to root layout
2. Created `BASE_URL` constant for consistent URL generation
3. Updated all hardcoded URLs to use the constant

## Rollback Plan

If issues are discovered after deployment:

1. The previous version can be re-deployed from Vercel dashboard
2. Or revert this PR and redeploy

## Related Documentation

- [Next.js Metadata Configuration](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

## Testing in Preview Deployments

Note: Preview deployments will still use preview URLs for internal testing. The production deployment will use the production URL as configured in `metadataBase`.
