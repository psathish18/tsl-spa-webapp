// scripts/create-blogger-posts.js
const fs = require('fs');
const path = require('path');

// Configuration
const NO_MATCH_JSON = path.join(__dirname, '../migration_analysis/no-match-posts.json');
const OUTPUT_RESULTS = path.join(__dirname, '../migration_analysis/blogger-create-results.json');
const BLOGGER_ACCESS_TOKEN = process.env.BLOGGER_ACCESS_TOKEN;
const BLOG_ID = '933118286952973473'; // tsonglyricsapp.blogspot.com

// Validate environment
if (!BLOGGER_ACCESS_TOKEN) {
  console.error('Error: BLOGGER_ACCESS_TOKEN environment variable is not set');
  console.error('See scripts/get-blogger-oauth.js for instructions on obtaining a token');
  process.exit(1);
}

// Check if input file exists
if (!fs.existsSync(NO_MATCH_JSON)) {
  console.error(`Error: Input file not found at ${NO_MATCH_JSON}`);
  console.error('Run: node scripts/extract-no-match-posts.js first');
  process.exit(1);
}

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')     // Remove leading/trailing hyphens
    .substring(0, 100);        // Limit length
}

// Check if slug is meaningful (not just a post ID)
function isSlugMeaningful(slug) {
  if (!slug) return false;
  // Check if slug is just a number or contains only "p=" pattern
  if (/^p=\d+$/.test(slug)) return false;
  if (/^\d+$/.test(slug)) return false;
  return true;
}

// Create a single Blogger post
async function createBloggerPost(post) {
  const url = `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/`;
  
  // Use the slug from JSON file as-is
  const customSlug = post.slug;
  
  // Parse published date
  let publishedDate = null;
  if (post.publishedDate) {
    try {
      publishedDate = new Date(post.publishedDate).toISOString();
    } catch (e) {
      console.warn(`  ⚠️  Invalid date format: ${post.publishedDate}`);
    }
  }
  if (publishedDate) {
    body.published = publishedDate;
  }
  const body = {
    kind: "blogger#post",
    title: post.title,
    content: post.content,
    labels: post.labels || []
  };
  
  // Only set custom URL if slug exists
  if (customSlug) {
    body.url = `https://tsonglyricsapp.blogspot.com/p/${customSlug}.html`;
  }
  
  // Add published date if available
  if (publishedDate) {
    body.published = publishedDate;
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BLOGGER_ACCESS_TOKEN}`,
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
      slug: customSlug,
      publishedDate: data.published
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      slug: customSlug
    };
  }
}

// Main creation function
async function createPosts() {
  console.log('Starting Blogger post creation...\n');
  
  // Load no-match posts
  const inputData = JSON.parse(fs.readFileSync(NO_MATCH_JSON, 'utf8'));
  const postsToCreate = inputData.posts || [];
  
  console.log(`Total posts to create: ${postsToCreate.length}\n`);
  
  if (postsToCreate.length === 0) {
    console.log('No posts to create. Exiting.');
    return;
  }
  
  // Confirm before proceeding
  console.log('⚠️  This will create NEW posts in Blogger. Press Ctrl+C to cancel.\n');
  console.log('Starting in 5 seconds...');
  await sleep(5000);
  
  // Process posts
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < 1; i++) {
    const post = postsToCreate[i];
    console.log(`\n[${i + 1}/${postsToCreate.length}] Creating: ${post.category}`);
    console.log(`  Title: ${post.title}`);
    
    if (post.slug) {
      console.log(`  Using slug: ${post.slug}`);
    } else {
      console.log(`  No slug - Blogger will auto-generate`);
    }
    
    if (post.publishedDate) {
      console.log(`  Published: ${post.publishedDate}`);
    }
    
    const result = await createBloggerPost(post);
    
    const resultEntry = {
      category: post.category,
      title: post.title,
      slug: post.slug,
      success: result.success,
      postId: result.postId || null,
      url: result.url || null,
      publishedDate: result.publishedDate || null,
      error: result.error || null,
      timestamp: new Date().toISOString()
    };
    
    results.push(resultEntry);
    
    if (result.success) {
      successCount++;
      console.log(`  ✅ Created successfully`);
      console.log(`  📍 URL: ${result.url}`);
      console.log(`  🆔 Post ID: ${result.postId}`);
    } else {
      failureCount++;
      console.log(`  ❌ Failed: ${result.error}`);
    }
    
    // Rate limiting - wait 2 seconds between creates to avoid API throttling
    if (i < postsToCreate.length - 1) {
      await sleep(2000);
    }
  }
  
  // Save results
  const resultsOutput = {
    completedAt: new Date().toISOString(),
    summary: {
      total: postsToCreate.length,
      successful: successCount,
      failed: failureCount
    },
    results
  };
  
  fs.writeFileSync(OUTPUT_RESULTS, JSON.stringify(resultsOutput, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('CREATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total posts attempted: ${postsToCreate.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log('='.repeat(60));
  console.log(`\n✅ Results saved to: ${OUTPUT_RESULTS}`);
  
  if (failureCount > 0) {
    console.log('\n⚠️  Some posts failed to create. Check the results file for details.');
  }
  
  if (successCount > 0) {
    console.log('\n🎉 Successfully created posts! Next steps:');
    console.log('1. Run the analyze script again to verify all posts now match');
    console.log('2. Run the update script to fix any title/URL mismatches');
  }
}

// Run post creation
createPosts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
