import Link from 'next/link'
import Image from 'next/image'
import { cachedBloggerFetch } from '@/lib/dateBasedCache'
import { getSlugFromSong } from '@/lib/slugUtils'
import { REVALIDATE_RELATED_SONGS } from '@/lib/cacheConfig'

interface Song {
  id: { $t: string }
  title: { $t: string }
  content: { $t: string }
  published: { $t: string }
  category?: Array<{ term: string }>
  media$thumbnail?: { url: string }
}

interface RelatedSongsProps {
  currentSongId: string
  categories: Array<{ term: string }>
}

// Helper to get clean song title
function getCleanTitle(song: Song): string {
  const title = song.title?.$t || ''
  return title.trim()
}

// Fetch songs by category
async function fetchSongsByCategory(category: string, currentSongId: string, limit: number = 6): Promise<Song[]> {
  try {
    const data = await cachedBloggerFetch(
      `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/${encodeURIComponent(category)}?alt=json&max-results=${limit + 5}`,
      {
        next: {
          revalidate: REVALIDATE_RELATED_SONGS, // Match page revalidation - 30 days
          tags: [`related-${category}`]
        }
      }
    )

    const entries = data.feed?.entry || []
    
    // Filter out current song and only keep Song: categories
    return entries
      .filter((entry: Song) => {
        const hasSongCategory = entry.category?.some(cat => 
          cat.term?.startsWith('Song:') || cat.term?.startsWith('OldSong:')
        )
        return entry.id.$t !== currentSongId && hasSongCategory
      })
      .slice(0, limit)
  } catch (error) {
    console.error(`Error fetching songs for category ${category}:`, error)
    return []
  }
}

export default async function RelatedSongs({ currentSongId, categories }: RelatedSongsProps) {
  // Extract relevant categories
  const movieCategory = categories.find(cat => cat.term.startsWith('Movie:'))
  const singerCategory = categories.find(cat => cat.term.startsWith('Singer:'))
  const lyricistCategory = categories.find(cat => cat.term.startsWith('Lyrics:') || cat.term.startsWith('Lyricist:'))
  const musicCategory = categories.find(cat => cat.term.startsWith('Music:') || cat.term.startsWith('OldMusic:'))
  
  // Helper to format category name (replace hyphens with spaces)
  const formatCategoryName = (term: string, prefix: string) => {
    return term.replace(prefix, '').replace(/-/g, ' ')
  }

  // Fetch related songs in parallel
  const [movieSongs, singerSongs, lyricistSongs, musicSongs] = await Promise.all([
    movieCategory ? fetchSongsByCategory(movieCategory.term, currentSongId, 6) : Promise.resolve([]),
    singerCategory ? fetchSongsByCategory(singerCategory.term, currentSongId, 6) : Promise.resolve([]),
    lyricistCategory ? fetchSongsByCategory(lyricistCategory.term, currentSongId, 6) : Promise.resolve([]),
    musicCategory ? fetchSongsByCategory(musicCategory.term, currentSongId, 6) : Promise.resolve([])
  ])

  // Helper to render a section
  const renderSection = (title: string, songs: Song[], categoryTerm?: string) => {
    if (songs.length === 0) return null

    return (
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
          {categoryTerm && songs.length >= 6 && (
            <Link
              href={`/category?category=${encodeURIComponent(categoryTerm)}`}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All →
            </Link>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {songs.map((song) => {
            const cleanTitle = getCleanTitle(song)
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
                      alt={cleanTitle}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                    {cleanTitle}
                  </h4>
                  <p className="text-sm text-gray-500">{publishDate}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  // If no related songs found, return fallback
  if (movieSongs.length === 0 && singerSongs.length === 0 && lyricistSongs.length === 0 && musicSongs.length === 0) {
    return (
      <div className="mt-12">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">More Tamil Song Lyrics</h3>
        <div className="text-center py-8">
          <Link 
            href="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse All Songs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-12">
      {/* Movie section - highest priority */}
      {movieCategory && renderSection(
        `More from ${formatCategoryName(movieCategory.term, 'Movie:')}`,
        movieSongs,
        movieCategory.term
      )}

      {/* Singer section */}
      {singerCategory && renderSection(
        `More by ${formatCategoryName(singerCategory.term, 'Singer:')}`,
        singerSongs,
        singerCategory.term
      )}

      {/* Lyricist section */}
      {lyricistCategory && renderSection(
        `${formatCategoryName(
          lyricistCategory.term, 
          lyricistCategory.term.startsWith('Lyricist:') ? 'Lyricist:' : 'Lyrics:'
        )} Hits`,
        lyricistSongs,
        lyricistCategory.term
      )}

      {/* Music Director section */}
      {musicCategory && renderSection(
        `Music by ${formatCategoryName(
          musicCategory.term,
          musicCategory.term.startsWith('OldMusic:') ? 'OldMusic:' : 'Music:'
        )}`,
        musicSongs,
        musicCategory.term
      )}
    </div>
  )
}
