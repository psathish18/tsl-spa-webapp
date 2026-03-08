import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy - Tamil Song Lyrics | tsonglyrics.com',
  description: 'Privacy policy for tsonglyrics.com. Learn how we handle data, cookies, and advertising on the Tamil Song Lyrics website.',
  keywords: 'privacy policy, Tamil song lyrics, data protection, cookies, Google AdSense',
  alternates: {
    canonical: 'https://www.tsonglyrics.com/privacy-policy-tamil-song-lyrics-app',
  },
}

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-gray-500">
          <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
          <li>•</li>
          <li className="text-gray-900">Privacy Policy</li>
        </ol>
      </nav>

      <article className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 2025</p>

        <p className="text-gray-700 leading-relaxed mb-6">
          This Privacy Policy describes how <strong>Tamil Song Lyrics</strong> (tsonglyrics.com, operated by
          Sathish Kumar) collects, uses, and shares information when you visit our website.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We do not directly collect or store any personally identifiable information (PII) from visitors
            to tsonglyrics.com. We do not have user accounts, registration forms, or comment systems that
            collect personal data.
          </p>
          <p className="text-gray-700 leading-relaxed">
            However, third-party services embedded on our site may collect data as described below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookies</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Our website itself does not set cookies directly. However, the third-party services we use
            (listed below) may set cookies on your device to function correctly. These are standard
            industry practices.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            You can manage or disable cookies through your browser settings. Note that disabling cookies
            may affect the functionality of some features on our site.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We use the following third-party services, each with their own privacy policies:
          </p>

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Google AdSense</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                We use Google AdSense to display advertisements on our website. Google AdSense uses cookies
                and similar technologies to serve relevant ads based on your browsing history and preferences.
                Google may use this data to personalize the ads you see across the web.
              </p>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                You can opt out of personalized advertising by visiting{' '}
                <a
                  href="https://www.google.com/settings/ads"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Ads Settings
                </a>{' '}
                or by visiting{' '}
                <a
                  href="https://www.aboutads.info/choices/"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  aboutads.info
                </a>
                .
              </p>
              <p className="text-gray-700 text-sm">
                <a
                  href="https://policies.google.com/privacy"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Privacy Policy →
                </a>
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Google Analytics</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                We use Google Analytics to understand how visitors use our website (e.g., pages visited,
                time on site, geographic location). This data is anonymised and used solely to improve our
                content and user experience.
              </p>
              <p className="text-gray-700 text-sm">
                <a
                  href="https://policies.google.com/privacy"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Privacy Policy →
                </a>
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">OneSignal (Push Notifications)</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                If you choose to subscribe to push notifications, we use OneSignal to send you alerts
                when new song lyrics are published. OneSignal stores a unique device identifier to deliver
                notifications. You can unsubscribe at any time through your browser settings or through
                the notification button on our site.
              </p>
              <p className="text-gray-700 text-sm">
                <a
                  href="https://onesignal.com/privacy_policy"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  OneSignal Privacy Policy →
                </a>
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Information</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            The aggregated, anonymised analytics data we receive (through Google Analytics) is used only to:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Understand which songs and pages are most popular</li>
            <li>Improve site performance and user experience</li>
            <li>Identify and fix technical issues</li>
            <li>Understand our audience to better serve their needs</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Children&apos;s Privacy</h2>
          <p className="text-gray-700 leading-relaxed">
            Our website does not knowingly collect personal information from children under the age of 13.
            If you are a parent or guardian and believe your child has provided personal information to us,
            please contact us at{' '}
            <a href="mailto:admin@tsonglyrics.com" className="text-blue-600 hover:underline">
              admin@tsonglyrics.com
            </a>{' '}
            and we will delete it promptly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Links to Other Websites</h2>
          <p className="text-gray-700 leading-relaxed">
            Our website may contain links to external websites. We are not responsible for the privacy
            practices or content of those sites. We encourage you to review the privacy policies of any
            external sites you visit.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update this Privacy Policy from time to time. Any changes will be posted on this page
            with an updated date. We encourage you to review this page periodically to stay informed.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you have any questions, concerns, or requests regarding this Privacy Policy or how we
            handle data, please contact us:
          </p>
          <ul className="list-none text-gray-700 space-y-2">
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
