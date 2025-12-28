import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if URL has YYYY/MM pattern (e.g., /2014/11/song-name.html)
  const datePatternMatch = pathname.match(/^\/(\d{4})\/(\d{2})\/(.+)$/);
  
  if (datePatternMatch) {
    // Extract the song slug without the date prefix
    const songSlug = datePatternMatch[3];
    
    // Create new URL without the date pattern
    const newUrl = request.nextUrl.clone();
    newUrl.pathname = `/${songSlug}`;
    
    // Return 301 permanent redirect
    return NextResponse.redirect(newUrl, 301);
  }
  
  // Pass through all other requests
  return NextResponse.next();
}

// Configure middleware to run on all paths except excluded ones
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
