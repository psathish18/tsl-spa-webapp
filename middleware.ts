import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Redirect non-www to www (301 permanent redirect for SEO)
  const hostname = request.headers.get('host') || '';
  if (hostname === 'tsonglyrics.com' || hostname.startsWith('tsonglyrics.com:')) {
    const newUrl = request.nextUrl.clone();
    newUrl.host = 'www.' + hostname;
    return NextResponse.redirect(newUrl, 301);
  }
  
  // Block non-essential bot crawlers to save edge requests
  // These bots don't provide SEO value and consume ~30-40% of edge quota
  // Source: https://github.com/mitchellkrogza/nginx-ultimate-bad-bot-blocker
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const blocklistBots = [
    // Ad Network & Analytics (High Volume, No SEO Value)
    'criteobot',        // Ad network crawler - major consumer
    'proximic',         // ComScore analytics crawler
    
    // AI Scrapers (Training Data Collection)
    'gptbot',           // OpenAI GPT training
    'chatgpt-user',     // ChatGPT user agent
    'claudebot',        // Anthropic Claude
    'ccbot',            // Common Crawl for AI training
    'anthropic-ai',     // Anthropic AI crawler
    'bytespider',       // TikTok/ByteDance crawler
    
    // SEO Tool Crawlers (Already rate-limited in robots.txt)
    'semrushbot',       // SEO tool
    'ahrefsbot',        // Backlink checker
    'dotbot',           // SEO spider
    'mj12bot',          // Majestic crawler
    'blexbot',          // Webmeup crawler
    'dataforseobot',    // SEO data collector
    'dataforseo.com',   // SEO data variant
    'serpstatbot',      // Serpstat SEO tool
    'zoominfobot',      // B2B data collector
    
    // Search Engine Alternatives (Low Usage)
    'petalbot',         // Huawei search crawler
    
    // Aggressive Scrapers
    'barkrowler',       // Aggressive scraper
    'botalot',          // Known bad bot
    'aspiegel',         // Content scraper
  ];
  
  if (blocklistBots.some(bot => userAgent.includes(bot))) {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden',
      headers: {
        'X-Robots-Tag': 'noindex',
      }
    });
  }
  
  // Block malicious/unwanted requests early to save CPU/memory
  // These patterns are from old WordPress site or hacking attempts
  const blockedPatterns = [
    /^\/wp-/,                    // WordPress paths (wp-login.php, wp-content, wp-admin)
    /^\/tag\//,                  // Old WordPress tag pages
    /^\/author\//,               // Old WordPress author pages
    /^\/search\/label\//,        // Old Blogger URL format
    /^\/feeds?\//,               // Blogger feeds (/feed/, /feeds/)
    /^\/feed$/,                  // WordPress feed endpoint
    /^\/lyrics-tamil\/page\//,   // Old pagination format
    /\.php$/,                    // PHP files (we're Next.js)
    /\.asp$/,                    // ASP files
    /\.(env|git|sql|backup)$/,   // Sensitive files
    /sitemap\.txt$/,             // Wrong sitemap format (only .xml)
  ];
  
  for (const pattern of blockedPatterns) {
    if (pattern.test(pathname)) {
      // Return 410 Gone (better than 404 for SEO - tells crawlers it's permanently removed)
      return new NextResponse(null, {
        status: 410,
        statusText: 'Gone',
        headers: {
          'X-Robots-Tag': 'noindex',
        }
      });
    }
  }
  
  // Clone the request headers and add pathname for 404 handling
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  
  // Date pattern redirects moved to next.config.js
  
  // Pass through all other requests with headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Configure middleware to run on all paths except excluded ones
// Allowlist approach: only allow legitimate patterns
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml (legitimate static files)
     * - app-ads.txt (Google AdSense verification)
     * - manifest.json (PWA manifest)
     * 
     * Everything else goes through middleware for validation
     */
    '/((?!api|_next/static|_next/image|favicon|robots\\.txt|sitemap|app-ads\\.txt|manifest\\.json|android-chrome|apple-touch|icon).*)',
  ],
}
