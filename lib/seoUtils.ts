/**
 * SEO Utility Functions
 * Helpers for generating optimized metadata for song and category pages
 */

// Constants for snippet extraction
const SENTENCE_BOUNDARY_BUFFER = 20; // Extra chars to look for sentence boundaries
const MIN_SENTENCE_LENGTH = 80; // Minimum length for a complete sentence to use

/**
 * Maximum snippet length to use in song descriptions
 * Exported for use in song page metadata generation
 */
export const SONG_DESCRIPTION_SNIPPET_LENGTH = 100;

/**
 * Extract a clean snippet from lyrics content for meta descriptions
 * Returns the first stanza/paragraph, cleaned and truncated to optimal length
 */
export function extractSnippet(content: string, maxLength: number = 155): string {
  if (!content) return '';
  
  // Remove all HTML tags
  let text = content
    .replace(/<img\b[^>]*>(?:<\/img>)?/gi, '') // Remove images first
    .replace(/<br\s*\/?>/gi, ' ') // Convert breaks to spaces
    .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // If text is short enough, return as is
  if (text.length <= maxLength) {
    return text;
  }
  
  // Find the first natural break (period, newline, or double space) near maxLength
  const firstPeriod = text.indexOf('.', 0);
  const firstSentence = firstPeriod > 0 && firstPeriod <= maxLength + SENTENCE_BOUNDARY_BUFFER
    ? text.substring(0, firstPeriod + 1) 
    : null;
  
  if (firstSentence && firstSentence.length >= MIN_SENTENCE_LENGTH) {
    return firstSentence;
  }
  
  // Otherwise, truncate at word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Clean category labels by removing prefixes like "Movie:", "Song:", etc.
 */
export function cleanCategoryLabel(label: string): string {
  if (!label) return '';
  
  // Remove common prefixes
  return label
    .replace(/^(Movie|Song|Singer|Lyrics|Lyricist|Music|MovieMusic|OldMusic|OldSong|Actor):\s*/i, '')
    .trim();
}

/**
 * Generate SEO-optimized description for song page
 */
export function generateSongDescription(params: {
  entry: any;
  title: string;
  snippet: string;
  movie?: string;
  singer?: string;
  lyricist?: string;
  music?:string;
  actor?:string;
}): string {
  const { title, snippet, movie, singer, lyricist, music, actor } = params;
  
  // Build a natural-sounding description
  const parts: string[] = [];
  
  // Start with the title
  // const cleanTitle = cleanCategoryLabel(title).replace(/\s+lyrics$/i, '').trim();
  const entryTitle = params.entry.title?.$t || '';
  if(title.indexOf("-")!=-1 ){
    const songName = title.split("-")[0].trim();
    if(hasEnglishTranslationContent(params.entry.category || [])){
      parts.push(entryTitle + '.');
    }else{
      if(['tamil lyrics','lyrics in tamil','lyrics tamil'].some(term => entryTitle.toLowerCase().includes(term))){
        parts.push(`Full ${songName} songs lyrics in tamil (${snippet.split(" ").slice(0,5).join(" ")} ...)`);
      }else
       parts.push(`Full ${songName} songs lyrics,`);
    }
  }else{
    parts.push("Full " + title + ",");
  }
  
  // Add context
  if (movie) {
    parts.push(`${movie} Songs Lyrics.`);
  }
  if(!hasEnglishTranslationContent(params.entry.category || [])){
      parts.push("sharable lyrics snippets,");
    }
  if (lyricist) {
    parts.push(`Lyrics: ${lyricist},`);
  }

  if (music) {
    parts.push(`Music: ${music},`);
  }
  
  if (singer) {
    parts.push(`Singer(s): ${singer}`);
  }
  
  // Add lyrics keyword  
  // Add snippet if we have room
  const baseDesc = parts.join(' ') + '.';
  const remainingLength = 155 - baseDesc.length - 1; // -1 for space
  
  if (remainingLength > 30 && snippet) {
    const shortSnippet = snippet.length > remainingLength 
      ? snippet.substring(0, remainingLength - 3) + '...'
      : snippet;
    return baseDesc + ' ' + shortSnippet;
  }
  
  return baseDesc;
}

/**
 * Generate SEO-optimized description for category page
 */
export function generateCategoryDescription(categoryTerm: string): string {
  const cleanLabel = cleanCategoryLabel(categoryTerm);
  
  if (categoryTerm.match(/^Movie:/i)) {
  // Focus: Completeness and the specific movie name
  return `Explore full ${cleanLabel} songs lyrics in Tamil. Get all song lyrics, singer credits, and music details from this hit movie.`;
} else if (categoryTerm.match(/^Singer:/i)) {
  // Focus: Fan discovery and collection
  return `Best of ${cleanLabel} Tamil songs lyrics collection. Browse and read the complete lyrics of hit songs performed by singer ${cleanLabel}.`;
} else if (categoryTerm.match(/^(Lyrics|Lyricist):/i)) {
  // Focus: Artistry and poetic value
  return `Read all Tamil song lyrics penned by ${cleanLabel}. Discover the deep meaning and powerful verses of hit songs written by lyricist ${cleanLabel}.`;
} else if (categoryTerm.match(/^(Music|OldMusic):/i)) {
  // Focus: The composer's brand
  return `Complete collection of Tamil song lyrics composed by ${cleanLabel}. Read the lyrics of your favorite hits from this legendary music director.`;
}

// Generic fallback - Cleaner and more professional
return `Browse the latest ${cleanLabel} Tamil song lyrics. Read, sing along, and explore full lyrics from the ${cleanLabel} category on our site.`;
}

/**
 * Clean and format title for SEO (removes redundant "Lyrics" if already present)
 */
export function formatSEOTitle(title: string): string {
  if (!title) return 'Tamil Song Lyrics';
  
  // If title already contains "Lyrics", use as is
  if (title.match(/lyrics/i)) {
    return title;
  }
  
  // Otherwise, append "Lyrics"
  return `${title} Lyrics`;
}

/**
 * Extract metadata from Blogger entry categories
 */
export function extractSongMetadata(categories: Array<{ term: string }> | undefined, title: string) {
  if (!categories) {
    return {
      songTitle: title,
      movieName: '',
      singerName: '',
      lyricistName: '',
      musicName: '',
      actorName: '',
      songCategory: '',
      movieTerm: ''
    };
  }
  
  const songCategory = categories.find(cat => cat.term?.startsWith('Song:'))
  const movieCategory = categories.find(cat => cat.term?.startsWith('Movie:'))
  const singerCategories = categories.filter(cat => cat.term?.startsWith('Singer:')) || []
  const lyricsCategory = categories.find(cat => cat.term?.startsWith('Lyrics:') || cat.term?.startsWith('Lyricist:'))
  const musicCategory = categories.find(cat => cat.term?.startsWith('Music:'))
  const actorCategory = categories.find(cat => cat.term?.startsWith('Actor:'))
  
  // Extract and join multiple singer names
  const singerNames = singerCategories
    .map(cat => cat.term.replace('Singer:', '').trim())
    .filter(name => name.length > 0)
  
  return {
    songTitle: songCategory ? songCategory.term.replace('Song:', '') : title,
    movieName: movieCategory?.term?.replace('Movie:', '') || '',
    singerName: singerNames.length > 0 ? singerNames.join(', ') : '',
    lyricistName: lyricsCategory?.term?.replace(/^(Lyrics|Lyricist):/, '') || '',
    musicName: musicCategory?.term?.replace('Music:', '') || '',
    actorName: actorCategory?.term?.replace('Actor:', '') || '',
    songCategory: songCategory?.term || '',
    movieTerm: movieCategory?.term || ''
  }
}

export function generateSEOTitle(cleanLabel:string, categoryTerm: string): string {
  if (categoryTerm.match(/^Movie:/i)) {
  // Focus: Movie name + "Tamil Songs Lyrics"
  return `${cleanLabel} Tamil Songs Lyrics | Full Movie Song Lyrics`;
} else if (categoryTerm.match(/^Singer:/i)) {
  // Focus: Singer name + "Hit Songs"
  return `${cleanLabel} Hit Tamil Songs Lyrics | Best Songs of ${cleanLabel}`;
} else if (categoryTerm.match(/^(Lyrics|Lyricist):/i)) {
  // Focus: Lyricist name + "All Songs"
  return `Tamil Songs Written by ${cleanLabel} | All Song Lyrics`;
} else if (categoryTerm.match(/^(Music|OldMusic):/i)) {
  // Focus: Composer name + "Music Director"
  return `${cleanLabel} Musical Hits - Tamil Song Lyrics | ${cleanLabel} Compositions`;
}

// Generic fallback
return `${cleanLabel} Tamil Song Lyrics Collection`;
}

//has english translation 
export function hasEnglishTranslationContent(categories: any): boolean {
  return categories.some((cat: any) => 
    cat.term && cat.term.toLowerCase().includes('englishtranslation')
  );
}

/**
 * Generate SEO keywords for song page
 */
export function generateKeywords(entry: any, metadata: any): string {
  const title = metadata.songTitle;
  const songName = title.indexOf("-") !== -1 ? title.split("-")[0].trim() : title;
  const keywordList = (entry.category || [])
    .filter((cat: any) => !cat.term.startsWith('Song:'))
    .map((cat: any) => cat.term.replace(/^[^:]*:/, '').trim())
    .filter(Boolean);

  keywordList.push(
    ...(hasEnglishTranslationContent(entry.category || []) ? [
      `${songName} lyrics meaning`,
      `${songName} Tamil to English translation`
    ] : [`${songName} full lyrics`]),
    `${metadata.movieName} songs lyrics`,
    `${songName} lyrics snippets`,
    `${songName} WhatsApp status lyrics snippets`,
    `share ${songName} lyrics snippets with friends`
  );
  return keywordList.join(', ');
}
