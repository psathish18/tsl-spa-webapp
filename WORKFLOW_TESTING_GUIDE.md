# Quick Start Guide: Testing the Automated Lyrics Workflow

This guide will help you test the automated lyrics workflow locally before deploying it to production.

## Prerequisites

1. **API Keys**
   - Google Gemini API Key: https://makersuite.google.com/app/apikey
   - GitHub Personal Access Token: https://github.com/settings/tokens
   - Blogger API Key (optional for full flow): https://console.cloud.google.com/apis/credentials
   - Blog ID (optional for full flow): Your Blogger blog ID

2. **Installed Tools**
   - Node.js 20+
   - npm
   - Git

## Testing Locally

### 1. Install Dependencies

```bash
npm install
```

This will install the newly added dependencies:
- `@google/generative-ai`
- `@octokit/rest`

### 2. Test Lyrics Extraction (requestReview.js)

Set up your environment variables:

```bash
export GEMINI_API_KEY="your-gemini-api-key"
export YT_URL="https://www.youtube.com/watch?v=example"
export GITHUB_TOKEN="your-github-token"
export ISSUE_NUMBER="1"
export REPO_OWNER="psathish18"
export REPO_NAME="tsl-spa-webapp"
```

Run the extraction script:

```bash
node scripts/requestReview.js
```

**Expected Output:**
```
🚀 Starting lyrics extraction...
📺 YouTube URL: https://www.youtube.com/watch?v=example
🤖 Calling Gemini AI to extract lyrics...
📝 Raw AI response: {...
✅ Successfully extracted lyrics
📌 Title: Song Title - Movie Name
📤 Posting to GitHub issue for review...
✅ Posted comment for review
🔗 Comment URL: https://github.com/...
✅ Stage 1 Complete! Review the lyrics and comment /approve to publish.
```

### 3. Test Blogger Publishing (publishToBlogger.js)

**Note**: This requires that you've already run requestReview.js and there's a comment on the issue with the PROPOSED_POST format.

Set up your environment variables:

```bash
export BLOGGER_API_KEY="your-blogger-api-key"
export BLOG_ID="your-blog-id"
export GITHUB_TOKEN="your-github-token"
export ISSUE_NUMBER="1"
export REPO_OWNER="psathish18"
export REPO_NAME="tsl-spa-webapp"
```

Run the publishing script:

```bash
node scripts/publishToBlogger.js
```

**Expected Output:**
```
🚀 Starting Blogger publishing process...
📥 Fetching issue comments...
📝 Found X comments
✅ Found proposed post comment
📌 Extracted data:
   Title: Song Title - Movie Name
   Categories: Movie, Singer, Music Director
   Labels: Song Title, Movie
   Content length: XXXX characters
📤 Publishing to Blogger...
✅ Successfully published to Blogger!
🔗 Post URL: https://...
📝 Post ID: 1234567890
✅ Issue updated and closed
🎉 Stage 2 Complete! Post is live on Blogger.
```

## Testing with GitHub Actions (Dry Run)

### 1. Create a Test Repository

If you want to test the full workflow without affecting your main repository:

1. Fork or create a test repository
2. Copy the workflow file: `.github/workflows/lyrics-pipeline.yml`
3. Copy the scripts: `scripts/requestReview.js` and `scripts/publishToBlogger.js`
4. Add GitHub Secrets (see below)

### 2. Configure GitHub Secrets

Go to your repository settings → Secrets and variables → Actions → New repository secret:

- `GEMINI_API_KEY`: Your Google Gemini API key
- `BLOGGER_API_KEY`: Your Google Blogger API key
- `BLOG_ID`: Your Blogger blog ID
- `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob Storage token

### 3. Test the Workflow

**Stage 1: Extract**

1. Go to Issues → New Issue
2. Title: `https://www.youtube.com/watch?v=VIDEO_ID`
3. Create issue
4. Wait 1-2 minutes
5. Check the issue for a comment with extracted lyrics

**Stage 2: Publish**

1. Edit the comment to fix any errors
2. Save your changes
3. Add a new comment: `/approve`
4. Wait 1-2 minutes
5. Check for success message
6. Verify post on Blogger

## Troubleshooting

### Script Errors

**Error: "Missing required environment variables"**
- Solution: Ensure all required env vars are set

**Error: "JSON parse error"**
- Solution: The AI response might not be valid JSON. Check the raw response in logs.

**Error: "Could not find the proposed post comment"**
- Solution: Ensure you ran requestReview.js first and it posted a comment.

### GitHub Actions Errors

**Workflow doesn't trigger**
- Check that issue title contains `youtube.com` or `youtu.be`
- Verify workflow file is in `.github/workflows/`
- Check GitHub Actions tab for errors

**Secrets not found**
- Verify secrets are added in repository settings
- Check secret names match exactly (case-sensitive)

### API Errors

**Gemini API Error**
- Verify API key is valid
- Check you haven't exceeded quota
- Ensure Gemini API is enabled in your Google Cloud project

**Blogger API Error**
- Verify API key is valid
- Check Blogger API v3 is enabled
- Verify Blog ID is correct

## Verification Checklist

Before deploying to production, verify:

- [ ] `requestReview.js` runs successfully locally
- [ ] `publishToBlogger.js` runs successfully locally
- [ ] GitHub Actions workflow triggers on issue creation
- [ ] AI extracts lyrics and posts comment
- [ ] Comment can be edited on mobile
- [ ] `/approve` comment triggers publishing
- [ ] Post appears on Blogger
- [ ] `generate-song-json` runs automatically
- [ ] `upload-to-blob` runs automatically
- [ ] Issue is closed automatically

## Next Steps

Once testing is complete:

1. Deploy to production repository
2. Add secrets to production repository
3. Test with a real YouTube video
4. Document any custom configurations
5. Train your team on the workflow

## Support

If you encounter issues:
1. Check the console output for errors
2. Review GitHub Actions logs
3. Verify all API keys are valid
4. Check the documentation: `AUTOMATED_LYRICS_WORKFLOW.md`

## Example YouTube URLs for Testing

Tamil Song Videos (for testing):
- https://www.youtube.com/watch?v=example1
- https://www.youtube.com/watch?v=example2

Make sure to use videos with Tamil lyrics for best results with the AI extraction.
