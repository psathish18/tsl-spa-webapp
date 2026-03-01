// scripts/post-social-media-to-blogger.js
const fs = require('fs');
const path = require('path');
const BloggerTokenManager = require('./blogger-token-manager');

// Configuration
const SOCIAL_POSTS_JSON = path.join(__dirname, '../social-media-posts.json');
const SONGS_DIR = path.join(__dirname, '../public/songs');
const OUTPUT_RESULTS = path.join(__dirname, '../social-media-blogger-results.json');
const BLOG_ID = '4274710440628694122'; // tslshared.blogspot.com

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
 * Format post content with image HTML
 */
function formatPostWithImage(originalContent, songData) {
  if (!songData || !songData.thumbnail) {
    return originalContent;
  }
  
  // Create image HTML similar to Blogger format
  const imageHtml = `<div class="separator" style="clear: both; text-align: center;">
<a href="${songData.thumbnail}" style="margin-left: 1em; margin-right: 1em;">
<img border="0" src="${songData.thumbnail}" width="400" alt="${songData.title || ''}" title="${songData.title || ''}" />
</a>
</div>
<br/>`;
  
  // Convert <br> to <br/>
  const formattedContent = originalContent.replace(/<br>/g, '<br/>');
  
  // Add image at both top and bottom of the post
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
    return `${cleanTitle} - Share Now`;
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
  
  return 'Tamil Song Lyrics - Share Now';
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
  
  // Format content with image
  const contentWithImage = formatPostWithImage(postContent, songData);
  
  // Generate title and labels
  const title = generatePostTitle(postContent, songData);
  const labels = generateLabels(songData);
  
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
      hasImage: !!songData?.thumbnail
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      slug: slug
    };
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
      hasImage: result.hasImage || false,
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
