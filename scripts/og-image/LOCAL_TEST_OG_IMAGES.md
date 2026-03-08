# Local OG Image Generation - Quick Start Guide

## ✨ New Implementation: Local Generation + Static Files

Images are now generated locally using `sharp` and saved to `public/og-images/` folder.
No server required! Works completely offline.

## Quick Test (3 Easy Steps)

### Step 1: Test Image Generation

```bash
npm run test-og-images
```

This will:
- Generate 4 sample images (gradient, romantic, mass, dark themes)
- Save them to `public/og-images/` folder
- Show you the URLs to test

**Expected output:**
```
🎨 Testing OG Image Generation

[1/4] Generating gradient theme...
  ✅ Saved: og-lyrics-gradient-abc123.png
  📏 Size: 45.23 KB
  🌐 URL: http://localhost:3000/og-images/og-lyrics-gradient-abc123.png

... (repeat for all 4 themes)

✅ Test Summary
Total images generated: 4
```

### Step 2: View Generated Images

```bash
# Start dev server
npm run dev
```

Then open the URLs shown in Step 1 in your browser. You should see beautiful lyric cards!

### Step 3: Test with Real Posts

```bash
# Generate images from your actual social media posts and post to Blogger
npm run post-social-media
```

This will:
1. Read `social-media-posts.json`
2. Extract lyric snippets (🌟⭐...⭐🌟)
3. Generate OG images locally and save to `public/og-images/`
4. Post to Blogger with image URLs

**Note:** Images use URLs like:
- Local: `http://localhost:3000/og-images/filename.png`
- Production: `https://www.tsonglyrics.com/og-images/filename.png`

## How It Works

### 1. Local Generation (Sharp)
```javascript
// Uses Sharp library (already installed)
const imageBuffer = await generateOGImage(lyrics, artist, theme);
```

### 2. Save to Public Folder
```javascript
// Saves to public/og-images/ (served by Next.js)
fs.writeFileSync('public/og-images/filename.png', imageBuffer);
```

### 3. Use in Blogger Posts
```html
<!-- Image is accessible via public URL -->
<img src="https://www.tsonglyrics.com/og-images/filename.png" />
```

## File Structure

```
tsl-spa-webapp/
├── public/
│   └── og-images/              # Generated images (gitignored)
│       ├── og-lyrics-gradient-abc123.png
│       ├── og-lyrics-romantic-def456.png
│       └── ...
├── scripts/
│   ├── generate-og-image.js    # Image generation logic
│   ├── test-og-image-generation.js  # Test script
│   └── post-social-media-to-blogger.js  # Updated to use local images
└── ...
```

## Generated Image Details

- **Format:** PNG
- **Size:** 1200x630px (Twitter Card optimized)
- **File Size:** ~40-60 KB per image
- **Naming:** `og-lyrics-{theme}-{hash}.png` (unique per content)
- **Font:** Georgia serif (elegant for Tamil lyrics)
- **Themes:** gradient, romantic, mass, dark

## Themes

### Gradient (Default)
- Purple gradient background
- White text
- Emoji: 🌟

### Romantic
- Pink gradient background  
- Triggered by: ❤️ or 💔 in post
- Emoji: ❤️

### Mass
- Vibrant multi-color gradient
- Triggered by: 🔥 in post
- Emoji: 🔥

### Dark
- Dark minimal background
- Golden text
- Triggered by: ✨ in post
- Emoji: ✨

## Testing Locally

### Test Individual Image
```bash
node -e "
const { generateOGImage } = require('./scripts/generate-og-image');
const fs = require('fs');

async function test() {
  const buffer = await generateOGImage(
    'test lyrics line 1\ntest lyrics line 2',
    'Test Artist',
    'gradient'
  );
  fs.writeFileSync('public/og-images/test.png', buffer);
  console.log('✅ Saved to public/og-images/test.png');
}
test();
"
```

Then view: `http://localhost:3000/og-images/test.png`

### Check Generated Files
```bash
ls -lh public/og-images/
```

### Clean Generated Images
```bash
rm -rf public/og-images/*.png
```

## GitHub Actions Workflow

The workflow automatically:
1. Runs `npm run post-social-media`
2. Generates OG images locally in GitHub Actions runner
3. Posts to Blogger with image URLs
4. When deployed to Vercel, images are accessible at `/og-images/` URL

**Note:** Generated images are gitignored, so they won't be in the repo. They're regenerated during:
- Local testing: When you run `npm run post-social-media`
- GitHub Actions: During workflow execution
- Production: Images are served from `public/og-images/` on your Vercel deployment

## Troubleshooting

### Issue: "Module not found: ./generate-og-image"
**Fix:** Make sure you've committed the new files:
```bash
git add scripts/generate-og-image.js
git add scripts/test-og-image-generation.js
```

### Issue: Images not showing in browser
**Fix:** Make sure dev server is running:
```bash
npm run dev
```

### Issue: "Cannot find module 'sharp'"
**Fix:** Sharp is already installed, but if needed:
```bash
npm install
```

