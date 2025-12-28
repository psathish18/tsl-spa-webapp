import { NextRequest, NextResponse } from 'next/server'
import urlMappings from './migration_analysis/url_mappings_clean.json'

// Redirect lookup for middleware (runs before caching)
class MiddlewareRedirectLookup {
  private static instance: MiddlewareRedirectLookup | null = null;
  private destinationMap: Map<string, string> = new Map();

  constructor() {
    this.loadMappings();
  }

  static getInstance(): MiddlewareRedirectLookup {
    if (!MiddlewareRedirectLookup.instance) {
      MiddlewareRedirectLookup.instance = new MiddlewareRedirectLookup();
    }
    return MiddlewareRedirectLookup.instance;
  }

  private loadMappings() {
    try {
      // Use imported JSON instead of fs.readFileSync (Edge Runtime compatible)
      const mappings = urlMappings as any;
      
      // Create lookup map: source → destination
      this.destinationMap = new Map();
      
      mappings.redirects.forEach((redirect: any) => {
        // Normalize source path for consistent lookup
        const cleanSource = this.normalizePath(redirect.source);
        this.destinationMap.set(cleanSource, redirect.destination);
      });
    } catch (error) {
      console.error('Failed to load redirect mappings in middleware:', error);
      this.destinationMap = new Map();
    }
  }

  private normalizePath(path: string): string {
    return path.replace(/^\//, '').replace(/\.html$/, '').toLowerCase();
  }

  findRedirectDestination(sourcePath: string): string | null {
    if (!this.destinationMap) return null;
    
    const normalizedSource = this.normalizePath(sourcePath);
    return this.destinationMap.get(normalizedSource) || null;
  }
}

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
  
  // Only process potential song pages (skip API routes, static assets, etc.)
  if (pathname.startsWith('/api') || 
      pathname.startsWith('/_next') || 
      pathname.startsWith('/favicon') ||
      pathname.includes('.') && !pathname.endsWith('.html')) {
    return NextResponse.next();
  }

  // Check for redirect mapping
  const redirectLookup = MiddlewareRedirectLookup.getInstance();
  const redirectDestination = redirectLookup.findRedirectDestination(pathname);
  
  if (redirectDestination) {
    // Return 301 permanent redirect
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectDestination;
    
    return NextResponse.redirect(redirectUrl, 301);
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
