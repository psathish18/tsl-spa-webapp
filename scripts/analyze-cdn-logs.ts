import * as fs from 'fs';
import * as path from 'path';

// Read the CSV log file
const logFile = '/Users/psathish18/Downloads/logs_result (12).csv';
const songsDir = path.join(__dirname, '../public/songs');

interface LogEntry {
  pageUrl: string;
  rawSlug: string;
  cdnStatus: number | null;
  filename: string | null;
  matchStatus: 'MATCH' | 'NO_MATCH' | 'N/A';
}

// Extract slug from page URL
function extractSlugFromUrl(url: string): string | null {
  // Match patterns like:
  // www.tsonglyrics.com/song-name.html
  // www.tsonglyrics.com/2016/11/song-name.html
  const match = url.match(/tsonglyrics\.com\/(?:\d{4}\/\d{2}\/)?([a-z0-9-]+)\.html/);
  return match ? match[1] : null;
}

// Extract slug from CDN log message
function extractSlugFromMessage(message: string): string | null {
  // Match: "[Hybrid] CDN response status: 200 for song-name"
  const match = message.match(/CDN response status: \d+ for ([a-z0-9-]+)/);
  return match ? match[1] : null;
}

// Check if file exists in public/songs/
function findMatchingFile(slug: string): { filename: string | null; matchStatus: 'MATCH' | 'NO_MATCH' } {
  const exactMatch = `${slug}.json`;
  
  try {
    const files = fs.readdirSync(songsDir);
    
    // Check exact match first
    if (files.includes(exactMatch)) {
      return { filename: exactMatch, matchStatus: 'MATCH' };
    }
    
    // Check startsWith match
    const startsWithMatches = files.filter(file => {
      const fileSlug = file.replace('.json', '');
      return fileSlug.startsWith(slug) && file.endsWith('.json');
    });
    
    if (startsWithMatches.length > 0) {
      // Return shortest match
      const bestMatch = startsWithMatches.sort((a, b) => a.length - b.length)[0];
      return { filename: bestMatch, matchStatus: 'MATCH' };
    }
    
    return { filename: null, matchStatus: 'NO_MATCH' };
  } catch (error) {
    return { filename: null, matchStatus: 'NO_MATCH' };
  }
}

// Parse CSV log file - extract CDN status messages
function parseLogFile(): Map<string, LogEntry> {
  const logData = fs.readFileSync(logFile, 'utf-8');
  const lines = logData.split('\n');
  
  const entries = new Map<string, LogEntry>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Look for CDN response status messages
    if (!line.includes('CDN response status:')) continue;
    
    // Extract the message part which contains the slug and status
    const messageMatch = line.match(/\[Hybrid\] CDN response status: (\d+) for ([a-z0-9-]+)/);
    if (!messageMatch) continue;
    
    const cdnStatus = parseInt(messageMatch[1]);
    const rawSlug = messageMatch[2];
    
    // Construct the page URL (we don't have full URL, but we have the slug)
    const pageUrl = `www.tsonglyrics.com/${rawSlug}.html`;
    
    // Skip if we already processed this slug
    if (entries.has(pageUrl)) continue;
    
    // Find matching file
    const { filename, matchStatus } = findMatchingFile(rawSlug);
    
    entries.set(pageUrl, {
      pageUrl,
      rawSlug,
      cdnStatus,
      filename,
      matchStatus
    });
  }
  
  return entries;
}

// Generate CSV report
function generateReport(entries: Map<string, LogEntry>) {
  const csvLines: string[] = [
    'Page URL,Raw Slug,CDN Status,Filename Match,Match Status'
  ];
  
  const sortedEntries = Array.from(entries.values()).sort((a, b) => {
    // Sort by match status (NO_MATCH first), then by slug
    if (a.matchStatus !== b.matchStatus) {
      if (a.matchStatus === 'NO_MATCH') return -1;
      if (b.matchStatus === 'NO_MATCH') return 1;
    }
    return a.rawSlug.localeCompare(b.rawSlug);
  });
  
  for (const entry of sortedEntries) {
    const cdnStatus = entry.cdnStatus !== null ? entry.cdnStatus.toString() : 'N/A';
    const filename = entry.filename || 'NOT FOUND';
    
    csvLines.push([
      entry.pageUrl,
      entry.rawSlug,
      cdnStatus,
      filename,
      entry.matchStatus
    ].join(','));
  }
  
  return csvLines.join('\n');
}

// Main execution
console.log('📊 Analyzing CDN logs...\n');

const entries = parseLogFile();
console.log(`Found ${entries.size} unique page URLs\n`);

// Generate statistics
let matchCount = 0;
let noMatchCount = 0;
let naCount = 0;
let cdn200Count = 0;
let cdn404Count = 0;

for (const entry of entries.values()) {
  if (entry.matchStatus === 'MATCH') matchCount++;
  if (entry.matchStatus === 'NO_MATCH') noMatchCount++;
  if (entry.matchStatus === 'N/A') naCount++;
  
  if (entry.cdnStatus === 200) cdn200Count++;
  if (entry.cdnStatus === 404) cdn404Count++;
}

console.log('📈 Statistics:');
console.log(`  Total URLs: ${entries.size}`);
console.log(`  CDN 200 (Success): ${cdn200Count}`);
console.log(`  CDN 404 (Miss): ${cdn404Count}`);
console.log(`  Files MATCH: ${matchCount}`);
console.log(`  Files NO_MATCH: ${noMatchCount}`);
console.log(`  N/A (no CDN data): ${naCount}`);
console.log(`  Match Rate: ${((matchCount / entries.size) * 100).toFixed(1)}%\n`);

// Generate and save report
const report = generateReport(entries);
const outputFile = path.join(__dirname, '../cdn-match-report.csv');
fs.writeFileSync(outputFile, report);

console.log(`✅ Report saved to: ${outputFile}`);
console.log(`\nPreview of NO_MATCH entries:`);

// Show first 10 NO_MATCH entries
let count = 0;
for (const entry of entries.values()) {
  if (entry.matchStatus === 'NO_MATCH' && count < 10) {
    console.log(`  ${entry.rawSlug} → ${entry.filename || 'NOT FOUND'}`);
    count++;
  }
}

if (noMatchCount > 10) {
  console.log(`  ... and ${noMatchCount - 10} more`);
}
