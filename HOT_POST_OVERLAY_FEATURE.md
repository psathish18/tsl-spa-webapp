# Hot Post Overlay Feature

## Overview
A sticky bottom overlay that displays a featured "hot" post with an animated fire icon. The overlay is fully client-side, theme-aware, and mobile-responsive.

## Implementation Details

### Components Added
1. **HotPostOverlay.tsx** - Main component that displays the overlay
2. **public/hot-post.json** - Configuration file for the featured post

### Features
- ✅ Sticky bottom positioning (z-index: 40)
- ✅ Animated fire/hot icon with pulse effect
- ✅ Single-line display with post title and metadata
- ✅ Fully client-side loading (no server/edge requests)
- ✅ Theme-aware styling (adapts to all 6 themes: blue, green, orange, purple, indigo, dark)
- ✅ Mobile responsive with truncated text
- ✅ Hover effects (translate up, underline title)
- ✅ Smooth slide-up animation on load
- ✅ Arrow indicator for clickability

### Configuration

To update the featured post, edit `/public/hot-post.json`:

```json
{
  "enabled": true,
  "slug": "uyirnaadi-nanbane-lyrics-tamil",
  "title": "Uyirnaadi Nanbane Lyrics Tamil - Coolie",
  "movieName": "Coolie",
  "singerName": "Anirudh, Sai Smriti"
}
```

### Styling
- Background: Uses `--header-surface` CSS variable for theme consistency
- Border: Top border with `--primary` color (2px)
- Text: Primary color for title, muted color for metadata
- Fire Icon: Fixed orange/red color (#ff4500) for visibility
- Hover: Lifts up 2px and underlines title

### Performance
- Lazy loaded via `dynamic()` import (ssr: false)
- Loads after 500ms delay for smooth UX
- Uses static JSON file (cached by CDN)
- No impact on server-side rendering or edge requests

### Browser Compatibility
- Works on all modern browsers
- Mobile-friendly with responsive design
- Touch-optimized for mobile devices

### Screenshots

#### Blue Theme
![Blue Theme](https://github.com/user-attachments/assets/130ef320-ea95-40fb-93c0-66762923f372)

#### Dark Theme
![Dark Theme](https://github.com/user-attachments/assets/9856ff3e-18b8-4f58-b4c1-f08d020039a7)

#### Green Theme
![Green Theme](https://github.com/user-attachments/assets/9ce763f3-c00a-4d1a-903f-f6ba89c951aa)

#### Hover Effect
![Hover Effect](https://github.com/user-attachments/assets/9e588fe8-e9bd-42d0-892b-83d7db707f15)

#### Mobile View
![Mobile View](https://github.com/user-attachments/assets/57dd270f-82c1-4e90-a24d-9ba7424585c2)

## Usage

The component is automatically loaded in the root layout. No additional configuration needed.

To disable the overlay temporarily, set `"enabled": false` in `/public/hot-post.json`.

## Future Enhancements
- Add close button (dismissed state saved in localStorage)
- Add view counter/analytics
- Support for multiple hot posts with rotation
- Admin interface to manage hot post from dashboard
