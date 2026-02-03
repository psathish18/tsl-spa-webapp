# Social Media Agent Instructions

## Purpose
Generate shareable social media posts from Tamil song lyrics JSON data for Twitter and WhatsApp.

## Input Format
Process JSON files from `public/songs/` directory with the following structure:
- `title`: Song title
- `tamilStanzas`: Array of Tamil lyrics (each stanza contains multiple lines separated by `<br />`)
- `category`: Array of tags/categories
- `slug`: URL slug for the song

## Output Format

### Lyrics Snippets
1. **Split lyrics by stanzas**: Each stanza in `tamilStanzas` array is a separate group
2. **Format each snippet**:
   - Remove HTML tags (`<br />`, `</br>`, etc.)
   - Preserve line breaks as actual newlines for readability
   - Add star emoji (⭐) at the beginning and end
   - Add hashtags from category tags after a colon
   - Add song URL
   - Add "via @tsongslyrics" attribution

### Snippet Structure
```
⭐[Tamil lyrics with line breaks]⭐

#[Hashtag1] #[Hashtag2] #[Hashtag3] ...
[Song URL] via @tsongslyrics
```

### Hashtag Generation
- Extract from `category` array
- Format: Remove prefixes like "Lyrics:", "Movie:", "Singer:", "Song:"
- Replace spaces with nothing (no spaces in hashtags)
- Sort alphabetically

### Deep Links

#### Twitter Share Link
```
https://twitter.com/intent/tweet?text=[URL_ENCODED_SNIPPET]
```

#### WhatsApp Share Link (Mobile-friendly)
```
https://wa.me/?text=[URL_ENCODED_SNIPPET]
```

## Processing Rules

1. **Line Break Preservation**:
   - Split by `<br />` or `<br>` or `</br>` tags
   - Join with actual newline characters (`\n`)
   - Maintain readability in shared posts

2. **Hashtag Processing**:
   - Extract category values
   - Remove category type prefixes
   - Convert to hashtags (prepend #)
   - Sort alphabetically
   - Join with spaces

3. **URL Generation**:
   - Base URL: `http://localhost:3000/` (or production URL)
   - Append the `slug` field
   - Ensure proper encoding in share links

4. **Star Emoji Placement**:
   - Add ⭐ at the start of lyrics
   - Add ⭐ at the end of lyrics
   - No extra spaces around emojis

## Example Output

For a stanza like:
```
ஒரு பேரே வரலாறு<br />
அழிச்சாலும் அழியாது<br />
அவன்தானே ஜனநாயகன்
```

With categories: `["Lyrics:Vivek", "Movie:Jana Nayagan", "Singer:Anirudh"]`

Generate:
```
⭐ஒரு பேரே வரலாறு
அழிச்சாலும் அழியாது
அவன்தானே ஜனநாயகன்⭐

#Anirudh #JanaNayagan #Vivek
http://localhost:3000/oru-pere-varalaaru-lyrics-in-tamil-jana-nayagan via @tsongslyrics
```

## Analytics Tracking
Include Google Analytics event tracking for shares:
```javascript
gtag("event", "share", {
  method: "WhatsApp", // or "Twitter"
  content_type: "text",
  item_id: postUrl,
  value: clearText,
  hash_tags: hashLists.join(" "),
  item_cat: item_cat
});
```

## Output Format
For each song JSON file, generate:
1. Array of snippet objects with:
   - `text`: Formatted snippet text
   - `twitterLink`: Twitter share deep link
   - `whatsappLink`: WhatsApp share deep link
   - `hashtags`: Array of hashtags
   - `stanzaIndex`: Index of the stanza (for reference)

## Usage
This agent should:
1. Read the song JSON file
2. Process each Tamil stanza
3. Generate formatted snippets with share links
4. Output the complete list of shareable posts