### Issue: Blogger post has broken image
**Fix:** Use production URL, not localhost:
- ❌ `http://localhost:3000/og-images/...`
- ✅ `https://www.tsonglyrics.com/og-images/...`

## Benefits

✅ **No Server Required** - Pure local generation  
✅ **No External Services** - No Vercel Blob, Cloudinary, etc.  
✅ **Fast** - Sharp is blazing fast  
✅ **Free** - No additional costs  
✅ **Works Offline** - Generate images without internet  
✅ **Version Control** - Script logic is versioned, images are generated  
✅ **Hobby Plan Friendly** - No serverless function limits  

## Next Steps

1. ✅ Run `npm run test-og-images` to verify
2. ✅ Check generated images in browser
3. ✅ Run `npm run post-social-media` to post to Blogger
4. 📊 Monitor engagement on Twitter via IFTTT
5. 🎨 Optionally: Customize themes in `scripts/generate-og-image.js`

## Step 1: Start Development Server

```bash
npm run dev
```

Wait until you see: `✓ Ready on http://localhost:3000`

## Step 2: Test OG Image API Directly

Open your browser and visit these URLs to see the generated images:

### Test 1: Basic Gradient Theme
```
http://localhost:3000/api/og-lyrics?lyrics=pothavillaye%20pothavillaiye%0Aunnaippola%20bhothai%0Ayeathum%20illaiye&artist=AR%20Rahman%20%2B%20Vairamuthu&theme=gradient
```

### Test 2: Romantic Theme
```
http://localhost:3000/api/og-lyrics?lyrics=kadhal%20kaditham%0Amegam%20ellaam%20kaagitham&artist=AR%20Rahman&theme=romantic
```

### Test 3: Mass Theme
```
http://localhost:3000/api/og-lyrics?lyrics=vaathi%20coming%0Avaathi%20raid&artist=Anirudh&theme=mass
```

### Test 4: Dark Theme
```
http://localhost:3000/api/og-lyrics?lyrics=nilave%20vaa%0Aselladhe%20vaa&artist=Ilaiyaraaja%20%2B%20SPB&theme=dark
```

**Expected Result:** You should see a PNG image with the lyrics displayed beautifully with the theme colors.

## Step 3: Test with Real Social Media Posts

### 3a. Check Your Generated Posts

```bash
cat social-media-posts.json
```

Verify that you have posts with the 🌟⭐ snippet format.

### 3b. Test the Post Script (DRY RUN)

Create a test script to verify OG image URL generation without actually posting to Blogger:

```bash
node -e "
const fs = require('fs');
const posts = JSON.parse(fs.readFileSync('social-media-posts.json', 'utf8'));

// Extract lyric snippet function
function extractLyricSnippet(content) {
  const match = content.match(/🌟⭐([^⭐]+)⭐🌟/);
  return match ? match[1].trim() : null;
}

// Extract artist info
function extractArtistInfo(content) {
  const match = content.match(/⭐🌟<br><br>([^<]+)/);
  if (match) {
    return match[1].replace(/#/g, '').replace(/@\\w+/g, '').trim().split(/\\s+/).slice(0, 2).join(' + ');
  }
  return 'TSongLyrics';
}

// Determine theme
function determineTheme(content) {
  if (content.includes('🔥')) return 'mass';
  if (content.includes('❤️') || content.includes('💔')) return 'romantic';
  if (content.includes('✨')) return 'dark';
  return 'gradient';
}

console.log('\\n=== OG IMAGE URL TEST ===\\n');

posts.slice(0, 3).forEach((post, i) => {
  const lyrics = extractLyricSnippet(post);
  const artist = extractArtistInfo(post);
  const theme = determineTheme(post);
  
  if (lyrics) {
    const params = new URLSearchParams({ lyrics, artist, theme });
    const url = \`http://localhost:3000/api/og-lyrics?\${params.toString()}\`;
    
    console.log(\`Post \${i + 1}:\`);
    console.log(\`  Artist: \${artist}\`);
    console.log(\`  Theme: \${theme}\`);
    console.log(\`  Lyrics: \${lyrics.substring(0, 50)}...\`);
    console.log(\`  URL: \${url}\`);
    console.log('');
  }
});
"
```

**Expected Result:** You'll see the generated OG image URLs for your posts. Copy and paste these URLs into your browser to verify the images look good.

## Step 4: Test Full Blogger Post Script (Without Posting)

To test the script without actually posting to Blogger, you can add a dry-run check:

