'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

export default function OneSignalUnsubscribeLink() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let mounted = true;

    const checkSubscriptionStatus = () => {
      if (typeof window === 'undefined' || !window.OneSignalDeferred) {
        return;
      }

      window.OneSignalDeferred.push(async function(OneSignal: any) {
        if (!mounted) return;

        try {
          const isPushEnabled = await OneSignal.User.PushSubscription.optedIn;
          
          if (mounted) {
            setIsSubscribed(isPushEnabled);

            // Listen for subscription changes
            OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
              if (mounted) {
                setIsSubscribed(event.current.optedIn);
              }
            });
          }
        } catch (error) {
          console.error('Failed to check subscription status:', error);
        }
      });
    };

    // Check immediately
    checkSubscriptionStatus();

    // Also check after a delay in case OneSignal loads late
    const timeoutId = setTimeout(checkSubscriptionStatus, 1000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const handleUnsubscribe = async () => {
    if (typeof window === 'undefined' || !window.OneSignalDeferred) {
      return;
    }
    
    setIsLoading(true);
    try {
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        try {
          // Opt out from push notifications
          await OneSignal.User.PushSubscription.optOut();
          
          // Update local state
          setIsSubscribed(false);
          
          // Give user feedback
          alert('Successfully unsubscribed from notifications! You can re-subscribe anytime using the bell icon in the header.');
          
          // Force a small delay to ensure state propagates
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Failed to unsubscribe:', error);
          alert('Failed to unsubscribe. Please try again.');
        } finally {
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      setIsLoading(false);
    }
  }

  // Only show if user is subscribed
  if (!isSubscribed) {
    return null;
  }

  return (
    <button
      onClick={handleUnsubscribe}
      disabled={isLoading}
      className="header-link transition-colors hover:underline text-left disabled:opacity-50"
    >
      {isLoading ? 'Unsubscribing...' : 'Unsubscribe from Notifications'}
    </button>
  );
}
