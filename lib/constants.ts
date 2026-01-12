/**
 * Application-wide constants
 */

/**
 * Production base URL for the application
 * This should be used for all absolute URL generation
 */
export const BASE_URL = 'https://www.tsonglyrics.com';

/**
 * API base URL (same as BASE_URL for internal APIs)
 */
export const API_BASE_URL = BASE_URL;

/**
 * Build a full URL for a song page
 * Ensures consistent URL formatting with .html extension
 * @param slug - The song slug (with or without .html extension)
 * @returns Full URL with proper formatting
 */
export function buildSongUrl(slug: string | undefined | null): string {
  if (!slug) {
    return BASE_URL;
  }
  const cleanSlug = slug.replace('.html', '');
  return `${BASE_URL}/${cleanSlug}.html`;
}
