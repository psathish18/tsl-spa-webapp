// scripts/analyze-blogger-updates.js
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Configuration
const WORDPRESS_XML = path.join(__dirname, '../migration_analysis/lyricsoftamilsongs.WordPress.2025-08-10 (1).xml');
const BLOGGER_FEED_URL = 'https://tsonglyricsapp.blogspot.com/feeds/posts/default';
const OUTPUT_JSON = path.join(__dirname, '../migration_analysis/blogger-update-plan.json');
const OUTPUT_CSV = path.join(__dirname, '../migration_analysis/blogger-update-plan.csv');

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Parse WordPress XML
async function parseWordPressXML() {
  console.log('Reading WordPress XML file...');
  const xmlContent = fs.readFileSync(WORDPRESS_XML, 'utf8');
  
  console.log('Parsing WordPress XML...');
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xmlContent);
  
  const items = result.rss.channel[0].item || [];
  console.log(`Found ${items.length} total WordPress posts`);
  
  // Extract posts with Song: or OldSong: categories
  const songPosts = [];
  for (const item of items) {
    const categories = item.category || [];
    const songCategory = categories.find(cat => {
      const catText = typeof cat === 'string' ? cat : cat._;
      return catText && (catText.startsWith('Song:') || catText.startsWith('OldSong:'));
    });
    
    if (songCategory) {
      const categoryText = typeof songCategory === 'string' ? songCategory : songCategory._;
      const title = item.title[0];
      const link = item.link[0];
      
      // Extract slug from WordPress URL
      const urlMatch = link.match(/\.com\/(.+)\.html$/);
      const wpSlug = urlMatch ? urlMatch[1] : null;
      
      songPosts.push({
        wpTitle: title,
        wpUrl: link,
        wpSlug: wpSlug,
        category: categoryText
      });
    }
  }
  
  console.log(`Found ${songPosts.length} WordPress posts with Song/OldSong categories`);
  return songPosts;
}

// Query Blogger feed for a specific category
async function queryBloggerByCategory(category) {
  const encodedCategory = encodeURIComponent(category);
  const url = `${BLOGGER_FEED_URL}/-/${encodedCategory}?alt=json`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const feed = data.feed;
    
    // Parse Blogger feed entries
    if (!feed.entry || feed.entry.length === 0) {
      return [];
    }
    
    return feed.entry.map(entry => {
      // Extract post ID from entry.id.$t (format: "tag:blogger.com,1999:blog-XXXXX.post-YYYYY")
      const postId = entry.id.$t.split('.post-')[1];
      
      // Find the alternate link (the actual post URL)
      const alternateLink = entry.link.find(l => l.rel === 'alternate');
      const url = alternateLink ? alternateLink.href : '';
      
      return {
        id: postId,
        title: entry.title.$t,
        url: url
      };
    });
  } catch (error) {
    console.error(`Error querying category "${category}":`, error.message);
    return [];
  }
}

