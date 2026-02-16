import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Types from generate-song-json.ts
interface BloggerEntry {
  id: { $t: string };
  title: { $t: string };
  content: { $t: string };
  published: { $t: string };
  category?: Array<{ term: string }>;
  media$thumbnail?: { url: string };
  link?: Array<{ rel: string; type: string; href: string; title?: string }>;
}

interface BloggerFeed {
  feed: {
    entry?: BloggerEntry[];
  };
}

// Extract slug from Blogger post URL (same logic as generate-song-json.ts)
function extractSlugFromUrl(entry: BloggerEntry): string {
  const alternateLink = entry.link?.find(link => 
    link.rel === 'alternate' && link.type === 'text/html'
  );
  
  if (alternateLink?.href) {
    // Extract from: https://...blogspot.com/2026/01/song-name.html
    const match = alternateLink.href.match(/\/([^\/]+)\.html$/);
    if (match) {
      return match[1];
    }
  }
  
  // Fallback to title-based slug
  return createSlug(entry.title.$t);
}

// Create slug from title (fallback)
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\b\d+\b/g, '') // Remove standalone digits
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Convert spaces to hyphens
    .replace(/-+/g, '-') // Clean up multiple hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Clean lyrics content
function stripImagesFromHtml(html: string): string {
  return html.replace(/<img[^>]*>/gi, '');
}

function sanitizeLyrics(content: string): string[] {
  const cleanContent = stripImagesFromHtml(content);
  const stanzas = cleanContent.split(/<br\s*\/?>\s*<br\s*\/?>/gi);
  
  return stanzas
    .map(stanza => stanza.trim())
    .filter(stanza => stanza.length > 0);
}

// Parse CSV row (simple CSV parser for our format)
function parseCSVRow(line: string): {
  rawSlug: string;
  cleanSlug: string;
  blobFile: string;
  songCategory: string;
  movieCategory: string;
} | null {
  // Skip header or empty lines
  if (line.includes('Raw Slug') || !line.includes('[CDN_MISS]')) {
    return null;
  }
  
  // Split by comma and extract fields
  const parts = line.split(',');
  if (parts.length < 5) {
    return null;
  }
  
  // Extract fields (handling the [CDN_MISS] prefix)
  const rawSlug = parts[1]?.trim() || '';
  const cleanSlug = parts[2]?.trim() || '';
  const blobFile = parts[3]?.trim() || '';
  const songCategory = parts[4]?.trim() || '';
  const movieCategory = parts[5]?.trim() || '';
  
  return {
    rawSlug,
    cleanSlug,
    blobFile,
    songCategory,
    movieCategory
  };
}

