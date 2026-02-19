// scripts/extract-no-match-posts.js
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Configuration
const WORDPRESS_XML = path.join(__dirname, '../migration_analysis/lyricsoftamilsongs.WordPress.2025-08-10 (1).xml');
const UPDATE_PLAN_JSON = path.join(__dirname, '../migration_analysis/blogger-update-plan.json');
const OUTPUT_JSON = path.join(__dirname, '../migration_analysis/no-match-posts.json');

// Parse WordPress XML
async function parseWordPressXML() {
  console.log('Reading WordPress XML file...');
  const xmlContent = fs.readFileSync(WORDPRESS_XML, 'utf8');
  
  console.log('Parsing WordPress XML...');
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xmlContent);
  
  const items = result.rss.channel[0].item || [];
  
  // Build map of category -> post data
  const postMap = new Map();
  
  for (const item of items) {
    const categories = item.category || [];
    const songCategory = categories.find(cat => {
      const catText = typeof cat === 'string' ? cat : cat._;
      return catText && (catText.startsWith('Song:') || catText.startsWith('OldSong:'));
    });
    
    if (songCategory) {
      const categoryText = typeof songCategory === 'string' ? songCategory : songCategory._;
      const title = item.title?.[0] || '';
      const link = item.link?.[0] || '';
      const content = item['content:encoded']?.[0] || '';
      const pubDate = item.pubDate?.[0] || '';
      
      // Extract all categories/tags
      const allCategories = categories.map(cat => 
        typeof cat === 'string' ? cat : cat._
      ).filter(Boolean);
      
      // Extract slug from WordPress URL
      const urlMatch = link.match(/\.com\/(.+)\.html$/);
      const wpSlug = urlMatch ? urlMatch[1] : null;
      
      postMap.set(categoryText, {
        title,
        link,
        slug: wpSlug,
        category: categoryText,
        allCategories,
        content,
        publishedDate: pubDate
      });
    }
  }
  
  console.log(`Found ${postMap.size} WordPress posts with Song/OldSong categories\n`);
  return postMap;
}

// Extract NO_MATCH posts
async function extractNoMatchPosts() {
  console.log('Extracting NO_MATCH posts...\n');
  
  // Load update plan
  if (!fs.existsSync(UPDATE_PLAN_JSON)) {
    console.error(`Error: Update plan not found at ${UPDATE_PLAN_JSON}`);
    console.error('Run: node scripts/analyze-blogger-updates.js first');
    process.exit(1);
  }
  
  const updatePlan = JSON.parse(fs.readFileSync(UPDATE_PLAN_JSON, 'utf8'));
  
  // Get NO_MATCH categories
  const noMatchPosts = updatePlan.posts.filter(p => p.status === 'NO_MATCH');
  console.log(`Found ${noMatchPosts.length} posts with NO_MATCH status\n`);
  
  // Parse WordPress XML to get full content
  const wpPostMap = await parseWordPressXML();
  
  // Build output data
  const outputPosts = [];
  
  for (const post of noMatchPosts) {
    const category = post.category;
    const wpData = wpPostMap.get(category);
    
    if (wpData) {
      outputPosts.push({
        category: category,
        title: wpData.title,
        slug: wpData.slug,
        url: wpData.link,
        content: wpData.content,
        publishedDate: wpData.publishedDate,
        allCategories: wpData.allCategories,
        // Metadata for Blogger creation
        labels: wpData.allCategories,
        // Extract hashtags from category for social sharing
        hashtags: extractHashtags(wpData.allCategories)
      });
    }
  }
  
  // Save output
  const output = {
    generatedAt: new Date().toISOString(),
    totalPosts: outputPosts.length,
    posts: outputPosts
  };
  
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2));
  
  console.log('='.repeat(60));
  console.log('EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total NO_MATCH posts: ${outputPosts.length}`);
  console.log(`Output saved to: ${OUTPUT_JSON}`);
  console.log('='.repeat(60));
  
  // Print sample
  if (outputPosts.length > 0) {
    console.log('\n📝 Sample post:');
    const sample = { ...outputPosts[0] };
    sample.content = sample.content.substring(0, 200) + '...'; // Truncate for display
    console.log(JSON.stringify(sample, null, 2));
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. Review the JSON file');
  console.log('2. Use Blogger API to create these posts programmatically');
  console.log('3. Or manually copy content to create posts in Blogger dashboard');
}

// Extract hashtags from categories
function extractHashtags(categories) {
  const hashtags = [];
  
  for (const cat of categories) {
    if (cat.startsWith('Song:') || cat.startsWith('OldSong:')) {
      // Extract parts after colon and convert to hashtags
      const parts = cat.split(':')[1].split('-').map(p => p.trim());
      hashtags.push(...parts.map(p => `#${p.replace(/\s+/g, '')}`));
    }
  }
  
  return [...new Set(hashtags)]; // Remove duplicates
}

// Run extraction
extractNoMatchPosts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
