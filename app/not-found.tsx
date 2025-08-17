import React from 'react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">404 — Page not found</h1>
            <p className="text-gray-600 mb-4">Sorry, we couldn\'t find the page you\'re looking for.</p>
            <Link href="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md">Go home</Link>
          </div>
        </div>
      </body>
    </html>
  )
}
