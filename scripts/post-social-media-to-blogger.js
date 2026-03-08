// scripts/post-social-media-to-blogger.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const BloggerTokenManager = require('./blogger-token-manager');
const { createWinampSVG, createGlassmorphismSVG } = require('./og-image/enhanced-design-samples');
const { generateOGImage } = require('./og-image/generate-og-image');
const GCSStorage = require('./gcs/gcs-storage');

// Configuration
const SOCIAL_POSTS_JSON = path.join(__dirname, '../social-media-posts.json');
const SONGS_DIR = path.join(__dirname, '../public/songs');
const OG_IMAGES_DIR = path.join(__dirname, '../public/og-images');
const OUTPUT_RESULTS = path.join(__dirname, '../social-media-blogger-results.json');
// const BLOG_ID = '4274710440628694122'; // tslshared.blogspot.com
const BLOG_ID = '410491814635039034'; // https://tamilsonglyrics4all.blogspot.com/

// Initialize GCS storage (optional - fallback to local if not configured)
let gcsStorage = null;
if (GCSStorage.isConfigured()) {
  try {
    gcsStorage = new GCSStorage();
    console.log('✅ Google Cloud Storage configured - images will be uploaded to GCS');
  } catch (error) {
    console.warn('⚠️  GCS initialization failed, using local storage fallback:', error.message);
  }
} else {
  console.log('ℹ️  GCS not configured - images will be saved locally only');
  console.log('   To enable GCS upload, set: GCS_BUCKET_NAME, GCS_PROJECT_ID, GCS_SERVICE_ACCOUNT_KEY');
}

// Ensure OG images directory exists
if (!fs.existsSync(OG_IMAGES_DIR)) {
  fs.mkdirSync(OG_IMAGES_DIR, { recursive: true });
  console.log(`✅ Created OG images directory: ${OG_IMAGES_DIR}`);
}

// Initialize token manager
let tokenManager;
try {
  tokenManager = new BloggerTokenManager();
  if (!tokenManager.hasRefreshToken()) {
    console.error('❌ Error: Blogger authentication not configured');
    console.error('Run this command first to set up authentication:');
    console.error('  node scripts/setup-blogger-auth.js');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error initializing token manager:', error.message);
  console.error('Make sure blogger-client-secret.json exists in scripts directory');
  process.exit(1);
}

// Check if input file exists
if (!fs.existsSync(SOCIAL_POSTS_JSON)) {
  console.error(`Error: Input file not found at ${SOCIAL_POSTS_JSON}`);
  console.error('Run: npm run trends-ai first to generate social media posts');
  process.exit(1);
}

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extract song slug from social media post URL
 * Example: https://www.tsonglyrics.com/aval-lyrics-manithan-song-lyrics.html
 * Returns: aval-lyrics-manithan-song-lyrics
 */
function extractSlugFromPost(postContent) {
  const regex = /https:\/\/www\.tsonglyrics\.com\/([^.]+)\.html/;
  const match = postContent.match(regex);
  return match ? match[1] : null;
}

/**
 * Load song data from JSON file
 */
function loadSongData(slug) {
  const songPath = path.join(SONGS_DIR, `${slug}.json`);
  if (!fs.existsSync(songPath)) {
    console.warn(`  ⚠️  Song JSON not found: ${slug}.json`);
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(songPath, 'utf8'));
  } catch (error) {
    console.warn(`  ⚠️  Error reading song JSON: ${error.message}`);
    return null;
  }
}

/**
 * Extract lyric snippet from post content
 */
function extractLyricSnippet(postContent) {
  // Extract content between 🌟⭐ and ⭐🌟
  const snippetMatch = postContent.match(/🌟⭐([^⭐]+)⭐🌟/);
  if (snippetMatch) {
    return snippetMatch[1].trim();
  }
  return null;
}

/**
 * Extract artist info from post content
 */
