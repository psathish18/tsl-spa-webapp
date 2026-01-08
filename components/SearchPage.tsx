'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getSlugFromSong, formatCategoryName } from '@/lib/slugUtils'

interface Song {
  id: { $t: string }
  title: { $t: string }
  published: { $t: string }
  category?: Array<{ term: string }>
  media$thumbnail?: { url: string }
  link?: Array<{ rel: string; href: string }>
}

interface Suggestion {
  category: string
  display: string
}

interface TrendingPost {
  title: string
  url: string
  views: number
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [categoryResults, setCategoryResults] = useState<Song[]>([])
  const [isLoadingResults, setIsLoadingResults] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [popularSongs, setPopularSongs] = useState<Song[]>([])
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const debounceTimer = useRef<NodeJS.Timeout>()

  // Auto-focus search input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Fetch popular songs on mount
  useEffect(() => {
    const fetchPopularSongs = async () => {
      try {
        const response = await fetch('/api/search?popular=true')
        const data = await response.json()
        setPopularSongs(data.results || [])
      } catch (error) {
        console.error('Error fetching popular songs:', error)
      }
    }
    fetchPopularSongs()
  }, [])

  // Fetch trending posts on mount
  useEffect(() => {
    const fetchTrendingPosts = async () => {
      try {
        const response = await fetch('/api/trending')
        const data = await response.json()
        setTrendingPosts(data.trending || [])
      } catch (error) {
        console.error('Error fetching trending posts:', error)
      }
    }
    fetchTrendingPosts()
  }, [])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch autocomplete suggestions
  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const url = `/api/search?autocomplete=true&q=${encodeURIComponent(query)}`
      const response = await fetch(url)
      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setShowSuggestions((data.suggestions || []).length > 0)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    }
  }

  // Handle search input change - only fetch autocomplete suggestions
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    setSelectedIndex(-1)
    
    // Clear category results when user starts typing again
    if (selectedCategory) {
      setCategoryResults([])
      setSelectedCategory('')
    }

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Fetch autocomplete suggestions with debounce
    if (query.trim().length >= 2) {
      debounceTimer.current = setTimeout(() => {
        fetchSuggestions(query)
      }, 300)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Handle suggestion selection - load category results
  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setSearchQuery(suggestion.display)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    setSelectedCategory(suggestion.category)
    setIsLoadingResults(true)

    // Track selection
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'select_content', {
        content_type: 'autocomplete_suggestion',
        item_id: suggestion.category
      })
    }

    try {
      const response = await fetch(`/api/search?category=${encodeURIComponent(suggestion.category)}`)
      const data = await response.json()
      setCategoryResults(data.results || [])
    } catch (error) {
      console.error('Error fetching category results:', error)
      setCategoryResults([])
    } finally {
      setIsLoadingResults(false)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            handleSelectSuggestion(suggestions[selectedIndex])
          }
          break
        case 'Escape':
          setShowSuggestions(false)
          break
      }
    }
  }

  // Handle clear search
  const handleClear = () => {
    setSearchQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
    setCategoryResults([])
    setSelectedCategory('')
    inputRef.current?.focus()
  }

  // Handle song click tracking
  const handleSongClick = (songTitle: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'select_content', {
        content_type: 'song',
        item_id: songTitle,
        source: 'popular'
      })
    }
  }

  const renderSongCard = (song: Song) => {
    const title = song.title.$t
    const slug = getSlugFromSong(song)
    const thumbnail = song.media$thumbnail?.url
    const publishDate = new Date(song.published.$t).toLocaleDateString()

    return (
      <Link
      prefetch={false}
        key={song.id.$t}
        href={`/${slug}.html`}
        onClick={() => handleSongClick(title)}
        className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header with back button */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Go back"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Search Lyrics</h1>
        </div>
      </div>

      {/* Search Input Section */}
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Find Your Favorite Songs
          </h2>
          <p className="text-gray-600">
            Search from thousands of Tamil song lyrics
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-12">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
              placeholder="Search by song name, movie, singer, or lyricist..."
              className="w-full px-6 py-4 pr-24 text-lg border-2 border-gray-200 rounded-full focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-lg"
              autoComplete="off"
            />
            
            {/* Clear button */}
            {searchQuery && (
              <button
                onClick={handleClear}
                className="absolute right-16 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Search icon */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
            >
              <div className="max-h-96 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.category}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className={`w-full px-6 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 ${
                      index === selectedIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span className="text-gray-900 font-medium">{suggestion.display}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Posts */}
          {suggestions.length === 0 && searchQuery.length === 0 && trendingPosts.length > 0 && (
            <div className="mt-6 max-w-2xl mx-auto">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">🔥 Trending Now</h3>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {trendingPosts.slice(0, 10).map((post, index) => (
                    <Link
                    prefetch={false}
                      key={post.url}
                      href={post.url}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors group"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                          {post.title}
                        </p>
                        {/* <p className="text-xs text-gray-500 dark:text-gray-400">
                          {post.views.toLocaleString()} views
                        </p> */}
                      </div>
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category Results Section */}
        {selectedCategory && (
          <div className="max-w-6xl mx-auto mb-12">
            {isLoadingResults ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading songs...</p>
              </div>
            ) : categoryResults.length > 0 ? (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {formatCategoryName(selectedCategory)}
                    </h3>
                    <p className="text-gray-600">{categoryResults.length} song{categoryResults.length !== 1 ? 's' : ''} found</p>
                  </div>
                  <button
                    onClick={handleClear}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Clear Results
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryResults.map((song) => renderSongCard(song))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No songs found
                </h3>
                <p className="text-gray-600 mb-6">
                  Try searching for something else
                </p>
              </div>
            )}
          </div>
        )}

        {/* Popular Songs Section */}
        {!selectedCategory && popularSongs.length > 0 && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Popular Right Now</h3>
              <p className="text-gray-600">Trending Tamil song lyrics</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularSongs.slice(0, 12).map((song) => renderSongCard(song))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
