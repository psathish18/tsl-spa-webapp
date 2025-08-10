import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json()
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      )
    }

    // Remove subscription from storage (in production, remove from database)
    console.log('Subscription removed:', endpoint)
    
    return NextResponse.json({ message: 'Unsubscription successful' })
  } catch (error) {
    console.error('Error processing unsubscription:', error)
    return NextResponse.json(
      { error: 'Failed to process unsubscription' },
      { status: 500 }
    )
  }
}
