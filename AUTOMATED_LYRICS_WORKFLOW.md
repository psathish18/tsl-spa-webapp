# Automated Lyrics Pipeline Workflow

## Overview

This workflow automates the process of extracting song lyrics from YouTube videos, using AI for content generation, and publishing to Blogger. It's designed to work seamlessly on mobile devices, enabling you to add new lyrics on the go.

## How It Works

### The Mobile Flow

1. **Trigger**: Create a GitHub issue with a YouTube link as the title (on your mobile GitHub app)
2. **AI Step**: Gemini AI extracts the lyrics and posts them as a comment on that issue
3. **Edit**: Click "Edit" on that comment in the GitHub app, fix any words, and save
4. **Approve**: Add a new comment saying `/approve`
5. **Post**: GitHub Actions posts the edited text to Blogger and updates your website

```
┌─────────────────┐
│ Create Issue    │
│ with YT Link    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI Extracts     │
│ Lyrics          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Review & Edit   │
│ on Mobile       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Comment         │
│ "/approve"      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Post to Blogger │
│ & Update Site   │
└─────────────────┘
```

## Setup Instructions

### 1. GitHub Secrets Configuration

Navigate to your repository settings and add the following secrets:

- `GEMINI_API_KEY`: Your Google Gemini API key
  - Get it from: https://makersuite.google.com/app/apikey
  
- `BLOGGER_API_KEY`: Your Google Blogger API key
  - Get it from: https://console.cloud.google.com/apis/credentials
  - Enable Blogger API v3
  
- `BLOG_ID`: Your Blogger blog ID
  - Find it in your Blogger dashboard URL or API response
  - Example: `1234567890123456789`
  
- `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob Storage token
  - Get it from: https://vercel.com/docs/storage/vercel-blob/using-blob-sdk#generate-a-blob-read-write-token

Note: `GITHUB_TOKEN` is automatically provided by GitHub Actions.

### 2. Install Dependencies

The workflow automatically installs dependencies, but for local testing:

```bash
npm install
```

New dependencies added:
- `@google/generative-ai`: For AI-powered lyrics extraction
- `@octokit/rest`: For GitHub API interactions

## Usage

### Step-by-Step Mobile Workflow

#### Step 1: Create an Issue with YouTube Link

On your mobile device:
1. Open GitHub app
2. Navigate to your repository
3. Create a new issue
4. **Title**: Paste the YouTube video URL (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)
5. **Body**: Optional - add any notes or context
6. Submit the issue

The workflow will automatically trigger when the issue contains a YouTube link.

#### Step 2: AI Extraction (Automatic)

Within 1-2 minutes:
- GitHub Actions runs the extraction job
- Gemini AI analyzes the video
- A comment appears with the extracted lyrics in this format:

```markdown
### 🎵 PROPOSED_POST

**TITLE:** Song Title - Movie Name

**CATEGORIES:** Movie Name, Singer Name, Music Director

**LABELS:** Song Title, Movie Name, Singer Name

**CONTENT:**
<h3>Song Title</h3>
<p><strong>Movie:</strong> Movie Name<br/>
<strong>Singer:</strong> Singer Name<br/>
...lyrics...</p>

---
**Instructions:**
1. Click "Edit" to review and fix errors
2. Save your changes
3. Reply with `/approve` to publish
```

#### Step 3: Review and Edit

1. Click the **"..."** menu on the comment
2. Select **"Edit"**
3. Fix any errors in:
   - Song title
   - Movie/artist names
   - Lyrics text
   - Categories and labels
4. Click **"Update comment"**

#### Step 4: Approve

1. Add a new comment on the issue
2. Type: `/approve`
3. Submit

#### Step 5: Automatic Publishing (Automatic)

The workflow will:
1. ✅ Post the lyrics to Blogger
2. 🔄 Generate song JSON files
3. ☁️ Upload to Vercel Blob Storage
4. 🎉 Close the issue with a success message

## Workflow Files

### GitHub Actions Workflow

**File**: `.github/workflows/lyrics-pipeline.yml`

Two jobs:
1. **extract**: Triggered when issue is created with YouTube link
2. **publish**: Triggered when comment contains `/approve`

### Scripts

#### `scripts/requestReview.js`

Extracts lyrics using Gemini AI and posts for review.

**Key Features:**
- YouTube video analysis
- Structured data extraction
- Error handling with user feedback
- Mobile-friendly comment format

#### `scripts/publishToBlogger.js`

Publishes approved lyrics to Blogger.

**Key Features:**
- Parses edited comment content
- Posts to Blogger API
- Triggers song JSON generation
- Uploads to Blob Storage
- Closes issue automatically

## Workflow Stages

### Stage 1: Extract (Triggered by Issue Creation)

```yaml
on:
  issues:
    types: [opened]
