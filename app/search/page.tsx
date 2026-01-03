import { Metadata } from 'next'
import SearchPage from '@/components/SearchPage'

export const metadata: Metadata = {
  title: 'Search Tamil Song Lyrics | TSL',
  description: 'Search and discover your favorite Tamil song lyrics. Find songs by name, movie, singer, or lyricist.',
}

// Cache search page for 24 hours (it's a static shell with client-side search)
export const revalidate = 86400

export default function Search() {
  return <SearchPage />
}
