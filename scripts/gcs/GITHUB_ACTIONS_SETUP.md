# GitHub Actions Setup for GCS

## Quick Setup Guide

Follow these steps to enable GCS image uploads in your GitHub Actions workflow.

---

## Step 1: Prepare Service Account Key

You need to convert your GCS service account JSON file to base64 format for GitHub Secrets.

### On macOS/Linux:

```bash
# Navigate to your project directory
cd /path/to/tsl-spa-webapp

# Convert service account key to base64 (single line, no wrapping)
base64 -i scripts/gcs/gcs-service-account.json | tr -d '\n' > gcs-key-base64.txt

# Copy the content
cat gcs-key-base64.txt | pbcopy  # macOS
# OR
cat gcs-key-base64.txt           # Linux - copy manually
```

### On Windows (PowerShell):

```powershell
# Convert to base64
[Convert]::ToBase64String([IO.File]::ReadAllBytes("scripts\gcs\gcs-service-account.json")) | Out-File gcs-key-base64.txt

# Copy the content
Get-Content gcs-key-base64.txt | Set-Clipboard
```

**⚠️ IMPORTANT:** The base64 string should be one long line with no line breaks.

---

## Step 2: Add GitHub Secrets

1. Go to your GitHub repository: `https://github.com/psathish18/tsl-spa-webapp`

2. Click **Settings** → **Secrets and variables** → **Actions**

3. Click **New repository secret** button

4. Add these **three secrets** one by one:

### Secret 1: GCS_BUCKET_NAME

| Field | Value |
|-------|-------|
| **Name** | `GCS_BUCKET_NAME` |
| **Secret** | `tsonglyrics-og-images` (or your bucket name) |

Click **Add secret**

### Secret 2: GCS_PROJECT_ID

| Field | Value |
|-------|-------|
| **Name** | `GCS_PROJECT_ID` |
| **Secret** | `tsonglyrics-prod` (or your project ID) |

Click **Add secret**

### Secret 3: GCS_SERVICE_ACCOUNT_KEY

| Field | Value |
|-------|-------|
| **Name** | `GCS_SERVICE_ACCOUNT_KEY` |
| **Secret** | [Paste the entire base64 string from gcs-key-base64.txt] |

Click **Add secret**

---

## Step 3: Verify Workflow Configuration

The workflow file `.github/workflows/google-trends.yaml` should already be configured (updated automatically):

```yaml
- name: Post Social Media Content to Blogger
  env:
    GCS_BUCKET_NAME: ${{ secrets.GCS_BUCKET_NAME }}
    GCS_PROJECT_ID: ${{ secrets.GCS_PROJECT_ID }}
    GCS_SERVICE_ACCOUNT_KEY: ${{ secrets.GCS_SERVICE_ACCOUNT_KEY }}
  run: |
    echo "📱 Posting social media content to Blogger..."
    npm run post-social-media
```

---

## Step 4: Test the Workflow

### Option A: Manual Trigger (Recommended for Testing)

1. Go to **Actions** tab in GitHub
2. Click **Fetch Google Trends and Post to Blogger**
3. Click **Run workflow** button
4. Select branch: `copilot/update-google-trends-workflow`
5. Click **Run workflow**

### Option B: Wait for Scheduled Run

The workflow runs automatically daily at 6 PM IST (12:30 PM UTC).

---

## Step 5: Verify GCS Upload

After the workflow runs:

1. Check the workflow logs:
   - Go to **Actions** tab
   - Click on the latest workflow run
   - Expand **Post Social Media Content to Blogger** step
   - Look for logs like:
     ```
     ✅ Google Cloud Storage configured - images will be uploaded to GCS
     🎨 Generating OG image...
     ✅ Uploaded to GCS: og-images/og-lyrics-romantic-abc123.png
     🌐 Made public: og-images/og-lyrics-romantic-abc123.png
     ```

2. Verify images in GCS:
   ```bash
   # From your local terminal
   gsutil ls gs://tsonglyrics-og-images/og-images/
   ```

3. Check Blogger post:
   - Visit https://tslshared.blogspot.com
   - Open the latest post
   - Inspect the HTML to verify GCS URLs are used

---

## Troubleshooting

### ❌ "GCS_BUCKET_NAME environment variable is required"

**Cause:** GitHub Secrets not configured or wrong names

**Fix:**
- Double-check secret names in GitHub (must match exactly: `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GCS_SERVICE_ACCOUNT_KEY`)
- Ensure secrets are added to the correct repository
- Re-run the workflow

### ❌ "Failed to parse GCS_SERVICE_ACCOUNT_KEY"

**Cause:** Invalid base64 encoding or line breaks in the secret

