// scripts/generate-og-image.js
// Local OG image generation using Sharp (no server required)

const sharp = require('sharp');

/**
 * Theme configurations
 */
const THEMES = {
  gradient: {
    background: { r: 102, g: 126, b: 234 }, // #667eea
    gradientEnd: { r: 118, g: 75, b: 162 }, // #764ba2
    textColor: '#ffffff',
    artistColor: '#FFE066',
    emoji: '🌟'
  },
  romantic: {
    background: { r: 240, g: 147, b: 251 }, // #f093fb
    gradientEnd: { r: 245, g: 87, b: 108 }, // #f5576c
    textColor: '#ffffff',
    artistColor: '#FFE8E8',
    emoji: '❤️'
  },
  mass: {
    background: { r: 250, g: 139, b: 255 }, // #FA8BFF
    gradientEnd: { r: 43, g: 255, b: 136 }, // #2BFF88
    textColor: '#ffffff',
    artistColor: '#FFD700',
    emoji: '🔥'
  },
  dark: {
    background: { r: 15, g: 17, b: 21 }, // #0f1115
    gradientEnd: { r: 26, g: 29, b: 36 }, // #1a1d24
    textColor: '#eaac0c',
    artistColor: '#FFE066',
    emoji: '✨'
  }
};

/**
 * Create SVG with lyrics
 */
function createLyricsSVG(lyrics, artist, theme = 'gradient') {
  const themeConfig = THEMES[theme] || THEMES.gradient;
  
  // Clean lyrics - remove emojis
  const cleanLyrics = lyrics
    .replace(/⭐/g, '')
    .replace(/🌟/g, '')
    .trim();
  
  // Split into lines and limit to 4 lines max
  const lines = cleanLyrics.split(/\r?\n/).slice(0, 4);
  
  // Calculate text positions
  const lineHeight = 70;
  const lyricsStartY = 200;
  const artistY = lyricsStartY + (lines.length * lineHeight) + 60;
  const brandY = 580;
  
  // Create gradient definition
  const gradient = `
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:rgb(${themeConfig.background.r},${themeConfig.background.g},${themeConfig.background.b});stop-opacity:1" />
        <stop offset="100%" style="stop-color:rgb(${themeConfig.gradientEnd.r},${themeConfig.gradientEnd.g},${themeConfig.gradientEnd.b});stop-opacity:1" />
      </linearGradient>
    </defs>
  `;
  
  // Build lyrics lines
  const lyricsLines = lines.map((line, i) => `
    <text x="600" y="${lyricsStartY + (i * lineHeight)}" 
          font-family="Georgia, serif" 
          font-size="52" 
          font-weight="bold"
          fill="${themeConfig.textColor}" 
          text-anchor="middle"
          style="text-shadow: 2px 2px 4px rgba(0,0,0,0.3)">
      ${escapeXml(line)}
    </text>
  `).join('');
  
  // Generate random music notes in background
  const musicNotes = ['♪', '♫', '♬', '♩', '♭', '♮', '♯'];
  const notePositions = [
    { x: 120, y: 150, size: 80, rotate: -15 },
    { x: 950, y: 180, size: 70, rotate: 25 },
    { x: 200, y: 450, size: 90, rotate: 10 },
    { x: 1050, y: 520, size: 75, rotate: -20 },
    { x: 100, y: 320, size: 65, rotate: 35 },
    { x: 1100, y: 350, size: 85, rotate: -10 },
    { x: 300, y: 100, size: 60, rotate: 20 },
    { x: 850, y: 450, size: 70, rotate: -25 }
  ];
  const musicNotesMarkup = notePositions.map((pos, i) => `
    <text x="${pos.x}" y="${pos.y}" 
          font-size="${pos.size}" 
          fill="${themeConfig.textColor}" 
          opacity="0.30"
          transform="rotate(${pos.rotate} ${pos.x} ${pos.y})">
      ${musicNotes[i % musicNotes.length]}
    </text>
  `).join('');
  
  // Complete SVG
  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      ${gradient}
      
      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bgGradient)"/>
      
      <!-- Music notes background -->
      ${musicNotesMarkup}
      
      <!-- Twitter handle watermark (centered) -->
      <text x="600" y="340" 
            font-family="'Helvetica Neue', Arial, sans-serif" 
            font-size="120" 
            font-weight="900"
            fill="${themeConfig.textColor}" 
            text-anchor="middle"
            opacity="0.15">
        @tsongslyrics
      </text>
      
      <!-- Top Emoji -->
      <text x="600" y="80" font-size="60" text-anchor="middle" opacity="0.3">
        ${themeConfig.emoji}
      </text>
      
      <!-- Lyrics -->
      ${lyricsLines}
      
      <!-- Artist -->
      <text x="600" y="${artistY}" 
            font-family="Georgia, serif" 
            font-size="32" 
            font-weight="600"
            fill="${themeConfig.artistColor}" 
            text-anchor="middle"
            style="text-shadow: 1px 1px 3px rgba(0,0,0,0.3)">
        ${escapeXml(artist)}
      </text>
      
      <!-- Branding -->
      <text x="600" y="${brandY}" 
            font-family="Arial, sans-serif" 
            font-size="24" 
            font-weight="500"
            fill="${themeConfig.textColor}" 
            text-anchor="middle"
            opacity="0.9">
        tsonglyrics.com | @tsongslyrics
      </text>
      
      <!-- Bottom Emoji -->
      <text x="600" y="610" font-size="60" text-anchor="middle" opacity="0.3">
        ${themeConfig.emoji}
      </text>
    </svg>
  `;
  
  return svg;
}

/**
 * Escape XML special characters
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate OG image as PNG buffer
 * @param {string} lyrics - Lyric text (can include <br> tags)
 * @param {string} artist - Artist name
 * @param {string} theme - Theme name (gradient, romantic, mass, dark)
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateOGImage(lyrics, artist, theme = 'gradient') {
  // Clean lyrics - remove HTML tags
  const cleanLyrics = lyrics
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
  
  // Create SVG
  const svg = createLyricsSVG(cleanLyrics, artist, theme);
  
  // Convert SVG to PNG using Sharp
  try {
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    
    return pngBuffer;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

/**
 * Generate OG image filename from content
 */
function generateImageFilename(songData, lyrics, artist, theme) {
  const hash = require('crypto')
    .createHash('md5')
    .update(`${lyrics}-${artist}-${theme}`)
    .digest('hex')
    .substring(0, 12);
  
  return `og-lyrics-${songData.slug}-${theme}-${hash}.png`;
}

module.exports = {
  generateOGImage,
  generateImageFilename,
  THEMES
};
