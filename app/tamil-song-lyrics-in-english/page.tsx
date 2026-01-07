import { Metadata } from 'next'
import Link from 'next/link'
import { cachedBloggerFetch } from '@/lib/dateBasedCache'

export const metadata: Metadata = {
  title: '100+ Tamil Song Lyrics with English Meaning | Translation',
  description: 'Discover 100+ amazing Tamil songs with English lyrics translation. Simple English meanings to help you understand beautiful Tamil songs easily.',
  keywords: 'Tamil songs English translation, Tamil lyrics English meaning, Tamil songs with English subtitles, Tamil to English lyrics',
  alternates: {
    canonical: 'https://tsonglyrics.com/tamil-song-lyrics-in-english.html',
  },
}

interface Song {
  id: { $t: string }
  title: { $t: string }
  published: { $t: string }
  category?: Array<{ term: string }>
}

async function getEnglishTranslationSongs() {
  try {
    const data = await cachedBloggerFetch(
      'https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/englishtranslation?alt=json&max-results=500',
      {
        next: {
          revalidate: 86400, // Cache for 24 hours
        }
      }
    )

    const songs = data.feed?.entry || []
    
    // Filter and process songs with English Translation category
    const englishSongs = songs.filter((entry: any) => {
      return entry.category?.some((cat: any) => 
        cat.term && cat.term.toLowerCase().includes('englishtranslation')
      )
    }).map((entry: any) => ({
      id: entry.id?.$t,
      title: entry.title?.$t || 'Unknown Song',
      published: entry.published?.$t,
      category: entry.category || []
    }))

    return englishSongs
  } catch (error) {
    console.error('Error fetching English translation songs:', error)
    return []
  }
}

function getSongSlug(song: any) {
  const apiTitle = song.title || ''
  return apiTitle.toLowerCase()
    .replace(/\b\d+\b/g, '') // Remove standalone digits
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .trim()
}

export default async function TamilSongsEnglishPage() {
  const allSongs = await getEnglishTranslationSongs()
  
  // Recent 5 songs (newest first)
  const recentSongs = allSongs.slice(0, 5)
  
  // All songs sorted alphabetically by title
  const sortedSongs = [...allSongs].sort((a, b) => 
    a.title.localeCompare(b.title)
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-gray-500">
          <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
          <li>•</li>
          <li className="text-gray-900">Tamil Songs with English Translation</li>
        </ol>
      </nav>

      <article className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          100+ Tamil Song Lyrics with English Meaning | Translation
        </h1>

        <p className="text-gray-700 leading-relaxed mb-8">
          This page has 100+ amazing list of Tamil Songs for which Lyrics is translated into English meaning. 
          English translation for these tamil songs lyrics are written with very simple words so people can understand it easily.
        </p>

        {/* Recent Songs Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 pb-3 border-b-2 border-blue-500">
            Recent Songs With English Meaning
          </h2>
          
          {recentSongs.length > 0 ? (
            <ul className="space-y-3">
              {recentSongs.map((song: any, index: number) => {
                const slug = getSongSlug(song)
                const publishedDate = song.published ? new Date(song.published).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }) : ''
                
                return (
                  <li key={song.id || index} className="flex items-start">
                    <span className="text-blue-600 font-bold mr-3 mt-1">→</span>
                    <div className="flex-1">
                      <Link
                        href={`/${encodeURIComponent(slug)}.html`}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-lg"
                      >
                        {song.title}
                      </Link>
                      {publishedDate && (
                        <span className="text-gray-500 text-sm ml-3">
                          ({publishedDate})
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-gray-600 italic">No recent songs found</p>
          )}
        </section>

        {/* Ad placeholder */}
        <div className="my-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-gray-500 text-sm mb-2">Advertisement</div>
          <div className="text-gray-400 text-xs">In-Article Ad</div>
        </div>

        {/* All Songs Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 pb-3 border-b-2 border-green-500">
            List of Tamil Songs Lyrics Meaning in English
          </h2>
          
          <p className="text-gray-600 mb-4">
            Total Songs: <strong>{sortedSongs.length}</strong>
          </p>

          {sortedSongs.length > 0 ? (
            <ul className="space-y-2 columns-1 md:columns-2 gap-6">
              {sortedSongs.map((song: any, index: number) => {
                const slug = getSongSlug(song)
                
                return (
                  <li key={song.id || index} className="break-inside-avoid mb-3">
                    <Link
                      href={`/${encodeURIComponent(slug)}.html`}
                      className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-start"
                    >
                      <span className="mr-2 text-gray-500">•</span>
                      <span>{song.title}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-gray-600 italic">No songs found</p>
          )}
        </section>

        {/* SEO Content */}
        <section className="mt-12 bg-blue-50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">About Tamil Songs English Translation</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Understanding Tamil songs becomes easier when you have English translations. Our collection features over 100 popular Tamil songs with their English meanings, helping non-Tamil speakers appreciate the beauty and depth of Tamil music and poetry.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Each translation is written in simple English, making it accessible to everyone who wants to understand the emotions and stories behind their favorite Tamil songs.
          </p>
        </section>
      </article>

      {/* Back to Home Button */}
      <div className="mt-12 text-center">
        <Link 
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
