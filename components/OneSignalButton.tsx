'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
    oneSignalInitialized?: boolean;
  }
}

export default function OneSignalButton() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    let mounted = true;

    const initOneSignal = () => {
      if (typeof window === 'undefined') return;

      // Check if OneSignalDeferred is available
      if (!window.OneSignalDeferred) {
        console.warn('OneSignal SDK not loaded yet');
        setIsLoading(false);
        return;
      }

      window.OneSignalDeferred.push(async function(OneSignal: any) {
        if (!mounted) return;

        try {
          // Wait for initialization
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Check if user is already subscribed
          const isPushEnabled = await OneSignal.User.PushSubscription.optedIn;
          
          if (mounted) {
            setIsSubscribed(isPushEnabled);
            setIsInitialized(true);
            setIsLoading(false);
            window.oneSignalInitialized = true;

            // Listen for subscription changes
            OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
              if (mounted) {
                setIsSubscribed(event.current.optedIn);
              }
            });
          }
        } catch (error) {
          console.error('OneSignal initialization error:', error);
          if (mounted) {
            setIsLoading(false);
          }
        }
      });
    };

    // Try to initialize immediately
    initOneSignal();

    // Cleanup
    return () => {
      mounted = false;
    };
  }, [])

  const handleSubscribe = async () => {
    if (typeof window === 'undefined' || !window.oneSignalInitialized) {
      console.warn('OneSignal not initialized yet');
      return;
    }
    
    setIsLoading(true);
    try {
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async function(OneSignal: any) {
          try {
            await OneSignal.Slidedown.promptPush();
          } catch (error) {
            console.error('Failed to show prompt:', error);
          } finally {
            setIsLoading(false);
          }
        });
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return null // Don't show button while loading
  }

  if (isSubscribed) {
    return (
      <button
        className="flex items-center justify-center w-10 h-10 bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
        aria-label="Notifications subscribed"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
      </button>
    )
  }

  return (
    <button
      onClick={handleSubscribe}
      className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
      aria-label="Subscribe to notifications"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    </button>
  )
}