```

**Conditions:**
- Issue title contains `youtube.com` OR `youtu.be`

**Actions:**
1. Checkout repository
2. Setup Node.js 20
3. Install dependencies
4. Run `requestReview.js`

### Stage 2: Publish (Triggered by Approval Comment)

```yaml
on:
  issue_comment:
    types: [created]
```

**Conditions:**
- Comment body contains `/approve`

**Actions:**
1. Checkout repository
2. Setup Node.js 20
3. Install dependencies
4. Run `publishToBlogger.js`
5. Run `generate-song-json`
6. Run `upload-to-blob`

## Error Handling

Both scripts include comprehensive error handling:

- **Environment validation**: Checks for required secrets
- **API error handling**: Catches and reports API failures
- **User feedback**: Posts error messages to the issue
- **Detailed logging**: Console output for debugging

### Common Errors

**"Missing required environment variables"**
- Solution: Check GitHub Secrets configuration

**"Could not extract title from comment"**
- Solution: Ensure the comment has proper PROPOSED_POST format

**"Blogger API error"**
- Solution: Verify API key and blog ID

## Testing Locally

### Test Lyrics Extraction

```bash
export GEMINI_API_KEY="your-key"
export YT_URL="https://www.youtube.com/watch?v=VIDEO_ID"
export GITHUB_TOKEN="your-token"
export ISSUE_NUMBER="123"
export REPO_OWNER="psathish18"
export REPO_NAME="tsl-spa-webapp"

node scripts/requestReview.js
```

### Test Blogger Publishing

```bash
export BLOGGER_API_KEY="your-key"
export BLOG_ID="your-blog-id"
export GITHUB_TOKEN="your-token"
export ISSUE_NUMBER="123"
export REPO_OWNER="psathish18"
export REPO_NAME="tsl-spa-webapp"

node scripts/publishToBlogger.js
```

## Benefits

### Mobile-First Design
- ✅ Works entirely from mobile GitHub app
- ✅ No need for laptop/desktop
- ✅ Add lyrics on the go

### AI-Powered
- ✅ Automatic lyrics extraction
- ✅ Metadata extraction (singer, composer, etc.)
- ✅ Structured data generation

### Human-in-the-Loop
- ✅ Review before publishing
- ✅ Edit errors easily
- ✅ Approve when ready

### Fully Automated Publishing
- ✅ Posts to Blogger
- ✅ Generates JSON files
- ✅ Updates Blob Storage
- ✅ No manual steps after approval

## Integration with Existing Scripts

The workflow seamlessly integrates with existing scripts:

1. **`generate-song-json.ts`**: Automatically run after Blogger post
2. **`upload-to-blob.ts`**: Automatically run after JSON generation

This ensures your website is immediately updated with the new lyrics.

## Future Enhancements

Potential improvements:
- [ ] Support for multiple languages
- [ ] Automatic thumbnail extraction
- [ ] SEO optimization suggestions
- [ ] Social media posting
- [ ] Push notifications to subscribers
- [ ] Analytics tracking

## Troubleshooting

### Workflow Not Triggering

1. Check issue title contains valid YouTube URL
2. Verify workflow file is in `.github/workflows/`
3. Check GitHub Actions tab for errors

### AI Extraction Fails

1. Verify Gemini API key is valid
2. Check video is publicly accessible
3. Ensure video contains lyrics (not instrumental)

### Publishing Fails

1. Verify Blogger API key has correct permissions
2. Check Blog ID is correct
3. Ensure comment has PROPOSED_POST format

### JSON Generation Fails

1. Check Blogger post was created successfully
2. Verify post has proper categories/labels
3. Run `generate-song-json` manually for debugging

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review error messages in issue comments
3. Test scripts locally with debug output
4. Contact repository maintainer

## License

This workflow is part of the tsl-spa-webapp project.
