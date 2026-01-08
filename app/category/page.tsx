import { Metadata } from 'next'
import { Suspense } from 'react'
import CategoryPageClient from './CategoryPageClient'
import { cachedBloggerFetch } from '@/lib/dateBasedCache'
import { REVALIDATE_CATEGORY_API } from '@/lib/cacheConfig'
import { generateCategoryDescription, cleanCategoryLabel } from '@/lib/seoUtils'

// Enable ISR for category pages
export const revalidate = REVALIDATE_CATEGORY_API

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
  
  try {
    // Fetch category data to get accurate count
    const data = await cachedBloggerFetch(
      `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/${encodeURIComponent(category)}?alt=json&max-results=50`,
      {
        next: {
          revalidate: REVALIDATE_CATEGORY_API,
          tags: [`category-meta-${category}`]
        }
      }
    )
    
    const songCount = data.feed?.entry?.length || 0
    const cleanLabel = cleanCategoryLabel(category)
    
    // Generate title and description
    const title = `${cleanLabel} - Tamil Song Lyrics`
    const description = generateCategoryDescription(category, songCount)
    
    // Build keywords
    const keywords = `${cleanLabel}, Tamil songs, Tamil lyrics, ${category.match(/^Movie:/i) ? 'movie songs' : category.match(/^Singer:/i) ? 'singer songs' : 'Tamil music'}`
    
    return {
      title,
      description,
      keywords,
      alternates: {
        canonical: `https://www.tsonglyrics.com/category?category=${encodeURIComponent(category)}`,
      },
      openGraph: {
        title,
        description,
        type: 'website',
        url: `https://www.tsonglyrics.com/category?category=${encodeURIComponent(category)}`,
        siteName: 'Tamil Song Lyrics',
      },
      twitter: {
        card: 'summary',
        title,
        description,
      }
    }
  } catch (error) {
    console.error('Error generating category metadata:', error)
    const cleanLabel = cleanCategoryLabel(category)
    return {
      title: `${cleanLabel} - Tamil Song Lyrics`,
      description: `Browse Tamil song lyrics in ${cleanLabel} category.`,
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