// Main analysis function
async function analyzeUpdates() {
  console.log('Starting Blogger update analysis...\n');
  
  // Parse WordPress data
  const wpPosts = await parseWordPressXML();
  
  // Build update plan
  const updatePlan = [];
  let matchCount = 0;
  let multipleMatchCount = 0;
  let noMatchCount = 0;
  let needsUpdateCount = 0;
  
  console.log('\nQuerying Blogger API for each post...');
  for (let i = 0; i < wpPosts.length; i++) {
    const wpPost = wpPosts[i];
    console.log(`[${i + 1}/${wpPosts.length}] Checking: ${wpPost.category}`);
    
    // Query Blogger
    const bloggerPosts = await queryBloggerByCategory(wpPost.category);
    
    const planEntry = {
      category: wpPost.category,
      wordpress: {
        title: wpPost.wpTitle,
        url: wpPost.wpUrl,
        slug: wpPost.wpSlug
      },
      blogger: null,
      status: '',
      needsUpdate: false,
      titleMatch: false,
      urlMatch: false
    };
    
    if (bloggerPosts.length === 0) {
      planEntry.status = 'NO_MATCH';
      noMatchCount++;
    } else if (bloggerPosts.length > 1) {
      planEntry.status = 'MULTIPLE_MATCHES';
      planEntry.blogger = bloggerPosts.map(p => ({
        id: p.id,
        title: p.title,
        url: p.url
      }));
      multipleMatchCount++;
    } else {
      // Single match - ideal case
      const bloggerPost = bloggerPosts[0];
      
      // Extract slug from Blogger URL
      // Format: https://tsonglyricsapp.blogspot.com/p/song-slug.html
      const bloggerSlug = bloggerPost.url.match(/\/p\/(.+?)\.html$/)?.[1] || 
                          bloggerPost.url.match(/\.com\/(.+?)\.html$/)?.[1];
      
      const titleMatch = bloggerPost.title === wpPost.wpTitle;
      const urlMatch = bloggerSlug === wpPost.wpSlug;
      
      planEntry.blogger = {
        id: bloggerPost.id,
        title: bloggerPost.title,
        url: bloggerPost.url,
        slug: bloggerSlug
      };
      planEntry.titleMatch = titleMatch;
      planEntry.urlMatch = urlMatch;
      planEntry.needsUpdate = !titleMatch || !urlMatch;
      planEntry.status = planEntry.needsUpdate ? 'NEEDS_UPDATE' : 'MATCH';
      
      matchCount++;
      if (planEntry.needsUpdate) {
        needsUpdateCount++;
      }
    }
    
    updatePlan.push(planEntry);
    
    // Rate limiting
    await sleep(300);
  }
  
  // Summary
  const summary = {
    totalPosts: wpPosts.length,
    singleMatches: matchCount,
    multipleMatches: multipleMatchCount,
    noMatches: noMatchCount,
    needsUpdate: needsUpdateCount,
    alreadyCorrect: matchCount - needsUpdateCount
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total WordPress posts: ${summary.totalPosts}`);
  console.log(`Single matches: ${summary.singleMatches}`);
  console.log(`  - Already correct: ${summary.alreadyCorrect}`);
  console.log(`  - Needs update: ${summary.needsUpdate}`);
  console.log(`Multiple matches: ${summary.multipleMatches}`);
  console.log(`No matches: ${summary.noMatches}`);
  console.log('='.repeat(60));
  
  // Save JSON output
  const jsonOutput = {
    generatedAt: new Date().toISOString(),
    summary,
    posts: updatePlan
  };
  
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(jsonOutput, null, 2));
  console.log(`\n✅ JSON saved to: ${OUTPUT_JSON}`);
  
  // Save CSV output
  const csvRows = [
    // Header
    'Category,WP Title,WP Slug,Blogger ID,Blogger Title,Blogger Slug,Status,Title Match,URL Match,Needs Update'
  ];
  
  for (const entry of updatePlan) {
    const bloggerId = entry.blogger?.id || '';
    const bloggerTitle = entry.blogger?.title || '';
    const bloggerSlug = entry.blogger?.slug || '';
    
    // Escape CSV fields (handle commas and quotes)
    const escapeCSV = (str) => {
      if (!str) return '';
      str = String(str);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    csvRows.push([
      escapeCSV(entry.category),
      escapeCSV(entry.wordpress.title),
      escapeCSV(entry.wordpress.slug),
      escapeCSV(bloggerId),
      escapeCSV(bloggerTitle),
      escapeCSV(bloggerSlug),
      entry.status,
      entry.titleMatch,
      entry.urlMatch,
      entry.needsUpdate
    ].join(','));
  }
  
  fs.writeFileSync(OUTPUT_CSV, csvRows.join('\n'));
  console.log(`✅ CSV saved to: ${OUTPUT_CSV}`);
  
  console.log('\n📊 Next steps:');
  console.log('1. Review the update plan files');
  console.log('2. If satisfied, run: node scripts/apply-blogger-updates.js');
  console.log('   (Note: You\'ll need BLOGGER_ACCESS_TOKEN for write operations)');
}

// Run analysis
analyzeUpdates().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
