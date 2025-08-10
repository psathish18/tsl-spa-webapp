'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AdBanner } from '@/components/AdBanner'

interface Song {
  title: { $t: string }
  content: { $t: string }
  published: { $t: string }
  author: Array<{ name: { $t: string } }>
  category?: Array<{ term: string }>
  media$thumbnail?: { url: string }
}

export default function SongPage({ params }: { params: { slug: string } }) {
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSong = async () => {
      try {
        const response = await fetch(`/api/song?category=${encodeURIComponent(params.slug)}`)
        if (response.ok) {
          const data = await response.json()
          setSong(data.feed?.entry?.[0] || null)
        }
      } catch (error) {
        console.error('Error fetching song:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSong()
  }, [params.slug])

  if (loading) {
    return (
      <div className="container-custom py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading song details...</p>
        </div>
      </div>
    )
  }

  if (!song) {
    return (
      <div className="container-custom py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Song Not Found</h1>
          <p className="text-gray-600 mb-8">The song you're looking for doesn't exist or has been removed.</p>
          <Link href="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
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

  const getThumbnail = () => {
    return song.media$thumbnail?.url || '/default-thumbnail.jpg'
  }

  const cleanContent = (content: string) => {
    // Remove HTML tags and clean up the content
    return content.replace(/<[^>]*>/g, '').trim()
  }

  return (
    <>
      <article className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white">
          <div className="container-custom py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              <div className="lg:col-span-2">
                <nav className="text-primary-200 text-sm mb-4">
                  <Link href="/" className="hover:text-white">Home</Link>
                  <span className="mx-2">/</span>
                  <span>Song Lyrics</span>
                </nav>
                <h1 className="text-3xl md:text-5xl font-bold font-display mb-4">
                  {song.title.$t}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-primary-200">
                  <time dateTime={song.published.$t}>
                    Published: {formatDate(song.published.$t)}
                  </time>
                  {song.author?.[0]?.name?.$t && (
                    <span>By: {song.author[0].name.$t}</span>
                  )}
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="relative w-full h-64 rounded-lg overflow-hidden shadow-xl">
                  <Image
                    src={getThumbnail()}
                    alt={song.title.$t}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="container-custom py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Top Ad */}
              <AdBanner slot="song-top" className="mb-8" />
              
              <div className="prose prose-lg max-w-none">
                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Song Lyrics</h2>
                  <div className="whitespace-pre-wrap font-medium text-gray-800 leading-relaxed">
                    {cleanContent(song.content.$t)}
                  </div>
                </div>
                
                {/* Share Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Share this song</h3>
                  <div className="flex space-x-4">
                    <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                      </svg>
                      <span>Twitter</span>
                    </button>
                    <button className="flex items-center space-x-2 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span>Facebook</span>
                    </button>
                    <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                      </svg>
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Bottom Ad */}
              <AdBanner slot="song-bottom" className="mt-8" />
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-6">
                {/* Sidebar Ad */}
                <AdBanner slot="song-sidebar" className="h-96" />
                
                {/* Related Songs */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    More Tamil Songs
                  </h3>
                  <div className="space-y-3">
                    <Link href="/" className="block text-primary-600 hover:text-primary-700 text-sm">
                      View all latest songs →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </>
  )
}
