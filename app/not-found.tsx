import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">404 - Song Lyrics Not Found</h1>
        <p className="text-gray-600 mb-6">
          The song lyrics you&apos;re looking for might have been moved or doesn&apos;t exist.
        </p>
        <div className="space-x-4">
          <Link 
            href="/" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Browse All Songs
          </Link>
          <Link 
            href="/category" 
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors inline-block"
          >
            Browse by Category
          </Link>
        </div>
        
        {/* SEO and monitoring-friendly content */}
        <div className="mt-8 text-sm text-gray-500">
          <p>If you arrived here from a search engine or external link, the page may have been moved.</p>
          <p>Try searching for the song title from our <Link href="/" className="text-blue-600 hover:underline">homepage</Link>.</p>
        </div>
      </div>
    </div>
  )
}
