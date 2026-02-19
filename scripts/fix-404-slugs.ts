import * as fs from 'fs';
import * as path from 'path';

// Read the 404 CSV file
const logFile = '/Users/psathish18/Downloads/404 not found.csv';
const songsDir = path.join(__dirname, '../public/songs');

interface SlugMatch {
  slug: string;
  status: 'EXACT_MATCH' | 'STARTSWITH_MATCH' | 'NO_MATCH';
  existingFile: string | null;
  renameCommand: string | null;
}

// Extract slugs from 404 CSV
function extract404Slugs(): Set<string> {
  const logData = fs.readFileSync(logFile, 'utf-8');
  const lines = logData.split('\n');
  
  const slugs = new Set<string>();
  
  for (const line of lines) {
    // Match: /songs/slug-name.json
    const match = line.match(/\/songs\/([a-z0-9-]+)\.json/);
    if (match) {
      slugs.add(match[1]);
    }
  }
  
  return slugs;
}

// Check if file exists and find matches
function findMatchingFile(slug: string): SlugMatch {
  try {
    const files = fs.readdirSync(songsDir);
    const exactMatch = `${slug}.json`;
    
    // Check exact match first
    if (files.includes(exactMatch)) {
      return {
        slug,
        status: 'EXACT_MATCH',
        existingFile: exactMatch,
        renameCommand: null
      };
    }
    
    // Check startsWith match
    const startsWithMatches = files.filter(file => {
      const fileSlug = file.replace('.json', '');
      return fileSlug.startsWith(slug) && file.endsWith('.json');
    });
    
    if (startsWithMatches.length > 0) {
      // Prefer shortest match
      const bestMatch = startsWithMatches.sort((a, b) => a.length - b.length)[0];
      return {
        slug,
        status: 'STARTSWITH_MATCH',
        existingFile: bestMatch,
        renameCommand: `mv "${bestMatch}" "${exactMatch}"`
      };
    }
    
    return {
      slug,
      status: 'NO_MATCH',
      existingFile: null,
      renameCommand: null
    };
  } catch (error) {
    return {
      slug,
      status: 'NO_MATCH',
      existingFile: null,
      renameCommand: null
    };
  }
}

// Generate CSV report
function generateCSVReport(matches: SlugMatch[]): string {
  const csvLines: string[] = [
    'Slug,Status,Existing File,Rename Command'
  ];
  
  for (const match of matches) {
    const status = match.status;
    const existingFile = match.existingFile || 'NOT FOUND';
    const renameCommand = match.renameCommand || 'N/A';
    
    csvLines.push([
      match.slug,
      status,
      existingFile,
      renameCommand
    ].join(','));
  }
  
  return csvLines.join('\n');
}

// Main execution
console.log('📊 Analyzing 404 slugs...\n');

const slugs = extract404Slugs();
console.log(`Found ${slugs.size} unique 404 slugs\n`);

// Check each slug
const matches: SlugMatch[] = [];
for (const slug of Array.from(slugs).sort()) {
  const match = findMatchingFile(slug);
  matches.push(match);
}

// Generate statistics
const exactMatches = matches.filter(m => m.status === 'EXACT_MATCH').length;
const startsWithMatches = matches.filter(m => m.status === 'STARTSWITH_MATCH').length;
const noMatches = matches.filter(m => m.status === 'NO_MATCH').length;

console.log('📈 Statistics:');
console.log(`  Total 404 slugs: ${matches.length}`);
console.log(`  Exact matches (already fixed): ${exactMatches}`);
console.log(`  StartsWith matches (need rename): ${startsWithMatches}`);
console.log(`  No matches (need creation): ${noMatches}`);
console.log(`  Fix rate: ${((exactMatches / matches.length) * 100).toFixed(1)}%\n`);

// Save CSV report
const csvReport = generateCSVReport(matches);
const reportFile = path.join(__dirname, '../404-fix-report.csv');
fs.writeFileSync(reportFile, csvReport);
console.log(`✅ Report saved to: ${reportFile}\n`);

// Generate rename script
const renameCommands = matches
  .filter(m => m.status === 'STARTSWITH_MATCH' && m.renameCommand)
  .map(m => m.renameCommand);

if (renameCommands.length > 0) {
  const renameScript = path.join(__dirname, '../fix-404-renames.sh');
  const scriptContent = [
    '#!/bin/bash',
    '# Auto-generated rename script for 404 fixes',
    `# Total renames: ${renameCommands.length}`,
    'cd "$(dirname "$0")/public/songs"',
    '',
    ...renameCommands
  ].join('\n');
  
  fs.writeFileSync(renameScript, scriptContent);
  fs.chmodSync(renameScript, '755');
  
  console.log(`📝 Rename script saved to: ${renameScript}`);
  console.log(`   Run with: bash ${renameScript}\n`);
}

// Show preview of matches that need renaming
console.log('🔍 Preview of StartsWith matches (first 10):');
const previewMatches = matches.filter(m => m.status === 'STARTSWITH_MATCH').slice(0, 10);
for (const match of previewMatches) {
  console.log(`  ${match.slug}`);
  console.log(`    → ${match.existingFile}`);
}

if (startsWithMatches > 10) {
  console.log(`  ... and ${startsWithMatches - 10} more`);
}

console.log('\n🚨 No matches (first 10):');
const noMatchPreview = matches.filter(m => m.status === 'NO_MATCH').slice(0, 10);
for (const match of noMatchPreview) {
  console.log(`  ${match.slug}`);
}

if (noMatches > 10) {
  console.log(`  ... and ${noMatches - 10} more`);
}
