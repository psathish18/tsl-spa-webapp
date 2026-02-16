#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read the list of files to fix
const filesToFix = fs.readFileSync('few-stanzas-files.txt', 'utf8')
  .split('\n')
  .filter(line => line.trim())
  .map(line => line.split(' (')[0]) // Remove the stanza count in parentheses
  .filter(line => line.endsWith('.json'));

console.log(`Found ${filesToFix.length} files to regenerate`);

// Process each file
let successCount = 0;
let errorCount = 0;

for (const filePath of filesToFix) {
  try {
    // Extract the slug from the file path
    const slug = path.basename(filePath, '.json');

    // Read the existing JSON file to get the correct category
    const existingFile = path.join('public', 'songs', `${slug}.json`);
    let category = '';
    
    if (fs.existsSync(existingFile)) {
      const existingData = JSON.parse(fs.readFileSync(existingFile, 'utf8'));
      const songCategory = existingData.category?.find(cat => cat.startsWith('Song:'));
      if (songCategory) {
        category = songCategory;
      } else {
        console.log(`Skipping ${slug} - no Song category found`);
        errorCount++;
        continue;
      }
    } else {
      console.log(`Skipping ${slug} - existing file not found`);
      errorCount++;
      continue;
    }

    console.log(`Regenerating ${slug} with category: ${category}`);

    // Run the generation script
    const command = `npm run generate-song-json -- --category="${category}"`;
    execSync(command, { stdio: 'inherit' });

    // Copy the generated file to public/songs
    const generatedFile = path.join('blob-data', `${slug}.json`);
    const targetFile = path.join('public', 'songs', `${slug}.json`);

    if (fs.existsSync(generatedFile)) {
      fs.copyFileSync(generatedFile, targetFile);
      console.log(`✓ Successfully regenerated ${slug}`);
      successCount++;
    } else {
      console.log(`✗ Generated file not found: ${generatedFile}`);
      errorCount++;
    }

  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    errorCount++;
  }
}

console.log(`\nBulk regeneration complete:`);
console.log(`✓ Success: ${successCount} files`);
console.log(`✗ Errors: ${errorCount} files`);
console.log(`Total: ${filesToFix.length} files`);