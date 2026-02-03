/**
 * Script to generate social media posts from song JSON files
 * Usage: ts-node scripts/generate-social-posts.ts <song-json-file> [base-url]
 */

import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'

interface SongData {
  slug: string;
  title: string;
  tamilStanzas: string[];
  category: string[];
}

interface SocialPost {
  stanzaIndex: number;
  text: string;
  twitterLink: string;
  whatsappLink: string;
  hashtags: string[];
  rawLyrics: string;
}

/**
 * Clean HTML tags from text
 */
function cleanHtmlTags(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/br>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Extract hashtags from category array
 */
function extractHashtags(categories: string[]): string[] {
  const hashtags = categories.map(cat => {
    // Remove prefixes like "Lyrics:", "Movie:", "Singer:", "Song:"
    const cleaned = cat.replace(/^(Lyrics|Movie|Singer|Song|Music|Actor):/i, '');
    // Remove spaces and special characters, keep alphanumeric
    return '#' + cleaned.replace(/[^a-zA-Z0-9]/g, '');
  });
  
  // Sort alphabetically and remove duplicates
  return Array.from(new Set(hashtags)).sort();
}

/**
 * Generate formatted snippet with star emojis and hashtags
 */
function generateSnippet(
  lyrics: string,
  hashtags: string[],
  songUrl: string
): string {
  const cleanLyrics = cleanHtmlTags(lyrics);
  
  return `⭐${cleanLyrics}⭐\n\n${hashtags.join(' ')}\n${songUrl} via @tsongslyrics`;
}

/**
 * URL encode text for sharing
 */
function encodeForUrl(text: string): string {
  return encodeURIComponent(text);
}

/**
 * Process song data and generate social media posts
 */
export function generateSocialPosts(songData: SongData, baseUrl: string = 'http://localhost:3000'): SocialPost[] {
  const songUrl = `${baseUrl}/${songData.slug}`;
  const hashtags = extractHashtags(songData.category);
  const posts: SocialPost[] = [];

  songData.tamilStanzas.forEach((stanza, index) => {
    const rawLyrics = cleanHtmlTags(stanza);
    const snippetText = generateSnippet(stanza, hashtags, songUrl);
    const encodedText = encodeForUrl(snippetText);

    posts.push({
      stanzaIndex: index + 1,
      text: snippetText,
      twitterLink: `https://twitter.com/intent/tweet?text=${encodedText}`,
      whatsappLink: `https://wa.me/?text=${encodedText}`,
      hashtags,
      rawLyrics
    });
  });

  return posts;
}

/**
 * Process a song JSON file and generate posts
 */
export async function processSongFile(filePath: string, baseUrl?: string): Promise<SocialPost[]> {
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const songData: SongData = JSON.parse(fileContent);
  
  return generateSocialPosts(songData, baseUrl);
}

/**
 * Format posts for display
 */
export function formatPostsForDisplay(posts: SocialPost[]): string {
  let output = '='.repeat(80) + '\n';
  output += 'SOCIAL MEDIA POSTS\n';
  output += '='.repeat(80) + '\n\n';

  posts.forEach((post, index) => {
    output += `POST ${index + 1} (Stanza ${post.stanzaIndex})\n`;
    output += '-'.repeat(80) + '\n';
    output += post.text + '\n\n';
    output += `Twitter: ${post.twitterLink}\n`;
    output += `WhatsApp: ${post.whatsappLink}\n`;
    output += '\n' + '='.repeat(80) + '\n\n';
  });

  return output;
}

/**
 * Main function to process and display posts
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: ts-node scripts/generate-social-posts.ts <song-json-file> [base-url]');
    console.error('Example: ts-node scripts/generate-social-posts.ts public/songs/song.json https://tsonglyrics.com');
    process.exit(1);
  }

  const filePath = args[0];
  const baseUrl = args[1] || 'http://localhost:3000';

  if (!fsSync.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const posts = await processSongFile(filePath, baseUrl);
    const output = formatPostsForDisplay(posts);
    
    console.log(output);
    
    // Also save to a file
    const outputFileName = path.basename(filePath, '.json') + '-social-posts.txt';
    const outputDir = path.join(process.cwd(), 'social-posts');
    
    if (!fsSync.existsSync(outputDir)) {
      await fs.mkdir(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, outputFileName);
    await fs.writeFile(outputPath, output, 'utf-8');
    
    console.log(`\n✅ Posts saved to: ${outputPath}`);
    console.log(`\n📊 Generated ${posts.length} social media posts`);
    
  } catch (error) {
    console.error('Error processing file:', error);
    process.exit(1);
  }
}

// Run if called directly
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
