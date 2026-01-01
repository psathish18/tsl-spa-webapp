import { Metadata } from 'next'
import SearchPage from '@/components/SearchPage'

export const metadata: Metadata = {
  title: 'Search Tamil Song Lyrics | TSL',
  description: 'Search and discover your favorite Tamil song lyrics. Find songs by name, movie, singer, or lyricist.',
}

// Revalidate every 1 hour to keep trending posts fresh
export const revalidate = 3600

export default function Search() {
  return <SearchPage />
}
