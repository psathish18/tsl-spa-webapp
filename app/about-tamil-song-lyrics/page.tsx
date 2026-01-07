import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us - Tamil Song Lyrics App',
  description: 'Learn about Tamil Song Lyrics app - your ultimate destination for discovering the latest Tamil song lyrics, movie songs, and music.',
  keywords: 'about, Tamil songs, Tamil lyrics, Tamil music, song lyrics app',
  alternates: {
    canonical: 'https://tsonglyrics.com/about-tamil-song-lyrics.html',
  },
}

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-gray-500">
          <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
          <li>•</li>
          <li className="text-gray-900">About Us</li>
        </ol>
      </nav>

      <article className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">About Tamil Song Lyrics</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed">
            Tamil Song Lyrics is your ultimate destination for discovering and enjoying the latest Tamil song lyrics. We are passionate about Tamil music and committed to providing you with accurate, up-to-date lyrics from the latest Tamil movies and independent artists.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">What We Offer</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-3">
            <li><strong>Latest Lyrics:</strong> Get instant access to newly released Tamil song lyrics from movies and independent artists</li>
            <li><strong>Rich Metadata:</strong> Discover movie names, singer information, lyricist details, and music director credits</li>
            <li><strong>Easy Sharing:</strong> Share your favorite lyrics on WhatsApp and Twitter with one click</li>
            <li><strong>Push Notifications:</strong> Subscribe to get notified when new songs are added</li>
            <li><strong>Mobile Optimized:</strong> Enjoy a seamless experience on all devices</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-blue-900 mb-2">⚡ Fast & Reliable</h3>
              <p className="text-gray-700">Lightning-fast page loads and reliable content delivery</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-purple-900 mb-2">🎵 Always Updated</h3>
              <p className="text-gray-700">New songs added regularly as soon as they&apos;re released</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-green-900 mb-2">📱 Mobile First</h3>
              <p className="text-gray-700">Optimized for mobile devices for on-the-go access</p>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-orange-900 mb-2">🔍 SEO Friendly</h3>
              <p className="text-gray-700">Easily discover songs through search engines</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Journey</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Tamil Song Lyrics was born out of a passion for Tamil music and a desire to make lyrics easily accessible to music lovers worldwide. What started as a simple blog has evolved into a comprehensive platform serving thousands of Tamil music enthusiasts daily.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We continuously improve our platform based on user feedback and the latest web technologies to provide you with the best possible experience.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Technology Stack</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Built with modern web technologies for optimal performance:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Next.js 14 with App Router for server-side rendering</li>
            <li>TypeScript for type safety and better developer experience</li>
            <li>Tailwind CSS for beautiful, responsive design</li>
            <li>Vercel for global CDN and edge deployment</li>
            <li>Advanced caching for lightning-fast page loads</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We&apos;d love to hear from you! Whether you have questions, suggestions, or feedback:
          </p>
          <ul className="list-none text-gray-700 space-y-2">
            <li>📧 <strong>Email:</strong> <a href="mailto:contact@tsonglyrics.com" className="text-blue-600 hover:underline">contact@tsonglyrics.com</a></li>
            <li>🐦 <strong>Twitter:</strong> <a href="https://twitter.com/tsongslyrics" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">@tsongslyrics</a></li>
          </ul>
        </section>
      </article>

      {/* Back to Home Button */}
      <div className="mt-12 text-center">
        <Link 
          href="/"
          className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
