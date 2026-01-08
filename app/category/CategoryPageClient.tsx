'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { cleanCategoryLabel, generateSEOTitle, generateCategoryDescription } from '@/lib/seoUtils'

interface Song {
  id: string
  title: string
  slug: string
  thumbnail: string | null
  movieName: string
  singerName: string
  lyricistName: string
  published: string
  category?: Array<{ term: string }>
  excerpt: string
}

interface CategoryData {
  category: string
  songs: Song[]
  total: number
}

interface BloggerEntry {
  id: { $t: string }
  title: { $t: string }
  content: { $t: string }
  published: { $t: string }
  category?: Array<{ term: string }>
  media$thumbnail?: { url: string }
}

interface BloggerResponse {
  feed: {
    entry?: BloggerEntry[]
  }
}

// Enhanced thumbnail function to get higher resolution images
const getEnhancedThumbnail = (thumbnail: string): string => {
  if (!thumbnail) return thumbnail
  
  try {
    // Decode the URL and get higher resolution by replacing size parameter
    let imageUrl = decodeURIComponent(thumbnail)
    // Replace small thumbnail size (s72-c) with larger size (s400-c for better quality)
    imageUrl = imageUrl.replace(/\/s\d+-c\//, '/s400-c/')
    return imageUrl
  } catch (error) {
    console.error('Error enhancing thumbnail:', error)
    return thumbnail
  }
}

// Generate blur data URL for better loading experience
const generateBlurDataURL = (color = '#f3f4f6') => {
  // Simple base64 encoded 1x1 pixel image
  return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
}

// Helper function to create slug from title
const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes before trim
    .trim()
}

// Helper function to extract song metadata from Blogger entry
const extractSongData = (entry: BloggerEntry) => {
  const title = entry.title?.$t || ''
  
  // Extract metadata from categories
  const songCategory = entry.category?.find((cat) => 
    cat.term?.startsWith('Song:')
  )
  const movieCategory = entry.category?.find((cat) => 
    cat.term?.startsWith('Movie:')
  )
  const singerCategory = entry.category?.find((cat) => 
    cat.term?.startsWith('Singer:')
  )
  const lyricsCategory = entry.category?.find((cat) => 
    cat.term?.startsWith('Lyrics:')
  )

  const songTitle = songCategory ? songCategory.term.replace('Song:', '') : title
  const movieName = movieCategory?.term?.replace('Movie:', '') || ''
  const singerName = singerCategory?.term?.replace('Singer:', '') || ''
  const lyricistName = lyricsCategory?.term?.replace('Lyrics:', '') || ''
  
  return {
    songTitle,
    movieName,
    singerName,
    lyricistName
  }
}

// Helper function to get thumbnail URL
const getThumbnail = (entry: BloggerEntry): string | null => {
  if (entry.media$thumbnail && entry.media$thumbnail.url) {
    const imageUrl = decodeURIComponent(entry.media$thumbnail.url).replace(/\/s\d+-c\//, '/s400-c/')
    return imageUrl
  }
  return null
}

// Extract text content from HTML safely
// This function is used to create plain text excerpts from HTML content
// The result is ONLY used for display as text content (not HTML), and React
// will automatically escape it, preventing any XSS attacks
const extractTextFromHtml = (html: string): string => {
  if (!html) return ''
  
  // Primary approach: Use DOM API for safe text extraction (client-side only)
  // This is the safest method as it uses the browser's HTML parser
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div')
    temp.innerHTML = html
    // textContent automatically strips all HTML and returns plain text
    return (temp.textContent || temp.innerText || '').trim()
  }
  
  // Fallback for server-side: simplified text extraction
  // Note: This fallback has known limitations but is safe because:
  // 1. This code only runs client-side in practice (page is 'use client')
  // 2. The result is only displayed as plain text via React (auto-escaped)
  // 3. We never use dangerouslySetInnerHTML with this content
  return html
    .replace(/<[^>]*>/g, ' ') // Replace tags with spaces
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim()
}