function extractArtistInfo(postContent) {
  // Extract hashtags after the snippet
  const hashtagMatch = postContent.match(/⭐🌟<br><br>([^<]+)/);
  if (hashtagMatch) {
    const hashtags = hashtagMatch[1]
      .replace(/#/g, '')
      .replace(/@\w+/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join(' + ');
    return hashtags;
  }
  return 'TSongLyrics';
}

/**
 * Determine design style and theme based on language and post content
 * 22 total variations:
 * - 4 Old gradient themes (simple, works for all languages)
 * - 12 Winamp designs (6 solid + 6 gradient, retro style, good for English/Thanglish)
 * - 6 Glassmorphism designs (modern style, beautiful for Tamil)
 */
function determineDesignStyle(lyrics, postContent, index = 0) {
  // Detect Tamil script (Unicode range U+0B80 to U+0BFF)
  const hasTamilScript = /[\u0B80-\u0BFF]/.test(lyrics);
  
  // Old gradient theme system (4) - works for all languages
  const oldThemes = [
    { type: 'gradient', scheme: 'gradient', function: generateOGImage },
    { type: 'gradient', scheme: 'romantic', function: generateOGImage },
    { type: 'gradient', scheme: 'mass', function: generateOGImage },
    { type: 'gradient', scheme: 'dark', function: generateOGImage }
  ];
  
  // Winamp designs for English/Thanglish (12: 6 solid + 6 gradient)
  const winampDesigns = [
    // Solid color schemes (6)
    { type: 'winamp', scheme: 'green', function: createWinampSVG },
    { type: 'winamp', scheme: 'yellow', function: createWinampSVG },
    { type: 'winamp', scheme: 'cyan', function: createWinampSVG },
    { type: 'winamp', scheme: 'orange', function: createWinampSVG },
    { type: 'winamp', scheme: 'purple', function: createWinampSVG },
    { type: 'winamp', scheme: 'classic', function: createWinampSVG },
    // Gradient schemes (6)
    { type: 'winamp', scheme: 'gradient-sunset', function: createWinampSVG },
    { type: 'winamp', scheme: 'gradient-ocean', function: createWinampSVG },
    { type: 'winamp', scheme: 'gradient-berry', function: createWinampSVG },
    { type: 'winamp', scheme: 'gradient-forest', function: createWinampSVG },
    { type: 'winamp', scheme: 'gradient-fire', function: createWinampSVG },
    { type: 'winamp', scheme: 'gradient-aurora', function: createWinampSVG }
  ];
  
  // Glassmorphism designs for Tamil (6)
  const glassDesigns = [
    { type: 'glass', scheme: 'sunset', function: createGlassmorphismSVG },
    { type: 'glass', scheme: 'ocean', function: createGlassmorphismSVG },
    { type: 'glass', scheme: 'berry', function: createGlassmorphismSVG },
    { type: 'glass', scheme: 'forest', function: createGlassmorphismSVG },
    { type: 'glass', scheme: 'fire', function: createGlassmorphismSVG },
    { type: 'glass', scheme: 'aurora', function: createGlassmorphismSVG }
  ];
  
  // Combine all designs based on language
  let designs;
  if (hasTamilScript) {
    // Tamil: Old themes + Glassmorphism (10 total)
    designs = [...oldThemes, ...glassDesigns];
  } else {
    // English/Thanglish: Old themes + Winamp (16 total)
    designs = [...oldThemes, ...winampDesigns];
  }
  
  // Mood-based selection with emoji detection (overrides rotation)
  if (postContent.includes('🔥')) {
    // Mass/energetic - prefer gradient fire variations
    if (hasTamilScript) {
      return designs.find(d => d.scheme === 'fire') || designs.find(d => d.scheme === 'mass') || designs[2];
    } else {
      return designs.find(d => d.scheme === 'gradient-fire') || designs.find(d => d.scheme === 'orange') || designs.find(d => d.scheme === 'mass') || designs[2];
    }
  }
  if (postContent.includes('❤️') || postContent.includes('💔')) {
    // Romantic - prefer gradient berry/purple variations
    if (hasTamilScript) {
      return designs.find(d => d.scheme === 'berry') || designs.find(d => d.scheme === 'romantic') || designs[1];
    } else {
      return designs.find(d => d.scheme === 'gradient-berry') || designs.find(d => d.scheme === 'purple') || designs.find(d => d.scheme === 'romantic') || designs[1];
    }
  }
  if (postContent.includes('✨')) {
    // Special - prefer gradient aurora variations
    if (hasTamilScript) {
      return designs.find(d => d.scheme === 'aurora') || designs.find(d => d.scheme === 'dark') || designs[3];
    } else {
      return designs.find(d => d.scheme === 'gradient-aurora') || designs.find(d => d.scheme === 'classic') || designs.find(d => d.scheme === 'dark') || designs[3];
    }
  }
  
  // For other posts, rotate through all designs in the pool (10 for Tamil, 16 for English/Thanglish)
  return designs[index % designs.length];
}

/**
 * Generate OG image (Old themes, Winamp, or Glassmorphism) and upload to GCS (or save locally)
 * @returns {Promise<Object|null>} Object with {imageUrl, filename, designType, colorScheme} or null
 */
async function generateAndUploadOGImage(postContent, songData, postIndex = 0) {
  const lyrics = extractLyricSnippet(postContent);
  if (!lyrics) return null;
  
  // Clean HTML tags for SVG rendering (convert <br> to newlines)
  const cleanLyrics = lyrics.replace(/<br\s*\/?>/gi, '\n').trim();
  
  const artist = extractArtistInfo(postContent);
  
  // Determine design based on language and content
  const design = determineDesignStyle(cleanLyrics, postContent, postIndex);
  
  try {
    let designLabel = design.type;
    if (design.type === 'glass') designLabel = 'Glassmorphism';
    else if (design.type === 'winamp') designLabel = 'Winamp';
    else if (design.type === 'gradient') designLabel = 'Gradient';
    
    console.log(`  🎨 Design Type: ${designLabel}`);
    console.log(`  🎨 Theme/Color: ${design.scheme}`);
    
    let imageBuffer;
    
    // Generate image based on design type
    if (design.type === 'gradient') {
      // Old theme system - returns buffer directly
      imageBuffer = await design.function(cleanLyrics, artist, design.scheme);
    } else {
      // Winamp or Glassmorphism - returns SVG string, need to convert
      const svg = design.function(cleanLyrics, artist, design.scheme);
      imageBuffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();
    }
    
    // Generate unique filename with design type, color scheme and content hash
    const slug = songData?.slug || 'lyrics';
    const contentHash = Buffer.from(cleanLyrics).toString('base64').slice(0, 8).replace(/[^a-zA-Z0-9]/g, '');
    const filename = `og-${design.type}-${slug}-${design.scheme}-${contentHash}.png`;
    
    let imageUrl;
    
    // Upload to GCS if configured, otherwise save locally
    if (gcsStorage) {
      try {
        // Upload to Google Cloud Storage
        imageUrl = await gcsStorage.uploadFile(imageBuffer, filename, {
          contentType: 'image/png',
          folder: 'og-images',
          makePublic: true,
          cacheControl: 'public, max-age=31536000' // 1 year cache
        });
        console.log(`  🌐 Uploaded to GCS: ${imageUrl}`);
      } catch (gcsError) {
        console.warn(`  ⚠️  GCS upload failed, falling back to local: ${gcsError.message}`);
        // Fallback to local storage
        const filePath = path.join(OG_IMAGES_DIR, filename);
        fs.writeFileSync(filePath, imageBuffer);
        // imageUrl = `https://www.tsonglyrics.com/og-images/${filename}`;
        console.log(`  💾 Saved locally: ${filename}`);
      }
    } else {
      // Save to local public folder
      const filePath = path.join(OG_IMAGES_DIR, filename);
      fs.writeFileSync(filePath, imageBuffer);
      // imageUrl = `https://www.tsonglyrics.com/og-images/${filename}`;
      console.log(`  💾 Saved locally: ${filename}`);
    }
    
    return {
      imageUrl: imageUrl,
      filename: filename,
      designType: design.type,
      colorScheme: design.scheme,
      storage: gcsStorage ? 'gcs' : 'local'
    };
  } catch (error) {
    console.error('  ❌ Error generating OG image:', error.message);
    return null;
  }
}

/**
 * Generate OG image URL for lyric snippet (DEPRECATED - use generateAndUploadOGImage)
 */
function generateOGImageUrl(postContent, baseUrl = 'https://www.tsonglyrics.com') {
  const lyrics = extractLyricSnippet(postContent);
  if (!lyrics) return null;
  
  const artist = extractArtistInfo(postContent);
  const theme = determineTheme(postContent);
  
  // Build OG image URL
  const params = new URLSearchParams({
    lyrics: lyrics,
    artist: artist,
    theme: theme
  });
  
  return `${baseUrl}/api/og-lyrics?${params.toString()}`;
}

/**
 * Format post content with image HTML
 * @param {string} originalContent - Post content
 * @param {Object} songData - Song metadata
 * @param {Object} ogImageData - Object with {imageUrl} or null
 */
function formatPostWithImage(originalContent, songData, ogImageData = null) {
  // Convert <br> to <br/>
  const formattedContent = originalContent.replace(/<br>/g, '<br/>');
  
  let imageHtml = '';
  
  // Add OG lyric snippet image if available
  if (ogImageData && ogImageData.imageUrl) {
    imageHtml += `<div class="separator" style="clear: both; text-align: center; margin: 20px 0;">
<a href="${ogImageData.imageUrl}" style="margin-left: 1em; margin-right: 1em;">
<img border="0" src="${ogImageData.imageUrl}" width="600" alt="Tamil Song Lyrics Snippet" title="Share this lyric!" />
</a>
</div>
<br/>`;
  }
  
  // Add song thumbnail if available
  else if (songData && songData.thumbnail) {
    imageHtml += `<div class="separator" style="clear: both; text-align: center;">
<a href="${songData.thumbnail}" style="margin-left: 1em; margin-right: 1em;">
<img border="0" src="${songData.thumbnail}" width="400" alt="${songData.title || ''}" title="${songData.title || ''}" />
</a>
</div>
<br/>`;
  }
  
  // Add images after content
  return formattedContent + imageHtml;
}

/**
 * Generate a short title from the post content
 */
function generatePostTitle(postContent, songData) {
  if (songData && songData.title) {
    // Use song title with "Share Now" suffix
    const cleanTitle = songData.title
      .replace(/lyrics?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    return `${cleanTitle}`;
  }
  
  // Fallback: extract first meaningful text before hashtag
  const textMatch = postContent.match(/^([^#<]+)/);
  if (textMatch) {
    const title = textMatch[1]
      .replace(/🎶|✨|❤️‍🔥|[^\w\s-]/g, '')
      .trim()
      .substring(0, 60);
    return title || 'Tamil Song Lyrics';
  }
  
  return 'Tamil Song Lyrics';
}

/**
 * Generate labels/tags from song data
 */
function generateLabels(songData) {
  const labels = ['SocialMedia', 'Share', 'TamilSongs'];
  
  if (songData) {
    if (songData.movieName) {
      labels.push(songData.movieName.split('(')[0].trim());
    }
    if (songData.singerName) {
      const singers = songData.singerName.split(',').map(s => s.trim());
      singers.forEach(singer => {
        if (singer && singer.length < 30) labels.push(singer);
      });
    }
    if (songData.musicName) {
      labels.push(songData.musicName);
    }
  }
  
  // Remove duplicates and limit to 10 labels
  return [...new Set(labels)].slice(0, 10);
}

/**
 * Create a single Blogger post for social media content
 */
async function createSocialMediaPost(postContent, index) {
  const url = `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/`;
  
  // Extract slug and load song data
  const slug = extractSlugFromPost(postContent);
  const songData = slug ? loadSongData(slug) : null;
  
  // Ensure songData has slug property
  if (songData && !songData.slug && slug) {
    songData.slug = slug;
  }
  
  // Generate and upload OG image with multiple design systems:
  // - Old gradient themes (4 variations) - simple, works for all
  // - Winamp designs (6 variations) - retro, for English/Thanglish
  // - Glassmorphism designs (6 variations) - modern, for Tamil
  // Returns {imageUrl, filename, designType, colorScheme, storage}
  const ogImageData = await generateAndUploadOGImage(postContent, songData, index);
  const hasOGImage = !!(ogImageData && ogImageData.imageUrl);
  
  // Format content with image (accepts object with svgContent and imageUrl)
  const contentWithImage = formatPostWithImage(postContent, songData, ogImageData);
  
  // Generate title and labels
  const title = generatePostTitle(postContent, songData);
  const labels = generateLabels(songData);
  
  if(true) {
    const body = {
      kind: "blogger#post",
      title: title,
      content: contentWithImage,
      labels: labels
    };
    
    try {
      // Get fresh access token (auto-refreshes if expired)
      const accessToken = await tokenManager.getAccessToken();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      return { 
        success: true, 
        postId: data.id,
        url: data.url,
        title: data.title,
        slug: slug,
        hasOGImage: hasOGImage,
        hasThumbImage: !!songData?.thumbnail,
        hasImage: hasOGImage || !!songData?.thumbnail,
        designType: ogImageData?.designType || null,
        colorScheme: ogImageData?.colorScheme || null
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        slug: slug
      };
    }
  }
}

/**
 * Main posting function
 */
async function postSocialMediaToBlogger() {
  console.log('Starting social media post creation on Blogger...\n');
  
  // Show token status
  const tokenInfo = tokenManager.getTokenInfo();
  if (tokenInfo.isExpired) {
    console.log('🔄 Access token expired, will refresh automatically...\n');
  } else {
    console.log(`✅ Access token valid for ${Math.floor(tokenInfo.expiresIn / 60)} minutes\n`);
  }
  
  // Load social media posts
  const socialPosts = JSON.parse(fs.readFileSync(SOCIAL_POSTS_JSON, 'utf8'));
  
  console.log(`Total posts to create: ${socialPosts.length}\n`);
  
  if (socialPosts.length === 0) {
    console.log('No posts to create. Exiting.');
    return;
  }
  
  // Confirm before proceeding
  console.log('⚠️  This will create NEW social media posts in Blogger (tslshared.blogspot.com).');
  
  // Skip wait in CI environment
  if (!process.env.CI) {
    console.log('Press Ctrl+C to cancel.\n');
    console.log('Starting in 5 seconds...');
    await sleep(5000);
  } else {
    console.log('Running in CI environment, starting immediately...\n');
  }
  
  // Process posts
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  let withImageCount = 0;
  
  for (let i = 0; i < socialPosts.length; i++) {
    const post = socialPosts[i];
    console.log(`\n[${i + 1}/${socialPosts.length}] Creating social media post...`);
    
    // Extract slug for display
    const slug = extractSlugFromPost(post);
    if (slug) {
      console.log(`  Song: ${slug}`);
    }
    
    const result = await createSocialMediaPost(post, i);
    
    const resultEntry = {
      index: i + 1,
      slug: result.slug,
      title: result.title || null,
      success: result.success,
      postId: result.postId || null,
      url: result.url || null,
      hasOGImage: result.hasOGImage || false,
      hasThumbImage: result.hasThumbImage || false,
      hasImage: result.hasImage || false,
      designType: result.designType || null,
      colorScheme: result.colorScheme || null,
      error: result.error || null,
      timestamp: new Date().toISOString()
    };
    
    results.push(resultEntry);
    
    if (result.success) {
      successCount++;
      if (result.hasImage) withImageCount++;
      console.log(`  ✅ Created successfully`);
      console.log(`  📍 URL: ${result.url}`);
      console.log(`  🆔 Post ID: ${result.postId}`);
      console.log(`  🖼️  Image: ${result.hasImage ? 'Yes' : 'No'}`);
      if (result.designType && result.colorScheme) {
        const designName = result.designType === 'winamp' ? 'Winamp' : 'Glassmorphism';
        console.log(`  🎨 Design: ${designName} - ${result.colorScheme}`);
      }
    } else {
      failureCount++;
      console.log(`  ❌ Failed: ${result.error}`);
    }
    
    // Rate limiting - wait 2 seconds between creates to avoid API throttling
    if (i < socialPosts.length - 1) {
      await sleep(2000);
    }
  }
  
  // Save results
  const resultsOutput = {
    completedAt: new Date().toISOString(),
    blogId: BLOG_ID,
    blogUrl: 'https://tslshared.blogspot.com',
    summary: {
      total: socialPosts.length,
      successful: successCount,
      failed: failureCount,
      withImages: withImageCount
    },
    results
  };
  
  fs.writeFileSync(OUTPUT_RESULTS, JSON.stringify(resultsOutput, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('SOCIAL MEDIA POST CREATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total posts attempted: ${socialPosts.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log(`Posts with images: ${withImageCount}`);
  console.log('='.repeat(60));
  console.log(`\n✅ Results saved to: ${OUTPUT_RESULTS}`);
  
  if (failureCount > 0) {
    console.log('\n⚠️  Some posts failed to create. Check the results file for details.');
  }
  
  if (successCount > 0) {
    console.log('\n🎉 Successfully created social media posts on Blogger!');
    console.log('📱 Visit https://tslshared.blogspot.com to see your posts.');
  }
}

// Run post creation
postSocialMediaToBlogger().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
