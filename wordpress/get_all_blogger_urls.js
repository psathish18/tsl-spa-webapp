const fs = require('fs');
const path = require('path');
const axios = require('axios');

const outputCsvPath = path.join(__dirname, 'all_blogger_urls.csv');

// Function to fetch all Blogger posts in batches of 150
async function fetchAllBloggerPosts() {
  const allPosts = [];
  let startIndex = 1;
  const maxResults = 150;

  console.log('Fetching all Blogger posts (150 per batch)...');

  while (true) {
    try {
      const url = `https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&start-index=${startIndex}&max-results=${maxResults}`;
      console.log(`Fetching batch ${Math.ceil(startIndex/150)}: ${url}`);

      const response = await axios.get(url);
      const posts = response.data.feed?.entry || [];

      if (posts.length === 0) {
        console.log('No more posts found, stopping...');
        break; // No more posts
      }

      console.log(`Got ${posts.length} posts in this batch`);
      allPosts.push(...posts);
      startIndex += maxResults;

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));

      // Safety check to avoid infinite loops
      if (startIndex > 10000) {
        console.log('Reached safety limit (10,000 posts), stopping fetch');
        break;
      }

    } catch (error) {
      console.error('Error fetching Blogger posts:', error.message);
      break;
    }
  }

  console.log(`\nTotal posts fetched: ${allPosts.length}`);
  return allPosts;
}

// Function to get Blogger URL slug from post
function getBloggerUrlSlug(post) {
  // Find the alternate link (usually the first one)
  const link = post.link?.find(l => l.rel === 'alternate')?.href;
  if (link) {
    // Extract slug from URL
    const urlParts = link.split('/');
    const slugWithHtml = urlParts[urlParts.length - 1];
    return slugWithHtml; // e.g., "ammaa-endraal-anbu-song-lyrics.html"
  }
  return '';
}

// Function to get post title
function getPostTitle(post) {
  return post.title?.$t || post.title || '';
}

// Function to get published date
function getPublishedDate(post) {
  return post.published?.$t || post.published || '';
}

// Function to get categories
function getCategories(post) {
  const categories = post.category || [];
  return categories.map(cat => cat.term).join('; ');
}

async function main() {
  try {
    console.log('Starting Blogger URL extraction...\n');

    // Fetch all Blogger posts
    const bloggerPosts = await fetchAllBloggerPosts();

    // Create CSV output
    const csvHeader = 'url_slug,title,published_date,categories,full_url\n';
    const csvRows = bloggerPosts.map(post => {
      const slug = getBloggerUrlSlug(post);
      const title = getPostTitle(post);
      const published = getPublishedDate(post);
      const categories = getCategories(post);
      const fullUrl = post.link?.find(l => l.rel === 'alternate')?.href || '';

      // Escape quotes and wrap in quotes
      return `"${slug}","${title.replace(/"/g, '""')}","${published}","${categories.replace(/"/g, '""')}","${fullUrl}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    // Write to CSV file
    fs.writeFileSync(outputCsvPath, csvContent);

    console.log(`\n✅ Results saved to: ${outputCsvPath}`);
    console.log(`📊 Total URLs extracted: ${bloggerPosts.length}`);

    // Show sample of results
    console.log('\n📋 Sample entries:');
    bloggerPosts.slice(0, 5).forEach((post, i) => {
      const slug = getBloggerUrlSlug(post);
      const title = getPostTitle(post);
      console.log(`${i+1}. ${slug} - ${title.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();