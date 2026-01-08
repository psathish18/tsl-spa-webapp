import { Metadata } from 'next'
import { Suspense } from 'react'
import CategoryPageClient from './CategoryPageClient'
import { generateCategoryDescription, cleanCategoryLabel, generateSEOTitle } from '@/lib/seoUtils'

// Server-side metadata generation for better SEO
export async function generateMetadata({ 
  searchParams 
}: { 
  searchParams: { category?: string } 
}): Promise<Metadata> {
  const category = searchParams.category
  
  if (!category) {
    return {
      title: 'Browse Categories - Tamil Song Lyrics',
      description: 'Browse all Tamil song lyrics by category. Find songs by movie, singer, lyricist, and music director.',
    }
  }
  
  const cleanLabel = cleanCategoryLabel(category)
  
  const seoTitle = generateSEOTitle(cleanLabel, category)
  // Generate description without song count (client will fetch actual data)
  const description = generateCategoryDescription(category)
  
  // Build keywords based on category type
  const categoryType = category.match(/^Movie:/i) ? 'movie songs' 
    : category.match(/^Singer:/i) ? 'singer songs'
    : category.match(/^Lyricist:/i) ? 'lyricist songs'
    : category.match(/^Music:/i) ? 'music director songs'
    : 'Tamil music'
  
  const keywords = `${cleanLabel}, Tamil songs, Tamil lyrics, ${categoryType}`
  
  return {
    title: seoTitle,
    description,
    keywords,
    alternates: {
      canonical: `https://www.tsonglyrics.com/category?category=${encodeURIComponent(category)}`,
    },
    openGraph: {
      title: seoTitle,
      description,
      type: 'website',
      url: `https://www.tsonglyrics.com/category?category=${encodeURIComponent(category)}`,
      siteName: 'Tamil Song Lyrics',
    },
    twitter: {
      card: 'summary',
      title: seoTitle,
      description,
    }
  }
}

export default function CategoryPage() {
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
      <CategoryPageClient />
    </Suspense>
  )
}
