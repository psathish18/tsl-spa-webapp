const fs = require('fs');
const path = require('path');

// Bundle analyzer setup
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

// Custom redirects - Add your manual redirects here
const customRedirects = [
  // Example:
  // { source: '/old-url', destination: '/new-url', permanent: true },
  // { source: '/old-post-title-lyrics', destination: '/new-post-title-lyrics.html', permanent: true },
  { source: '/raavana-mavan-da-lyrics-in-tamil-jana-nayagan.html', destination: '/ravana-mavan-da-lyrics-in-tamil-jana-nayagan.html', permanent: true },
];

// Load migration redirects
function loadMigrationRedirects() {
  try {
    const mappingPath = path.join(process.cwd(), 'migration_analysis', 'url_mappings_clean.json');
    if (fs.existsSync(mappingPath)) {
      const data = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
      return (data.redirects || [])
        .filter(mapping => 
          mapping.source !== mapping.destination &&
          mapping.source && mapping.destination &&
          mapping.score >= 0.8
        )
        .map(mapping => ({
          source: mapping.source,
          destination: mapping.destination,
          permanent: true
        }));
    }
  } catch (error) {
    console.error('Error loading migration redirects:', error);
  }
  return [];
}

const nextConfig = {
  images: {
    unoptimized: true, // Disable Vercel image optimization to avoid limit
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'blogger.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
    formats: ['image/webp'],
  },
  // Bundle optimization
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Advanced caching and compression
  compress: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'https://tsonglyricsapp.blogspot.com/:path*',
      },
      // Handle static pages with .html extension
      {
        source: '/privacy-policy-tamil-song-lyrics-app.html',
        destination: '/privacy-policy-tamil-song-lyrics-app',
      },
      {
        source: '/privacy',
        destination: '/privacy-policy-tamil-song-lyrics-app',
      },
      {
        source: '/about',
        destination: '/about-tamil-song-lyrics',
      },
      {
        source: '/terms',
        destination: '/disclaimer',
      },
      {
        source: '/tamil-song-lyrics-in-english.html',
        destination: '/tamil-song-lyrics-in-english',
      },
      // Handle .html URLs by rewriting to dynamic route (must come after static pages)
      {
        source: '/:slug.html',
        destination: '/:slug',
      },
    ];
  },
  async headers() {
    return [
      // Revalidate API - NO CACHE (must never be cached!)
      {
        source: '/api/revalidate',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      // Security headers for all routes
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      // CDN Cache headers for all pages (home, search, songs) but NOT API routes
      // Extended to 30 days to minimize CPU usage on Vercel free tier
      {
        source: '/:path((?!api|_next/static|_next/image|favicon.ico).*)*',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=2592000, stale-while-revalidate=5184000',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'max-age=2592000',
          },
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'max-age=2592000',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
      // Static assets caching
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, s-maxage=2592000',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async redirects() {
    // console.log('🚫 Migration redirects disabled - using middleware for redirects');
    
    return [
      // Custom manual redirects (defined at top of file)
      ...customRedirects,
      
      // Legacy /song/ URLs redirect to root level  
      {
        source: '/song/:slug*',
        destination: '/:slug*',
        permanent: true,
      },
      // WordPress to Next.js migration redirects now handled by middleware
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
