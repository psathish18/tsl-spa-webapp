import { NextRequest, NextResponse } from 'next/server'

// Store subscriptions in memory (in production, use a database)
const subscriptions = new Set<string>()

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json()
    
    // Validate subscription object
    if (!subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      )
    }

    // Store subscription (in production, save to database)
    subscriptions.add(JSON.stringify(subscription))
    
    console.log('New subscription added:', subscription.endpoint)
    
    return NextResponse.json({ message: 'Subscription successful' })
  } catch (error) {
    console.error('Error processing subscription:', error)
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    )
  }
}