**Fix:**
```bash
# Re-encode ensuring single line
base64 -i scripts/gcs/gcs-service-account.json | tr -d '\n' | pbcopy

# Update the GitHub Secret with the new value
```

**Common mistake:** Copying base64 with line breaks. The secret should be ONE continuous string.

### ❌ "The caller does not have permission"

**Cause:** Service account lacks required permissions

**Fix:**
```bash
# Grant Storage Object Admin role
gsutil iam ch serviceAccount:og-image-uploader@tsonglyrics-prod.iam.gserviceaccount.com:objectAdmin \
  gs://tsonglyrics-og-images
```

### ❌ Workflow falls back to local storage

**Cause:** GCS configuration issue, but workflow continues (by design)

**Check:**
- Workflow logs show: "⚠️ GCS initialization failed, using local storage fallback"
- This is expected if GCS secrets are not configured
- Images will be saved locally and served from Vercel (works, but not optimal)

---

## What Happens When GCS is Configured

### With GCS Secrets (Recommended):

```
GitHub Actions Workflow
  ↓
npm run post-social-media
  ↓
Detect GCS environment variables
  ↓
Generate PNG image
  ↓
Upload to Google Cloud Storage
  ↓
Get public URL: https://storage.googleapis.com/tsonglyrics-og-images/og-images/[hash].png
  ↓
Post to Blogger with GCS URL
  ↓
IFTTT reads RSS → Posts to Twitter with GCS-hosted image
```

**Benefits:**
- ✅ Images served from global CDN (200+ edge locations)
- ✅ Faster page loads worldwide
- ✅ No Vercel bandwidth usage for images
- ✅ Cost-effective (~$0.40/month)

### Without GCS Secrets (Fallback):

```
GitHub Actions Workflow
  ↓
npm run post-social-media
  ↓
No GCS configuration detected
  ↓
Generate PNG image
  ↓
Save to public/og-images/ (local)
  ↓
Get local URL: https://tsonglyrics.com/og-images/[hash].png
  ↓
Post to Blogger with local URL
  ↓
IFTTT reads RSS → Posts to Twitter with Vercel-hosted image
```

**Works, but:**
- ⚠️ Images served from Vercel CDN (uses your bandwidth quota)
- ⚠️ Risk of hitting hobby plan limits with growth
- ⚠️ Not optimal for global audience

---

## Security Best Practices

1. **Never commit credentials to git:**
   ```bash
   # Already in .gitignore
   scripts/gcs/gcs-service-account.json
   gcs-key-base64.txt
   ```

2. **Rotate keys periodically:**
   - Recommended: Every 90 days
   - Create new service account key
   - Update GitHub Secret
   - Delete old key from GCP

3. **Use minimal permissions:**
   - Service account only needs `Storage Object Admin` role
   - Don't grant `Owner` or `Editor` roles

4. **Monitor access:**
   - Enable Cloud Audit Logging in GCP
   - Review GitHub Actions logs regularly
   - Set up billing alerts

---

## Verification Checklist

After setup, verify everything works:

- [ ] All 3 GitHub Secrets added correctly
- [ ] Workflow file updated with env variables
- [ ] Manual workflow run completed successfully
- [ ] Workflow logs show "✅ Google Cloud Storage configured"
- [ ] Images visible in GCS bucket: `gsutil ls gs://BUCKET/og-images/`
- [ ] Blogger post contains GCS URLs
- [ ] Images load correctly in browser
- [ ] Twitter posts have images attached

---

## Cost Monitoring

Set up billing alerts to avoid surprises:

1. Go to [GCP Billing](https://console.cloud.google.com/billing)
2. Create budget: **$5/month** (10× expected cost)
3. Set alerts at 50%, 90%, 100%
4. Add email notification

**Expected monthly cost:** ~$0.40 for 3,000 songs

---

## Related Documentation

- **Setup Guide**: [GCS_SETUP_GUIDE.md](docs/GCS_SETUP_GUIDE.md) - Complete GCS setup
- **Quick Start**: [GCS_QUICK_START.md](docs/GCS_QUICK_START.md) - Quick reference
- **Main README**: [README.md](README.md) - GCS folder overview

---

## Summary

**To enable GCS in GitHub Actions:**

1. ✅ Convert service account JSON to base64
2. ✅ Add 3 GitHub Secrets (BUCKET_NAME, PROJECT_ID, SERVICE_ACCOUNT_KEY)
3. ✅ Workflow file already configured
4. ✅ Trigger workflow manually to test
5. ✅ Verify logs and GCS bucket

**Note:** If secrets are not configured, the workflow will still work but use local storage (Vercel) for images. GCS is optional but recommended for better performance and cost efficiency.

---

**Setup Time:** ~5 minutes  
**Status:** ✅ Production Ready  
**Last Updated:** March 6, 2026
