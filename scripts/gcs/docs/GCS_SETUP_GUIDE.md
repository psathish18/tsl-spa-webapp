# Google Cloud Storage Setup Guide for OG Images

## Overview

This guide walks you through setting up Google Cloud Storage (GCS) to host your OG images for social media posts. Images will be automatically uploaded to GCS and served via public URLs when posting to Blogger.

## Why Google Cloud Storage?

✅ **Cost-Effective**: Free tier includes 5 GB storage + 1 GB network egress/month  
✅ **High Performance**: Global CDN with edge caching  
✅ **Scalable**: Handles growing traffic without Vercel hobby plan limits  
✅ **Reliable**: 99.95% SLA uptime guarantee  
✅ **SEO-Friendly**: Fast image loading improves page performance  

### Cost Estimation

For 3,000 songs with ~100 KB images each:
- **Storage**: ~300 MB (~$0.006/month)
- **Network**: ~30 GB/month for 10,000 views (~$0.36/month)
- **Operations**: ~10,000 reads/month (free under Class A operations)

**Total**: ~$0.40/month (well within free tier for initial growth)

---

## Prerequisites

- Google Cloud Platform account (free tier available)
- `gcloud` CLI installed (optional, for setup automation)
- Project with billing enabled (required even for free tier)

---

## Step 1: Create Google Cloud Project

### Via Console (GUI)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project details:
   - **Project name**: `tsonglyrics-prod` (or your choice)
   - **Project ID**: `tsonglyrics-prod-123456` (auto-generated, note this)
   - **Organization**: None (or select if you have one)
4. Click **Create**
5. Wait for project creation (~30 seconds)

### Via gcloud CLI

```bash
# Login to Google Cloud
gcloud auth login

# Create new project
gcloud projects create tsonglyrics-prod --name="TSongLyrics Production"

# Set as default project
gcloud config set project tsonglyrics-prod

# Enable billing (required for GCS)
# You'll need to link a billing account via console
```

---

## Step 2: Enable Cloud Storage API

### Via Console

1. Navigate to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for "Cloud Storage API"
3. Click **Enable**

### Via gcloud CLI

```bash
gcloud services enable storage.googleapis.com
```

---

## Step 3: Create Storage Bucket

### Via Console

