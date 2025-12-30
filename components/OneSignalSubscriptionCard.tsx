'use client'

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
    oneSignalInitialized?: boolean;
  }
}

export default function OneSignalSubscriptionCard() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initOneSignal = () => {
      if (typeof window === 'undefined') return;

      if (!window.OneSignalDeferred) {
        console.warn('OneSignal SDK not loaded yet');
        setIsLoading(false);
        return;
      }

      window.OneSignalDeferred.push(async function(OneSignal: any) {
        if (!mounted) return;

        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const isPushEnabled = await OneSignal.User.PushSubscription.optedIn;
          
          if (mounted) {
            setIsSubscribed(isPushEnabled);
            setIsLoading(false);

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

    initOneSignal();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubscribe = async () => {
    if (typeof window === 'undefined' || !window.OneSignalDeferred) {
      console.warn('OneSignal not initialized yet');
      return;
    }
    
    setIsLoading(true);
    try {
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        try {
          const permission = await OneSignal.Notifications.permission;
          
          if (permission === 'denied') {
            alert('Notifications are blocked. Please enable them in your browser settings.');
            setIsLoading(false);
            return;
          }
          
          const isPushEnabled = await OneSignal.User.PushSubscription.optedIn;
          if (!isPushEnabled) {
            await OneSignal.User.PushSubscription.optIn();
            setIsSubscribed(true);
          } else {
            await OneSignal.Slidedown.promptPush();
          }
        } catch (error) {
          console.error('Failed to subscribe:', error);
          try {
            await OneSignal.Slidedown.promptPush();
          } catch (promptError) {
            console.error('Failed to show prompt:', promptError);
            alert('Failed to subscribe to notifications. Please try again.');
          }
        } finally {
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Failed to subscribe:', error);
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (typeof window === 'undefined' || !window.OneSignalDeferred) {
      console.warn('OneSignal not initialized yet');
      return;
    }
    
    setIsLoading(true);
    try {
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        try {
          await OneSignal.User.PushSubscription.optOut();
          setTimeout(() => {
            setIsSubscribed(false);
            setIsLoading(false);
          }, 500);
        } catch (error) {
          console.error('Failed to unsubscribe:', error);
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Stay Updated</h3>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">
        Get notified instantly when new Tamil song lyrics are added to our collection.
      </p>
      
      {!isSubscribed ? (
        <button 
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {isLoading ? 'Subscribing...' : 'Subscribe to Notifications'}
        </button>
      ) : (
        <button 
          onClick={handleUnsubscribe}
          disabled={isLoading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {isLoading ? 'Unsubscribing...' : 'Unsubscribe'}
        </button>
      )}
      
      <p className="text-xs text-gray-500 mt-3">
        You can {isSubscribed ? 'unsubscribe' : 'unsubscribe'} at any time. Your privacy is important to us.
      </p>
    </div>
  );
}
