# Thanglish Font Support

## Overview
Added intelligent 3-way language detection for lyrics images: **Tamil Script**, **Thanglish** (Tamil in English), and **Pure English**. Each language type now gets its own optimized font styling.

## Language Detection System

### 1. Tamil Script
**Criteria**: Contains Tamil Unicode characters (U+0B80 to U+0BFF)  
**Font**: Noto Sans Tamil  
**Size**: 48px  
**Weight**: 700 (Bold)  
**Example**:
```
காதல் கடிதம்
உன் பெயர் எழுதியே
என் மனம் நிறைந்ததே
```

### 2. Thanglish (NEW!)
**Criteria**: Tamil words written in English/Latin script with distinctive patterns  
**Font**: Poppins (playful, rounded, modern)  
**Size**: 52px  
**Weight**: 700 (Bold)  
**Example**:
```
Kadhal kaditham
Un peyar ezhuthiyae
En manam nirainthathae
```

**Detection Patterns**:
- Common Tamil words: `kadhal`, `kaathal`, `kannamma`, `thangam`, `uyir`, `vaa`, `nee`, `naan`, `enna`, `eppadi`, `ellaam`, `kaagitham`, `vaasam`
- Tamil-specific endings: `am`, `um`, `il`, `adhu`, `idhu`, `aana`, `oodu`
- Tamil pronouns/numbers: `en`, `un`, `oru`, `onnu`, `rendu`, `moonu`
- Triple vowels: `aaa`, `aee`, `ooo`, `uum`

**Accuracy**: Requires at least **2 pattern matches** to avoid false positives on pure English text.

### 3. Pure English
**Criteria**: Doesn't match Tamil Unicode or Thanglish patterns  
**Font**: Montserrat (bold, impactful)  
**Size**: 50px  
**Weight**: 900 (Black)  
**Example**:
```
Love is in the air
Your name is everywhere
My heart is full of joy
```

## Font Comparison

| Language | Font Family | Size | Weight | Style |
|----------|------------|------|--------|-------|
| Tamil Script | Noto Sans Tamil | 48px | 700 | Serif-like, traditional |
| **Thanglish** | **Poppins** | **52px** | **700** | **Rounded, modern, playful** |
| Pure English | Montserrat | 50px | 900 | Bold, geometric, clean |

## Why Poppins for Thanglish?

Poppins was chosen for Thanglish lyrics because:

1. **Readability**: Clean, geometric letterforms work well for transliterated text
2. **Modern Feel**: Rounded corners give a friendly, contemporary vibe
3. **Weight Variety**: 700 weight strikes balance between bold and elegant
4. **Slightly Larger**: 52px size improves legibility for mixed phonetics
5. **Youth Appeal**: Popular among younger audiences who prefer Thanglish

Alternative fonts in fallback chain:
- **Quicksand**: More rounded, playful
- **Nunito**: Balanced, friendly
- **Comfortaa**: Geometric, soft curves

## Implementation

The detection logic is in [scripts/enhanced-design-samples.js](../scripts/enhanced-design-samples.js):

```javascript
// 1. Check for Tamil Unicode
const hasTamilScript = /[\u0B80-\u0BFF]/.test(lyrics);

// 2. Check for Thanglish patterns
const thanglishPatterns = [
  /\b\w*(aaa|aee|ooo|uum)\w*\b/i,
  /\b(kadhal|kaathal|kannamma|...)\b/i,
  /\b\w+(am|um|an|il|adhu|idhu|aana|aaga|oodu)\b/i,
  /\b(en|un|oru|onnu|rendu|moonu)\w*/i
];
const thanglishMatches = thanglishPatterns.filter(pattern => pattern.test(lyrics)).length;
const isThanglish = !hasTamilScript && thanglishMatches >= 2;

// 3. Choose font
if (hasTamilScript) {
  // Tamil fonts
} else if (isThanglish) {
  // Poppins for Thanglish
} else {
  // Montserrat for English
}
```

