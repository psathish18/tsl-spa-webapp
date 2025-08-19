"use client"
import React from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-lg w-full p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-600 mb-4">
          {error?.message || 'An unexpected error occurred.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try again
          </button>
          <a href="/" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200">
            Go home
          </a>
        </div>
      </div>
    </div>
  )
}
