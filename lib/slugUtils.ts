interface Song {
  id: { $t: string }
  title: { $t: string }
  link?: Array<{ rel: string; href: string }>
  [key: string]: any
}

/**
 * Extract slug from Blogger API song object
 * Uses the alternate link from API response for consistency
 */
export function getSlugFromSong(song: Song): string {
  // Extract slug from API link array (rel: alternate)
  if (song.link && Array.isArray(song.link)) {
    const alternateLink = song.link.find((l: any) => l.rel === 'alternate')
    if (alternateLink?.href) {
      // Extract slug.html from the full URL
      // e.g., https://tsonglyricsapp.blogspot.com/p/song-name-lyrics.html -> song-name-lyrics
      const match = alternateLink.href.match(/\/([^\/]+\.html)$/)
      if (match) {
        return match[1].replace('.html', '')
      }
    }
  }
  
  // Fallback: Use the API title to generate slug
  const apiTitle = song.title?.$t
  if (apiTitle) {
    return apiTitle.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
  }
  
  return ''
}
