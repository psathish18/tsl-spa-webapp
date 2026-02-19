// scripts/apply-blogger-updates.js
const fs = require('fs');
const path = require('path');

// Configuration
const UPDATE_PLAN_JSON = path.join(__dirname, '../migration_analysis/blogger-update-plan.json');
const OUTPUT_RESULTS = path.join(__dirname, '../migration_analysis/blogger-update-results.json');
const BLOGGER_ACCESS_TOKEN = process.env.BLOGGER_ACCESS_TOKEN;
const BLOG_ID = '7221311515792103867'; // tsonglyricsapp.blogspot.com

// Validate environment
if (!BLOGGER_ACCESS_TOKEN) {
  console.error('Error: BLOGGER_ACCESS_TOKEN environment variable is not set');
  console.error('See scripts/get-blogger-oauth.js for instructions on obtaining a token');
  process.exit(1);
}

// Check if update plan exists
if (!fs.existsSync(UPDATE_PLAN_JSON)) {
  console.error(`Error: Update plan not found at ${UPDATE_PLAN_JSON}`);
  console.error('Run: node scripts/analyze-blogger-updates.js first');
  process.exit(1);
}

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Update a single Blogger post
async function updateBloggerPost(postId, newTitle, newSlug) {
  const url = `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/${postId}`;
  
  const body = {
    title: newTitle,
    url: `https://tsonglyricsapp.blogspot.com/p/${newSlug}.html`
  };
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
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
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main update function
async function applyUpdates() {
  console.log('Starting Blogger updates...\n');
  
  // Load update plan
  const updatePlan = JSON.parse(fs.readFileSync(UPDATE_PLAN_JSON, 'utf8'));
  const postsToUpdate = updatePlan.posts.filter(p => p.status === 'NEEDS_UPDATE');
  
  console.log(`Total posts in plan: ${updatePlan.posts.length}`);
  console.log(`Posts needing update: ${postsToUpdate.length}\n`);
  
  if (postsToUpdate.length === 0) {
    console.log('No posts need updating. Exiting.');
    return;
  }
  
  // Confirm before proceeding
  console.log('⚠️  This will update Blogger posts. Press Ctrl+C to cancel.\n');
  console.log('Starting in 5 seconds...');
  await sleep(5000);
  
  // Process updates
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < postsToUpdate.length; i++) {
    const post = postsToUpdate[i];
    console.log(`\n[${i + 1}/${postsToUpdate.length}] Updating: ${post.category}`);
    console.log(`  Current title: ${post.blogger.title}`);
    console.log(`  New title: ${post.wordpress.title}`);
    console.log(`  Current slug: ${post.blogger.slug}`);
    console.log(`  New slug: ${post.wordpress.slug}`);
    
    const result = await updateBloggerPost(
      post.blogger.id,
      post.wordpress.title,
      post.wordpress.slug
    );
    
    const resultEntry = {
      category: post.category,
      postId: post.blogger.id,
      oldTitle: post.blogger.title,
      newTitle: post.wordpress.title,
      oldSlug: post.blogger.slug,
      newSlug: post.wordpress.slug,
      success: result.success,
      error: result.error || null,
      timestamp: new Date().toISOString()
    };
    
    results.push(resultEntry);
    
    if (result.success) {
      successCount++;
      console.log('  ✅ Updated successfully');
    } else {
      failureCount++;
      console.log(`  ❌ Failed: ${result.error}`);
    }
    
    // Rate limiting - wait 1 second between updates
    if (i < postsToUpdate.length - 1) {
      await sleep(1000);
    }
  }
  
  // Save results
  const resultsOutput = {
    completedAt: new Date().toISOString(),
    summary: {
      total: postsToUpdate.length,
      successful: successCount,
      failed: failureCount
    },
    results
  };
  
  fs.writeFileSync(OUTPUT_RESULTS, JSON.stringify(resultsOutput, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('UPDATE SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total updates attempted: ${postsToUpdate.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log('='.repeat(60));
  console.log(`\n✅ Results saved to: ${OUTPUT_RESULTS}`);
  
  if (failureCount > 0) {
    console.log('\n⚠️  Some updates failed. Check the results file for details.');
  }
}

// Run updates
applyUpdates().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
