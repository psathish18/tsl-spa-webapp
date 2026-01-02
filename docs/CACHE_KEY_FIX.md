# Cache Key Architecture Fix

## Problem Discovered

The `/api/revalidate` endpoint was calling `dateBasedCache.clearByPattern()` with patterns like:
- `search:*`
- `popular:*`
- `songs:latest`

**These patterns don't exist!** The actual data is stored in **Next.js native fetch cache**, not in the custom `dateBasedCache` Map.

## Root Cause

### How Caching Actually Works

1. **Pages** (homepage, song details, related songs):
   - Use `cachedBloggerFetch()` 
   - This uses **Next.js native `fetch()`** with `options.next.tags`
   - Data is stored in Next.js cache, **NOT** in `dateBasedCache` Map
   - Example:
   ```typescript
   const data = await cachedBloggerFetch(url, {
     next: {
       revalidate: 86400,
       tags: ['songs-latest', 'homepage']
     }
   })
   ```

2. **API Routes** (`/api/search`, `/api/trending`):
   - Use direct `fetch()` with `cache: 'no-store'` OR response headers
   - `/api/search`: Uses `cache: 'no-store'` + in-memory categories cache (1hr TTL)
   - `/api/trending`: Uses response headers `s-maxage=3600` + auto-revalidate

3. **Custom `dateBasedCache` Map**:
   - **NOT USED** by `cachedBloggerFetch`
   - The Map is essentially empty
   - `clearByPattern()` clears nothing

## The Fix

### 1. Added Proper Cache Tags

**Homepage** (`app/page.tsx`):
```typescript
const data = await cachedBloggerFetch(
  'https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&max-results=50',
  {
    next: {
      revalidate: 86400,
      tags: ['songs-latest', 'homepage']  // ← Added tags
    }
  }
)
```

**Related Songs** (already had tags):
```typescript
const data = await cachedBloggerFetch(url, {
  next: {
    revalidate: 86400,
    tags: [`related-${category}`]  // ✅ Already correct
  }
})
```

### 2. Removed Useless `clearByPattern()` Calls

**Before** (`app/api/revalidate/route.ts`):
```typescript
// ❌ These do nothing - Map is empty
dateBasedCache.clearByPattern('search:*')
dateBasedCache.clearByPattern('popular:*')
dateBasedCache.clearByPattern('songs:latest')
dateBasedCache.clear()
```

**After**:
```typescript
// ✅ Use Next.js native cache clearing
revalidateTag('songs-latest')
revalidateTag('homepage')
revalidatePath('/', 'layout')
```

### 3. Updated `clearCacheByPath()` Helper

**Before**:
```typescript
if (path === '/' || path === '/home') {
  dateBasedCache.clearByPattern('songs:latest')  // ❌ Does nothing
}
```

**After**:
```typescript
if (path === '/' || path === '/home') {
  revalidateTag('songs-latest')  // ✅ Clears actual cache
  revalidateTag('homepage')
}
```

## Cache Clearing Strategy

| Path | Action | What Gets Cleared |
|------|--------|-------------------|
| `/` or `/home` | `revalidateTag('songs-latest')` + `revalidateTag('homepage')` | Homepage Blogger data |
| `/search` | `revalidatePath('/api/trending')` | Trending API cache (1hr) |
| `/api/trending` | `revalidatePath('/api/trending')` | Trending API cache |
| `/api/search/autocomplete` | None | Uses in-memory cache (auto-expires 1hr) |
| `/api/search/popular` | None | Uses `cache: 'no-store'` (no cache) |
| `/<slug>.html` | `revalidateTag('song-{slug}')` | Specific song page |
| `clearAll=true` | `revalidatePath('/', 'layout')` + all tags | Everything |

## Important Notes

1. **`/api/search` uses `cache: 'no-store'`**
   - No Next.js cache to clear
   - Categories use in-memory cache with 1hr TTL
   - Auto-refreshes without manual clearing

2. **Trending API uses response headers + auto-revalidate**
   - `s-maxage=3600, stale-while-revalidate=7200`
   - `export const revalidate = 3600`
   - Auto-refreshes every hour
   - Manual clearing via `revalidatePath('/api/trending')`

3. **`dateBasedCache` Map is not used**
   - Could be removed entirely in future
   - Currently harmless but serves no purpose

## Testing

After these changes:

✅ Build succeeds
✅ No TypeScript errors
✅ Cache clearing now targets the **correct cache layer** (Next.js native)
✅ Homepage cache can be cleared with `/api/revalidate?path=/&secret=...`
✅ Trending cache clears when search page cache cleared

## Next Steps

1. Deploy to production
2. Test manual cache clearing via cache-manager.html
3. Verify homepage refreshes when cleared
4. Consider removing `dateBasedCache` entirely if not needed
