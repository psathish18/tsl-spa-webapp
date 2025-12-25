# Google AdSense Integration Guide

## Overview

Google AdSense is fully integrated into the Tamil Song Lyrics app with strategic ad placements for maximum revenue while maintaining excellent user experience.

## Current Implementation

### Ad Placements

**Home Page (`/`):**
1. **Sidebar Ad** - Right sidebar, above "Popular Songs" section
   - Slot ID: `sidebar-1`
   - Format: Auto (responsive)
   - Position: High visibility area

2. **Bottom Banner Ad** - Bottom of page, before footer
   - Slot ID: `bottom-banner-1`
   - Format: Auto (responsive)
   - Position: After all song listings

**Song Details Pages (`/[slug].html`):**
- Currently no ads to maintain reading experience
- Can add in-content ads between stanzas if needed

### Technical Implementation

**Components:**
- `components/GoogleAdsense.tsx` - Contains `AdBanner` component for displaying ads
- Auto-responsive ads that adapt to screen size
- Lazy loading for better performance

**Script Loading:**
- AdSense script loaded in `app/layout.tsx` head
- Async loading to prevent blocking page render
- Only loads if `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is configured

## Setup Instructions

### Step 1: Get Your AdSense Publisher ID

1. Sign up for [Google AdSense](https://www.google.com/adsense/)
2. Complete account setup and verification
3. Get your **Publisher ID** (format: `ca-pub-XXXXXXXXXXXXXXXX`)

### Step 2: Configure Environment Variables

**Local Development (`.env.local`):**
```bash
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-your-actual-publisher-id
```

**Production (Vercel):**
1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add: `NEXT_PUBLIC_ADSENSE_CLIENT_ID` = `ca-pub-your-actual-publisher-id`
4. Apply to: Production, Preview, Development
5. Redeploy

### Step 3: Create Ad Units in AdSense Dashboard

**For each ad slot, create an ad unit:**

1. **Sidebar Ad:**
   - Name: `TSL - Home Sidebar`
   - Type: Display ads
   - Size: Responsive
   - Ad unit code: Copy the `data-ad-slot` value

2. **Bottom Banner:**
   - Name: `TSL - Home Bottom Banner`
   - Type: Display ads
   - Size: Responsive
   - Ad unit code: Copy the `data-ad-slot` value

### Step 4: Update Ad Slot IDs

Replace placeholder slot IDs with actual AdSense ad unit IDs:

**In `app/page.tsx`:**
```tsx
// Replace "sidebar-1" with actual slot ID
<AdBanner 
  slot="1234567890"  // Your actual AdSense ad unit ID
  className="mb-6"
/>

// Replace "bottom-banner-1" with actual slot ID
<AdBanner 
  slot="9876543210"  // Your actual AdSense ad unit ID
  className=""
/>
```

### Step 5: Test Integration

**Development Testing:**
```bash
# Set test mode in .env.local
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-test

# Run dev server
npm run dev

# Check browser console for AdSense errors
```

**Production Testing:**
1. Deploy to Vercel
2. Visit your site
3. Check if ads appear (may take 24-48 hours for new accounts)
4. Verify in AdSense dashboard under "Sites" → "Pages"

### Step 6: Verify Ads.txt

Create/update `public/ads.txt`:
```txt
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

Replace `pub-XXXXXXXXXXXXXXXX` with your publisher ID.

## Ad Configuration

### Current Ad Settings

```tsx
<ins
  className="adsbygoogle"
  style={{ display: 'block' }}
  data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
  data-ad-slot={slot}
  data-ad-format="auto"              // Responsive ads
  data-full-width-responsive="true"  // Full-width on mobile
/>
```

### Customization Options

**Change Ad Format:**
```tsx
// Fixed size
data-ad-format="rectangle"
data-ad-width="300"
data-ad-height="250"

// Or keep responsive
data-ad-format="auto"
data-full-width-responsive="true"
```

**Add More Ad Units:**

1. Create new ad unit in AdSense dashboard
2. Add to appropriate page:

```tsx
import { AdBanner } from '@/components/GoogleAdsense'

// In your component
<AdBanner 
  slot="your-new-slot-id" 
  className="my-8"
/>
```

## Ad Placement Strategy

### Current Strategy (Minimal Ads)

✅ **User Experience First:**
- Only 2 ads on home page
- No ads interrupting lyrics reading
- Strategic placement for visibility without annoyance

✅ **Revenue Optimization:**
- Sidebar ad: High viewability (always visible while scrolling)
- Bottom banner: Captures users after browsing songs

### Optional Placements (If Revenue Needs Increase)

**Home Page:**
- Top banner (above hero)
- Between song cards (every 10 songs)
- Right sidebar (additional unit)

**Song Details Pages:**
- Between stanzas (every 3-4 stanzas)
- Below lyrics, before related songs
- Sidebar (if layout changes)

**Implementation:**
```tsx
// Between song cards
{songs.map((song, index) => (
  <>
    <SongCard song={song} />
    {(index + 1) % 10 === 0 && (
      <AdBanner slot="in-feed-ad" className="my-8" />
    )}
  </>
))}
```

