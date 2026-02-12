/**
 * Utility functions for song lyrics processing
 */

/**
 * Remove image tags from HTML content
 */
export function stripImagesFromHtml(html: string): string {
  if (!html) return html;
  // Remove <img ...> tags (self-closing or with closing tag)
  return html.replace(/<img\b[^>]*>(?:<\/img>)?/gi, '');
}

/**
 * Convert HTML stanza to plain text for sharing
 * Removes HTML tags, decodes entities, removes leading > characters
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map(l => l.replace(/^>\s*/g, '').replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 0)
    .join('\n')
    .trim();
}

/**
 * Format text with stars for social sharing
 */
export function formatSnippetWithStars(text: string): string {
  return `⭐${text}⭐`;
}

/**
 * Build hashtag string from song categories
 * Filters out Song: categories and formats as #hashtags
 */
export function buildHashtags(categories: Array<{ term: string }> | undefined): string {
  if (!categories) return '';
  
  const hashtagList = categories
    .map((c: any) => c.term || '')
    .filter((t: string) => !t.startsWith('Song:') && !!t)
    .map((t: string) => t.replace(/^[^:]*:/, '').trim())
    .map((v: string) => v.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .map((v: string) => `#${v}`);
  
  return hashtagList.join(' ');
}

/**
 * Find Song: category term from categories array
 */
export function getSongCategory(categories: Array<{ term: string }> | undefined): string {
  if (!categories) return '';
  
  const songCat = categories.find((cat: any) => cat.term && cat.term.startsWith('Song:'));
  return songCat?.term || '';
}

/**
 * Generate Twitter share URL
 */
export function buildTwitterShareUrl(params: {
  pageUrl: string;
  snippet: string;
  hashtags: string;
}): string {
  const { pageUrl, snippet, hashtags } = params;
  const text = hashtags ? `${snippet}\n\n${hashtags}\n\n` : `${snippet}\n\n`;
  return `https://twitter.com/intent/tweet?via=tsongslyrics&url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(text)}`;
}

/**
 * Generate WhatsApp share URL
 */
export function buildWhatsAppShareUrl(params: {
  pageUrl: string;
  snippet: string;
  hashtags: string;
}): string {
  const { pageUrl, snippet, hashtags } = params;
  const text = `${snippet}\n\n${hashtags ? `${hashtags}\n\n` : ''}${pageUrl}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Stanza separator regex for splitting lyrics
 * Matches: 2+ <br> tags OR paragraph boundaries </p><p>
 */
export const STANZA_SEPARATOR = /(?:<br\b[^>]*>(?:\s*<\/br>)?\s*){2,}|<\/p>\s*<p\b[^>]*>/i;

/**
 * Sanitize options for HTML cleaning
 */
export const DEFAULT_SANITIZE_OPTIONS = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'a', 'span', 'div', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'h3', 'h4', 'ul', 'li', 'iframe'],
  allowedAttributes: { 
    a: ['href', 'title', 'target', 'rel'],
    div: ['class', 'style'],
    iframe: ['src', 'width', 'height', 'title', 'frameborder', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy']
  },
  allowedClasses: {
    'div': ['easter-egg-list', 'faqs-section', 'faq-item']
  }
};

// Memoization cache for sanitized content
const sanitizeCache = new Map<string, string>();

/**
 * Sanitize HTML content once (with memoization)
 */
function memoizedSanitize(content: string, sanitizeHtml: any): string {
  if (sanitizeCache.has(content)) {
    return sanitizeCache.get(content)!;
  }
  const sanitized = sanitizeHtml(content, DEFAULT_SANITIZE_OPTIONS);
  // Only cache if content is reasonable size (avoid memory bloat)
  if (content.length < 100000) {
    sanitizeCache.set(content, sanitized);
  }
  return sanitized;
}

/**
 * Split content into stanzas and sanitize (optimized: sanitize once, then split)
 */
export function splitAndSanitizeStanzas(
  content: string,
  sanitizeHtml: any,
  skipSplit: boolean = false
): string[] {
  if (!content) return [];
  
  // Sanitize entire content ONCE instead of per-stanza (MAJOR performance boost)
  const sanitizedContent = memoizedSanitize(content, sanitizeHtml);
  
  const stanzas = skipSplit
    ? [sanitizedContent]
    : sanitizedContent.split(STANZA_SEPARATOR).map(s => s.trim()).filter(Boolean);
  
  return stanzas;
}

/**
 * Content sections structure returned by parseContentSections
 */
export interface ContentSections {
  intro: string;
  easterEgg: string;
  lyrics: string;
  faq: string;
}

/**
 * Parse blog post content into sections (intro, easter-egg, lyrics, faq)
 * 
 * Expected structure:
 * 1. Intro: <p>...</p>
 * 2. Easter-egg: <div class="easter-egg-list">...</div>
 * 3. Lyrics: remaining content with <br> tags
 * 4. FAQ: <div class="faqs-section">...</div>
 */
export function parseContentSections(content: string): ContentSections {
  if (!content) {
    return { intro: '', easterEgg: '', lyrics: '', faq: '' };
  }

  let remaining = content.trim();
  
  // Extract intro paragraph (first <p>...</p> tag)
  const introMatch = remaining.match(/^<p\b[^>]*>[\s\S]*?<\/p>/i);
  const intro = introMatch ? introMatch[0] : '';
  if (intro) {
    remaining = remaining.slice(intro.length).trim();
  }

  // Extract easter-egg section (<div class="easter-egg-list">...</div>)
  const easterEggMatch = remaining.match(/<div\s+class=["']easter-egg-list["'][^>]*>[\s\S]*?<\/div>/i);
  const easterEgg = easterEggMatch ? easterEggMatch[0] : '';
  if (easterEgg) {
    remaining = remaining.replace(easterEgg, '').trim();
  }

  // Extract FAQ section (<div class="faqs-section">...</div>)
  // Look for it at the end of content
  const faqMatch = remaining.match(/<div\s+class=["']faqs-section["'][^>]*>[\s\S]*?<\/div>\s*$/i);
  const faq = faqMatch ? faqMatch[0] : '';
  if (faq) {
    remaining = remaining.slice(0, remaining.lastIndexOf(faq)).trim();
  }

  // What's left is the lyrics content
  const lyrics = remaining;

  return { intro, easterEgg, lyrics, faq };
}

/**
 * Split content sections and sanitize
 * Returns sections with sanitized HTML
 */
export function splitAndSanitizeSections(
  content: string,
  sanitizeHtml: any
): ContentSections {
  const sections = parseContentSections(content);
  
  return {
    intro: sections.intro ? memoizedSanitize(sections.intro, sanitizeHtml) : '',
    easterEgg: sections.easterEgg ? memoizedSanitize(sections.easterEgg, sanitizeHtml) : '',
    lyrics: sections.lyrics ? memoizedSanitize(sections.lyrics, sanitizeHtml) : '',
    faq: sections.faq ? memoizedSanitize(sections.faq, sanitizeHtml) : '',
  };
}
