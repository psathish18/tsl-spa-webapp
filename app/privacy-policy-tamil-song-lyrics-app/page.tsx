import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy - Tamil Song Lyrics App',
  description: 'Privacy policy for Tamil Song Lyrics app. Learn how we collect, use, and protect your personal information.',
  keywords: 'privacy policy, Tamil song lyrics, data protection, privacy',
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
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        
        <p className="text-gray-700 leading-relaxed mb-8">
          Sathish Kumar built the Tamil Song Lyrics, com.tsonglyrics.lyricsviewer, app as a Free app. This SERVICE is provided by Sathish Kumar at no cost and is intended for use as is.
        </p>

        <p className="text-gray-700 leading-relaxed mb-8">
          This page is used to inform visitors regarding my policies with the collection, use, and disclosure of Personal Information if anyone decided to use my Service.
        </p>

        <p className="text-gray-700 leading-relaxed mb-8">
          The terms used in this Privacy Policy have the same meanings as in our Terms and Conditions, which is accessible at Tamil Song Lyrics unless otherwise defined in this Privacy Policy.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information Collection and Use</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            No personal information is collected by me from this app from users and nothing is stored.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            The app does use third party services that may collect information used to identify you.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Link to privacy policy of third party service providers used by the app:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>
              <strong>Google Play Services</strong>
            </li>
            <li>
              <strong>AdMob</strong> - Used to display ads within the mobile app.
            </li>
            <li>
              <strong>One Signal</strong> - This is used to provide push notification services. User may opt-out any time from &quot;Settings&quot; page within mobile app.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Log Data</h2>
          <p className="text-gray-700 leading-relaxed">
            No log data is stored by me from this app.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookies</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Cookies are files with a small amount of data that are commonly used as anonymous unique identifiers. These are sent to your browser from the websites that you visit and are stored on your device&apos;s internal memory.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            This Service does not use these &quot;cookies&quot; explicitly. However, the app may use third party code and libraries that use &quot;cookies&quot; to collect information and improve their services. You have the option to either accept or refuse these cookies and know when a cookie is being sent to your device. If you choose to refuse our cookies, you may not be able to use some portions of this Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Links to Other Sites</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            This Service may contain links to other sites. If you click on a third-party link, you will be directed to that site. Note that these external sites are not operated by me. Therefore, I strongly advise you to review the Privacy Policy of these websites. I have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            I may update our Privacy Policy from time to time. Thus, you are advised to review this page periodically for any changes. I will notify you of any changes by posting the new Privacy Policy on this page. These changes are effective immediately after they are posted on this page.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you have any questions or suggestions about my Privacy Policy, do not hesitate to contact me.
          </p>
          <p className="text-gray-700 leading-relaxed">
            <strong>Email:</strong> <a href="mailto:admin@tsonglyrics.com" className="text-blue-600 hover:underline">admin@tsonglyrics.com</a>
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