// Process Blogger API response into CategoryData format
const processBloggerResponse = (data: BloggerResponse, categoryTerm: string): CategoryData => {
  const entries = data.feed?.entry || []
  
  const songs = entries.map((entry) => {
    const metadata = extractSongData(entry)
    const thumbnail = getThumbnail(entry)
    const slug = createSlug(entry.title?.$t || metadata.songTitle || '')
    
    // Extract excerpt safely by removing HTML and only add ellipsis when truncated
    const content = extractTextFromHtml(entry.content?.$t || '')
    const excerpt = content.length > 150 ? content.substring(0, 150) + '...' : content
    
    return {
      id: entry.id.$t,
      title: entry.title?.$t || metadata.songTitle,
      slug: slug,
      thumbnail: thumbnail,
      movieName: metadata.movieName,
      singerName: metadata.singerName,
      lyricistName: metadata.lyricistName,
      published: entry.published.$t,
      category: entry.category,
      excerpt: excerpt
    }
  })
  
  return {
    category: categoryTerm,
    songs: songs,
    total: songs.length
  }
}

function CategoryPageContent() {
  const searchParams = useSearchParams()
  const category = searchParams.get('category')
  
  const [categoryData, setCategoryData] = useState<CategoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!category) {
      setError('No category specified')
      setLoading(false)
      return
    }

    const fetchCategoryData = async () => {
      try {
        setLoading(true)
        
        // Fetch directly from Blogger API via Vercel proxy
        // This reduces CPU usage and function invocations by calling from browser
        const response = await fetch(
          `/api/proxy/feeds/posts/default/-/${encodeURIComponent(category)}?alt=json&max-results=50`
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch category data')
        }
        
        const bloggerData: BloggerResponse = await response.json()
        
        // Process the Blogger API response on client-side
        const processedData = processBloggerResponse(bloggerData, category)
        setCategoryData(processedData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load category')
      } finally {
        setLoading(false)
      }
    }

    fetchCategoryData()
  }, [category])

  // Update document title when category data is available so analytics records correct title
  useEffect(() => {
    if (categoryData && typeof document !== 'undefined') {
      try {
        const cleanLabel = cleanCategoryLabel(categoryData.category)
        const seoTitle = generateSEOTitle(cleanLabel, categoryData.category)
        document.title = seoTitle
      } catch (e) {
        // ignore in non-browser environments
      }
    }
  }, [categoryData])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !categoryData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Category Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'The requested category could not be found.'}
          </p>
          <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            Browse All Songs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Category Header */}
      <div className="mb-8">
        <nav className="mb-4 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-gray-500">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>•</li>
            <li><span className="text-gray-900">{cleanCategoryLabel(categoryData.category)}</span></li>
          </ol>
        </nav>
        
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
          {generateSEOTitle(cleanCategoryLabel(categoryData.category), categoryData.category)}
        </h1>
        
        <p className="text-gray-600 mb-2">
          {generateCategoryDescription(categoryData.category)}
        </p>
      </div>

      {/* Songs Grid */}
      {categoryData.songs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryData.songs.map((song) => (
            <Link 
              key={song.id} 
              href={`/${song.slug}.html`}
              prefetch={false}
              className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-200"
            >
              {/* Song Image */}
              <div className="relative h-48 image-fallback">
                {song.thumbnail ? (
                  <Image
                    src={getEnhancedThumbnail(song.thumbnail)}
                    alt={song.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={categoryData.songs.indexOf(song) < 6} // Prioritize first 6 images
                    placeholder="blur"
                    blurDataURL={generateBlurDataURL()}
                    onError={(e) => {
                      console.error(`Image failed to load: ${song.thumbnail}`)
                      // Hide the image on error and show fallback
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 image-fallback-circle rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <span className="text-blue-600 text-sm font-medium">Tamil Song</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Song Info */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {song.title}
                </h3>
                
                <div className="space-y-1 text-sm text-gray-600 mb-3">
                  {song.movieName && (
                    <p><span className="font-medium">Movie:</span> {song.movieName}</p>
                  )}
                  <p><span className="font-medium">Singer:</span> {song.singerName}</p>
                </div>

                <p className="text-sm text-gray-500 line-clamp-3 mb-3">
                  {song.excerpt}
                </p>

                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>{new Date(song.published).toLocaleDateString()}</span>
                  {/* Removed explicit "Read Lyrics" text — entire card is clickable */}
                  <span className="opacity-0 group-hover:opacity-100 text-blue-600 font-medium transition-opacity">&nbsp;</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-6">No songs found in this category.</p>
          <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            Browse All Songs
          </Link>
        </div>
      )}
    </div>
  )
}

export default function CategoryPageClient() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <CategoryPageContent />
    </Suspense>
  )
}
