# How to Update Content After Posting New Songs

## ⚠️ Important: 30-Day Cache Strategy

All pages and APIs are now cached for **30 days** to minimize CPU usage on Vercel free tier (4 hours/month). 

**This means:**
- New songs won't appear automatically for 30 days
- Trending posts update monthly
- **You MUST manually revalidate** after posting new content

## Quick Revalidation Guide

After posting new song lyrics to Blogger, run these commands:

### 1. Update Sitemap (includes homepage)
```bash
curl -X POST https://tsonglyrics.com/api/revalidate-sitemap \
  -H "x-revalidate-secret: YOUR_SECRET_TOKEN"
```

### 2. Update Trending API
```bash
curl -X POST https://tsonglyrics.com/api/revalidate?tag=trending-api \
  -H "x-revalidate-secret: YOUR_SECRET_TOKEN"
```

### 3. Update Search Page (optional)
```bash
curl -X POST https://tsonglyrics.com/api/revalidate?path=/search \
  -H "x-revalidate-secret: YOUR_SECRET_TOKEN"
```

Replace `YOUR_SECRET_TOKEN` with the value from your `.env.local` file (`REVALIDATE_SECRET`).

## What This Does

1. **Clears in-memory song cache** (forces fresh fetch from Blogger)
2. Regenerates sitemap index (`/sitemap.xml`)
3. Regenerates all paginated sitemaps (`/sitemap/0.xml`, `/1.xml`, `/2.xml`)
4. Regenerates homepage to show latest songs
5. Takes ~30-60 seconds to complete

## CPU Optimization

The sitemap uses **in-memory caching** to reduce CPU usage:

- First sitemap request: Fetches all songs from Blogger (14 API calls)
- Subsequent requests: Read from memory cache (instant, zero API calls)
- Cache lifetime: 1 hour or until manual revalidation
- **Reduces CPU usage by ~66%** compared to no caching

### How It Works:
1. `sitemap/0.xml` fetches and caches all 2000+ songs
2. `sitemap/1.xml` reads from the same cache
3. `sitemap/2.xml` reads from the same cache
4. Result: **1 fetch instead of 3** ✅

## Response

**Success:**
```json
{
  "revalidated": true,
  "timestamp": "2026-01-04T10:30:00.000Z",
  "message": "Sitemap index, paginated sitemaps (0-3), and home page revalidated successfully"
}
```

**Error (Invalid Secret):**
```json
{
  "error": "Invalid or missing secret token"
}
```

## Current Sitemap Setup

- **sitemap/0.xml**: 5 static pages + Songs 0-999 (max 1,005 URLs)
- **sitemap/1.xml**: Songs 1,000-1,999 (max 1,000 URLs)
- **sitemap/2.xml**: Songs 2,000-2,999 (max 1,000 URLs)
- **Total capacity**: 3,005 URLs

With ~2000 songs currently, you have room for 1000+ more before needing to add sitemap/3.xml.

## Automatic Revalidation

Sitemaps also auto-regenerate every 7 days, so if you forget to call the API, new songs will appear within a week automatically.

## Tips

- Call this API immediately after posting to Blogger for instant sitemap updates
- Google typically crawls sitemaps within 24 hours
- You can verify the update by visiting https://tsonglyrics.com/sitemap.xml
- Monitor in Google Search Console > Sitemaps section
