# Cache Management Guide

## Revalidate API - Clear Caches

The revalidate API now clears **BOTH** caches:
1. ✅ Next.js ISR cache (revalidatePath/revalidateTag)
2. ✅ Custom date-based cache (in-memory)

### Usage

#### Option 1: Browser (GET) - Easy Testing
```
http://localhost:3000/api/revalidate?secret=YOUR_SECRET&clearAll=true
http://localhost:3000/api/revalidate?secret=YOUR_SECRET&path=/
http://localhost:3000/api/revalidate?secret=YOUR_SECRET&path=/search
http://localhost:3000/api/revalidate?secret=YOUR_SECRET&tag=song-monica-coolie-lyrics-tamil
```

**Production:**
```
https://tsonglyrics.com/api/revalidate?secret=YOUR_SECRET&clearAll=true
```

#### Option 2: curl (POST) - Recommended
```bash
# Clear ALL caches (nuclear option)
curl -X POST http://localhost:3000/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"clearAll": true, "secret": "9cQqqaV6l6OPYhslilv1RCXhsVRZ4CVQ3wTYV3Vcck5axiU4BPcCApHV9aT0yUhO"}'

# Clear home page cache
curl -X POST http://localhost:3000/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"path": "/", "secret": "9cQqqaV6l6OPYhslilv1RCXhsVRZ4CVQ3wTYV3Vcck5axiU4BPcCApHV9aT0yUhO"}'

# Clear search page cache
curl -X POST http://localhost:3000/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"path": "/search", "secret": "9cQqqaV6l6OPYhslilv1RCXhsVRZ4CVQ3wTYV3Vcck5axiU4BPcCApHV9aT0yUhO"}'

# Clear specific song cache
curl -X POST http://localhost:3000/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"tag": "song-monica-coolie-lyrics-tamil", "secret": "9cQqqaV6l6OPYhslilv1RCXhsVRZ4CVQ3wTYV3Vcck5axiU4BPcCApHV9aT0yUhO"}'
```

### Response
```json
{
  "revalidated": true,
  "type": "all" | "path" | "tag",
  "message": "All caches cleared",
  "now": 1767280049000
}
```

### What Gets Cleared

| Action | Custom Cache | Next.js Cache | Use Case |
|--------|--------------|---------------|----------|
| `clearAll=true` | ✅ ALL | ✅ /, /search, trending | New post added |
| `path=/` | ✅ songs:latest | ✅ / | Home page update |
| `path=/search` | ✅ search:*, popular:* | ✅ /search, /api/trending | Search/trending update |
| `path=/api/trending` | - | ✅ /api/trending | Trending API only |
| `path=/api/search/autocomplete` | ✅ search:* | - | Autocomplete cache only |
| `path=/api/search/popular` | ✅ popular:* | - | Popular posts cache only |
| `path=/song.html` | ✅ *song* | ✅ /song.html | Specific song update |
| `tag=song-slug` | ✅ *slug* | ✅ tag | Song page update |

### Cache Durations

| API/Page | Cache Duration | Auto-Refresh | Manual Clear Path |
|----------|----------------|--------------|-------------------|
| `/search` page | No cache | - | `/search` |
| `/api/trending` | 1 hour | ✅ Every 1hr | `/api/trending` or `/search` |
| `/api/search?autocomplete=true` | 24 hours | - | `/api/search/autocomplete` |
| `/api/search?popular=true` | 24 hours | - | `/api/search/popular` |
| `/api/search` (regular) | 5 minutes | - | - |

### When to Clear Cache

1. **New Song Posted** → `clearAll=true`
2. **Song Lyrics Updated** → `tag=song-slug` or `path=/song.html`
3. **Home Page Issues** → `path=/`
4. **Trending Not Updating** → `path=/search`

### Important Notes

⚠️ **Development Mode**: `revalidatePath`/`revalidateTag` don't work in dev (Next.js always fetches fresh). Custom cache clearing DOES work.

⚠️ **Production**: All cache clearing works as expected.

⚠️ **Secret**: Keep `REVALIDATE_SECRET` secure. Current: `9cQqqaV6l6OPYhslilv1RCXhsVRZ4CVQ3wTYV3Vcck5axiU4BPcCApHV9aT0yUhO`

### Bookmarklet (Easy Browser Access)
Create a bookmark with this as the URL:
```javascript
javascript:(function(){fetch('https://tsonglyrics.com/api/revalidate?secret=9cQqqaV6l6OPYhslilv1RCXhsVRZ4CVQ3wTYV3Vcck5axiU4BPcCApHV9aT0yUhO&clearAll=true').then(r=>r.json()).then(d=>alert('Cache cleared: '+JSON.stringify(d)))})()
```

Click it anytime to clear all caches!
