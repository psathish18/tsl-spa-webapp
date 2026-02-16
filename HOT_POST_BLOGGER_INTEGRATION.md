# Hot Post Blogger Integration

## Overview

The HotPostOverlay component now supports dynamic loading from Blogger with automatic fallback to static JSON configuration. **Uses a Next.js API proxy to avoid CORS issues.**

## How It Works

1. **Proxy Endpoint**: Component calls `/api/hotpost` (Next.js API route)
2. **Server-Side Fetch**: Proxy fetches from Blogger API (`https://tslappsetting.blogspot.com/feeds/posts/default/-/hotpost?alt=json&max-results=1`)
3. **No CORS Issues**: Server-side fetch bypasses browser CORS restrictions
4. **Caching**: Results cached for 5 minutes to reduce API calls
5. **Fallback**: If Blogger fetch fails, falls back to `/public/hot-post.json`
6. **Rotation**: If multiple items are found, automatically rotates every 10 seconds

## Architecture

```
Client (Browser)
    ↓ fetch('/api/hotpost')
Next.js API Route (/api/hotpost)
    ↓ server-side fetch (no CORS)
Blogger API
    ↓ JSON response
Cache (5 minutes)
    ↓
Client receives data
    ↓ if error
Fallback to /public/hot-post.json
```

## Blogger Post Setup

### Step 1: Create a Post in tslappsetting.blogspot.com

1. Go to https://tslappsetting.blogspot.com
2. Create a new post
3. Add category/label: `hotpost`
4. In the post content, add JSON array of hot posts

### Step 2: Post Content Format

The post content should be a valid JSON array:

```json
[
  {
    "slug": "uyirnaadi-nanbane-lyrics-tamil",
    "title": "Uyirnaadi Nanbane Lyrics Tamil - Coolie",
    "movieName": "Coolie",
    "singerName": "Anirudh, Sai Smriti"
  },
  {
    "slug": "another-song-lyrics",
    "title": "Another Song Lyrics - Movie Name",
    "movieName": "Movie Name",
    "singerName": "Singer Name"
  }
]
```

**For single item:**
```json
{
  "slug": "song-slug",
  "title": "Song Title Lyrics",
  "movieName": "Movie Name",
  "singerName": "Singer Name"
}
```

### Step 3: Publish the Post

Once published, the component will automatically fetch and display it within seconds (client-side fetch).

## Features

### Automatic Rotation

- If the Blogger post contains multiple items (array), the component automatically rotates through them
- Rotation interval: 10 seconds per item
- Smooth transitions between items

### Fallback Mechanism

If Blogger is unavailable or returns errors, the component falls back to:
- `/public/hot-post.json` for static configuration
- This ensures the feature always works even if Blogger is down

### Client-Side Only

- ✅ Zero edge requests (client-side fetch)
- ✅ No server-side rendering impact
- ✅ Works within Vercel Hobby plan limits
- ✅ CDN caching for Blogger responses

## Configuration File Format (Fallback)

### Single Item (Legacy Format - Still Supported)

```json
{
  "enabled": true,
  "slug": "song-slug",
  "title": "Song Title",
  "movieName": "Movie Name",
  "singerName": "Singer Name"
}
```

### Multiple Items (New Format)

```json
{
  "enabled": true,
  "items": [
    {
      "slug": "song-1-slug",
      "title": "Song 1 Title",
      "movieName": "Movie 1",
      "singerName": "Singer 1"
    },
    {
      "slug": "song-2-slug",
      "title": "Song 2 Title",
      "movieName": "Movie 2",
      "singerName": "Singer 2"
    }
  ]
}
```

## Update Workflow

### Method 1: Via Blogger (Recommended)

1. Edit the hotpost post in tslappsetting.blogspot.com
2. Update the JSON content with new hot posts
3. Publish changes
4. **Browser cache expires after 5 minutes** - users see new content on next visit
5. Or users can force refresh (Ctrl+F5) to see updates immediately
6. **No deployment needed!**

### Method 2: Via Static File

1. Edit `/public/hot-post.json`
2. Update with new hot posts
3. Commit and push
4. Vercel deploys automatically
5. CDN serves updated file

## Benefits

