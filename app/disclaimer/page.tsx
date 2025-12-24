import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Disclaimer - Tamil Song Lyrics',
  description: 'Disclaimer for Tamil Song Lyrics website. Learn about content ownership, copyright policies, and usage terms.',
  keywords: 'disclaimer, Tamil song lyrics, copyright, content policy',
}

export default function DisclaimerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-gray-500">
          <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
          <li>•</li>
          <li className="text-gray-900">Disclaimer</li>
        </ol>
      </nav>

      <article className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Disclaimer</h1>

        <p className="text-gray-700 leading-relaxed mb-8">
          Tsonglyrics.net is for sharing Lyrics of Tamil Movie Songs to Tamil Movie lovers residing all over the world.
        </p>

        <p className="text-gray-700 leading-relaxed mb-8">
          Tsonglyrics.net provides lyrics for all Tamil Songs in Thanglish, Tamil and English translation. We listen to songs from TV, Radio and various internet sources like youtube and other sites which hosts tamil songs and provide option to listen online.
        </p>

        <p className="text-gray-700 leading-relaxed mb-8">
          Though we listen and post lyrics, the original lyrics is owned by lyricist of the song or album owners / production house and they own the actual rights.
        </p>

        <p className="text-gray-700 leading-relaxed mb-8">
          English meaning of certain songs are posted for other language people to understand Tamil Songs. English meaning is posted based on my own knowledge and simple english that I know. If any english meaning posts are changing the original content meaning and reported to us, then we will remove it.
        </p>

        <p className="text-gray-700 leading-relaxed mb-8">
          Tsonglyrics.net uses some of movie posters or images or pictures which is took from various internet sources. The copyright of these pictures belongs to their original publisher / photographer. Please let us know at if any Copyright Violation occurs and we will remove them right away.
        </p>

        <p className="text-gray-700 leading-relaxed mb-8">
          Also, any links that linked to various other internet sources are for information purposes only. If you find any links that violates copy rights, kindly contact us with the page link so that we will remove them immediately.
        </p>

        <p className="text-gray-700 leading-relaxed mb-8">
          TSL and Tamil Song Lyrics logo displayed on our site is created by us and we own the rights for the same.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Privacy Policy</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            No user data is stored / used including personal information from this site.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            No cookies are stored from this website.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Below third party&apos;s plugins may gather some user data and they have their own privacy policies:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
            <li>Google Analytics</li>
            <li>Addthis</li>
            <li>Onesignal</li>
            <li>Google Adsense</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            You can contact us using below mail at for any queries.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-700 leading-relaxed">
            <strong>Email:</strong> <a href="mailto:admin@tsonglyrics.net" className="text-blue-600 hover:underline">admin@tsonglyrics.net</a>
          </p>
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
