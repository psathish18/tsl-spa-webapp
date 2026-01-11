import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  try {
    // List blobs to find the matching song
    const { blobs } = await list({
      prefix: `json/${slug}.json`,
      limit: 1,
    });

    if (blobs.length === 0) {
      return NextResponse.json(
        { error: 'Song not found in blob storage' },
        { status: 404 }
      );
    }

    const blob = blobs[0];
    
    // Fetch the blob data with cache tags for revalidation support
    const response = await fetch(blob.url, {
      next: { 
        revalidate: 2592000, // 30 days
        tags: [`api-${slug}`] // Enable tag-based revalidation
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.statusText}`);
    }

    const data = await response.json();

    // Return with aggressive CDN caching headers
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400, immutable',
        'CDN-Cache-Control': 'max-age=2592000',
        'Vercel-CDN-Cache-Control': 'max-age=2592000',
      },
    });
  } catch (error) {
    console.error(`[API] Error fetching song ${slug}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
