# Automated Lyrics Pipeline - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MOBILE DEVICE (User)                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │  1. Create     │  │  3. Edit       │  │  4. Comment    │       │
│  │     Issue      │──│     Comment    │──│   "/approve"   │       │
│  │  (YouTube URL) │  │  (Fix Errors)  │  │                │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS WORKFLOWS                          │
│  ┌──────────────────────────────┐  ┌───────────────────────────┐  │
│  │    STAGE 1: Extract          │  │  STAGE 2: Publish         │  │
│  │                              │  │                           │  │
│  │  Trigger: Issue opened       │  │  Trigger: /approve        │  │
│  │  with YouTube URL            │  │  comment                  │  │
│  │                              │  │                           │  │
│  │  ┌─────────────────────┐    │  │  ┌──────────────────┐    │  │
│  │  │ requestReview.js    │    │  │  │ publishToBlogger │    │  │
│  │  │                     │    │  │  │      .js         │    │  │
│  │  │ 1. Call Gemini AI   │    │  │  │                  │    │  │
│  │  │ 2. Extract lyrics   │    │  │  │ 1. Parse comment │    │  │
│  │  │ 3. Post comment     │    │  │  │ 2. Post to       │    │  │
│  │  │    for review       │    │  │  │    Blogger       │    │  │
│  │  └─────────────────────┘    │  │  │ 3. Generate JSON │    │  │
│  │                              │  │  │ 4. Upload blob   │    │  │
│  │  Permissions:                │  │  │ 5. Close issue   │    │  │
│  │  - contents: read            │  │  └──────────────────┘    │  │
│  │  - issues: write             │  │                           │  │
│  │                              │  │  Permissions:             │  │
│  └──────────────────────────────┘  │  - contents: read         │  │
│                                     │  - issues: write          │  │
│                                     └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │   Gemini AI  │  │   Blogger    │  │   Vercel Blob Storage    │ │
│  │              │  │     API      │  │                          │ │
│  │ - Extract    │  │              │  │ - songs.json             │ │
│  │   lyrics     │  │ - Post new   │  │ - Individual song JSON   │ │
│  │ - Extract    │  │   lyrics     │  │                          │ │
│  │   metadata   │  │ - Categories │  │                          │ │
│  │              │  │ - Labels     │  │                          │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Stage 1: Extract (Issue Creation)

```
User Creates Issue
       │
       ├─ Title: YouTube URL
       └─ Body: Optional notes
              │
              ▼
     GitHub Actions Triggered
              │
              ├─ Checkout code
              ├─ Setup Node.js 20
              ├─ Install dependencies
              └─ Run requestReview.js
                     │
                     ▼
          ┌──────────────────────────┐
          │  Extract lyrics using    │
          │  Gemini AI API           │
          │                          │
          │  Prompt:                 │
          │  - Video URL             │
          │  - Extract title         │
          │  - Extract metadata      │
          │  - Extract lyrics        │
          │  - Format as JSON        │
          └──────────────────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │  Parse AI Response       │
          │                          │
          │  {                       │
          │    "title": "...",       │
          │    "content": "...",     │
          │    "categories": [...],  │
          │    "labels": [...]       │
          │  }                       │
          └──────────────────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │  Post GitHub Comment     │
          │                          │
          │  ### PROPOSED_POST       │
          │  **TITLE:** ...          │
          │  **CATEGORIES:** ...     │
          │  **LABELS:** ...         │
          │  **CONTENT:** ...        │
          │                          │
          │  Instructions:           │
          │  1. Edit to fix errors   │
          │  2. Comment /approve     │
          └──────────────────────────┘
```

### Stage 2: Publish (Approval Comment)

