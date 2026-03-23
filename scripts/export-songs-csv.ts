import fs from 'fs/promises';
import path from 'path';

interface SongData {
  title: string;
  movieName?: string;
  musicName?: string;
  category?: string[];
}

async function exportSongsToCSV() {
  const songsDir = path.join(process.cwd(), 'public', 'songs');
  const outputFile = path.join(process.cwd(), 'songs-export.csv');
  
  console.log('📁 Reading songs from:', songsDir);
  
  // Read all JSON files
  const files = await fs.readdir(songsDir);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  
  console.log(`📊 Found ${jsonFiles.length} song files`);
  
  // CSV header
  const csvRows = ['Movie Name,Song Name,Music Director,Filename'];
  let filteredCount = 0;
  let skippedCount = 0;
  
  // Process each file
  for (const file of jsonFiles) {
    try {
      const filePath = path.join(songsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const song: SongData = JSON.parse(content);
      
      // Filter: exclude if has "MovieLyrics" category
      if (song.category?.includes('MovieLyrics')) {
        skippedCount++;
        continue;
      }
      
      // Filter: include only if has category starting with "Song:" or "Oldsong:"
      const hasSongCategory = song.category?.some(cat => 
        cat.startsWith('Song:') || cat.startsWith('Oldsong:')
      );
      
      if (!hasSongCategory) {
        skippedCount++;
        continue;
      }
      
      // Extract and escape fields for CSV
      const movieName = escapeCsvField(song.movieName || 'N/A');
      const songName = escapeCsvField(song.title || 'N/A');
      const musicDirector = escapeCsvField(song.musicName || 'N/A');
      const filename = escapeCsvField(file);
      
      csvRows.push(`${movieName},${songName},${musicDirector},${filename}`);
      filteredCount++;
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  }
  
  // Write CSV file
  await fs.writeFile(outputFile, csvRows.join('\n'), 'utf-8');
  
  console.log(`\n✅ CSV file created: ${outputFile}`);
  console.log(`📝 Songs exported: ${filteredCount}`);
  console.log(`⏭️  Songs skipped: ${skippedCount}`);
  console.log(`📊 Total processed: ${jsonFiles.length}`);
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCsvField(field: string): string {
  if (!field) return '""';
  
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  
  return field;
}

// Run the export
exportSongsToCSV().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