// Fetch song from Blogger API using Song: category
async function fetchSongByCategory(songCategory: string): Promise<BloggerEntry | null> {
  if (!songCategory || songCategory === 'N/A') {
    return null;
  }
  
  try {
    // Use the Song: category to find the exact post
    const categoryQuery = `Song:${songCategory}`;
    const url = `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/${encodeURIComponent(categoryQuery)}?alt=json&max-results=1`;
    
    console.log(`  Fetching: ${categoryQuery}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`  ❌ API error: ${response.status}`);
      return null;
    }
    
    const data: BloggerFeed = await response.json();
    const entries = data.feed?.entry || [];
    
    if (entries.length === 0) {
      console.error(`  ❌ No entry found for: ${categoryQuery}`);
      return null;
    }
    
    return entries[0];
  } catch (error) {
    console.error(`  ❌ Error fetching song:`, error);
    return null;
  }
}

// Generate JSON file from Blogger entry
function generateSongJSON(entry: BloggerEntry, slug: string): any {
  const title = entry.title.$t;
  const content = entry.content.$t;
  const stanzas = sanitizeLyrics(content);
  
  // Extract categories
  const categories = entry.category?.map(cat => cat.term) || [];
  const movieName = categories.find(c => c.startsWith('Movie:'))?.replace('Movie:', '') || '';
  const singerName = categories.find(c => c.startsWith('Singer:'))?.replace('Singer:', '') || '';
  const lyricistName = categories.find(c => c.startsWith('Lyrics:') || c.startsWith('Lyricist:'))?.replace(/^(Lyrics|Lyricist):/, '') || '';
  
  return {
    id: entry.id.$t,
    title,
    slug,
    stanzas,
    tamilStanzas: [], // Will be populated separately if needed
    category: categories,
    thumbnail: entry.media$thumbnail?.url || '',
    published: entry.published.$t,
    movieName,
    singerName,
    lyricistName,
    relatedSongs: [], // Will be populated separately if needed
    seo: {
      title,
      description: `${title} - Tamil song lyrics${movieName ? ` from ${movieName}` : ''}`,
      keywords: categories.filter(c => !c.startsWith('Song:')).join(', ')
    }
  };
}

// Find existing file with old slug
function findExistingFile(songsDir: string, oldCleanSlug: string): string | null {
  const possibleFiles = [
    `${oldCleanSlug}.json`,
    `${oldCleanSlug}-lyrics.json`,
    `${oldCleanSlug}-song.json`,
  ];
  
  for (const file of possibleFiles) {
    const fullPath = path.join(songsDir, file);
    if (fs.existsSync(fullPath)) {
      return file;
    }
  }
  
  // Try startsWith match
  const files = fs.readdirSync(songsDir);
  const match = files.find(f => f.startsWith(oldCleanSlug) && f.endsWith('.json'));
  
  return match || null;
}

async function main() {
  const csvPath = '/Users/psathish18/Downloads/jan 14 8 am last 12 hours - Sheet1.csv';
  const songsDir = path.join(process.cwd(), 'public/songs');
  const outputDir = path.join(process.cwd(), 'cdn-fix-output');
  
  // Create output directory for new/renamed files
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const reportPath = path.join(process.cwd(), 'cdn-fix-report.csv');
  const renameScriptPath = path.join(process.cwd(), 'cdn-fix-renames.sh');
  
  const reportLines: string[] = ['Original Slug,Blogger Slug,Song Category,Status,Action,Old File,New File'];
  const renameCommands: string[] = ['#!/bin/bash', 'cd public/songs', ''];
  
  let processed = 0;
  let generated = 0;
  let renamed = 0;
  let skipped = 0;
  let errors = 0;
  
  // Read CSV file line by line
  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  console.log('🔍 Processing CDN miss logs...\n');
  
  for await (const line of rl) {
    const row = parseCSVRow(line);
    if (!row) continue;
    
    processed++;
    
    // Skip if no song category
    if (!row.songCategory || row.songCategory === 'N/A') {
      skipped++;
      reportLines.push(`${row.cleanSlug},N/A,N/A,SKIPPED,No song category,N/A,N/A`);
      continue;
    }
    
    console.log(`\n[${processed}] Processing: ${row.cleanSlug}`);
    console.log(`  Song: ${row.songCategory}`);
    
    // Fetch the actual post from Blogger using Song: category
    const entry = await fetchSongByCategory(row.songCategory);
    
    if (!entry) {
      errors++;
      reportLines.push(`${row.cleanSlug},ERROR,${row.songCategory},ERROR,API fetch failed,N/A,N/A`);
      continue;
    }
    
    // Use the blob filename from CSV (this is what CDN is looking for)
    const blobFileName = row.blobFile.replace('.json', '');
    const bloggerSlug = extractSlugFromUrl(entry);
    console.log(`  ✅ Blogger slug: ${bloggerSlug}`);
    console.log(`  📦 Using blob filename: ${blobFileName}`);
    
    // Generate JSON with blob filename as slug
    const jsonData = generateSongJSON(entry, blobFileName);
    const newFilePath = path.join(outputDir, row.blobFile);
    
    fs.writeFileSync(newFilePath, JSON.stringify(jsonData, null, 2));
    generated++;
    console.log(`  📝 Generated: ${row.blobFile}`);
    
    // Find existing file with old slug
    const existingFile = findExistingFile(songsDir, row.cleanSlug);
    
    if (existingFile) {
      // Create rename command
      const oldPath = existingFile;
      const newPath = row.blobFile;
      renameCommands.push(`# ${row.songCategory}`);
      renameCommands.push(`mv "${oldPath}" "${newPath}"`);
      renameCommands.push('');
      renamed++;
      
      reportLines.push(`${row.cleanSlug},${blobFileName},${row.songCategory},RENAME,Rename + regenerate,${existingFile},${newPath}`);
      console.log(`  🔄 Will rename: ${existingFile} -> ${newPath}`);
    } else {
      reportLines.push(`${row.cleanSlug},${blobFileName},${row.songCategory},NEW,Generate new file,N/A,${row.blobFile}`);
      console.log(`  ✨ New file (no existing match)`);
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Write report
  fs.writeFileSync(reportPath, reportLines.join('\n'));
  console.log(`\n📊 Report saved: ${reportPath}`);
  
  // Write rename script
  fs.writeFileSync(renameScriptPath, renameCommands.join('\n'));
  fs.chmodSync(renameScriptPath, '755');
  console.log(`📜 Rename script saved: ${renameScriptPath}`);
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total rows processed: ${processed}`);
  console.log(`✅ Files generated: ${generated}`);
  console.log(`🔄 Files to rename: ${renamed}`);
  console.log(`⏭️  Skipped (no category): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log('='.repeat(60));
  console.log(`\nNew JSON files: ${outputDir}`);
  console.log(`To apply renames: bash ${renameScriptPath}`);
}

main().catch(console.error);
