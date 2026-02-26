#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface MissingKeyword {
  keyword: string;
  movie: string;
}

function generatePromptsForMissingKeywords() {
  console.log('📝 Generating lyrics prompts for missing keywords...\n');

  // Read missing keywords
  const missingKeywordsPath = join(__dirname, '../data/missing-keywords.json');
  const missingKeywords: MissingKeyword[] = JSON.parse(
    readFileSync(missingKeywordsPath, 'utf-8')
  );

  const prompts: Array<{
    songName: string;
    movieName: string;
    prompt: string;
  }> = [];

  missingKeywords.forEach((entry, index) => {
    const prompt = `Give me the full Tamil lyrics for ${entry.keyword} from ${entry.movie} Tamil and Thanglish separately, without any labels like 'Pallavi' or 'Charanam'.
    JSON format:
    {
  "title": "[Song Name] Song Lyrics & English Meaning - [Movie Name] | [Starring] | [Music Director]",
  "tags": "Song: [Name], Movie: [Name], Singer: [Name], Music: [Name], Lyrics: [Name]",
  "tamil": "[Tamil script lyrics with <br> tags]",
  "thanglish": "[Transliterated lyrics with <br> tags]",
  "translation": "[Thanglish snippets followed by <p style='text-align: right; border: 1px solid #ddd; padding: 2px;'>English Translation</p>]"
}`;
    
    prompts.push({
      songName: entry.keyword,
      movieName: entry.movie,
      prompt: prompt
    });

    console.log(`${index + 1}. ${entry.keyword} - ${entry.movie}:`);
    console.log(`   ${prompt}\n`);
  });

  // Save prompts to file
  const outputPath = join(__dirname, '../output/lyrics-prompts.json');
  writeFileSync(outputPath, JSON.stringify(prompts, null, 2), 'utf-8');

  console.log(`\n✅ Generated ${prompts.length} prompts`);
  console.log(`📄 Saved to: google-trends-workflow/output/lyrics-prompts.json`);
  console.log('\nYou can now use these prompts to fetch lyrics data.');
}

// Run the script
generatePromptsForMissingKeywords();