### Dynamic Updates Without Deployment

- ✅ Update hot posts via Blogger without code changes
- ✅ No waiting for Vercel deployment
- ✅ Updates appear within 5 minutes (browser cache)
- ✅ **No CORS issues** - uses server-side proxy
- ✅ **No server cache** - avoids edge function revalidation overhead

### Multiple Hot Posts Rotation

- ✅ Promote multiple songs simultaneously
- ✅ Automatic rotation keeps content fresh
- ✅ Better user engagement

### Reliability

- ✅ Automatic fallback ensures feature always works
- ✅ Handles Blogger API errors gracefully
- ✅ No single point of failure
- ✅ Server-side caching reduces load

## Technical Details

### Data Flow

```
1. Component Mount (Client-Side)
   ↓
2. Fetch from /api/hotpost (Proxy)
   ↓
3. Proxy: Server-Side Fetch to Blogger
   ↓
4. Parse JSON content
   ↓
5. Success? → Display & Rotate
   ↓ (if fails)
6. Fallback to /public/hot-post.json
   ↓
6. Display static configuration
```

### Error Handling

- **Proxy API Error**: Falls back to static JSON
- **Blogger API Error**: Proxy returns 500, triggers fallback
- **Parse Error**: Falls back to static JSON
- **Network Error**: Falls back to static JSON
- **Empty Response**: Falls back to static JSON

### Performance

- **Proxy Fetch**: ~200-500ms (each request)
- **Browser Cached Response**: ~10-50ms (within 5 min)
- **Fallback Load**: ~100ms (static file)
- **Rotation**: 10 seconds interval
- **Memory**: Minimal (~1KB per item)
- **Browser Cache Duration**: 5 minutes (300s)

### API Proxy Details

**Endpoint**: `/api/hotpost`

**Caching Strategy**:
- **No Server-Side Cache**: `export const dynamic = 'force-dynamic'`
- **No Next.js Fetch Cache**: `cache: 'no-store'`
- **Browser Cache Only**: `Cache-Control: public, max-age=300`
- **Why?**: Avoids edge function invocations from server-side revalidation
- **Impact**: Each client caches in browser for 5 minutes

**CORS Headers**:
- `Access-Control-Allow-Origin: *` - Allows requests from any origin
- `Access-Control-Allow-Methods: GET` - Only GET method allowed

**Error Response**:
```json
{
  "error": "Failed to fetch hot post data"
}
```

**Vercel Hobby Plan Optimization**:
- No server-side caching to avoid revalidation invocations
- Browser-side caching reduces repeated requests
- Minimal edge function usage per unique client

## Example Blogger Post

**Title**: Hot Post Configuration

**Category/Labels**: hotpost

**Content**:
```json
[
  {
    "slug": "uyirnaadi-nanbane-lyrics-tamil",
    "title": "Uyirnaadi Nanbane Lyrics Tamil - Coolie",
    "movieName": "Coolie",
    "singerName": "Anirudh, Sai Smriti"
  },
  {
    "slug": "aasa-kooda-lyrics-tamil",
    "title": "Aasa Kooda Lyrics Tamil - Saba Nayagan",
    "movieName": "Saba Nayagan",
    "singerName": "Sean Roldan, Sanjana Kalmanje"
  }
]
```

**Published**: Yes

**Visibility**: Public

## Troubleshooting

### Hot post not appearing?

1. Check if Blogger post exists with `hotpost` category
2. Verify JSON format is valid
3. Check browser console for errors
4. Verify `/hot-post.json` exists as fallback

### Rotation not working?

- Ensure Blogger content has array with multiple items
- Check browser console for JavaScript errors
- Verify items are valid JSON objects

### Showing old content?

- Clear browser cache
- Check Blogger post is published (not draft)
- Wait 30 seconds for cache to expire

## SEO Impact

- ✅ No impact on Core Web Vitals (client-side only)
- ✅ No blocking requests during page load
- ✅ Progressive enhancement pattern

## Future Enhancements

- [ ] Add animation during rotation transitions
- [ ] Track clicks per hot post item
- [ ] A/B testing for multiple variants
- [ ] Admin dashboard for managing hot posts
- [ ] Schedule hot posts with start/end dates
