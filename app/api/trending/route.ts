import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET() {
  try {
    // Initialize Google Analytics Data API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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
          { startDate: 'yesterday', endDate: 'yesterday' }
        ],
        orderBys: [
          { metric: { metricName: 'screenPageViews' }, desc: true }
        ],
        limit: '10'
      }
    })

    // Transform GA4 data to simple format and filter out home page
    const trending = response.data.rows
      ?.map((row) => ({
        title: row.dimensionValues?.[0]?.value || '',
        url: `https://www.tsonglyrics.com${row.dimensionValues?.[1]?.value || ''}`,
        views: parseInt(row.metricValues?.[0]?.value || '0'),
        pagePath: row.dimensionValues?.[1]?.value || ''
      }))
      .filter((post) => post.pagePath !== '/' && post.pagePath !== '') || []

    return NextResponse.json(
      { trending },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
        }
      }
    )
  } catch (error) {
    console.error('Trending API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trending posts', trending: [] },
      { status: 500 }
    )
  }
}
