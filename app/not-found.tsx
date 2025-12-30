import Link from 'next/link'
import NotFoundSuggestions from '@/components/NotFoundSuggestions'

export default function NotFound() {
  // For 404 pages, we cannot reliably get the pathname from headers
  // because not-found.tsx is a special Next.js file that doesn't have access to dynamic route params
  // We'll pass undefined and let the component show popular posts
  const slug = undefined

  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* 404 Header */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <h1 className="text-8xl font-bold text-gray-200">404</h1>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Song Lyrics Not Found
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We couldn&apos;t find the song lyrics you&apos;re looking for. The song might have been moved, 
            renamed, or doesn&apos;t exist yet. Check out these suggestions below!
          </p>
        </div>

        {/* Smart Suggestions */}
        <NotFoundSuggestions searchSlug={slug} />

        {/* Action Button */}
        <div className="mt-12 flex justify-center items-center">
          <Link
            href="/"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold 
                     hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Browse All Songs
          </Link>
        </div>

        {/* Additional Help */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Still can&apos;t find what you need? Try our{' '}
            <Link href="/" className="text-blue-600 hover:underline">
              homepage
            </Link>{' '}
            to discover the latest Tamil song lyrics.
          </p>
        </div>
      </div>
    </div>
  )
}
