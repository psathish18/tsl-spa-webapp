# Google Cloud Storage (GCS) Integration

This folder contains all Google Cloud Storage related scripts and documentation for uploading and managing OG images.

## 📁 Folder Structure

```
scripts/gcs/
├── gcs-storage.js              # GCS upload utility module
├── test-gcs-upload.js          # Test script for GCS configuration
└── docs/                       # Documentation
    ├── GCS_QUICK_START.md      # Quick start guide (1 page)
    ├── GCS_SETUP_GUIDE.md      # Detailed setup instructions (15 steps)
    ├── GCS_IMPLEMENTATION_SUMMARY.md  # Architecture comparison
    └── GCS_INTEGRATION_COMPLETE.md   # Complete implementation docs
```

## 🚀 Quick Start

### Test GCS Upload
```bash
npm run test-gcs-upload
```

### Post with GCS Images
```bash
npm run post-social-media
```

## 📚 Documentation

- **[Quick Start](docs/GCS_QUICK_START.md)** - Get started in 5 minutes
- **[Setup Guide](docs/GCS_SETUP_GUIDE.md)** - Complete setup instructions
- **[GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md)** - Configure workflow credentials ⭐ NEW
- **[Implementation](docs/GCS_IMPLEMENTATION_SUMMARY.md)** - Architecture details
- **[Integration Docs](docs/GCS_INTEGRATION_COMPLETE.md)** - Full implementation

## ⚙️ Configuration

Required environment variables:

```bash
# Local development (.env.local)
GCS_BUCKET_NAME=your-bucket-name
GCS_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./scripts/gcs/gcs-service-account.json

# CI/CD (GitHub Secrets)
GCS_BUCKET_NAME=your-bucket-name
GCS_PROJECT_ID=your-project-id
GCS_SERVICE_ACCOUNT_KEY=<base64-encoded-json>
```

## 🎯 Key Features

✅ Automatic upload to Google Cloud Storage  
✅ Graceful fallback to local storage  
✅ Global CDN (200+ edge locations)  
✅ Cost efficient (~$0.40/month for 3K songs)  
✅ Zero config required (works without GCS)  
✅ Production ready with error handling  

## 💻 Usage

### In Code

```javascript
const GCSStorage = require('./gcs/gcs-storage');

// Check if configured
if (GCSStorage.isConfigured()) {
  const gcs = new GCSStorage();
  
  // Upload file
  const publicUrl = await gcs.uploadFile(buffer, 'filename.png', {
    contentType: 'image/png',
    folder: 'og-images',
    makePublic: true
  });
  
  console.log('Uploaded to:', publicUrl);
}
```

### CLI Commands

```bash
# Test GCS configuration
npm run test-gcs-upload

# Post to social media with GCS images
npm run post-social-media

# List uploaded images
gsutil ls gs://your-bucket-name/og-images/

# Check storage usage
gsutil du -sh gs://your-bucket-name
```

## 🔧 Modules

### gcs-storage.js

Main GCS utility module for uploading images.

**Key Methods:**
- `uploadFile(buffer, filename, options)` - Upload file to GCS
- `fileExists(filename, folder)` - Check if file exists
- `getPublicUrl(filename, folder)` - Get public URL
- `listFiles(folder, maxResults)` - List files in bucket
- `deleteFile(filename, folder)` - Delete file

### test-gcs-upload.js

Test script to verify GCS configuration and upload functionality.

**Tests:**
1. Configuration check
2. Client initialization
3. Image generation
4. Upload to GCS
5. File verification
6. Public access test

## 📊 Cost Information

**Monthly costs for 3,000 songs:**

| Component | Usage | Cost |
|-----------|-------|------|
| Storage | ~240 MB | $0.005 |
| Network | ~30 GB | $3.60 |
| Operations | ~10K reads | Free |
| **Total** | | **~$3.60/month** |

**Free tier includes:**
- 5 GB storage
- 1 GB network egress
- 50K Class A operations

## 🛠️ Development

### Running Tests

```bash
# Test GCS upload
npm run test-gcs-upload

# Expected output:
# ✅ GCS configuration found
# ✅ GCS client initialized
# ✅ Generated image
# ✅ Upload successful
# ✅ Image is publicly accessible
```

### Adding New Features

1. Update `gcs-storage.js` with new methods
2. Add tests in `test-gcs-upload.js`
3. Update documentation in `docs/`
4. Test locally before committing

## 🔒 Security

- Service account credentials are gitignored
- Use minimum required IAM permissions
- Rotate keys every 90 days
- Enable audit logging for production

**Gitignored files:**
- `scripts/gcs-service-account.json`
- `gcs-key-base64.txt`

## 📖 Related Files

- `scripts/post-social-media-to-blogger.js` - Uses GCS for image upload
- `scripts/generate-og-image.js` - Generates images for upload
- `.env.example` - Environment variable template
- `.gitignore` - Excludes GCS credentials

## 🐛 Troubleshooting

See [docs/GCS_SETUP_GUIDE.md](docs/GCS_SETUP_GUIDE.md) for detailed troubleshooting steps.

**Common issues:**
- Missing environment variables
- Invalid service account credentials
- Insufficient IAM permissions
- Bucket not found
- Images not publicly accessible

## 📞 Support

For issues or questions:
1. Check documentation in `docs/` folder
2. Run `npm run test-gcs-upload` for diagnostics
3. Review error messages carefully
4. Verify environment variables are set

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** March 6, 2026
