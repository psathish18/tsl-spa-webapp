#!/usr/bin/env node

/**
 * Script to split stanzas in English translation song files
 * 
 * Current format: One HTML string with table containing two columns (Thanglish | English)
 * New format: Multiple stanzas with alternating Thanglish and English paragraphs
 * 
 * Usage: node scripts/split-translation-stanzas.js <file1> <file2> ...
 */

const fs = require('fs');
const path = require('path');

function extractTableContent(html) {
  // Try first pattern: <table><tbody><tr><td>Lyrics in Thanglish...
  let tableRegex = /<table><tbody><tr>\s*<td>Lyrics in Thanglish[^<]*<br \/>[^<]*<br \/>(.*?)<\/td>\s*<td>English Translation[^<]*<br \/>[^<]*<br \/>(.*?)<\/td>\s*<\/tr><\/tbody><\/table>/s;
  let match = html.match(tableRegex);
  
  if (match) {
    return {
      thanglish: match[1].trim(),
      english: match[2].trim()
    };
  }
  
  // Try second pattern: <table><tbody>\n<tr><td>Lyrics in Thanglish...
  tableRegex = /<table><tbody>\s*<tr><td>Lyrics in Thanglish[^<]*<br \/>[^<]*<br \/>\s*(.*?)<\/td><td>English Translation[^<]*<br \/>[^<]*<br \/>\s*(.*?)<\/td><\/tr>\s*<\/tbody><\/table>/s;
  match = html.match(tableRegex);
  
  if (match) {
    return {
      thanglish: match[1].trim(),
      english: match[2].trim()
    };
  }
  
  console.log('  ⚠️  Could not find translation table in expected format');
  return null;
}

function cleanHtmlTags(text) {
  // Remove span tags but keep content
  text = text.replace(/<span[^>]*>(.*?)<\/span>/g, '$1');
  // Remove a tags but keep content
  text = text.replace(/<a[^>]*>(.*?)<\/a>/g, '$1');
  // Remove div tags but keep content
  text = text.replace(/<div[^>]*>(.*?)<\/div>/g, '$1');
  return text.trim();
}

function splitIntoStanzas(thanglish, english) {
  // Split by double br tags (stanza separator)
  const thanglishParts = thanglish.split(/<br\s*\/>\s*<br\s*\/>/i).map(s => cleanHtmlTags(s).trim()).filter(s => s.length > 0);
  const englishParts = english.split(/<br\s*\/>\s*<br\s*\/>/i).map(s => cleanHtmlTags(s).trim()).filter(s => s.length > 0);
  
  console.log(`  Found ${thanglishParts.length} Thanglish stanzas and ${englishParts.length} English stanzas`);
  
  const stanzas = [];
  const maxLength = Math.max(thanglishParts.length, englishParts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const tPart = thanglishParts[i] || '';
    const ePart = englishParts[i] || '';
    
    // Create stanza with Thanglish (no <p> tag) and English (with <p> tag)
    // Thanglish: raw text with <br /> tags
    // English: wrapped in <p> tag with <br /> tags for line breaks
    let stanza = '<div>\n';
    
    if (tPart) {
      stanza += `${tPart.replace(/<br\s*\/?>/gi, '<br />')}\n`;
    }
    
    if (ePart) {
      stanza += `<p>${ePart.replace(/<br\s*\/?>/gi, '<br />')}</p>\n`;
    }
    
    stanza += '</div>';
    stanzas.push(stanza);
  }
  
  return stanzas;
}

function processFile(filePath) {
  console.log(`\nProcessing: ${path.basename(filePath)}`);
  
  try {
    // Read JSON file
    const content = fs.readFileSync(filePath, 'utf8');
    const song = JSON.parse(content);
    
    // Check if it has englishtranslation category
    if (!song.category || !song.category.includes('englishtranslation')) {
      console.log('  ⚠️  Skipping: Not an englishtranslation song');
      return false;
    }
    
    // Check if stanzas exist and has content
    if (!song.stanzas || song.stanzas.length === 0) {
      console.log('  ⚠️  Skipping: No stanzas found');
      return false;
    }
    
    // Extract Thanglish and English content from table
    const htmlContent = song.stanzas[0];
    const extracted = extractTableContent(htmlContent);
    
    if (!extracted) {
      return false;
    }
    
    // Split into stanzas
    const newStanzas = splitIntoStanzas(extracted.thanglish, extracted.english);
    
    if (newStanzas.length === 0) {
      console.log('  ⚠️  No stanzas created');
      return false;
    }
    
    // Update song object
    song.stanzas = newStanzas;
    song.generatedAt = new Date().toISOString();
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(song, null, 2), 'utf8');
    
    console.log(`  ✅ Successfully created ${newStanzas.length} stanzas`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error processing file: ${error.message}`);
    return false;
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node split-translation-stanzas.js <file1> <file2> ...');
  process.exit(1);
}

let successCount = 0;
let failCount = 0;

for (const filePath of args) {
  const fullPath = path.resolve(filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    failCount++;
    continue;
  }
  
  const success = processFile(fullPath);
  if (success) {
    successCount++;
  } else {
    failCount++;
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Summary: ${successCount} succeeded, ${failCount} failed`);
console.log(`${'='.repeat(50)}\n`);

process.exit(failCount > 0 ? 1 : 0);
