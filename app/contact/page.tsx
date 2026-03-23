import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact Us - Tamil Song Lyrics',
  description: 'Get in touch with Tamil Song Lyrics. Contact us for copyright concerns, song requests, feedback, or any queries about our Tamil lyrics website.',
  keywords: 'contact, Tamil song lyrics, feedback, copyright, song request',
  alternates: {
    canonical: 'https://tsonglyrics.com/contact',
  },
}

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-gray-500">
          <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
          <li>•</li>
          <li className="text-gray-900">Contact Us</li>
        </ol>
      </nav>

      <article className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Contact Us</h1>

        <p className="text-gray-700 leading-relaxed mb-8">
          We&apos;d love to hear from you! Whether you have a question, want to report a copyright issue,
          suggest a new song, or just want to say hello — we&apos;re here to help.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-900 mb-3">📧 Email Us</h2>
            <p className="text-gray-700 mb-3">
              For all general enquiries, feedback, or song requests, write to us at:
            </p>
            <a
              href="mailto:admin@tsonglyrics.com"
              className="text-blue-600 hover:underline font-medium text-lg"
            >
              admin@tsonglyrics.com
            </a>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-purple-900 mb-3">🐦 Follow on Twitter / X</h2>
            <p className="text-gray-700 mb-3">
              Stay updated with new lyrics and connect with us on Twitter:
            </p>
            <a
              href="https://twitter.com/tsongslyrics"
              className="text-purple-600 hover:underline font-medium text-lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              @tsongslyrics
            </a>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Copyright / DMCA Notices</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            All lyrics featured on Tamil Song Lyrics are the intellectual property of their respective
            owners — including lyricists, music directors, and film production houses. We share lyrics for
            educational and fan-appreciation purposes only.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you believe any content on our site infringes your copyright, please email us at{' '}
            <a href="mailto:admin@tsonglyrics.com" className="text-blue-600 hover:underline">
              admin@tsonglyrics.com
            </a>{' '}
            with the following information:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
            <li>Your name and contact information</li>
            <li>A description of the copyrighted work that you claim has been infringed</li>
            <li>The URL or page on our site containing the infringing content</li>
            <li>A statement that you have a good-faith belief that the use is not authorized</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            We will review and respond to all valid copyright notices promptly and remove content as
            required.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Song Requests &amp; Corrections</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Don&apos;t see a Tamil song you&apos;re looking for? Found a typo or error in lyrics? We welcome your
            input!
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li><strong>Song Requests:</strong> Email us with the song name, movie, and singer</li>
            <li><strong>Lyrics Corrections:</strong> Send us the correct version with the song URL</li>
            <li><strong>New Songs:</strong> We regularly add newly released Tamil songs to our collection</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Advertising Enquiries</h2>
          <p className="text-gray-700 leading-relaxed">
            For advertising, partnerships, or sponsorship enquiries, please reach out to us at{' '}
            <a href="mailto:admin@tsonglyrics.com" className="text-blue-600 hover:underline">
              admin@tsonglyrics.com
            </a>
            .
          </p>
        </section>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Response Time</h2>
          <p className="text-gray-700 leading-relaxed">
            We aim to respond to all emails within <strong>2–3 business days</strong>. For urgent copyright
            matters, we will act within <strong>24 hours</strong> of receiving a valid notice.
          </p>
        </div>
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
