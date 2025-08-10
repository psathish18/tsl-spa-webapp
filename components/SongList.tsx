'use client'

import Link from 'next/link'
import Image from 'next/image'

interface Song {
  id: { $t: string }
  title: { $t: string }
  content: { $t: string }
  published: { $t: string }
  category?: Array<{ term: string }>
  media$thumbnail?: { url: string }
}

interface SongListProps {
  songs: Song[]
}

export function SongList({ songs }: SongListProps) {
  if (!songs || songs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No songs found</div>
        <p className="text-gray-400 mt-2">Check back later for new updates!</p>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const extractDescription = (content: string) => {
    // Remove HTML tags and get first 150 characters
    const text = content.replace(/<[^>]*>/g, '')
    return text.length > 150 ? text.substring(0, 150) + '...' : text
  }

  const getThumbnail = (song: Song) => {
    return song.media$thumbnail?.url || '/default-thumbnail.jpg'
  }

  const getSongSlug = (song: Song) => {
    const category = song.category?.[0]?.term
    if (category) {
      return category.replace(/^Song:/, '').trim()
    }
    // Fallback to title-based slug
    return song.title.$t.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {songs.map((song, index) => (
        <article key={song.id.$t || index} className="card overflow-hidden animate-fade-in">
          <Link href={`/song/${encodeURIComponent(getSongSlug(song))}`}>
            <div className="relative h-48 bg-gray-200">
              <Image
                src={getThumbnail(song)}
                alt={song.title.$t}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-4 left-4 text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </Link>
          
          <div className="p-6">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
              <time dateTime={song.published.$t}>
                {formatDate(song.published.$t)}
              </time>
              {song.category?.[0]?.term && (
                <span className="bg-primary-100 text-primary-600 px-2 py-1 rounded-full text-xs font-medium">
                  Song
                </span>
              )}
            </div>
            
            <Link href={`/song/${encodeURIComponent(getSongSlug(song))}`}>
              <h3 className="font-semibold text-lg text-gray-900 mb-2 hover:text-primary-600 transition-colors line-clamp-2">
                {song.title.$t}
              </h3>
            </Link>
            
            <p className="text-gray-600 text-sm line-clamp-3 mb-4">
              {extractDescription(song.content.$t)}
            </p>
            
            <Link 
              href={`/song/${encodeURIComponent(getSongSlug(song))}`}
              className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium text-sm group"
            >
              Read Lyrics
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </article>
      ))}
    </div>
  )
}
