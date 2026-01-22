const fs = require('fs');
const path = require('path');
const axios = require('axios');

// const inputCsvPath = path.join(__dirname, 'wordpress_urls.csv');
// const outputCsvPath = path.join(__dirname, 'wordpress_urls_with_blogger.csv');


const inputCsvPath = path.join(__dirname, 'jan 21 404 not found - 404 url.csv');
// const inputCsvPath = path.join(__dirname, 'wordpress_urls_test.csv');
const outputCsvPath = path.join(__dirname, 'not_found_url_with_blogger_jan 21.csv');
// const outputCsvPath = path.join(__dirname, 'wordpress_urls_with_blogger_movie.csv');

// Function to clean slug (from page.tsx logic)
function cleanSlugFunction(slug) {
  return slug.replace('.html', '')
    .replace(/[_-]\d+(?=[_-])/g, '_') // Replace _digits_ or -digits- with just _ (preserve separation between words)
    .replace(/[_-]\d+$/g, '') // Remove _digits or -digits at the end
    .replace(/[^a-z0-9\s-_]/g, '') // Allow underscore to pass through
    .replace(/[\s_]+/g, '-') // Convert spaces and underscores to single hyphen
    .replace(/-+/g, '-') // Clean up multiple hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Function to clean song category for search
function cleanSongCategory(songCategory) {
  // Remove prefix
  let songName = songCategory.replace(/^(Song:|OldSong:)/, '');
  // Replace multiple spaces with single space
  songName = songName.replace(/\s+/g, ' ').trim();
  return songName;
}

// Function to search Blogger API by category
async function searchBloggerByCategory(category) {
  const url = `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/Song:${encodeURIComponent(category)}?alt=json&max-results=100`;
  try {
    const response = await axios.get(url);
    return response.data.feed?.entry || [];
  } catch (error) {
    console.error('Error fetching from Blogger category API:', error.message);
    return [];
  }
}

// Function to search Blogger API
async function searchBloggerAPI(searchTerms, maxResults = 100) {
  const url = `https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&q=${encodeURIComponent(searchTerms)}&max-results=${maxResults}`;
  try {
    const response = await axios.get(url);
    return response.data.feed?.entry || [];
  } catch (error) {
    console.error('Error fetching from Blogger API:', error.message);
    return [];
  }
}

// Function to find matching post
function findMatchingPost(posts, targetSlug) {
  return posts.find(song => {
    const apiTitle = song.title?.$t || song.title;
    if (apiTitle) {
      let songSlug = apiTitle.toLowerCase()
        .trim()
        .replace(/\b\d+\b/g, '') // Remove standalone digits (e.g., "2" in "2 Point 0")
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Convert spaces to hyphens
        .replace(/-+/g, '-') // Clean up multiple hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

      return songSlug === targetSlug || songSlug.startsWith(`${targetSlug}`) || targetSlug.startsWith(`${songSlug}`);
    }
    return false;
  });
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

// Function to get song category from post
function getSongCategoryFromPost(post) {
  const songCategory = post.category?.find(cat => cat.term?.startsWith('Song:') || cat.term?.startsWith('OldSong:'));
  return songCategory ? songCategory.term : '';
}

async function processCsv() {
  const csvContent = fs.readFileSync(inputCsvPath, 'utf8');
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');

  const results = [];
  results.push([...headers, 'clean_slug', 'blogger_url_slug', 'blogger_song_category']);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.split(',').map(col => col.replace(/^"|"$/g, '')); // Remove quotes
    const wordpressUrl = columns[0];
    const songCategory = columns[1];
    const movieCategory = columns[2];

    console.log(`Processing: ${songCategory}`);

    let cleanSlug = '';
    let bloggerUrlSlug = '';
    let bloggerSongCategory = '';

    if (songCategory) {
      // First, try category API with full song category
      console.log(`Searching with category API: ${songCategory}`);
      let posts = await searchBloggerByCategory(songCategory);

      if (posts.length > 0) {
        // Take the first post (should be exact match)
        const matchingPost = posts[0];
        // const targetSlug = cleanSongCategory(songCategory).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        // cleanSlug only set on fallback API calls
        bloggerUrlSlug = getBloggerUrlSlug(matchingPost);
        bloggerSongCategory = getSongCategoryFromPost(matchingPost);
      } else {
        // Fallback: try with cleaned song category search
        const wpSlug = wordpressUrl.split('/').pop();
        const cleanedSongTitle = cleanSlugFunction(wpSlug);
        // const cleanedSongName = cleanSongCategory(songCategory);
        console.log(`Fallback: Searching with song name: ${cleanedSongTitle}`);
        posts = await searchBloggerAPI(cleanedSongTitle);

        if (posts.length > 0) {
          // Find exact match
          const targetSlug = cleanedSongTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const matchingPost = findMatchingPost(posts, targetSlug);

          if (matchingPost) {
            cleanSlug = targetSlug;
            bloggerUrlSlug = getBloggerUrlSlug(matchingPost);
            bloggerSongCategory = getSongCategoryFromPost(matchingPost);
          }
        }

        // If still not found, try with WordPress URL slug
        if (!bloggerUrlSlug) {
          const wpSlug = wordpressUrl.split('/').pop().replace('.html', '');
          const cleanedWpSlug = cleanSlugFunction(wpSlug + '.html');
        //   const searchTerms = cleanedWpSlug.replace(/-/g, ' ');
          console.log(`Retrying with WordPress slug: ${cleanedWpSlug}`);
          posts = await searchBloggerAPI(cleanedWpSlug);

          if (posts.length > 0) {
            const matchingPost = findMatchingPost(posts, cleanedWpSlug);

            if (matchingPost) {
              cleanSlug = cleanedWpSlug;
              bloggerUrlSlug = getBloggerUrlSlug(matchingPost);
              bloggerSongCategory = getSongCategoryFromPost(matchingPost);
            }
          }
        }
      }
    } else if (movieCategory) {
      // For movie-only rows, use search API for more precise results
      const wpSlug = wordpressUrl.split('/').pop();
      const cleanedTitleName = cleanSlugFunction(wpSlug);
      console.log(`Searching movie with API: ${cleanedTitleName}`);
      const posts = await searchBloggerAPI(cleanedTitleName);

      if (posts.length > 0) {
        // Take the first post
        const matchingPost = findMatchingPost(posts, cleanedTitleName);
        // const targetSlug = cleanedTitleName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if(matchingPost){
            cleanSlug = cleanedTitleName;
            bloggerUrlSlug = getBloggerUrlSlug(matchingPost);
            bloggerSongCategory = getSongCategoryFromPost(matchingPost);
        }
      }
    }

    results.push([...columns, cleanSlug, bloggerUrlSlug, bloggerSongCategory]);

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const outputCsv = results.map(row => row.map(col => `"${col}"`).join(',')).join('\n');
  fs.writeFileSync(outputCsvPath, outputCsv);

  console.log('Processing complete. Output saved to:', outputCsvPath);
}

processCsv().catch(console.error);