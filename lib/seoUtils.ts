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
    .replace(/^(Movie|Song|Singer|Lyrics|Lyricist|Music|OldMusic|OldSong):\s*/i, '')
    .trim();
}

/**
 * Get meaningful labels from categories array
 * Filters and cleans category terms for use in descriptions
 */
export function getMeaningfulLabels(categories: Array<{ term: string }> | undefined): {
  movie: string;
  singer: string;
  lyricist: string;
  music: string;
} {
  if (!categories) {
    return { movie: '', singer: '', lyricist: '', music: '' };
  }
  
  const movieCat = categories.find(cat => cat.term?.match(/^Movie:/i));
  const singerCat = categories.find(cat => cat.term?.match(/^Singer:/i));
  const lyricistCat = categories.find(cat => cat.term?.match(/^(Lyrics|Lyricist):/i));
  const musicCat = categories.find(cat => cat.term?.match(/^(Music|OldMusic):/i));
  
  return {
    movie: movieCat ? cleanCategoryLabel(movieCat.term) : '',
    singer: singerCat ? cleanCategoryLabel(singerCat.term) : '',
    lyricist: lyricistCat ? cleanCategoryLabel(lyricistCat.term) : '',
    music: musicCat ? cleanCategoryLabel(musicCat.term) : '',
  };
}

/**
 * Generate SEO-optimized description for song page
 */
export function generateSongDescription(params: {
  title: string;
  snippet: string;
  movie?: string;
  singer?: string;
  lyricist?: string;
}): string {
  const { title, snippet, movie, singer, lyricist } = params;
  
  // Build a natural-sounding description
  const parts: string[] = [];
  
  // Start with the title
  const cleanTitle = cleanCategoryLabel(title).replace(/\s+lyrics$/i, '').trim();
  parts.push(cleanTitle);
  
  // Add context
  if (movie) {
    parts.push(`from ${movie}`);
  }
  
  if (singer) {
    parts.push(`sung by ${singer}`);
  }
  
  // Add lyrics keyword
  parts.push('lyrics');
  
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
export function generateCategoryDescription(categoryTerm: string, songCount: number): string {
  const cleanLabel = cleanCategoryLabel(categoryTerm);
  
  // Detect category type and generate appropriate description
  if (categoryTerm.match(/^Movie:/i)) {
    return `Browse all ${songCount} song${songCount !== 1 ? 's' : ''} from ${cleanLabel} movie. Read Tamil lyrics and enjoy the music from this film.`;
  } else if (categoryTerm.match(/^Singer:/i)) {
    return `Explore ${songCount} song${songCount !== 1 ? 's' : ''} sung by ${cleanLabel}. Discover Tamil song lyrics performed by this talented artist.`;
  } else if (categoryTerm.match(/^(Lyrics|Lyricist):/i)) {
    return `View ${songCount} song${songCount !== 1 ? 's' : ''} written by ${cleanLabel}. Read beautiful Tamil lyrics penned by this lyricist.`;
  } else if (categoryTerm.match(/^(Music|OldMusic):/i)) {
    return `Listen to ${songCount} song${songCount !== 1 ? 's' : ''} composed by ${cleanLabel}. Enjoy Tamil music and lyrics from this music director.`;
  }
  
  // Generic fallback
  return `Browse ${songCount} Tamil song${songCount !== 1 ? 's' : ''} in ${cleanLabel} category. Read lyrics and discover new music.`;
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
