// Winamp-style Lyrics Image Generator
// Production-ready design with language-aware font rendering

/**
 * WINAMP OSCILLOSCOPE DESIGN
 * Classic Winamp-style with oscilloscope visualization and spectrum analyzer
 */
function createWinampSVG(lyrics, artist, colorScheme = 'green') {
  const lines = lyrics.split(/\r?\n/).slice(0, 4);
  const lineHeight = 65;
  const lyricsStartY = 200;
  
  // Detect language type
  // 1. Tamil Script - contains Tamil Unicode characters (U+0B80 to U+0BFF)
  const hasTamilScript = /[\u0B80-\u0BFF]/.test(lyrics);
  
  // 2. Thanglish detection - Tamil written in English/Latin script
  // Look for distinctive Tamil phonetic patterns not common in English
  const thanglishPatterns = [
    /\b\w*(aaa|aee|ooo|uum)\w*\b/i,  // Triple vowels or Tamil endings
    /\b(kadhal|kaathal|kannamma|thangam|uyir|vaa|nee|naan|enna|eppadi|ellaam|kaagitham|vaasam|pazhutham|ettave|megam)\b/i,  // Common Tamil words
    /\b\w+(am|um|an|il|adhu|idhu|aana|aaga|oodu)\b/i,  // Tamil-specific endings
    /\b(en|un|oru|onnu|rendu|moonu)\w*/i  // Tamil numbers/pronouns
  ];
  
  // Require at least 2 pattern matches to confirm Thanglish (reduces false positives)
  const thanglishMatches = thanglishPatterns.filter(pattern => pattern.test(lyrics)).length;
  const isThanglish = !hasTamilScript && thanglishMatches >= 2;
  
  // Font configuration based on language
  let fontConfig;
  if (hasTamilScript) {
    // Tamil script fonts
    fontConfig = {
      family: "'Noto Sans Tamil', 'Lohit Tamil', 'Mukta Malar', 'Tamil Sangam MN', Arial, sans-serif",
      size: 48,  // Slightly smaller for Tamil characters
      weight: 700,
      style: 'Tamil Script'
    };
  } else if (isThanglish) {
    // Thanglish fonts - playful, rounded, casual style
    fontConfig = {
      family: "'Poppins', 'Quicksand', 'Nunito', 'Comfortaa', sans-serif",
      size: 52,  // Slightly larger for better readability
      weight: 700,  // Bold but not too heavy
      style: 'Thanglish'
    };
  } else {
    // Pure English fonts - bold and impactful
    fontConfig = {
      family: "'Montserrat', 'Arial Black', 'Helvetica', sans-serif",
      size: 50,
      weight: 900,
      style: 'English'
    };
  }
  
  console.log(`  📝 Language detected: ${fontConfig.style}, Font: ${fontConfig.family.split(',')[0]}`);
  
  // Color schemes with perfect contrast (solid colors + gradients)
  const schemes = {
    // Solid color schemes (classic Winamp style)
    green: {
      type: 'solid',
      bg: '#00FF00',      // Lime green (classic Winamp)
      text: '#000000',    // Black text
      display: '#00CC00', // Darker green for display
      wave: '#003300'     // Dark green for oscilloscope
    },
    yellow: {
      type: 'solid',
      bg: '#FFFF00',      // Bright yellow
      text: '#000000',    // Black text
      display: '#FFD700', // Gold for display
      wave: '#666600'     // Dark yellow-brown for oscilloscope
    },
    cyan: {
      type: 'solid',
      bg: '#00FFFF',      // Cyan
      text: '#000000',    // Black text
      display: '#00CCCC', // Darker cyan for display
      wave: '#003333'     // Dark cyan for oscilloscope
    },
    orange: {
      type: 'solid',
      bg: '#FF6600',      // Orange
      text: '#FFFFFF',    // White text
      display: '#FF8833', // Lighter orange for display
      wave: '#330000'     // Dark red for oscilloscope
    },
    purple: {
      type: 'solid',
      bg: '#9900FF',      // Purple
      text: '#FFFFFF',    // White text
      display: '#BB33FF', // Lighter purple for display
      wave: '#220044'     // Dark purple for oscilloscope
    },
    classic: {
      type: 'solid',
      bg: '#0A0A0A',      // Almost black (classic Winamp dark)
      text: '#00FF00',    // Lime green text
      display: '#1A1A1A', // Slightly lighter black
      wave: '#00FF00'     // Lime green oscilloscope
    },
    // Gradient schemes (glassmorphism-inspired)
    'gradient-sunset': {
      type: 'gradient',
      gradient: ['#667eea', '#ff0080', '#ff6b35', '#ffd700'],
      text: '#ffffff',
      display: 'rgba(255,255,255,0.2)',
      wave: '#ffffff'
    },
    'gradient-ocean': {
      type: 'gradient',
      gradient: ['#0077be', '#00c9ff', '#0096c7', '#48cae4'],
      text: '#ffffff',
      display: 'rgba(255,255,255,0.2)',
      wave: '#ffffff'
    },
    'gradient-berry': {
      type: 'gradient',
      gradient: ['#d946ef', '#a855f7', '#ec4899', '#f472b6'],
      text: '#ffffff',
      display: 'rgba(255,255,255,0.2)',
      wave: '#ffffff'
    },
    'gradient-forest': {
      type: 'gradient',
      gradient: ['#059669', '#10b981', '#34d399', '#6ee7b7'],
      text: '#ffffff',
      display: 'rgba(255,255,255,0.2)',
      wave: '#ffffff'
    },
    'gradient-fire': {
      type: 'gradient',
      gradient: ['#dc2626', '#f97316', '#fbbf24', '#fef08a'],
      text: '#ffffff',
      display: 'rgba(255,255,255,0.2)',
      wave: '#ffffff'
    },
    'gradient-aurora': {
      type: 'gradient',
      gradient: ['#8b5cf6', '#06b6d4', '#10b981', '#d946ef'],
      text: '#ffffff',
      display: 'rgba(255,255,255,0.2)',
      wave: '#ffffff'
    }
  };
  
  const colors = schemes[colorScheme] || schemes.green;
  
  // Generate oscilloscope waveform (sinusoidal wave across top)
  const oscilloscopePoints = [];
  for (let x = 0; x <= 1200; x += 3) {
    // Create complex wave pattern (mix of frequencies)
    const y = 80 + 
      Math.sin(x * 0.02) * 15 + 
      Math.sin(x * 0.05) * 10 +
      Math.sin(x * 0.08) * 5 +
      Math.random() * 3; // Add slight noise for realism
    oscilloscopePoints.push(`${x},${y}`);
  }
  const oscilloscopePath = `M ${oscilloscopePoints.join(' L ')}`;
  
  // Generate spectrum analyzer bars with classic Winamp gradient (green → yellow → orange → red)
  const spectrumBarGradients = Array.from({length: 30}, (_, i) => `
    <linearGradient id="barGrad${i}" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color:#00FF00;stop-opacity:1" />
      <stop offset="40%" style="stop-color:#88FF00;stop-opacity:1" />
      <stop offset="60%" style="stop-color:#FFFF00;stop-opacity:1" />
      <stop offset="80%" style="stop-color:#FF8800;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FF0000;stop-opacity:1" />
    </linearGradient>
  `).join('');
  
  const spectrumBars = Array.from({length: 30}, (_, i) => {
    const x = 100 + (i * 35);
    const heights = [8, 12, 18, 24, 32, 28, 35, 40, 38, 42, 45, 40, 35, 30, 28, 25, 22, 20, 18, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5];
    const h = heights[i] * 1.5;
    const y = 580 - h;
    return `<rect x="${x}" y="${y}" width="25" height="${h}" fill="url(#barGrad${i})" rx="2"/>`;
  }).join('');
  
  // Build lyrics with language-appropriate font style
  const lyricsLines = lines.map((line, i) => `
    <!-- Shadow for depth -->
    <text x="602" y="${lyricsStartY + (i * lineHeight) + 2}" 
          font-family="${fontConfig.family}" 
          font-size="${fontConfig.size}" 
          font-weight="${fontConfig.weight}"
          fill="${colors.wave}" 
          text-anchor="middle"
          opacity="0.3">
      ${escapeXml(line)}
    </text>
    <!-- Main text with language-appropriate font -->
    <text x="600" y="${lyricsStartY + (i * lineHeight)}" 
          font-family="${fontConfig.family}" 
          font-size="${fontConfig.size}" 
          font-weight="${fontConfig.weight}"
          fill="${colors.text}" 
          text-anchor="middle">
      ${escapeXml(line)}
    </text>
  `).join('');
  
  // Generate background gradient definition if scheme type is gradient
  const bgGradientDef = colors.type === 'gradient' ? `
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      ${colors.gradient.map((color, i) => {
        const offset = (i / (colors.gradient.length - 1) * 100).toFixed(0);
        return `<stop offset="${offset}%" style="stop-color:${color};stop-opacity:1" />`;
      }).join('\n      ')}
    </linearGradient>
  ` : '';
  
  // Determine background fill based on scheme type
  const bgFill = colors.type === 'gradient' ? 'url(#bgGradient)' : colors.bg;
  
  // Generate random music notes in background
  const musicNotes = ['♪', '♫', '♬', '♩', '♭', '♮', '♯'];
  const notePositions = [
    { x: 80, y: 200, size: 70, rotate: -15 },
    { x: 1100, y: 250, size: 65, rotate: 25 },
    { x: 120, y: 480, size: 75, rotate: 10 },
    { x: 1050, y: 540, size: 70, rotate: -20 },
    { x: 90, y: 360, size: 60, rotate: 35 },
    { x: 1120, y: 400, size: 80, rotate: -10 }
  ];
  const musicNotesMarkup = notePositions.map((pos, i) => `
    <text x="${pos.x}" y="${pos.y}" 
          font-size="${pos.size}" 
          fill="${colors.text}" 
          opacity="0.30"
          transform="rotate(${pos.rotate} ${pos.x} ${pos.y})">
      ${musicNotes[i % musicNotes.length]}
    </text>
  `).join('');
  
  return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Pattern for digital display texture -->
        <pattern id="scanlines" x="0" y="0" width="100%" height="3" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="100%" height="1" fill="#000000" opacity="0.05"/>
        </pattern>
        
        <!-- Metal border gradient -->
        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#555555;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#999999;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#555555;stop-opacity:1" />
        </linearGradient>
        
        <!-- Background gradient (for gradient schemes) -->
        ${bgGradientDef}
        
        <!-- Classic Winamp spectrum analyzer bar gradients (green → yellow → red) -->
        ${spectrumBarGradients}
      </defs>
      
      <!-- Outer metal frame (Winamp style) -->
      <rect width="1200" height="630" fill="url(#metalGrad)"/>
      
      <!-- Inner display area -->
      <rect x="15" y="15" width="1170" height="600" fill="${bgFill}" rx="8"/>
      <rect x="15" y="15" width="1170" height="600" fill="url(#scanlines)"/>
      
      <!-- Music notes background -->
      ${musicNotesMarkup}
      
      <!-- Twitter handle watermark (centered) -->
      <text x="600" y="340" 
            font-family="'Courier New', 'Helvetica Neue', monospace" 
            font-size="100" 
            font-weight="900"
            fill="${colors.text}" 
            text-anchor="middle"
            opacity="0.12">
        @tsongslyrics
      </text>
      
      <!-- Top oscilloscope display area -->
      <rect x="50" y="30" width="1100" height="120" fill="${colors.display}" opacity="0.3" rx="5"/>
      
      <!-- Oscilloscope waveform -->
      <path d="${oscilloscopePath}" 
            stroke="${colors.wave}" 
            stroke-width="2" 
            fill="none"
            opacity="0.9"/>
      
      <!-- Digital time/indicator (top right - Winamp style) -->
      <text x="1100" y="65" 
            font-family="'Courier New', monospace" 
            font-size="32" 
            font-weight="bold"
            fill="${colors.text}" 
            text-anchor="end">
        ▶ 2:45
      </text>
      
      <!-- Lyrics area with display background -->
      <rect x="50" y="160" width="1100" height="300" fill="${colors.display}" opacity="0.2" rx="5"/>
      
      <!-- Lyrics -->
      ${lyricsLines}
      
      <!-- Artist name with display style -->
      <rect x="350" y="470" width="500" height="50" fill="${colors.display}" opacity="0.4" rx="8"/>
      <text x="600" y="505" 
            font-family="${fontConfig.family}" 
            font-size="${Math.floor(fontConfig.size * 0.56)}" 
            font-weight="700"
            fill="${colors.text}" 
            text-anchor="middle">
        ${escapeXml(artist)}
      </text>
      
      <!-- Bottom spectrum analyzer bars -->
      ${spectrumBars}
      
      <!-- Branding with modern font -->
      <text x="50" y="610" 
            font-family="'Inter', 'Segoe UI', Arial, sans-serif" 
            font-size="18" 
            font-weight="600"
            fill="${colors.text}">
        ● tsonglyrics.com | @tsongslyrics
      </text>
      
      <!-- Volume/EQ indicators (right side) -->
      <text x="1150" y="610" 
            font-family="'Inter', 'Segoe UI', Arial, sans-serif" 
            font-size="18" 
            font-weight="600"
            fill="${colors.text}" 
            text-anchor="end">
        ♪♫♪
      </text>
      
      <!-- LED-style corner dots (classic Winamp) -->
      <circle cx="30" cy="30" r="6" fill="${colors.text}" opacity="0.8"/>
      <circle cx="1170" cy="30" r="6" fill="${colors.text}" opacity="0.8"/>
      <circle cx="30" cy="600" r="6" fill="${colors.text}" opacity="0.8"/>
      <circle cx="1170" cy="600" r="6" fill="${colors.text}" opacity="0.8"/>
    </svg>
  `;
}

/**
 * GLASSMORPHISM DESIGN
 * Modern frosted glass effect with colorful gradient backgrounds
 */
function createGlassmorphismSVG(lyrics, artist, colorScheme = 'sunset') {
  const lines = lyrics.split(/\r?\n/).slice(0, 4);
  const lineHeight = 65;
  const lyricsStartY = 220;
  
  // Color scheme variations
  const schemes = {
    sunset: {
      gradient: ['#667eea', '#ff0080', '#ff6b35', '#ffd700'],
      circles: [
        { cx: 200, cy: 150, r: 120, fill: '#ffffff', opacity: 0.2 },
        { cx: 1000, cy: 400, r: 150, fill: '#ffffff', opacity: 0.15 },
        { cx: 600, cy: 500, r: 80, fill: '#ff0080', opacity: 0.2 }
      ]
    },
    ocean: {
      gradient: ['#0077be', '#00c9ff', '#0096c7', '#48cae4'],
      circles: [
        { cx: 200, cy: 150, r: 120, fill: '#ffffff', opacity: 0.25 },
        { cx: 1000, cy: 400, r: 150, fill: '#0077be', opacity: 0.2 },
        { cx: 600, cy: 500, r: 80, fill: '#00c9ff', opacity: 0.2 }
      ]
    },
    berry: {
      gradient: ['#d946ef', '#a855f7', '#ec4899', '#f472b6'],
      circles: [
        { cx: 200, cy: 150, r: 120, fill: '#ffffff', opacity: 0.2 },
        { cx: 1000, cy: 400, r: 150, fill: '#d946ef', opacity: 0.2 },
        { cx: 600, cy: 500, r: 80, fill: '#ec4899', opacity: 0.25 }
      ]
    },
    forest: {
      gradient: ['#059669', '#10b981', '#34d399', '#6ee7b7'],
      circles: [
        { cx: 200, cy: 150, r: 120, fill: '#ffffff', opacity: 0.2 },
        { cx: 1000, cy: 400, r: 150, fill: '#059669', opacity: 0.2 },
        { cx: 600, cy: 500, r: 80, fill: '#10b981', opacity: 0.2 }
      ]
    },
    fire: {
      gradient: ['#dc2626', '#f97316', '#fbbf24', '#fef08a'],
      circles: [
        { cx: 200, cy: 150, r: 120, fill: '#fef08a', opacity: 0.3 },
        { cx: 1000, cy: 400, r: 150, fill: '#f97316', opacity: 0.2 },
        { cx: 600, cy: 500, r: 80, fill: '#dc2626', opacity: 0.25 }
      ]
    },
    aurora: {
      gradient: ['#8b5cf6', '#06b6d4', '#10b981', '#d946ef'],
      circles: [
        { cx: 200, cy: 150, r: 120, fill: '#06b6d4', opacity: 0.25 },
        { cx: 1000, cy: 400, r: 150, fill: '#8b5cf6', opacity: 0.2 },
        { cx: 600, cy: 500, r: 80, fill: '#10b981', opacity: 0.2 }
      ]
    }
  };
  
  const colors = schemes[colorScheme] || schemes.sunset;
  
  const lyricsLines = lines.map((line, i) => `
    <text x="600" y="${lyricsStartY + (i * lineHeight)}" 
          font-family="'Inter', Arial, sans-serif" 
          font-size="48" 
          font-weight="700"
          fill="#ffffff" 
          text-anchor="middle"
          style="text-shadow: 1px 1px 2px rgba(0,0,0,0.3)">
      ${escapeXml(line)}
    </text>
  `).join('');
  
  // Generate floating circles dynamically
  const circlesMarkup = colors.circles.map(circle => 
    `<circle cx="${circle.cx}" cy="${circle.cy}" r="${circle.r}" fill="${circle.fill}" opacity="${circle.opacity}" filter="url(#blur)"/>`
  ).join('\n      ');
  
  // Generate random music notes in background
  const musicNotes = ['♪', '♫', '♬', '♩', '♭', '♮', '♯'];
  const notePositions = [
    { x: 150, y: 120, size: 90, rotate: -20 },
    { x: 1050, y: 150, size: 85, rotate: 25 },
    { x: 100, y: 500, size: 95, rotate: 15 },
    { x: 1100, y: 550, size: 80, rotate: -15 },
    { x: 250, y: 350, size: 70, rotate: 30 },
    { x: 950, y: 380, size: 75, rotate: -25 }
  ];
  const musicNotesMarkup = notePositions.map((pos, i) => `
    <text x="${pos.x}" y="${pos.y}" 
          font-size="${pos.size}" 
          fill="#ffffff" 
          opacity="0.30"
          transform="rotate(${pos.rotate} ${pos.x} ${pos.y})">
      ${musicNotes[i % musicNotes.length]}
    </text>
  `).join('');
  
  return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Colorful background gradient -->
        <linearGradient id="colorfulBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.gradient[0]};stop-opacity:1" />
          <stop offset="33%" style="stop-color:${colors.gradient[1]};stop-opacity:1" />
          <stop offset="66%" style="stop-color:${colors.gradient[2]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.gradient[3]};stop-opacity:1" />
        </linearGradient>
        
        <!-- Blur filter for glass effect -->
        <filter id="blur">
          <feGaussianBlur stdDeviation="10"/>
        </filter>
      </defs>
      
      <!-- Vibrant background -->
      <rect width="1200" height="630" fill="url(#colorfulBg)"/>
      
      <!-- Floating decorative circles (blurred) -->
      ${circlesMarkup}
      
      <!-- Music notes background -->
      ${musicNotesMarkup}
      
      <!-- Twitter handle watermark (centered) -->
      <text x="600" y="340" 
            font-family="'Inter', 'Helvetica Neue', Arial, sans-serif" 
            font-size="110" 
            font-weight="900"
            fill="#ffffff" 
            text-anchor="middle"
            opacity="0.15">
        @tsongslyrics
      </text>
      
      <!-- Glass card -->
      <rect x="150" y="120" width="900" height="390" 
            fill="#ffffff" 
            opacity="0.2" 
            rx="30"
            style="backdrop-filter: blur(10px);"/>
      
      <!-- Inner border for glass effect -->
      <rect x="150" y="120" width="900" height="390" 
            fill="none" 
            stroke="#ffffff" 
            stroke-width="2"
            opacity="0.3"
            rx="30"/>
      
      <!-- Lyrics -->
      ${lyricsLines}
      
      <!-- Artist -->
      <text x="600" y="460" 
            font-family="'Inter', Arial, sans-serif" 
            font-size="26" 
            font-weight="600"
            fill="#ffffff" 
            text-anchor="middle"
            opacity="0.9">
        ${escapeXml(artist)}
      </text>
      
      <!-- Branding -->
      <text x="600" y="580" 
            font-family="Arial, sans-serif" 
            font-size="20" 
            fill="#ffffff" 
            text-anchor="middle"
            opacity="0.8">
        tsonglyrics.com | @tsongslyrics
      </text>
    </svg>
  `;
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Export for production use
module.exports = {
  createWinampSVG,
  createGlassmorphismSVG
};