```bash
# Add a test that shows what would be posted
node -e "
const fs = require('fs');
const path = require('path');

// Load functions from the script
const SOCIAL_POSTS_JSON = 'social-media-posts.json';
const SONGS_DIR = 'public/songs';

function extractLyricSnippet(content) {
  const match = content.match(/🌟⭐([^⭐]+)⭐🌟/);
  return match ? match[1].trim() : null;
}

function extractArtistInfo(content) {
  const match = content.match(/⭐🌟<br><br>([^<]+)/);
  if (match) {
    return match[1].replace(/#/g, '').replace(/@\\w+/g, '').trim().split(/\\s+/).slice(0, 2).join(' + ');
  }
  return 'TSongLyrics';
}

function determineTheme(content) {
  if (content.includes('🔥')) return 'mass';
  if (content.includes('❤️') || content.includes('💔')) return 'romantic';
  if (content.includes('✨')) return 'dark';
  return 'gradient';
}

function generateOGImageUrl(content) {
  const lyrics = extractLyricSnippet(content);
  if (!lyrics) return null;
  
  const artist = extractArtistInfo(content);
  const theme = determineTheme(content);
  const params = new URLSearchParams({ lyrics, artist, theme });
  
  return \`http://localhost:3000/api/og-lyrics?\${params.toString()}\`;
}

function extractSlugFromPost(content) {
  const match = content.match(/https:\\/\\/www\\.tsonglyrics\\.com\\/([^.]+)\\.html/);
  return match ? match[1] : null;
}

function loadSongData(slug) {
  const songPath = path.join(SONGS_DIR, \`\${slug}.json\`);
  if (!fs.existsSync(songPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(songPath, 'utf8'));
  } catch {
    return null;
  }
}

// Load and test
const posts = JSON.parse(fs.readFileSync(SOCIAL_POSTS_JSON, 'utf8'));

console.log('\\n=== DRY RUN: Blogger Post Preview ===\\n');

posts.slice(0, 2).forEach((post, i) => {
  console.log(\`\\nPost \${i + 1}:\`);
  console.log('─'.repeat(60));
  
  const slug = extractSlugFromPost(post);
  const songData = slug ? loadSongData(slug) : null;
  const ogImageUrl = generateOGImageUrl(post);
  
  console.log(\`Slug: \${slug || 'N/A'}\`);
  console.log(\`Song Title: \${songData?.title || 'N/A'}\`);
  console.log(\`Has OG Image: \${!!ogImageUrl}\`);
  console.log(\`Has Thumbnail: \${!!songData?.thumbnail}\`);
  
  if (ogImageUrl) {
    console.log(\`\\nOG Image URL:\`);
    console.log(ogImageUrl);
  }
  
  if (songData?.thumbnail) {
    console.log(\`\\nThumbnail URL:\`);
    console.log(songData.thumbnail);
  }
  
  console.log(\`\\nPost Content (first 200 chars):\`);
  console.log(post.substring(0, 200) + '...');
});

console.log('\\n' + '─'.repeat(60));
console.log(\`\\nTotal posts ready: \${posts.length}\`);
console.log(\`With OG images: \${posts.filter(p => generateOGImageUrl(p)).length}\`);
"
```

## Step 5: Visual Verification Checklist

When viewing the OG images in your browser, verify:

✅ **Lyrics are readable** - Text is clear and properly formatted  
✅ **Line breaks work** - Each lyric line is on a separate line  
✅ **Theme colors match** - Background and text colors are appropriate  
✅ **Artist name visible** - Shows below lyrics in contrasting color  
✅ **Branding present** - "tsonglyrics.com" at the bottom  
✅ **No emojis** - 🌟⭐ emojis are stripped from lyrics  
✅ **Size is correct** - Image should be 1200x630px (right-click → inspect)

## Step 6: Test Complete Workflow (Optional - Requires Blogger Auth)

**⚠️ This will actually post to Blogger!** Only run if you want to test end-to-end.

```bash
# Make sure you have Blogger auth set up
npm run setup-blogger-auth

# Run the post script
npm run post-social-media
```

Check the results in `social-media-blogger-results.json`:

```bash
cat social-media-blogger-results.json | grep -A 10 "hasOGImage"
```

## Troubleshooting

### Issue: Image shows "Failed to generate image"
**Fix:** Check terminal logs for errors. Make sure dev server is running.

### Issue: Image is blank or has no text
**Fix:** Check URL encoding. Use `encodeURIComponent()` for Tamil text.

### Issue: Theme not applied
**Fix:** Add explicit `&theme=romantic` (or mass/dark/gradient) to URL.

### Issue: "Module not found: @vercel/og"
**Fix:** Run `npm install` to ensure @vercel/og is installed.

## Quick Test Commands

```bash
# 1. Start dev server
npm run dev

# 2. In another terminal, generate a simple test URL
echo "http://localhost:3000/api/og-lyrics?lyrics=test%20lyrics%0Asecond%20line&artist=Test%20Artist&theme=gradient"

# 3. Check if posts have snippets
grep -o "🌟⭐[^⭐]*⭐🌟" social-media-posts.json | head -3

# 4. Count posts with snippets
grep -c "🌟⭐" social-media-posts.json
```

## Next Steps After Local Testing

1. ✅ Commit changes to your branch
2. ✅ Push to GitHub
3. ✅ Vercel will auto-deploy
4. ✅ Run GitHub Actions workflow
5. 📊 Check results in `social-media-blogger-results.json`
6. 🎉 View posts on https://tslshared.blogspot.com