```
User Comments "/approve"
       │
       ▼
GitHub Actions Triggered
       │
       ├─ Checkout code
       ├─ Setup Node.js 20
       ├─ Install dependencies
       └─ Run publishToBlogger.js
              │
              ▼
   ┌────────────────────────┐
   │  Fetch Issue Comments  │
   │                        │
   │  Find comment with     │
   │  "PROPOSED_POST"       │
   └────────────────────────┘
              │
              ▼
   ┌────────────────────────┐
   │  Parse Comment Body    │
   │                        │
   │  Extract:              │
   │  - Title               │
   │  - Categories          │
   │  - Labels              │
   │  - Content (HTML)      │
   └────────────────────────┘
              │
              ▼
   ┌────────────────────────┐
   │  Post to Blogger API   │
   │                        │
   │  POST /blogs/{id}/     │
   │       posts/           │
   │                        │
   │  Body:                 │
   │  - title               │
   │  - content             │
   │  - labels              │
   └────────────────────────┘
              │
              ▼
   ┌────────────────────────┐
   │  Run generate-song-    │
   │       json             │
   │                        │
   │  - Fetch from Blogger  │
   │  - Parse content       │
   │  - Generate JSON files │
   └────────────────────────┘
              │
              ▼
   ┌────────────────────────┐
   │  Run upload-to-blob    │
   │                        │
   │  - Upload JSON files   │
   │  - Update blob storage │
   └────────────────────────┘
              │
              ▼
   ┌────────────────────────┐
   │  Post Success Comment  │
   │  & Close Issue         │
   │                        │
   │  ✅ Published!         │
   │  URL: ...              │
   │  Post ID: ...          │
   └────────────────────────┘
```

## Component Interactions

### requestReview.js

**Inputs:**
- `GEMINI_API_KEY` - API key for Gemini
- `YT_URL` - YouTube video URL
- `GITHUB_TOKEN` - GitHub auth token
- `ISSUE_NUMBER` - Issue number
- `REPO_OWNER` - Repository owner
- `REPO_NAME` - Repository name

**Process:**
1. Validate environment variables
2. Initialize Gemini AI client
3. Create extraction prompt
4. Call Gemini API
5. Parse JSON response
6. Format comment body
7. Post comment to issue

**Outputs:**
- GitHub comment with extracted data
- Error comment if failed

**Error Handling:**
- Validates all env vars
- Sanitizes error messages
- Posts errors to issue

### publishToBlogger.js

**Inputs:**
- `BLOGGER_API_KEY` - Blogger API key
- `BLOG_ID` - Blog ID
- `GITHUB_TOKEN` - GitHub auth token
- `ISSUE_NUMBER` - Issue number
- `REPO_OWNER` - Repository owner
- `REPO_NAME` - Repository name

**Process:**
1. Validate environment variables
2. Fetch issue comments
3. Find PROPOSED_POST comment
4. Parse title, categories, labels, content
5. Post to Blogger API
6. Trigger generate-song-json
7. Trigger upload-to-blob
8. Post success comment
9. Close issue

**Outputs:**
- Blogger post
- Generated JSON files
- Uploaded blobs
- Closed issue

**Error Handling:**
- Validates all env vars
- Sanitizes error messages
- Safe API response logging
- Posts errors to issue

## Security Architecture

### GITHUB_TOKEN Permissions

```yaml
permissions:
  contents: read   # Read repository code
  issues: write    # Create/update comments and close issues
```

**Why these permissions?**
- `contents: read` - Required to checkout code
- `issues: write` - Required to post comments and close issues
- No other permissions needed (principle of least privilege)

### Secret Management

**GitHub Secrets (Repository Settings):**
- `GEMINI_API_KEY` - Encrypted at rest
- `BLOGGER_API_KEY` - Encrypted at rest
- `BLOG_ID` - Encrypted at rest
- `BLOB_READ_WRITE_TOKEN` - Encrypted at rest

**Automatic Secrets:**
- `GITHUB_TOKEN` - Auto-provided by GitHub Actions
- Scoped to the workflow run
- Expires after workflow completes

### Error Sanitization

```javascript
// Before posting error to issue
const sanitizedError = error.message.replace(
  /key|token|secret/gi,
  '[REDACTED]'
);
```

**What gets sanitized:**
- API keys
- Tokens
- Secrets
- Sensitive API responses

