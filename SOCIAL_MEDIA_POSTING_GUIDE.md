# Social Media Posting to Blogger Guide

This guide explains how to post AI-generated social media content to your Blogger blog with images extracted from song JSON files.

## Overview

The workflow automatically:
1. Reads social media posts from `social-media-posts.json`
2. Extracts the song URL from each post
3. Finds the corresponding song JSON file in `public/songs/`
4. Gets the thumbnail image from the JSON
5. Formats the post with the image
6. Posts to your Blogger blog (tslshared.blogspot.com)

## Prerequisites

### 1. Get Blogger OAuth Token

If you don't have `BLOGGER_ACCESS_TOKEN` set up:

```bash
node scripts/get-blogger-oauth.js
```

Follow the instructions to get your access token, then set it:

```bash
export BLOGGER_ACCESS_TOKEN="your-token-here"
```

### 2. Get Blog ID for tslshared.blogspot.com

Run the helper script to get your blog ID:

```bash
node scripts/get-blog-id.js https://tslshared.blogspot.com
```

This will output something like:
```
Blog ID: 1234567890123456789
```

Set the environment variable:

```bash
export BLOGGER_SHARED_BLOG_ID="1234567890123456789"
```

## Usage

### Step 1: Generate Social Media Posts

First, run the AI workflow to generate social media posts:

```bash
npm run trends-ai
```

This creates `social-media-posts.json` with AI-generated social media content.

### Step 2: Post to Blogger

Post the generated content to your Blogger blog:

```bash
npm run post-social-media
```

The script will:
- Show you how many posts will be created
- Wait 5 seconds (press Ctrl+C to cancel)
- Create each post with image
- Save results to `social-media-blogger-results.json`

## What Gets Posted

Each post includes:

### Title
Generated from the song title or extracted from post content:
```
"Kadhal Kan Kattudhe English Meaning KaakiSattai - Share Now"
```

### Content
- **Image**: Extracted from song JSON `thumbnail` field
- **Social media text**: From `social-media-posts.json`
- **Formatted HTML**: With proper line breaks and styling

### Labels/Tags
Auto-generated from song metadata:
- `SocialMedia`, `Share`, `TamilSongs` (default)
- Movie name
- Singer names
- Music director

### Example Post Structure

```html
<div class="separator" style="clear: both; text-align: center;">
  <a href="https://blogger.googleusercontent.com/...">
    <img src="..." width="400" alt="Song Title" />
  </a>
</div>
<br/>
Anirudh + Shakthisree = Pure Magic! 🎶✨<br/>
This track from #KaakiSattai is a vibe! ❤️‍🔥<br/><br/>
"Kadhal kan kattudhey<br/>Kavidhai pesi Kai thattudhey..."<br/><br/>
Dive into the full lyrics here: https://www.tsonglyrics.com/...
```

## Results

After posting, check `social-media-blogger-results.json`:

```json
{
  "completedAt": "2026-03-01T...",
  "blogId": "...",
  "blogUrl": "https://tslshared.blogspot.com",
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "withImages": 3
  },
  "results": [
    {
      "index": 1,
      "slug": "kadhal-kan-kattudhe-english-meaning",
      "title": "...",
      "success": true,
      "postId": "...",
      "url": "https://tslshared.blogspot.com/...",
      "hasImage": true
    }
  ]
}
```

## Rate Limiting

The script includes automatic rate limiting:
- **2 seconds** between each post creation
- Prevents Blogger API throttling
- Safe for batch posting

## Troubleshooting

### "BLOGGER_ACCESS_TOKEN not set"
Run `node scripts/get-blogger-oauth.js` to get a token.

### "BLOGGER_SHARED_BLOG_ID not set"
Run `node scripts/get-blog-id.js https://tslshared.blogspot.com` to get the ID.

### "Song JSON not found"
The song slug from the URL doesn't match any file in `public/songs/`. The post will be created without an image.

### "HTTP 401 Unauthorized"
Your access token expired. Get a new one with `get-blogger-oauth.js`.

### "HTTP 429 Too Many Requests"
API rate limit hit. Wait a few minutes and try again.

## Environment Variables

```bash
# Required for posting
export BLOGGER_ACCESS_TOKEN="your-oauth-token"
export BLOGGER_SHARED_BLOG_ID="your-blog-id"
```

Or create a `.env` file:
```
BLOGGER_ACCESS_TOKEN=your-oauth-token
BLOGGER_SHARED_BLOG_ID=your-blog-id
```

## Complete Workflow

```bash
# 1. Fetch trending keywords
npm run trends

# 2. Filter and generate social media posts with AI
npm run trends-ai

# 3. Set up environment (first time only)
node scripts/get-blog-id.js https://tslshared.blogspot.com
export BLOGGER_SHARED_BLOG_ID="..."
export BLOGGER_ACCESS_TOKEN="..."

# 4. Post to Blogger
npm run post-social-media

# 5. Check results
cat social-media-blogger-results.json
```

## Benefits

✅ **Automated**: No manual copy-paste  
✅ **Images Included**: Automatically fetches from song data  
✅ **SEO Optimized**: Proper titles, labels, and formatting  
✅ **Rate Limited**: Safe API usage  
✅ **Results Tracked**: JSON output for verification  
✅ **Reusable**: Works for any batch of social media posts
