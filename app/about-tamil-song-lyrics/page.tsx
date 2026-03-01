import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us - Tamil Song Lyrics | tsonglyrics.com',
  description: 'Learn about Tamil Song Lyrics (tsonglyrics.com) — a fan-created website dedicated to sharing Tamil movie and independent song lyrics since 2010. Meet the team and our mission.',
  keywords: 'about Tamil Song Lyrics, tsonglyrics, Tamil lyrics website, Tamil music fan site',
  alternates: {
    canonical: 'https://www.tsonglyrics.com/about-tamil-song-lyrics',
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Who We Are</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Tamil Song Lyrics (<strong>tsonglyrics.com</strong>) is a passion project started by a Tamil music
            enthusiast who wanted to make it easy for fans around the world to read, enjoy, and share the
            beautiful poetry found in Tamil film and independent music.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            What began as a small personal blog in 2010 has grown into one of the most visited Tamil lyrics
            resources online — now hosting over <strong>3,000 songs</strong> spanning decades of Tamil cinema,
            from classic golden-era melodies to today&apos;s chart-topping hits.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Every lyric is manually typed, proofread, and enriched with song metadata (movie name, singer,
            lyricist, music director) to ensure you get accurate and useful information with every visit.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Tamil is one of the world&apos;s oldest classical languages, and its film music carries a richness
            of poetry that deserves to be celebrated and preserved. Our mission is simple:
          </p>
          <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 mb-4">
            &ldquo;To make every Tamil song lyric accessible to music lovers everywhere — whether they read Tamil
            script, Tanglish (Tamil in English letters), or want an English translation.&rdquo;
          </blockquote>
          <p className="text-gray-700 leading-relaxed">
            We believe that great lyrics deserve a great home. That&apos;s why we invest in fast, clean, and
            mobile-friendly pages so you can focus on the music.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">What We Offer</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-3">
            <li><strong>Latest Lyrics:</strong> Newly released Tamil song lyrics are added as soon as songs come out — often within hours of release</li>
            <li><strong>Tanglish &amp; Tamil Script:</strong> Lyrics in both Tanglish (romanised Tamil) and native Tamil script where available</li>
            <li><strong>English Translations:</strong> English meaning of select songs to help non-Tamil speakers appreciate the poetry</li>
            <li><strong>Rich Metadata:</strong> Movie name, singer, lyricist, music director — all in one place</li>
            <li><strong>Snippet Sharing:</strong> Share your favourite stanzas directly to WhatsApp or Twitter in one tap</li>
            <li><strong>Push Notifications:</strong> Subscribe to be notified the moment new lyrics are published</li>
            <li><strong>Ad-Free Reading Experience:</strong> Minimal, non-intrusive ads so you can focus on the lyrics</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-blue-900 mb-2">⚡ Fast &amp; Reliable</h3>
              <p className="text-gray-700">Powered by Vercel&apos;s global CDN for sub-second page loads anywhere in the world</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-purple-900 mb-2">🎵 Always Updated</h3>
              <p className="text-gray-700">New songs added regularly — we follow Tamil film releases closely so you don&apos;t miss a single lyric</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-green-900 mb-2">📱 Mobile First</h3>
              <p className="text-gray-700">Designed for phones first — read lyrics comfortably while watching videos or listening to songs</p>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-orange-900 mb-2">🤝 Fan Community</h3>
              <p className="text-gray-700">Over a decade of serving Tamil music fans — we understand what you&apos;re looking for</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Journey</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Tamil Song Lyrics started as a personal blog in 2010 — a simple place to save lyrics that the
            founder kept searching for online. Over the years it grew into a full website with a dedicated
            following of Tamil music fans from India, Sri Lanka, Malaysia, Singapore, and Tamil diaspora
            communities worldwide.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            In 2024–2025, the site was migrated from WordPress to a modern Next.js application, bringing
            dramatically faster page loads, better SEO, and a much-improved reading experience on mobile
            devices.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We continue to grow and improve based on user feedback. Our readers are at the heart of everything
            we do.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Copyright &amp; Fair Use</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            All song lyrics are the intellectual property of their respective copyright holders — including
            lyricists, composers, and music labels. Tamil Song Lyrics shares lyrics for educational and
            fan-appreciation purposes under the principles of fair use.
          </p>
          <p className="text-gray-700 leading-relaxed">
            If you are a rights holder and have concerns about content on our site, please{' '}
            <Link href="/contact" className="text-blue-600 hover:underline">contact us</Link>{' '}
            and we will respond promptly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We&apos;d love to hear from you — for song requests, corrections, feedback, or anything else:
          </p>
          <ul className="list-none text-gray-700 space-y-2">
            <li>📧 <strong>Email:</strong> <a href="mailto:admin@tsonglyrics.com" className="text-blue-600 hover:underline">admin@tsonglyrics.com</a></li>
            <li>🐦 <strong>Twitter / X:</strong> <a href="https://twitter.com/tsongslyrics" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">@tsongslyrics</a></li>
            <li>🌐 <strong>Contact page:</strong> <Link href="/contact" className="text-blue-600 hover:underline">Visit our contact page</Link></li>
          </ul>
        </section>
      </article>

      {/* Back to Home Button */}
      <div className="mt-12 text-center">
        <Link
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
