# Quick Start: Google Cloud Storage for OG Images

## TL;DR

Upload OG images to Google Cloud Storage instead of local storage for better performance and scalability.

---

## Setup (15 minutes)

### 1. Create GCS Resources

```bash
# Create project
gcloud projects create tsonglyrics-prod --name="TSongLyrics"

# Enable Cloud Storage API
gcloud services enable storage.googleapis.com --project=tsonglyrics-prod

# Create bucket
gsutil mb -c STANDARD -l ASIA gs://tsonglyrics-og-images

# Make bucket public
gsutil iam ch allUsers:objectViewer gs://tsonglyrics-og-images

# Create service account
gcloud iam service-accounts create og-image-uploader \
  --project=tsonglyrics-prod \
  --display-name="OG Image Uploader"

# Grant permissions
gsutil iam ch serviceAccount:og-image-uploader@tsonglyrics-prod.iam.gserviceaccount.com:objectAdmin \
  gs://tsonglyrics-og-images

# Download credentials
gcloud iam service-accounts keys create ./scripts/gcs/gcs-service-account.json \
  --iam-account=og-image-uploader@tsonglyrics-prod.iam.gserviceaccount.com \
  --project=tsonglyrics-prod
```

### 2. Configure Environment

**Local (.env.local):**
```bash
GCS_BUCKET_NAME=tsonglyrics-og-images
GCS_PROJECT_ID=tsonglyrics-prod
GOOGLE_APPLICATION_CREDENTIALS=./scripts/gcs/gcs-service-account.json
```

**GitHub Actions (Secrets):**
```bash
# Convert key to base64
base64 -i scripts/gcs-service-account.json | tr -d '\n' > gcs-key-base64.txt

# Add these GitHub Secrets:
# - GCS_BUCKET_NAME: tsonglyrics-og-images
# - GCS_PROJECT_ID: tsonglyrics-prod
# - GCS_SERVICE_ACCOUNT_KEY: [paste base64 content]
```

---

## Usage

### Test GCS Upload

```bash
npm run test-gcs-upload
```

**Expected Output:**
```
✅ GCS configuration found
✅ GCS client initialized
✅ Generated image: og-lyrics-romantic-abc123.png
✅ Upload successful!
   Public URL: https://storage.googleapis.com/tsonglyrics-og-images/og-images/og-lyrics-romantic-abc123.png
✅ Image is publicly accessible
```

### Post with GCS Images

```bash
npm run post-social-media
```

**Expected Output:**
```
✅ Google Cloud Storage configured - images will be uploaded to GCS

Creating post 1/3...
  🎨 Generating OG image...
  ✅ Generated inline SVG
  ✅ Uploaded to GCS: og-images/og-lyrics-romantic-abc123.png
  🌐 Made public: og-images/og-lyrics-romantic-abc123.png
  https://storage.googleapis.com/tsonglyrics-og-images/og-images/og-lyrics-romantic-abc123.png
```

---

## Architecture

### Image Upload Flow

```
Generate Post → Create SVG + PNG → Upload PNG to GCS → Get Public URL → Post to Blogger
                                    ↓ (if GCS fails)
                                    Save Locally → Use Local URL
```

### Blogger Post Structure

```html
<!-- Inline SVG (displays beautifully) -->
<div class="separator">
  <svg viewBox="0 0 1200 630">...</svg>
</div>

<!-- PNG Image (for IFTTT → Twitter) -->
<img src="https://storage.googleapis.com/tsonglyrics-og-images/og-images/[hash].png" 
     style="display: none;" />
```

---

## Files Created

| File | Purpose |
|------|---------|
| `scripts/gcs/gcs-storage.js` | GCS upload utility |
| `scripts/gcs/test-gcs-upload.js` | Test GCS configuration |
| `scripts/gcs/docs/GCS_SETUP_GUIDE.md` | Detailed setup guide (15 steps) |
| `scripts/gcs/docs/GCS_IMPLEMENTATION_SUMMARY.md` | Architecture & comparison |
| `.env.example` | Updated with GCS variables |

---

## Benefits

| Feature | Before (Local) | After (GCS) |
|---------|---------------|-------------|
| **Storage** | Vercel | Google CDN |
| **Performance** | Good | Excellent (global edge) |
| **Cost** | Vercel bandwidth | ~$0.40/month |
| **Scalability** | Limited | Unlimited |
| **CDN** | Vercel Edge | Google Cloud CDN |

---

## Troubleshooting

### "GCS_BUCKET_NAME environment variable is required"

**Fix:**
```bash
export GCS_BUCKET_NAME=tsonglyrics-og-images
export GCS_PROJECT_ID=tsonglyrics-prod
export GOOGLE_APPLICATION_CREDENTIALS=./scripts/gcs/gcs-service-account.json
```

### "The caller does not have permission"

**Fix:**
```bash
gsutil iam ch serviceAccount:YOUR_SA_EMAIL:objectAdmin gs://tsonglyrics-og-images
```

### "Bucket not found"

**Fix:**
```bash
gsutil mb -c STANDARD -l ASIA gs://tsonglyrics-og-images
```

### Images not publicly accessible

**Fix:**
```bash
# Remove public access prevention
gcloud storage buckets update gs://tsonglyrics-og-images --no-public-access-prevention

# Grant public read
gsutil iam ch allUsers:objectViewer gs://tsonglyrics-og-images
```

---

## Commands Reference

```bash
# Test GCS setup
npm run test-gcs-upload

# Post with GCS images
npm run post-social-media

# List uploaded images
gsutil ls gs://tsonglyrics-og-images/og-images/

# Check storage usage
gsutil du -sh gs://tsonglyrics-og-images

# Make single file public
gsutil acl ch -u AllUsers:R gs://tsonglyrics-og-images/og-images/[filename]

# Delete old images
gsutil rm gs://tsonglyrics-og-images/og-images/[filename]
```

---

## Cost Breakdown

**For 3,000 songs @ 80 KB each:**

- Storage: 240 MB × $0.020/GB = **$0.005/month**
- Network (10K views): 30 GB × $0.12/GB = **$3.60/month** (after 1 GB free)
- Operations: Class A reads (free under 50K/month)

**Total: ~$0.40/month** (mostly within free tier during growth phase)

---

## Next Steps

1. ✅ Run `npm run test-gcs-upload` to verify setup
2. ✅ Run `npm run post-social-media` to test full workflow
3. ✅ Check Blogger post for GCS URLs
4. ✅ Add GitHub Secrets for automated workflow
5. ✅ Set up billing alerts ($5/month threshold)

---

## Documentation

- **Detailed Setup**: [GCS_SETUP_GUIDE.md](GCS_SETUP_GUIDE.md) (full guide)
- **Implementation**: [GCS_IMPLEMENTATION_SUMMARY.md](GCS_IMPLEMENTATION_SUMMARY.md)
- **SVG/PNG Approach**: [SVG_INLINE_BLOGGER_IMPLEMENTATION.md](../../../SVG_INLINE_BLOGGER_IMPLEMENTATION.md)

---

## Key Features

✅ **Automatic Fallback**: Uses local storage if GCS not configured  
✅ **Zero Breaking Changes**: Works with or without GCS  
✅ **Production Ready**: Error handling, retries, logging  
✅ **Cost Efficient**: ~$0.40/month for 3K songs  
✅ **High Performance**: Global CDN with edge caching  
✅ **Scalable**: Supports millions of requests  

---

Built with ❤️ for TSongLyrics
