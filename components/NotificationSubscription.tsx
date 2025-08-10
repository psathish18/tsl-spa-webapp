'use client'

import { useNotification } from '@/app/providers'
import { useState } from 'react'

export function NotificationSubscription() {
  const { isSubscribed, subscribe, unsubscribe } = useNotification()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubscribe = async () => {
    setIsLoading(true)
    setMessage('')
    
    try {
      await subscribe()
      setMessage('Successfully subscribed to notifications!')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to subscribe')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setIsLoading(true)
    setMessage('')
    
    try {
      await unsubscribe()
      setMessage('Successfully unsubscribed from notifications')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to unsubscribe')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 7V3m0 18v-4m4-4h4m-8 0H8m-4 0H1m7-4V7m0 0L4 3m4 4l4-4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Stay Updated</h3>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">
        Get notified instantly when new Tamil song lyrics are added to our collection.
      </p>
      
      {message && (
        <div className={`p-3 rounded-lg text-sm mb-4 ${
          message.includes('Success') || message.includes('subscribed')
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}
      
      {!isSubscribed ? (
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Subscribing...
            </div>
          ) : (
            'Subscribe to Notifications'
          )}
        </button>
      ) : (
        <div>
          <div className="flex items-center text-green-600 mb-3">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">You're subscribed!</span>
          </div>
          <button
            onClick={handleUnsubscribe}
            disabled={isLoading}
            className="w-full bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Unsubscribing...' : 'Unsubscribe'}
          </button>
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-3">
        You can unsubscribe at any time. Your privacy is important to us.
      </p>
    </div>
  )
}
