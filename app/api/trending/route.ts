import { NextResponse } from 'next/server'
import { google } from 'googleapis'

// Auto-revalidate every 6 hours (21600 seconds) to reduce CPU usage
export const revalidate = 21600

export async function GET() {
  try {
    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.warn('Google Analytics credentials not configured')
      return NextResponse.json(
        { trending: [] },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            'x-vercel-cache-tags': 'trending-api'
          }
        }
      )
    }

    // Parse private key - handle both escaped and non-escaped newlines
    let privateKey = process.env.GOOGLE_PRIVATE_KEY
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n')
    }
    
    // Initialize Google Analytics Data API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    })

    const analyticsDataClient = google.analyticsdata({
      version: 'v1beta',
      auth
    })

    const response = await analyticsDataClient.properties.runReport({
      property: 'properties/315076100',
      requestBody: {
        dimensions: [
          { name: 'pageTitle' },
          { name: 'pagePath' }
        ],
        metrics: [
          { name: 'screenPageViews' }
        ],
        dateRanges: [
          { startDate: 'yesterday', endDate: 'today' }
        ],
        orderBys: [
          { metric: { metricName: 'screenPageViews' }, desc: true }
        ],
        limit: '10'
      }
    })

    // Transform GA4 data to simple format and filter out home page and localhost
    const trending = response.data.rows
      ?.map((row) => ({
        title: row.dimensionValues?.[0]?.value || '',
        url: `${BASE_URL}${row.dimensionValues?.[1]?.value || ''}`,
        views: parseInt(row.metricValues?.[0]?.value || '0'),
        pagePath: row.dimensionValues?.[1]?.value || ''
      }))
      .filter((post) => {
        const path = post.pagePath.toLowerCase()
        return path !== '/' && 
               path !== '' && 
               path !== '/search' &&
               !path.includes('localhost') &&
               !post.title.toLowerCase().includes('localhost')
      }) || []

    return NextResponse.json(
      { trending },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
          'x-vercel-cache-tags': 'trending-api'  // Allows CDN cache clearing via revalidateTag
        }
      }
    )
  } catch (error) {
    console.error('Trending API error:', error)
    // Return empty array with 200 status so frontend doesn't break
    return NextResponse.json(
      { trending: [] },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'x-vercel-cache-tags': 'trending-api'
        }
      }
    )
  }
}
