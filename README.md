# Tamil Song Lyrics Web App - 

A modern, SEO-optimized Next.js application for displaying Tamil song lyrics fetched from a Blogger API. Built with performance, user experience, and monetization in mind.

## Features

### 🎵 Core Features
- **Latest Song Lyrics**: Display latest Tamil songs from Blogger API
- **Song Details**: Dedicated pages for each song with full lyrics
- **Responsive Design**: Optimized for all devices
- **Search Functionality**: Find songs quickly

### 🚀 Performance & SEO
- **Server-Side Rendering**: Next.js App Router for optimal performance
- **SEO Optimized**: Meta tags, structured data, and semantic HTML
- **Image Optimization**: Next.js Image component with WebP support
- **Fast Loading**: Optimized assets and caching strategies

### 💰 Monetization
- **Google AdSense Integration**: Strategic ad placement for maximum revenue
- **High Click-Through Rate**: Optimized design for user engagement
- **Ad Performance Tracking**: Built-in analytics support

### 🔔 User Engagement
- **Push Notifications**: Subscribe for new song updates
- **Social Sharing**: Share songs on social media platforms
- **Return User Optimization**: Features to encourage repeat visits

### 🛠 Technical Features
- **TypeScript**: Full type safety
- **Tailwind CSS**: Modern, utility-first styling
- **API Routes**: Proxy functionality for Blogger API
- **Advanced Caching**: Multi-layer intelligent caching system ([Documentation](./cache/))
- **Error Handling**: Robust error management

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tsl-spa-webapp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Fill in your environment variables in `.env.local`:
- Google AdSense Client ID
- VAPID keys for push notifications
- Other configuration options

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── song/[slug]/       # Dynamic song pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── SongList.tsx
│   └── ...
├── public/               # Static assets
└── ...
```

## API Integration

The app fetches data from Blogger API:
- **Latest Songs**: `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/~/?alt=json`
- **Song Details**: `https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/Song:{category}?alt=json`

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Manual Deployment

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Google AdSense client ID | Yes |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key for push notifications | Yes |
| `VAPID_PRIVATE_KEY` | VAPID private key | Yes |
| `NEXT_PUBLIC_SITE_URL` | Your site URL | Yes |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | No |

## SEO Features

- **Meta Tags**: Dynamic meta tags for each page
- **Open Graph**: Social media sharing optimization
- **Twitter Cards**: Enhanced Twitter sharing
- **Structured Data**: JSON-LD for search engines
- **Sitemap**: Auto-generated sitemap
- **Canonical URLs**: Proper URL canonicalization

## Performance Optimization

- **Image Optimization**: Next.js Image component with WebP/AVIF
- **Code Splitting**: Automatic code splitting
- **Advanced Caching**: Multi-layer intelligent caching ([View Details](./cache/))
  - Date-based TTL (2 minutes → 7 days)
  - Vercel CDN integration
  - Lyrics lifecycle optimization
- **Bundle Analysis**: Webpack bundle analyzer
- **Core Web Vitals**: Optimized for Google's metrics

## Automation & Workflows

### GitHub Actions Workflows
- **[Generate Song JSON Workflow](./docs/GENERATE_SONG_JSON_WORKFLOW.md)** - Automatic JSON generation via GitHub Issues
  - Create an issue with title `generate json for recent X song` to generate JSON for recent songs
  - Create an issue with title `generate json for category CategoryName` to generate JSON for specific category
  - Files are automatically generated and committed to the repository

- **[Upload to Blob Workflow](./docs/UPLOAD_TO_BLOB_WORKFLOW.md)** - Upload generated files to Vercel Blob Storage
  - Comment `/approve` on any issue to trigger upload
  - Uploads all JSON files from `blob-data/` directory to Vercel Blob
  - Requires `BLOB_READ_WRITE_TOKEN` secret configured

## Documentation

### 📁 Documentation Structure
- **[/cache/](./cache/)** - Comprehensive caching system documentation
  - Cache management guides
  - Vercel CDN integration
  - Lyrics lifecycle optimization
  - Performance testing results
- **[/docs/](./docs/)** - Additional documentation
  - [Generate Song JSON Workflow](./docs/GENERATE_SONG_JSON_WORKFLOW.md) - Automated JSON generation guide
  - [Upload to Blob Workflow](./docs/UPLOAD_TO_BLOB_WORKFLOW.md) - Upload files to Vercel Blob Storage guide
  - [Workflow Examples](./docs/WORKFLOW_EXAMPLES.md) - Examples and testing scenarios
  - [Testing Guide](./docs/TESTING_WORKFLOW.md) - Testing workflows before deployment
- **[OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)** - Performance optimization guide
- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Technical documentation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email [your-email] or create an issue in the repository.
