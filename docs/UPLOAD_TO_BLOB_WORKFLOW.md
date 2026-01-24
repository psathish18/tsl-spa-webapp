# Upload to Blob Workflow

## Overview
This GitHub Actions workflow automatically uploads song JSON files to Vercel Blob Storage when a user comments `/approve` on an issue.

## Trigger
The workflow is triggered when a comment is **created** on an issue (not pull requests) with the exact text `/approve`.

## How It Works

### Workflow Steps

1. **Trigger**: User comments `/approve` on an issue
2. **Checkout**: Clones the repository code
3. **Setup**: Installs Node.js v20 and dependencies
4. **Check Files**: Verifies JSON files exist in `blob-data/` directory
5. **Upload**: Runs `npm run upload-to-blob` to upload files to Vercel Blob
6. **Comment**: Posts success/failure message on the issue

### Workflow Logic

```
Comment "/approve" → Check blob-data/ → Upload to Vercel → Post result comment
```

## Usage

### Prerequisites

1. **Generate JSON files first** by creating an issue:
   - `generate json for recent X song` OR
   - `generate json for category CategoryName`
   
2. **Configure Vercel Blob Token**:
   - Go to repository Settings → Secrets and variables → Actions
   - Add a new secret named `BLOB_READ_WRITE_TOKEN`
   - Get your token from: https://vercel.com/docs/storage/vercel-blob/using-blob-sdk#generate-a-blob-read-write-token

### Step-by-Step Process

1. **Create an issue to generate JSON files:**
   ```
   Title: generate json for recent 5 song
   ```
   - Workflow generates JSON files in `blob-data/`
   - Files are committed to repository

2. **Approve the upload by commenting:**
   ```
   /approve
   ```
   - Workflow uploads files to Vercel Blob Storage
   - Success/failure comment is posted

3. **Verify in Vercel:**
   - Go to https://vercel.com/storage
   - Check that files are uploaded
   - Note your blob storage URL

## Workflow Outputs

### Success Scenario
- **Comment posted**: ✅ Success message with next steps
- **Files uploaded**: All JSON files from `blob-data/` uploaded to Vercel Blob
- **Blob URLs**: Files accessible via Vercel Blob URLs

### No Files Scenario
- **Comment posted**: ❌ Error message explaining no files found
- **Suggestion**: Generate JSON files first

### Error Scenario
- **Comment posted**: ❌ Error message with troubleshooting tips
- **Logs**: Check Actions tab for detailed error information

## Examples

### Example 1: Generate and Upload Recent Songs

**Step 1 - Create issue:**
```
Title: generate json for recent 3 song
```
→ Workflow generates 3 JSON files in `blob-data/`

**Step 2 - Approve upload:**
```
Comment: /approve
```
→ Workflow uploads files to Vercel Blob

### Example 2: Generate and Upload Category Songs

**Step 1 - Create issue:**
```
Title: generate json for category Song:Coolie
```
→ Workflow generates JSON files for Song:Coolie

**Step 2 - Approve upload:**
```
Comment: /approve
```
→ Workflow uploads files to Vercel Blob

## Configuration

### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Storage access token | [Vercel Dashboard](https://vercel.com/docs/storage/vercel-blob/using-blob-sdk#generate-a-blob-read-write-token) |

### Workflow Permissions

The workflow requires:
- `contents: read` - To read repository files
- `issues: write` - To comment on issues

## Troubleshooting

### Workflow doesn't trigger

**Problem**: Commented `/approve` but workflow didn't run

**Solutions**:
- Ensure comment is exactly `/approve` (case-sensitive, no extra spaces)
- Verify you commented on an issue (not a pull request)
- Check that workflow file exists in main branch
- Verify GitHub Actions is enabled

### BLOB_READ_WRITE_TOKEN not configured

**Problem**: Workflow fails with "BLOB_READ_WRITE_TOKEN secret not configured"

**Solution**:
1. Go to repository Settings
2. Navigate to Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `BLOB_READ_WRITE_TOKEN`
5. Value: Your Vercel Blob token
6. Click "Add secret"

### No files found in blob-data/

**Problem**: Workflow reports no JSON files found

**Solution**:
1. First generate JSON files by creating an issue:
   - `generate json for recent 5 song` OR
   - `generate json for category Song:Coolie`
2. Wait for generation workflow to complete
3. Verify files exist in `blob-data/` directory
4. Then comment `/approve`

### Upload fails

**Problem**: Workflow runs but upload fails

**Solutions**:
- Verify `BLOB_READ_WRITE_TOKEN` is valid and not expired
- Check Vercel Blob Storage quota/limits
- Verify network connectivity to Vercel API
- Check workflow logs for specific error messages

## Technical Details

### Workflow File Location
`.github/workflows/upload-to-blob-on-comment.yml`

### Environment Variables
- `BLOB_READ_WRITE_TOKEN` - Required secret for Vercel Blob access

### Upload Script
The workflow uses `scripts/upload-to-blob.ts` which:
- Reads JSON files from `blob-data/` directory
- Uploads to Vercel Blob Storage under `json/` prefix
- Skips files that already exist (unless `--force` flag)
- Provides upload statistics and summary

### Runner
- **OS**: Ubuntu Latest
- **Node.js**: v20.x
- **Package Manager**: npm

## Integration with Generate Workflow

This workflow is designed to work together with the "Generate Song JSON from Issue" workflow:

1. **Generate Workflow** (`generate-song-json-on-issue.yml`):
   - Triggered by creating an issue with specific title
   - Generates JSON files
   - Commits to repository

2. **Upload Workflow** (`upload-to-blob-on-comment.yml`):
   - Triggered by commenting `/approve`
   - Uploads generated files to Vercel Blob
   - Posts confirmation comment

### Typical Workflow

```
┌─────────────────────────────────────────────────────────┐
│ Create Issue: "generate json for recent 5 song"        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Generate Workflow Runs                                  │
│ - Generates 5 JSON files                                │
│ - Commits to blob-data/                                 │
│ - Posts success comment                                 │
│ - Closes issue                                          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ User Comments: "/approve"                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Upload Workflow Runs                                    │
│ - Uploads files to Vercel Blob                          │
│ - Posts upload confirmation                             │
└─────────────────────────────────────────────────────────┘
```

## Security Considerations

- Workflow only runs on issue comments (not PR comments)
- Comment must be exactly `/approve` (prevents accidental triggers)
- Requires repository secrets for Vercel access
- Only repository collaborators can trigger workflows
- Uses GitHub Actions bot with minimal permissions

## Best Practices

1. **Generate before uploading**: Always generate JSON files first
2. **Verify generation**: Check that generation workflow completed successfully
3. **Review files**: Optionally review generated files before uploading
4. **Comment `/approve`**: Trigger upload when ready
5. **Verify upload**: Check Vercel dashboard after upload completes

## Related Documentation

- [Generate Song JSON Workflow](./GENERATE_SONG_JSON_WORKFLOW.md)
- [Workflow Examples](./WORKFLOW_EXAMPLES.md)
- [Testing Guide](./TESTING_WORKFLOW.md)
- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