1. Go to [Cloud Storage > Buckets](https://console.cloud.google.com/storage/browser)
2. Click **Create Bucket**

#### Configuration:

**Bucket Name**: `tsonglyrics-og-images` (must be globally unique)
- If taken, try: `tsonglyrics-og-images-prod`, `your-domain-og-images`, etc.

**Location**: 
- **Type**: Multi-region
- **Region**: `US` or `ASIA` (choose closest to your audience)
  - For Indian audience: Choose `ASIA`
  - For global: Choose `US`

**Storage Class**: Standard (best for frequently accessed content)

**Access Control**: 
- Select **Uniform** (recommended for public buckets)

**Protection Tools**:
- Uncheck "Enforce public access prevention" (we need public access)
- Soft delete policy: 7 days (default)

**Advanced Settings** (optional):
- Encryption: Google-managed key (default)
- Retention policy: None

3. Click **Create**

### Via gcloud CLI

```bash
# Create bucket in US multi-region
gsutil mb -c STANDARD -l US gs://tsonglyrics-og-images

# OR create in Asia multi-region
gsutil mb -c STANDARD -l ASIA gs://tsonglyrics-og-images

# Make bucket publicly readable (required for OG images)
gsutil iam ch allUsers:objectViewer gs://tsonglyrics-og-images
```

---

## Step 4: Configure Bucket Permissions

We need to make the bucket publicly readable so images can be accessed via direct URLs.

### Via Console

1. Go to your bucket page
2. Click **Permissions** tab
3. Click **Grant Access**
4. Enter:
   - **New principals**: `allUsers`
   - **Role**: `Storage Object Viewer`
5. Click **Save**
6. Confirm warning about public access

### Via gcloud CLI

```bash
# Grant public read access
gsutil iam ch allUsers:objectViewer gs://tsonglyrics-og-images

# Verify permissions
gsutil iam get gs://tsonglyrics-og-images
```

---

## Step 5: Create Service Account

Service accounts are used to authenticate from your Node.js scripts and GitHub Actions.

### Via Console

1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **Create Service Account**

#### Service Account Details:
- **Name**: `og-image-uploader`
- **Description**: Service account for uploading OG images to Cloud Storage
- Click **Create and Continue**

#### Grant Permissions:
- **Role**: `Storage Object Creator` (allows upload to bucket)
- **Alternative**: `Storage Object Admin` (allows upload, delete, and list)
- Click **Continue**

#### Grant Access (optional):
- Skip this step
- Click **Done**

3. Find your new service account in the list
4. Click the **⋮** menu → **Manage keys**
5. Click **Add Key** → **Create new key**
6. Select **JSON** format
7. Click **Create**
8. Save the downloaded JSON file as `gcs-service-account.json`

**⚠️ IMPORTANT**: Keep this file secure! It grants access to your GCS bucket.

### Via gcloud CLI

```bash
# Create service account
gcloud iam service-accounts create og-image-uploader \
  --display-name="OG Image Uploader" \
  --description="Service account for uploading OG images"

# Get service account email
SA_EMAIL=$(gcloud iam service-accounts list \
  --filter="displayName:OG Image Uploader" \
  --format="value(email)")

# Grant Storage Object Admin role
gsutil iam ch serviceAccount:${SA_EMAIL}:objectAdmin gs://tsonglyrics-og-images

# Create and download key
gcloud iam service-accounts keys create gcs-service-account.json \
  --iam-account=${SA_EMAIL}

echo "✅ Service account key saved to gcs-service-account.json"
```

---

## Step 6: Configure Environment Variables

### For Local Development

Create or update `.env.local` file:

```bash
# Google Cloud Storage Configuration
GCS_BUCKET_NAME=tsonglyrics-og-images
GCS_PROJECT_ID=tsonglyrics-prod-123456
GOOGLE_APPLICATION_CREDENTIALS=./scripts/gcs/gcs-service-account.json
```

Move your service account JSON file:
```bash
mv ~/Downloads/gcs-service-account.json ./scripts/gcs/gcs-service-account.json
```

**Security**: Add to `.gitignore`:
```bash
echo "scripts/gcs-service-account.json" >> .gitignore
```

### For GitHub Actions (CI/CD)

You need to convert the JSON key to base64 for secure storage in GitHub Secrets.

#### Convert Service Account Key

```bash
# On macOS/Linux
base64 -i scripts/gcs-service-account.json | tr -d '\n' > gcs-key-base64.txt

# On Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("scripts\gcs-service-account.json")) | Out-File gcs-key-base64.txt
```

#### Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add these secrets:

| Name | Value | Description |
|------|-------|-------------|
| `GCS_BUCKET_NAME` | `tsonglyrics-og-images` | Your bucket name |
| `GCS_PROJECT_ID` | `tsonglyrics-prod-123456` | Your project ID |
| `GCS_SERVICE_ACCOUNT_KEY` | [base64 string from file] | Base64-encoded service account JSON |

4. Save all secrets

### For Vercel Deployment (Optional)

If you plan to use GCS in Vercel Edge Functions or API Routes:

1. Go to your Vercel project settings
2. Click **Environment Variables**
3. Add the same variables:
   - `GCS_BUCKET_NAME`
   - `GCS_PROJECT_ID`
   - `GCS_SERVICE_ACCOUNT_KEY` (base64 encoded)

---

## Step 7: Update GitHub Actions Workflow

Add environment variables to your `.github/workflows/google-trends.yaml`:

```yaml
- name: Post to social media
  run: npm run post-social-media
  env:
    BLOGGER_REFRESH_TOKEN: ${{ secrets.BLOGGER_REFRESH_TOKEN }}
    BLOGGER_CLIENT_ID: ${{ secrets.BLOGGER_CLIENT_ID }}
    BLOGGER_CLIENT_SECRET: ${{ secrets.BLOGGER_CLIENT_SECRET }}
    GCS_BUCKET_NAME: ${{ secrets.GCS_BUCKET_NAME }}
    GCS_PROJECT_ID: ${{ secrets.GCS_PROJECT_ID }}
    GCS_SERVICE_ACCOUNT_KEY: ${{ secrets.GCS_SERVICE_ACCOUNT_KEY }}
```

---

## Step 8: Test the Setup

### Test Locally

```bash
# Install dependencies
npm install

# Test OG image generation with GCS upload
npm run post-social-media
```

**Expected Output:**
```
✅ Google Cloud Storage configured - images will be uploaded to GCS
Reading social media posts from: /path/to/social-media-posts.json
Found 3 posts to publish

Creating post 1/3...
  🎨 Generating OG image...
  ✅ Generated inline SVG
  ✅ Uploaded to GCS: og-images/og-lyrics-romantic-abc123def456.png
  🌐 Made public: og-images/og-lyrics-romantic-abc123def456.png
  https://storage.googleapis.com/tsonglyrics-og-images/og-images/og-lyrics-romantic-abc123def456.png
```

### Test Public Access

Open the GCS URL in your browser:
```
https://storage.googleapis.com/tsonglyrics-og-images/og-images/[filename].png
```

You should see the image rendered.

### Test from Blogger Post

1. Run `npm run post-social-media`
2. Visit https://tslshared.blogspot.com
3. Open the latest post
4. Verify:
   - SVG displays inline
   - PNG `<img>` tag has GCS URL
   - Image loads quickly

---

## Troubleshooting

### Error: "GCS_BUCKET_NAME environment variable is required"

**Cause**: Environment variables not set  
**Fix**: Update `.env.local` or export variables:
```bash
export GCS_BUCKET_NAME=tsonglyrics-og-images
export GCS_PROJECT_ID=tsonglyrics-prod-123456
export GOOGLE_APPLICATION_CREDENTIALS=./scripts/gcs/gcs-service-account.json
```

### Error: "Failed to parse GCS_SERVICE_ACCOUNT_KEY"

**Cause**: Invalid base64 encoding  
**Fix**: Re-encode the service account JSON:
```bash
base64 -i scripts/gcs-service-account.json | tr -d '\n'
```

### Error: "The caller does not have permission"

**Cause**: Service account lacks write permissions  
**Fix**: Grant Storage Object Admin role:
```bash
gsutil iam ch serviceAccount:YOUR_SA_EMAIL:objectAdmin gs://tsonglyrics-og-images
```

### Error: "Bucket not found"

**Cause**: Bucket doesn't exist or wrong name  
**Fix**: Verify bucket exists:
```bash
gsutil ls gs://tsonglyrics-og-images
```

### Images Not Publicly Accessible

**Cause**: Bucket not configured for public access  
**Fix**: Grant public read access:
```bash
gsutil iam ch allUsers:objectViewer gs://tsonglyrics-og-images
```

### 403 Forbidden When Accessing Image

**Cause**: 
1. Public access prevention enabled on bucket
2. Missing `allUsers` viewer permission

**Fix**:
```bash
# Remove public access prevention
gcloud storage buckets update gs://tsonglyrics-og-images --no-public-access-prevention

# Grant public access
gsutil iam ch allUsers:objectViewer gs://tsonglyrics-og-images
```

---

## Monitoring & Management

### View Bucket Contents

```bash
# List all files
gsutil ls gs://tsonglyrics-og-images/og-images/

# List with details (size, date)
gsutil ls -lh gs://tsonglyrics-og-images/og-images/

# Count total files
gsutil ls gs://tsonglyrics-og-images/og-images/ | wc -l
```

### Check Storage Usage

Visit [Cloud Storage > Browser](https://console.cloud.google.com/storage/browser) to see:
- Total storage used
- Number of objects
- Monthly costs

### Set Up Billing Alerts

1. Go to [Billing > Budget & alerts](https://console.cloud.google.com/billing/budgets)
2. Click **Create Budget**
3. Set budget amount: `$5/month` (10x expected cost)
4. Set threshold alerts: 50%, 90%, 100%
5. Enter email for notifications

---

## Cost Optimization Tips

1. **Lifecycle Rules**: Auto-delete old images after 1 year
   ```bash
   # Create lifecycle policy
   cat > lifecycle.json <<EOF
   {
     "lifecycle": {
       "rule": [
         {
           "action": {"type": "Delete"},
           "condition": {"age": 365}
         }
       ]
     }
   }
   EOF
   
   # Apply to bucket
   gsutil lifecycle set lifecycle.json gs://tsonglyrics-og-images
   ```

2. **Compression**: Images are already optimized at ~40-90 KB

3. **CDN Caching**: GCS automatically uses Google's global CDN with edge caching

4. **Monitoring**: Set up budget alerts to avoid surprises

---

## Migration from Local Storage

If you have existing images in `public/og-images/`, migrate them to GCS:

```bash
# Upload all existing images
gsutil -m cp -r public/og-images/* gs://tsonglyrics-og-images/og-images/

# Make them public
gsutil -m acl ch -r -u AllUsers:R gs://tsonglyrics-og-images/og-images

# Verify upload
gsutil ls gs://tsonglyrics-og-images/og-images/ | wc -l
```

---

## Security Best Practices

1. **Never commit service account keys** to git
   - Add to `.gitignore`: `*.json` in scripts folder
   - Use GitHub Secrets for CI/CD

2. **Rotate keys periodically** (every 90 days)
   ```bash
   # Delete old key
   gcloud iam service-accounts keys delete KEY_ID --iam-account=SA_EMAIL
   
   # Create new key
   gcloud iam service-accounts keys create new-key.json --iam-account=SA_EMAIL
   ```

3. **Use least privilege**
   - Service account only needs `Storage Object Creator` role
   - Don't grant `Owner` or `Editor` roles

4. **Monitor access logs**
   - Enable Cloud Audit Logging for security monitoring
   - Review access patterns monthly

---

## Next Steps

1. ✅ Complete setup following this guide
2. ✅ Test locally with `npm run post-social-media`
3. ✅ Update GitHub secrets
4. ✅ Test GitHub Actions workflow
5. ✅ Set up billing alerts
6. ✅ Monitor first week of usage

---

## Support Resources

- [GCS Documentation](https://cloud.google.com/storage/docs)
- [GCS Pricing Calculator](https://cloud.google.com/products/calculator)
- [Node.js Client Library](https://googleapis.dev/nodejs/storage/latest/)
- [GitHub: @google-cloud/storage](https://github.com/googleapis/nodejs-storage)

---

## Summary

After completing this setup:

✅ OG images automatically uploaded to Google Cloud Storage  
✅ Served via fast global CDN  
✅ Public URLs work in Blogger and Twitter  
✅ Within free tier limits for initial growth  
✅ Scalable as traffic increases  
✅ Works in local dev, GitHub Actions, and Vercel  

**Cost**: ~$0.40/month for 3,000 songs (well within $300 free trial credit)

**Performance**: Images load from nearest edge location globally, improving SEO and user experience.
