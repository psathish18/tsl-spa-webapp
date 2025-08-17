const fs = require('fs');
const path = require('path');

// Bundle analyzer setup
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'blogger.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
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
      // Handle .html URLs by rewriting to dynamic route
      {
        source: '/:slug*.html',
        destination: '/:slug*',
      },
    ];
  },
  async headers() {
    return [
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
      // Static assets caching
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
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
    // Load migration redirects dynamically
    const migrationRedirects = loadMigrationRedirects();
    
    console.log(`📊 Loaded ${migrationRedirects.length} migration redirects`);
    
    return [
      // Legacy /song/ URLs redirect to root level  
      {
        source: '/song/:slug*',
        destination: '/:slug*',
        permanent: true,
      },
      // WordPress to Next.js migration redirects
      ...migrationRedirects
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
