import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Disclaimer - Tamil Song Lyrics | tsonglyrics.com',
  description: 'Disclaimer for tsonglyrics.com. Learn about content ownership, copyright policies, fair use, and usage terms for the Tamil Song Lyrics website.',
  keywords: 'disclaimer, Tamil song lyrics, copyright, content policy, fair use',
  alternates: {
    canonical: 'https://tsonglyrics.com/disclaimer',
  },
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
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Disclaimer</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 2025</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Purpose of This Website</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            <strong>Tamil Song Lyrics</strong> (tsonglyrics.com) is a fan-created website dedicated to
            sharing Tamil movie and independent song lyrics with Tamil music enthusiasts worldwide.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Lyrics are provided in Tanglish (romanised Tamil), Tamil script, and English translation to help
            fans read along, understand, and appreciate Tamil music — regardless of whether they can read
            Tamil script.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Copyright Notice</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            All song lyrics displayed on tsonglyrics.com are the <strong>intellectual property of their
            respective copyright holders</strong>, including but not limited to:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
            <li>Lyricists and poets who composed the lyrics</li>
            <li>Music directors and composers</li>
            <li>Film production houses and studios</li>
            <li>Music labels and distributors</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            <strong>Tamil Song Lyrics does not claim ownership of any song lyrics.</strong> We are fans
            sharing lyrics for the love of Tamil music.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Fair Use Statement</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            The lyrics shared on this website are provided under the principles of <strong>fair use</strong>
            for the following purposes:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
            <li><strong>Educational:</strong> Helping students and fans learn Tamil language and poetry through songs</li>
            <li><strong>Commentary &amp; Appreciation:</strong> Enabling cultural discussion and appreciation of Tamil music</li>
            <li><strong>Informational:</strong> Providing lyrics information to fans who wish to understand songs they hear</li>
            <li><strong>Non-commercial fan content:</strong> No lyrics are sold or used for commercial gain</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">English Translations</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            English meanings and translations of Tamil songs are provided based on the author&apos;s personal
            knowledge and interpretation. These translations are intended to help non-Tamil speakers
            appreciate the poetry of Tamil music.
          </p>
          <p className="text-gray-700 leading-relaxed">
            If any translation misrepresents the original meaning and is reported to us, we will review and
            correct or remove it promptly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Images &amp; Thumbnails</h2>
          <p className="text-gray-700 leading-relaxed">
            Movie posters, album artwork, and artist images used on this website are sourced from publicly
            available internet resources. The copyright of these images belongs to their original
            publishers, photographers, and production houses. If you believe any image on this site
            violates copyright, please{' '}
            <Link href="/contact" className="text-blue-600 hover:underline">contact us</Link>{' '}
            and we will remove it promptly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">DMCA / Copyright Removal Requests</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you are a copyright holder and believe that content on tsonglyrics.com infringes your rights,
            please contact us with:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
            <li>Your name and contact information</li>
            <li>Identification of the copyrighted work you believe has been infringed</li>
            <li>The specific URL on our site containing the infringing material</li>
            <li>A statement of good faith belief that the use is not authorised by the copyright owner</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            Send removal requests to:{' '}
            <a href="mailto:admin@tsonglyrics.com" className="text-blue-600 hover:underline">
              admin@tsonglyrics.com
            </a>
            . We aim to process all valid requests within <strong>48 hours</strong>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Accuracy of Lyrics</h2>
          <p className="text-gray-700 leading-relaxed">
            While we strive for accuracy, song lyrics are typed and proofread manually. There may
            occasionally be minor errors. If you notice an inaccuracy in any lyrics, please{' '}
            <Link href="/contact" className="text-blue-600 hover:underline">let us know</Link>{' '}
            and we will correct it.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Advertising</h2>
          <p className="text-gray-700 leading-relaxed">
            This website is supported by advertising through <strong>Google AdSense</strong>. Ads help us
            cover hosting and maintenance costs and allow us to continue providing free lyrics to fans.
            We do not control the specific ads displayed; they are served by Google based on your
            browsing context and preferences.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">External Links</h2>
          <p className="text-gray-700 leading-relaxed">
            This website may contain links to external websites for reference or information. We are not
            responsible for the content, privacy practices, or accuracy of any external sites. These links
            do not imply endorsement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact</h2>
          <p className="text-gray-700 leading-relaxed">
            For any copyright concerns, content removal requests, or general queries:
          </p>
          <ul className="list-none text-gray-700 space-y-2 mt-3">
            <li>📧 <strong>Email:</strong> <a href="mailto:admin@tsonglyrics.com" className="text-blue-600 hover:underline">admin@tsonglyrics.com</a></li>
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
