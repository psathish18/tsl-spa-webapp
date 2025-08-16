const fs = require('fs');
const path = require('path');

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

module.exports = nextConfig;
