import { Metadata } from 'next'
import SearchPage from '@/components/SearchPage'
import { REVALIDATE_SEARCH_PAGE } from '@/lib/cacheConfig'

export const metadata: Metadata = {
  title: 'Search Tamil Song Lyrics | TSL',
  description: 'Search and discover your favorite Tamil song lyrics. Find songs by name, movie, singer, or lyricist.',
  alternates: {
    canonical: 'https://tsonglyrics.com/search',
  },
}

// Cache search page for 30 days to minimize CPU usage (it's a static shell with client-side search)
// Use manual revalidation API for immediate updates: /api/revalidate?path=/search
export const revalidate = REVALIDATE_SEARCH_PAGE

export default function Search() {
  return <SearchPage />
}