## Performance Considerations

### Workflow Execution Time

**Stage 1 (Extract):**
- Checkout: ~5s
- Setup Node.js: ~10s
- Install dependencies: ~30s
- Gemini API call: ~10-20s
- Post comment: ~2s
- **Total: ~60s**

**Stage 2 (Publish):**
- Checkout: ~5s
- Setup Node.js: ~10s
- Install dependencies: ~30s
- Fetch comments: ~2s
- Post to Blogger: ~5s
- Generate JSON: ~30-60s
- Upload to blob: ~10-30s
- **Total: ~90-140s**

### Optimization Opportunities

1. **Cache dependencies** - Reduce npm install time
2. **Parallel JSON generation** - If multiple songs
3. **Batch blob uploads** - Upload multiple files at once
4. **Incremental updates** - Only update changed songs

## Monitoring and Debugging

### GitHub Actions Logs

Each workflow run provides detailed logs:
- Environment setup
- Script execution
- API responses (sanitized)
- Error messages (sanitized)

### Issue Comments

Real-time feedback posted to the issue:
- Extraction status
- Publishing status
- Success/error messages
- Blogger post URL

### Console Output

Detailed logging in scripts:
```javascript
console.log('🚀 Starting extraction...');
console.log('📺 YouTube URL:', url);
console.log('✅ Successfully extracted');
console.log('🔗 Comment URL:', url);
```

## Failure Recovery

### Stage 1 Fails

**User action:**
1. Check error message in issue comment
2. Fix the problem (e.g., invalid URL)
3. Close the issue
4. Create a new issue with corrected URL

**No cleanup needed** - Issue remains open with error message

### Stage 2 Fails

**User action:**
1. Check error message in issue comment
2. Fix the problem (e.g., API key)
3. Comment `/approve` again to retry

**Partial state:**
- Issue remains open
- Comment still editable
- Can retry multiple times

## Scalability

### Current Limits

- **GitHub Actions**: 2000 free minutes/month
- **Gemini API**: Based on your plan
- **Blogger API**: 10,000 requests/day
- **Vercel Blob**: Based on your plan

### Handling High Volume

1. **Batch processing** - Process multiple videos in one workflow
2. **Rate limiting** - Add delays between API calls
3. **Caching** - Cache API responses
4. **Queue system** - Add videos to queue, process in batches

## Future Enhancements

### Phase 2 Features

- [ ] Support multiple languages (not just Tamil)
- [ ] Automatic thumbnail extraction
- [ ] Video metadata validation
- [ ] Duplicate detection
- [ ] SEO optimization suggestions

### Phase 3 Features

- [ ] Social media integration (Twitter, Facebook)
- [ ] Push notifications to subscribers
- [ ] Analytics dashboard
- [ ] Bulk import from playlist
- [ ] A/B testing for titles

## Troubleshooting Flowchart

```
Workflow doesn't trigger?
     │
     ├─ Issue title has YouTube URL? ──No──> Fix title
     │                              └─Yes
     ├─ Workflow file exists? ──No──> Add workflow file
     │                        └─Yes
     └─ Check GitHub Actions tab for errors


AI extraction fails?
     │
     ├─ Gemini API key valid? ──No──> Update secret
     │                        └─Yes
     ├─ Video accessible? ──No──> Try different video
     │                   └─Yes
     └─ Check video has lyrics (not instrumental)


Publishing fails?
     │
     ├─ Blogger API key valid? ──No──> Update secret
     │                         └─Yes
     ├─ Blog ID correct? ──No──> Update secret
     │                   └─Yes
     ├─ Comment has PROPOSED_POST? ──No──> Check Stage 1 completed
     │                             └─Yes
     └─ Check API permissions in Google Cloud
```

## Conclusion

This architecture provides:
- ✅ Mobile-first workflow
- ✅ AI-powered extraction
- ✅ Human review process
- ✅ Automated publishing
- ✅ Comprehensive security
- ✅ Detailed error handling
- ✅ Scalable design

Ready for production use! 🚀
