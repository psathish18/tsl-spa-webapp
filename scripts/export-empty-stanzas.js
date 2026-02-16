#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Directory containing the song JSON files
const songsDir = path.join(__dirname, '..', 'public', 'songs');

// Read all JSON files in the songs directory
const files = fs.readdirSync(songsDir).filter(file => file.endsWith('.json'));

console.log(`Found ${files.length} JSON files in songs directory`);

const emptyStanzasFiles = [];
const fewStanzasFiles = [];

for (const file of files) {
  try {
    const filePath = path.join(songsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Skip files with "MovieLyrics" or "englishtranslation" category
    if (data.category && data.category.some(cat => cat.includes('MovieLyrics') || cat.includes('englishtranslation'))) {
      continue;
    }

    // Check if stanzas array is empty
    if (!data.stanzas || data.stanzas.length === 0) {
      emptyStanzasFiles.push(file);
    }
    
    // Check if stanzas array has 2 or 3 items (potentially problematic)
    if (data.stanzas && (data.stanzas.length === 2 || data.stanzas.length === 3)) {
      fewStanzasFiles.push(`${file} (${data.stanzas.length} stanzas)`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
}

console.log(`Found ${emptyStanzasFiles.length} files with empty stanzas`);
console.log(`Found ${fewStanzasFiles.length} files with 2-3 stanzas`);

// Write the empty stanzas list to a file
const emptyOutputFile = path.join(__dirname, '..', 'empty-stanzas-files.txt');
fs.writeFileSync(emptyOutputFile, emptyStanzasFiles.join('\n'), 'utf8');
console.log(`Exported empty stanzas files to: ${emptyOutputFile}`);

// Write the few stanzas list to a file
const fewOutputFile = path.join(__dirname, '..', 'few-stanzas-files.txt');
fs.writeFileSync(fewOutputFile, fewStanzasFiles.join('\n'), 'utf8');
console.log(`Exported few stanzas files to: ${fewOutputFile}`);

// Also show a summary
console.log('\nFirst 10 files with empty stanzas:');
emptyStanzasFiles.slice(0, 10).forEach(file => console.log(`- ${file}`));

console.log('\nFirst 10 files with 2-3 stanzas:');
fewStanzasFiles.slice(0, 10).forEach(file => console.log(`- ${file}`));