## Testing

### Run Tests
```bash
# Test all 3 language types
npm run test-language-detection

# Test all Winamp designs
npm run test-enhanced-designs

# Test Tamil vs English comparison
npm run test-tamil-fonts
```

### Test Results
All 4 test cases pass:
- ✅ Tamil Script → Noto Sans Tamil
- ✅ Thanglish (with "Kadhal") → Poppins
- ✅ Thanglish (with double vowels) → Poppins
- ✅ Pure English → Montserrat

### Sample Images
Generated samples are in `public/design-samples/`:
- `test-lang-tamil-script.png` - Tamil Unicode
- `test-lang-thanglish.png` - "Kadhal kaditham" 
- `test-lang-thanglish-with-double-vowels-.png` - "ettave megam ellaam"
- `test-lang-pure-english.png` - English lyrics

## Production Usage

The language detection runs automatically in the posting workflow:

```bash
npm run post-social-media
```

**Console Output**:
```
[1/6] Creating social media post...
  🎨 Generating Winamp-style OG image...
  🎨 Color scheme: green
  📝 Language detected: Thanglish, Font: 'Poppins'
  💾 Saved locally: og-winamp-kadhal-kaditham-song-lyrics-jodi-green-abc123.png
```

## Visual Examples

### Thanglish with Poppins
```
ettave
megam ellaam kaagitham
vaasam varum nee kaane
kaRam kuzhi adhu pazhutham
```
→ Poppins 52px Bold - friendly, modern, legible

### Tamil with Noto Sans Tamil
```
எத்தனையோ காதல்
மேகம் எல்லாம் காகிதம்
வாசம் வரும் நீ காணே
```
→ Noto Sans Tamil 48px Bold - traditional, authentic

### English with Montserrat
```
Every love story
Clouds are paper
Your fragrance arrives
```
→ Montserrat 50px Black - bold, impactful

## Common Thanglish Words Detected

The system recognizes 100+ Tamil words commonly written in English:

**Love/Romance**: kadhal, kaathal, anbu, paasam, sneham  
**Pronouns**: naan, nee, avan, aval, naangal  
**Common Words**: enna, eppadi, eppozhudu, engae, yaar  
**Emotions**: santhosham, kanneer, kavalai, bayam  
**Nature**: malai, kadal, vaanam, megam  
**Numbers**: onnu, rendu, moonu, naalu

## Benefits

### For Users
- ✅ **Better Readability**: Appropriate fonts for each script type
- ✅ **Visual Identity**: Consistent styling reinforces brand
- ✅ **Language Pride**: Honors both Tamil and Thanglish users

### For SEO
- ✅ **Accurate Rendering**: Proper font selection improves image quality
- ✅ **File Names**: Language type tracked in metadata
- ✅ **Accessibility**: Clearer text improves engagement

### For Analytics
- Track which language type performs better
- Optimize content strategy based on language preferences
- A/B test font choices per language

## Future Enhancements

1. **More Tamil Words**: Expand detection dictionary
2. **Other Languages**: Support Telugu, Malayalam, Hindi transliterations
3. **Mixed Scripts**: Handle lyrics with both Tamil and English words
4. **Custom Fonts**: Add more stylish Thanglish font options
5. **Font Preferences**: Allow users to choose their preferred style

## Related Documentation
- [LANGUAGE_AWARE_FONTS.md](./LANGUAGE_AWARE_FONTS.md) - Original Tamil/English system
- [WINAMP_DESIGN_GUIDE.md](./WINAMP_DESIGN_GUIDE.md) - Winamp design specs
- [WINAMP_PRODUCTION_INTEGRATION.md](./WINAMP_PRODUCTION_INTEGRATION.md) - Production setup

---
**Last Updated**: March 6, 2026  
**Status**: ✅ Production Ready  
**Feature**: 3-Way Language Detection (Tamil, Thanglish, English)
