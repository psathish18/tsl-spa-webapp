'use client'

import { createContext, useContext, useState, useEffect } from 'react'

// Notification Context
interface NotificationContextType {
  isSubscribed: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    // Check if user is already subscribed
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setIsSubscribed(!!subscription)
        })
      })
    }
  }, [])

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications are not supported')
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Permission not granted for notifications')
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })

    // Send subscription to server
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    })

    setIsSubscribed(true)
  }

  const unsubscribe = async () => {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      await subscription.unsubscribe()
      
      // Remove subscription from server
      await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
    }
    
    setIsSubscribed(false)
  }

  return (
    <NotificationContext.Provider value={{ isSubscribed, subscribe, unsubscribe }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  )
}
