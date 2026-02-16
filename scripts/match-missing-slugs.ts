/**
 * Match missing CDN slugs with existing files using startsWith
 * This helps identify files that need renaming for 100% CDN hit rate
 */

import { promises as fs } from 'fs';
import path from 'path';

const SONGS_DIR = path.join(__dirname, '../public/songs');

// Missing slugs from Vercel logs (404s)
const MISSING_SLUGS = `avalukena-lyrics-single-by-anirudh
avalum-naanum-lyrics-achcham-yenbathu
avaravar-vazhkaiyil-lyrics-pandavar
avatha-paiyan-lyrics-paradesi-songs
ayan-songs-lyrics
ayayayayo-aananthamey-lyrics-kumki-song
ayyayo-en-usurukulla-song-lyrics
azhagae-azhagae-lyrics-kathakali-song
azhage-azhagae-lyrics-album
azhagho-azhaghu-lyrics-samar-songs
azhagiya-soodana-poovey-lyrics-english
backup
bae-ini-nan-unna-en-kanna-pola-lyrics
bagulu-odayum-dagulu-mari-lyrics-maari
bam-bam-bam-bambaram-lyrics-raja
banaras-pattu-katti-lyrics-ninaithale
bhoomi-bhoomi-song-lyrics-chekka
bhoomi-bhoomi-song-lyrics-chekka-chivantha
bhoomi-bhoomi-song-lyrics-english
billa-2-idhayam-lyrics-in-tamil
blog
blog-verify
boomi-enna-suthudhe-lyrics-ethir
boomiyil-lyrics-pizza-2-villa-song
bulbu-vaangittaen-machan-lyrics
category-sitemap
chekka-chivantha-vaanam-songs-lyrics
chemmeenaa-vinmeenaa-lyrics-anantha
chennai-28-ii-song-lyrics
chennai-city-gangsta-lyrics-vanakkam
chennai-vada-chennai-madras-lyrics
chikku-bukku-rayile-song-lyrics
chillax-lyrics-manjanathi-lyrics
chinna-chinna-laali-laali-lyrics
chinna-chinna-roja-poove-lyrics
chithirai-nela-lyrics-in-tamil-kadal
chithirai-nela-lyrics-kadal-songs-lyrics
chittukku-lyrics-nallavanuku-nallavan
chotta-chotta-ninaika-lyrics-engeyum
chudithar-anindhu-lyrics-poovellam
damaal-dumeel-lyrics-damaal-dumeel-song
damakku-damakku-lyrics-aadhavan-song
dandanakka-lyrics-romeo-juliet-song
danga-maari-english-meaning-lyrics
dappankuththu-mettula-lyrics-nannbenda
darling-dambakku-lyrics-maan-karate
david-songs-lyrics-tamil
deeyaalo-deeyaalo-lyrics-kayal-song
deivangal-ellam-thotre-pogum-lyrics
deva-devathai-lyrics-amara-kaaviyam
dhagudu-dhattham-lyrics-manmadhan-ambu
dhanush-in-mappillai-song-lyrics
dheivangal-ellam-lyrics-kedi-billa
dhevathai-vamsam-neeyo-lyrics-snegithiye
dhikku-dhikku-sir-lyrics-kaashmora-
dhruva-natchathiram-teaser-rap-lyrics
disco-woman-lyrics-pizza-2-villa-song-lyrics
don-you-mess-with-me-lyrics-vedalam
don39t-you-mess-with-me-lyrics-vedalam-song-lyrics`.split('\n');

async function findMatches() {
  const files = await fs.readdir(SONGS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  console.log(`Found ${jsonFiles.length} JSON files in public/songs/\n`);
  console.log(`Missing slugs: ${MISSING_SLUGS.length}\n`);
  console.log(`========================================\n`);

  const matches: Array<{slug: string, matches: string[], exactMatch: boolean}> = [];
  const noMatches: string[] = [];

  for (const slug of MISSING_SLUGS) {
    const matchingFiles = jsonFiles.filter(file => {
      const fileSlug = file.replace('.json', '');
      return fileSlug.startsWith(slug) || slug.startsWith(fileSlug);
    });

    const exactMatch = jsonFiles.some(file => file === `${slug}.json`);

    if (matchingFiles.length > 0) {
      matches.push({ slug, matches: matchingFiles, exactMatch });
    } else {
      noMatches.push(slug);
    }
  }

  // Print matches
  console.log('✅ MATCHES FOUND (rename these files):\n');
  for (const { slug, matches: fileMatches, exactMatch } of matches) {
    if (!exactMatch && fileMatches.length > 0) {
      console.log(`Missing slug: "${slug}"`);
      console.log(`  → Matching files:`);
      for (const file of fileMatches) {
        console.log(`     - ${file}`);
      }
      console.log(`  → Suggested rename: mv "${fileMatches[0]}" "${slug}.json"\n`);
    }
  }

  // Print no matches
  console.log(`\n========================================\n`);
  console.log(`❌ NO MATCHES (need to generate or these are invalid URLs):\n`);
  for (const slug of noMatches) {
    console.log(`  - ${slug}`);
  }

  // Statistics
  console.log(`\n========================================\n`);
  console.log(`📊 STATISTICS:`);
  console.log(`  Total missing: ${MISSING_SLUGS.length}`);
  console.log(`  Found matches: ${matches.length}`);
  console.log(`  No matches: ${noMatches.length}`);
  console.log(`  Match rate: ${((matches.length / MISSING_SLUGS.length) * 100).toFixed(1)}%`);
}

findMatches().catch(console.error);
