"use client"
import React from 'react'
import Link from 'next/link'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-lg w-full p-6 bg-white rounded-lg shadow">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-600 mb-4">{error?.message || 'An unexpected error occurred.'}</p>
            <div className="flex gap-3">
              <button
                onClick={() => reset()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
              >
                Try again
              </button>
              <Link href="/" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md">Home</Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