## Performance Considerations

### Current Optimizations

1. **Async Script Loading** - AdSense script loads asynchronously
2. **Lazy Initialization** - Ads initialize only when component mounts
3. **No Layout Shift** - Ad containers have proper sizing
4. **Error Handling** - Graceful degradation if AdSense fails

### Monitoring Performance

**Check these metrics:**
- Page Load Time: Should stay < 3s
- Cumulative Layout Shift (CLS): Should be < 0.1
- First Contentful Paint (FCP): Should be < 1.8s

**Tools:**
- Vercel Analytics (already integrated)
- Google PageSpeed Insights
- Vercel Speed Insights (already integrated)

## Troubleshooting

### Ads Not Showing

**Check:**
1. ✅ `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is set correctly
2. ✅ Ad slot IDs match AdSense dashboard
3. ✅ Site is verified in AdSense account
4. ✅ Wait 24-48 hours for new accounts
5. ✅ Check browser console for errors
6. ✅ Disable ad blockers during testing

**Common Errors:**

**Error: "AdSense code could not be loaded"**
```
Solution: Check network tab, verify client ID is correct
```

**Error: "Ad unit not found"**
```
Solution: Verify slot ID matches AdSense dashboard
```

**Error: "No ads to show"**
```
Solution: Normal in dev, check production after 48 hours
```

### Ad Blockers

**Detection:**
```tsx
// Add to components/AdBanner.tsx
useEffect(() => {
  const timer = setTimeout(() => {
    const adBlock = document.querySelector('.adsbygoogle')
    if (adBlock && adBlock.innerHTML.length === 0) {
      console.log('Ad blocker detected')
      // Show alternative content
    }
  }, 2000)
  return () => clearTimeout(timer)
}, [])
```

### Low Revenue

**Optimization Tips:**
1. **Increase traffic** - Focus on SEO (already optimized)
2. **Strategic placement** - Test different positions
3. **Ad density** - Add more units (carefully)
4. **Content quality** - Keep lyrics accurate and complete
5. **User engagement** - Improve return visitor rate

## AdSense Policies

### Must Follow

✅ **Content:**
- Original lyrics content
- Proper attribution to lyricists/composers
- No copyright violations

✅ **Placement:**
- Clear separation from content
- No accidental clicks
- Visible ad labels

✅ **User Experience:**
- No pop-ups or overlays
- No excessive ads
- Mobile-friendly

❌ **Don't:**
- Ask users to click ads
- Place ads on empty pages
- Hide or obstruct ads
- Use deceptive labels

## Revenue Tracking

### AdSense Dashboard

**Monitor:**
- Daily earnings
- Page RPM (Revenue per 1000 impressions)
- Click-through rate (CTR)
- Ad impressions
- Active view %

### Expected Revenue (Estimates)

Based on 1,000 daily visitors:
- **Conservative**: $5-10/day
- **Average**: $15-25/day
- **Optimized**: $30-50/day

**Factors affecting revenue:**
- Traffic quality (organic search = higher)
- User location (US/UK/Canada = higher)
- Content niche (entertainment = medium)
- Ad placement optimization
- Seasonal trends

## Best Practices

### Do's

✅ Create high-quality, engaging content
✅ Focus on SEO to increase organic traffic
✅ Monitor AdSense reports regularly
✅ Test different ad placements (A/B testing)
✅ Maintain fast page load times
✅ Keep content updated and accurate

### Don'ts

❌ Click your own ads (account suspension risk)
❌ Ask others to click ads
❌ Place too many ads (hurts UX)
❌ Hide ads or make them hard to see
❌ Use deceptive practices
❌ Violate AdSense program policies

## Future Enhancements

### Planned Improvements

1. **Auto Ads** - Let Google optimize placement
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXX"
     data-overlays="bottom"
     data-ad-frequency-hint="30s">
   </script>
   ```

2. **Ad Density Based on Traffic**
   - Show more ads for high-traffic pages
   - Maintain minimal ads for new visitors

3. **A/B Testing**
   - Test different ad positions
   - Measure impact on revenue and UX

4. **Video Ads** (Future)
   - If adding music videos or song snippets

## Related Files

```
components/
  ├── GoogleAdsense.tsx          # AdBanner component
  
app/
  ├── layout.tsx                 # AdSense script loading
  ├── page.tsx                   # Home page with 2 ad units
  └── [slug]/page.tsx            # Song pages (no ads currently)

public/
  └── ads.txt                    # AdSense verification (create this)

.env.local
  └── NEXT_PUBLIC_ADSENSE_CLIENT_ID

```

## Support

**Resources:**
- [Google AdSense Help Center](https://support.google.com/adsense)
- [AdSense Policies](https://support.google.com/adsense/answer/48182)
- [Optimization Tips](https://support.google.com/adsense/answer/9183460)

**Need Help?**
- Check AdSense dashboard for policy violations
- Review site status in AdSense account
- Contact AdSense support for technical issues

---

**Last Updated**: December 25, 2025  
**Integration Status**: ✅ Complete - Pending AdSense Account Approval
