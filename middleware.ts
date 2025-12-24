import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Redirect lookup for middleware (runs before caching)
class MiddlewareRedirectLookup {
  private static instance: MiddlewareRedirectLookup | null = null;
  private destinationMap: Map<string, any> | null = null;

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
      const mappingPath = path.join(process.cwd(), 'migration_analysis', 'url_mappings_clean.json');
      const mappings = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
      
      // Create lookup map: source → destination
      this.destinationMap = new Map();
      
      mappings.redirects.forEach((redirect: any) => {
        // Normalize source path for consistent lookup
        const cleanSource = this.normalizePath(redirect.source);
        this.destinationMap!.set(cleanSource, redirect.destination);
      });
      
      console.log(`🔄 Middleware loaded ${this.destinationMap.size} redirect mappings`);
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
    console.log(`🔄 Middleware redirect: ${pathname} → ${redirectDestination}`);
    
    // Return 308 permanent redirect (same as current redirect system)
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectDestination;
    
    return NextResponse.redirect(redirectUrl, 308);
  }

  // No redirect found, continue to page
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
