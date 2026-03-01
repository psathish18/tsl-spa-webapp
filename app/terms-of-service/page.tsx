import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service - Tamil Song Lyrics',
  description: 'Terms of service for tsonglyrics.com. Read our terms and conditions for using the Tamil Song Lyrics website.',
  keywords: 'terms of service, terms and conditions, Tamil song lyrics, usage policy',
  alternates: {
    canonical: 'https://www.tsonglyrics.com/terms-of-service',
  },
}

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-gray-500">
          <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
          <li>•</li>
          <li className="text-gray-900">Terms of Service</li>
        </ol>
      </nav>

      <article className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 2025</p>

        <p className="text-gray-700 leading-relaxed mb-6">
          Welcome to <strong>Tamil Song Lyrics</strong> (tsonglyrics.com). By accessing or using our website,
          you agree to be bound by these Terms of Service. Please read them carefully before using the site.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            By using tsonglyrics.com, you acknowledge that you have read, understood, and agree to these Terms
            of Service. If you do not agree with any part of these terms, please do not use our website.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Tamil Song Lyrics is a fan-created website that provides Tamil movie and independent song lyrics
            for informational, educational, and entertainment purposes. The site serves Tamil music enthusiasts
            worldwide who wish to read, follow along with, and share lyrics of Tamil songs.
          </p>
          <p className="text-gray-700 leading-relaxed">
            All lyrics are shared for personal, non-commercial use only to help fans enjoy and understand
            Tamil music better.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Intellectual Property &amp; Copyright</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            All song lyrics displayed on this website are the intellectual property of their respective
            copyright holders — including lyricists, music composers, film production houses, and music
            labels. Tamil Song Lyrics does not claim ownership of any song lyrics.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Lyrics are shared under the principles of fair use for:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
            <li>Educational and informational purposes</li>
            <li>Helping fans understand and appreciate Tamil music</li>
            <li>Commentary and cultural discussion</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            If you are a copyright holder and believe your content has been used improperly, please contact
            us at <a href="mailto:admin@tsonglyrics.com" className="text-blue-600 hover:underline">admin@tsonglyrics.com</a> and
            we will promptly remove the content upon verification.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Conduct</h2>
          <p className="text-gray-700 leading-relaxed mb-4">When using our website, you agree not to:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Reproduce, distribute, or commercially exploit any lyrics without permission from the rights holders</li>
            <li>Use the website for any unlawful purpose</li>
            <li>Attempt to access restricted areas of the website</li>
            <li>Engage in any activity that could harm, disable, or impair the website</li>
            <li>Use automated scraping tools to bulk-download content from the site</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Advertising</h2>
          <p className="text-gray-700 leading-relaxed">
            This website uses Google AdSense to display advertisements. Google AdSense may use cookies to
            serve relevant advertisements based on your browsing behavior. You can opt out of personalized
            advertising by visiting{' '}
            <a
              href="https://www.google.com/settings/ads"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Ads Settings
            </a>
            .
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Third-Party Links</h2>
          <p className="text-gray-700 leading-relaxed">
            Our website may contain links to third-party websites. These links are provided for your
            convenience only. We have no control over the content of those sites and accept no responsibility
            for them or for any loss or damage that may arise from your use of them.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Disclaimer of Warranties</h2>
          <p className="text-gray-700 leading-relaxed">
            This website is provided on an &quot;as is&quot; basis without any warranties of any kind, either
            expressed or implied. We do not guarantee that the service will be uninterrupted, timely, secure,
            or error-free, or that the lyrics are 100% accurate. Users should verify lyrics from official
            sources for accuracy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
          <p className="text-gray-700 leading-relaxed">
            To the fullest extent permitted by law, Tamil Song Lyrics and its operators shall not be liable
            for any indirect, incidental, special, or consequential damages arising from your use of or
            inability to use the website or its content.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Changes to Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            We reserve the right to modify these Terms of Service at any time. Changes will be posted on
            this page with an updated date. Your continued use of the website after any changes constitutes
            your acceptance of the new terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you have questions or concerns about these Terms of Service, please contact us:
          </p>
          <ul className="list-none text-gray-700 space-y-2">
            <li>📧 <strong>Email:</strong> <a href="mailto:admin@tsonglyrics.com" className="text-blue-600 hover:underline">admin@tsonglyrics.com</a></li>
            <li>🌐 <strong>Website:</strong> <a href="https://www.tsonglyrics.com" className="text-blue-600 hover:underline">www.tsonglyrics.com</a></li>
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
