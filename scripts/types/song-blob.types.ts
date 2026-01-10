/**
 * TypeScript types for song blob JSON structure (Optimized for file size)
 * This defines the complete data structure stored in Vercel Blob
 */

export interface SongBlobData {
  // Core identifiers
  slug: string                    // Clean slug matching song page routing
  id: string                      // Original Blogger post ID
  
  // Title and metadata
  title: string                   // Full title from Blogger API
  movieName: string               // Movie name (empty string if not available)
  singerName: string              // Singer name
  lyricistName: string            // Lyricist name (empty string if not available)
  musicName: string               // Music director name (empty string if not available)
  actorName: string               // Actor name (empty string if not available)
  
  // Publishing info
  published: string               // ISO date string
  
  // Main content (Tanglish) - stanzas only, no full HTML
  stanzas: string[]               // Pre-split sanitized HTML stanzas (share links built client-side)
  
  // Tamil lyrics
  hasTamilLyrics: boolean         // Whether Tamil lyrics are available
  tamilStanzas: string[]          // Pre-split Tamil stanzas (empty if not available)
  
  // Categories (minimal - for SEO and filtering)
  category: string[]              // Just the term strings (e.g., ["Movie:Coolie", "Singer:Anirudh"])
  
  // Related songs (movie-based only, minimal data)
  relatedSongs: RelatedSong[]     // Up to 10 related songs from same movie
  
  // SEO metadata (pre-computed, minimal)
  seo: SEOMetadata
  
  // Media
  thumbnail: string | null        // Enhanced thumbnail URL (s400-c) or null
  
  // Cache metadata
  generatedAt: string             // ISO date when JSON was generated
  version: number                 // Schema version (for future migrations)
}

export interface RelatedSong {
  id: string
  title: string
  slug: string
  thumbnail: string | null
  movieName: string
  singerName: string
  published: string
}

export interface SEOMetadata {
  title: string                   // SEO-optimized title
  description: string             // Rich description with movie, singer, etc.
  keywords: string                // Comma-separated keywords
  
  // Structured data (pre-computed JSON-LD) - only essential fields
  structuredData: {
    "@context": string
    "@type": string
    name: string
    description: string
    inLanguage: string
    genre: string
    inAlbum?: { "@type": string; name: string }
    byArtist?: { "@type": string; name: string }
    lyricist?: { "@type": string; name: string }
    composer?: { "@type": string; name: string }
    datePublished: string
    publisher: { "@type": string; name: string; url: string }
  }
}
