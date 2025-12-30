import Link from 'next/link'
import Image from 'next/image'
import { cachedBloggerFetch } from '@/lib/dateBasedCache'
import { getSlugFromSong } from '@/lib/slugUtils'

interface Song {
  id: { $t: string }
  title: { $t: string }
  published: { $t: string }
  category?: Array<{ term: string }>
  media$thumbnail?: { url: string }
  link?: Array<{ rel: string; href: string }>
}

interface NotFoundSuggestionsProps {
  searchSlug?: string
}

// Extract keywords from slug
function extractKeywords(slug: string): string[] {
  return slug
    .replace('.html', '')
    .replace(/-/g, ' ')
    .split(' ')
    .filter(word => 
      word.length > 2 && 
      !['the', 'and', 'lyrics', 'song', 'tamil', 'english', "meaning", "translation"].includes(word.toLowerCase())
    )
}

// Fetch songs by search keywords
async function searchSongs(keywords: string[], limit: number = 6): Promise<Song[]> {
  if (keywords.length === 0) return []
  
  try {
    const searchQuery = keywords.join(' ')
    const data = await cachedBloggerFetch(
      `https://tsonglyricsapp.blogspot.com/feeds/posts/default?q=${encodeURIComponent(searchQuery)}&alt=json&max-results=${limit + 5}`,
      {
        next: {
          revalidate: 3600, // Cache for 1 hour
          tags: ['404-search']
        }
      }
    )

    const entries = data.feed?.entry || []
    
    // Filter to only Song: categories
    return entries
      .filter((entry: Song) => {
        const hasSongCategory = entry.category?.some(cat => 
          cat.term?.startsWith('Song:') || cat.term?.startsWith('OldSong:')
        )
        return hasSongCategory
      })
      .slice(0, limit)
  } catch (error) {
    console.error('Error searching songs:', error)
    return []
  }
}

// Fetch popular/recent posts
async function getPopularPosts(limit: number = 12): Promise<Song[]> {
  try {
    const data = await cachedBloggerFetch(
      `https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&max-results=${limit + 5}`,
      {
        next: {
          revalidate: 3600, // Cache for 1 hour
          tags: ['popular-posts']
        }
      }
    )

    const entries = data.feed?.entry || []
    
    // Filter to only Song: categories
    return entries
      .filter((entry: Song) => {
        const hasSongCategory = entry.category?.some(cat => 
          cat.term?.startsWith('Song:') || cat.term?.startsWith('OldSong:')
        )
        return hasSongCategory
      })
      .slice(0, limit)
  } catch (error) {
    console.error('Error fetching popular posts:', error)
    return []
  }
}

export default async function NotFoundSuggestions({ searchSlug }: NotFoundSuggestionsProps) {
  let searchResults: Song[] = []
  let keywords: string[] = []
  let popularPosts: Song[] = []
  
  console.log("searchSlug:", searchSlug)
  // Try smart search if slug is provided
  if (searchSlug && searchSlug.trim()) {
    try {
      keywords = extractKeywords(searchSlug)
      console.log("Extracted keywords:", keywords)
      if (keywords.length > 0) {
        searchResults = await searchSongs(keywords, 6)
      }
    } catch (error) {
      console.error('Error in smart search:', error)
    }
  }
  
  // Always fetch popular posts as fallback
  try {
    popularPosts = await getPopularPosts(12)
  } catch (error) {
    console.error('Error fetching popular posts:', error)
  }

  return (
    <div className="mt-12">
      {/* Smart Search Results */}
      {searchResults.length > 0 && keywords.length > 0 && (
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Looking for &ldquo;{keywords.join(' ')}&rdquo;?
            </h2>
            <p className="text-gray-600">We found these similar songs that might interest you:</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map((song) => {
              const title = song.title.$t
              const slug = getSlugFromSong(song)
              const thumbnail = song.media$thumbnail?.url
              const publishDate = new Date(song.published.$t).toLocaleDateString()

              return (
                <Link
                  key={song.id.$t}
                  href={`/${slug}.html`}
                  className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden"
                >
                  {thumbnail && (
                    <div className="relative w-full h-48 bg-gray-200">
                      <Image
                        src={thumbnail.replace(/\/s\d+/, '/w400-h300')}
                        alt={title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                      {title}
                    </h3>
                    <p className="text-sm text-gray-500">{publishDate}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Popular Posts Section */}
      {popularPosts.length > 0 && (
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {searchResults.length > 0 ? 'More Popular Songs' : 'Popular Right Now'}
            </h2>
            <p className="text-gray-600">Discover the latest and most loved Tamil song lyrics:</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularPosts.map((song) => {
              const title = song.title.$t
              const slug = getSlugFromSong(song)
              const thumbnail = song.media$thumbnail?.url
              const publishDate = new Date(song.published.$t).toLocaleDateString()

              return (
                <Link
                  key={song.id.$t}
                  href={`/${slug}.html`}
                  className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden"
                >
                  {thumbnail && (
                    <div className="relative w-full h-48 bg-gray-200">
                      <Image
                        src={thumbnail.replace(/\/s\d+/, '/w400-h300')}
                        alt={title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                      {title}
                    </h3>
                    <p className="text-sm text-gray-500">{publishDate}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
