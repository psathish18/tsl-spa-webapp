import { NextRequest, NextResponse } from 'next/server'
import { REVALIDATE_30_DAYS, REVALIDATE_AUTOCOMPLETE, CDN_MAX_AGE, CDN_STALE_WHILE_REVALIDATE } from '@/lib/cacheConfig'
import { cachedBloggerFetch } from '@/lib/dateBasedCache'

interface Song {
  id: { $t: string }
  title: { $t: string }
  published: { $t: string }
  category?: Array<{ term: string }>
  media$thumbnail?: { url: string }
  link?: Array<{ rel: string; href: string }>
}

interface Category {
  term: string
}

// Cache for categories (store in memory for faster access)
let categoriesCache: string[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 3600000 // 1 hour in milliseconds

async function fetchCategories(): Promise<string[]> {
  const now = Date.now()
  
  // Return cached categories if still valid
  if (categoriesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('Returning cached categories:', categoriesCache.length)
    return categoriesCache
  }

  console.log('Fetching fresh categories from Blogger API...')
  try {
    const data = await cachedBloggerFetch(
      'https://tsonglyricsapp.blogspot.com/feeds/posts/default/?alt=json&max-results=0',
      {
        next: {
          revalidate: REVALIDATE_AUTOCOMPLETE, // 30 days
          tags: ['autocomplete-categories']
        }
      }
    )

    console.log('Blogger API response received')
    const categories = (data.feed as any).category || []
    console.log('Total categories in feed:', categories.length)
    
    // Filter only Song: and OldSong: categories
    const songCategories = categories
      .filter((cat: Category) => 
        cat.term?.startsWith('Song:') || cat.term?.startsWith('OldSong:')
      )
      .map((cat: Category) => cat.term)
    
    console.log('Filtered song categories:', songCategories.slice(0, 10)) // Log first 10 for brevity
    
    // Update cache
    categoriesCache = songCategories
    cacheTimestamp = now
    
    return songCategories
  } catch (error) {
    console.error('Error fetching categories:', error)
    return categoriesCache || [] // Return old cache if fetch fails
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const popular = searchParams.get('popular')
  const autocomplete = searchParams.get('autocomplete')
  const category = searchParams.get('category')

  console.log('Search API called with:', { query, popular, autocomplete, category })

  try {
    // Handle category request - fetch all songs with specific category
    if (category) {
      console.log('Fetching songs for category:', category)
      const url = `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/${encodeURIComponent(category)}?alt=json&max-results=100`
      
      const data = await cachedBloggerFetch(url, {
        next: {
          revalidate: REVALIDATE_30_DAYS,
          tags: ['category', `category-${category}`]
        }
      })

      const entries = data.feed?.entry || []

      return NextResponse.json(
        { results: entries },
        {
          headers: {
            'Cache-Control': `public, s-maxage=${CDN_MAX_AGE}, stale-while-revalidate=${CDN_STALE_WHILE_REVALIDATE}`
          }
        }
      )
    }

    // Handle autocomplete request
    if (autocomplete === 'true' && query) {
      console.log('Fetching categories for autocomplete...')
      const categories = await fetchCategories()
      console.log(`Total categories fetched: ${categories.length}`)
      const searchTerm = query.toLowerCase()
      
      // Filter categories that match the search term
      const matches = categories
        .filter(cat => {
          const songName = cat.replace(/^(Song:|OldSong:)/, '').toLowerCase()
          return songName.includes(searchTerm)
        })
        .slice(0, 10) // Limit to 10 suggestions
        .map(cat => ({
          category: cat,
          display: cat.replace(/^(Song:|OldSong:)/, '').replace(/-/g, ' ') + ' Lyrics'
        }))
      
      console.log(`Found ${matches.length} matches for "${query}"`)
      
      return NextResponse.json(
        { suggestions: matches },
        {
          headers: {
            // 30 days cache for autocomplete with manual revalidate option
            'Cache-Control': `public, s-maxage=${CDN_MAX_AGE}, stale-while-revalidate=${CDN_STALE_WHILE_REVALIDATE}`
          }
        }
      )
    }

    let url: string
    let isPopularRequest = false
    let cacheTag = 'search'

    if (popular === 'true') {
      // Fetch popular/recent songs
      isPopularRequest = true
      cacheTag = 'popular'
      url = 'https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&max-results=10'
    } else if (query) {
      // Check if query matches a category (user selected from autocomplete)
      const categories = await fetchCategories()
      const matchedCategory = categories.find(cat => {
        const songName = cat.replace(/^(Song:|OldSong:)/, '').toLowerCase()
        return songName === query.toLowerCase() || cat === query
      })

      if (matchedCategory) {
        // Fetch exact song by category
        cacheTag = `song-${matchedCategory}`
        url = `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/${encodeURIComponent(matchedCategory)}?alt=json&max-results=1`
      } else {
        // Fallback to regular search
        cacheTag = `search-${query}`
        url = `https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json&q=${encodeURIComponent(query)}&max-results=50`
      }
    } else {
      return NextResponse.json({ results: [] })
    }

    const data = await cachedBloggerFetch(url, {
      next: {
        revalidate: REVALIDATE_30_DAYS,
        tags: [cacheTag]
      }
    })

    const entries = data.feed?.entry || []

    // Filter to only Song: categories
    const songs = entries.filter((entry: Song) => {
      return entry.category?.some(cat => 
        cat.term?.startsWith('Song:') || cat.term?.startsWith('OldSong:')
      )
    })

    // Use 30 days cache for popular posts and search results
    const cacheControl = `public, s-maxage=${CDN_MAX_AGE}, stale-while-revalidate=${CDN_STALE_WHILE_REVALIDATE}`
    
    return NextResponse.json(
      { results: songs },
      {
        headers: {
          'Cache-Control': cacheControl
        }
      }
    )
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Failed to search', results: [] },
      { status: 500 }
    )
  }
}
