# Hybrid CDN Cache - Quick Reference Guide

## 🎯 Quick Commands

### Clear All Caches for a Song (Most Common)
```bash
curl "https://tsonglyrics.com/api/revalidate?secret=YOUR_SECRET&path=/monica-coolie-lyrics.html&type=all"
```
**Clears:** Page cache + CDN static file + API route

---

### After Updating `/public/songs/*.json`
```bash
# 1. Update and deploy
cp blob-data/song.json public/songs/
git add public/songs/song.json && git commit -m "Update song" && git push

# 2. Optional: Clear page cache for immediate effect
curl "https://tsonglyrics.com/api/revalidate?secret=YOUR_SECRET&path=/song.html&type=page"
```

---

### After Updating Blob Storage
```bash
# 1. Upload to blob
npm run upload-to-blob

# 2. Clear API cache
curl "https://tsonglyrics.com/api/revalidate?secret=YOUR_SECRET&path=/song.html&type=api"
```

---

### Emergency: Clear Everything
```bash
curl "https://tsonglyrics.com/api/revalidate?secret=YOUR_SECRET&clearAll=true"
```

---

## 📋 Cache Type Reference

| Type | Clears | Use When |
|------|--------|----------|
| `all` | Page + CDN + API | General updates (default) |
| `page` | Song page HTML | Page-specific changes |
| `cdn` | `/songs/*.json` | After updating /public/songs |
| `api` | `/api/songs/*` | After updating blob storage |

---

## 🔄 Common Workflows

### Workflow 1: Update Existing Song (in /public/songs)
```bash
npm run generate-song-json -- --category="Movie:Coolie"
cp blob-data/monica-coolie-lyrics.json public/songs/
git add public/songs && git commit -m "Update lyrics" && git push
# ✅ Auto-deployed, CDN cache cleared
```

### Workflow 2: Add New Song (via Blob)
```bash
npm run generate-song-json -- --category="Song:NewSong"
npm run upload-to-blob
curl "https://tsonglyrics.com/api/revalidate?secret=SECRET&path=/new-song.html&type=api"
# ✅ Instantly available, CDN cached after first request
```

### Workflow 3: Weekly Batch (Move to CDN)
```bash
npm run generate-song-json
cp blob-data/*.json public/songs/
git add public/songs && git commit -m "Weekly update" && git push
# ✅ All songs now on CDN (zero cost)
```

---

## 🔍 Troubleshooting

### Song not updating?
```bash
# Clear all caches
curl "https://tsonglyrics.com/api/revalidate?secret=SECRET&path=/song.html&type=all"

# Wait 30 seconds for CDN propagation
sleep 30

# Test
curl -I https://tsonglyrics.com/song.html
```

### Check if song is in CDN
```bash
# Should return 200 if in /public/songs
curl -I https://tsonglyrics.com/songs/monica-coolie-lyrics.json
```

### Check if song is in API cache
```bash
# Should return 200 and JSON data
curl https://tsonglyrics.com/api/songs/monica-coolie-lyrics
```

---

## 🔐 Setup

Add to Vercel environment variables:
```
REVALIDATE_SECRET=your-secret-token-here
```

---

## 📊 Cache Layer Summary

```
Request Flow:
┌─────────────┐
│ User visits │
│ song page   │
└──────┬──────┘
       │
       ↓
┌──────────────────────┐
│ Try CDN static file  │ ← FREE, <50ms (99% of traffic)
│ /songs/*.json        │
└──────┬───────────────┘
       │
    Found? ──Yes──→ ✅ Serve from CDN
       │
      No
       │
       ↓
┌──────────────────────┐
│ Try API route        │ ← 1 invocation, CDN cached
│ /api/songs/*         │
└──────┬───────────────┘
       │
    Found? ──Yes──→ ✅ Serve from API (cached 30d)
       │
      No
       │
       ↓
┌──────────────────────┐
│ Fallback to          │ ← ISR cached
│ Blogger API          │
└──────────────────────┘
```

---

## 💡 Best Practices

1. ✅ **For existing songs**: Update via `/public/songs` + deploy
2. ✅ **For new songs**: Upload to blob first, move to CDN weekly
3. ✅ **For urgent fixes**: Use revalidation API with `type=all`
4. ✅ **Monitor costs**: Check Vercel dashboard for invocations
5. ⚠️ **Avoid**: Frequent `clearAll` operations (impacts performance)

---

## 🔗 Full Documentation

- **Hybrid CDN Implementation**: `/HYBRID_CDN_IMPLEMENTATION.md`
- **Cache Management Guide**: `/cache/CACHE_MANAGEMENT_GUIDE.md`
- **Memory Optimization Plan**: `/MEMORY_OPTIMIZATION_PLAN.md`

---

*Last Updated: January 11, 2026*
