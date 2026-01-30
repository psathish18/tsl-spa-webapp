import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'edge';

// Construct blob URL directly without list() to avoid Advanced Operations cost
function getBlobUrl(slug: string): string {
  const blobBaseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL
  if (!blobBaseUrl) {
    throw new Error('NEXT_PUBLIC_BLOB_BASE_URL environment variable not set')
  }
  return `${blobBaseUrl}/json/${slug}.json`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  try {
    // In development, try to serve from local public/songs directory first
    if (process.env.NODE_ENV === 'development') {
      try {
        const filePath = path.join(process.cwd(), 'public', 'songs', `${slug}.json`);
        const fileContents = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContents);

        console.log(`[API] ✅ Served from local public/songs: ${slug}`);

        // Return with development-appropriate caching
        return NextResponse.json(data, {
          status: 200,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Source': 'local-development',
          },
        });
      } catch (localFileError) {
        // File not found locally, continue to blob storage
        console.log(`[API] Local file not found for ${slug}, trying blob storage`);
      }
    }

    // Construct blob URL directly (no list() call = no Advanced Operation cost)
    const blobUrl = getBlobUrl(slug)

    console.log(`[API] Fetching from blob URL: ${blobUrl}`)

    // Fetch the blob data with cache tags for revalidation support
    const response = await fetch(blobUrl, {
      next: { 
        revalidate: 2592000, // 30 days
        tags: [`api-${slug}`] // Enable tag-based revalidation
      },
    });

    if (!response.ok) {
      // Blob not found
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Song not found in blob storage' },
          { status: 404 }
        );
      }
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
