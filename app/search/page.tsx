import { Metadata } from 'next'
import SearchPage from '@/components/SearchPage'

export const metadata: Metadata = {
  title: 'Search Tamil Song Lyrics | TSL',
  description: 'Search and discover your favorite Tamil song lyrics. Find songs by name, movie, singer, or lyricist.',
}

// Disable page-level caching - cache only at API level
export const dynamic = 'force-dynamic'

export default function Search() {
  return <SearchPage />
}
