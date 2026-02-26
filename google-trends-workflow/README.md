# Google Trends Workflow for Tamil Song Lyrics

This folder contains all files and scripts related to the Google Trends workflow for identifying trending song searches and generating social media content.

## 📁 Folder Structure

```
google-trends-workflow/
├── README.md                       # This file
├── scripts/                        # Workflow scripts (numbered in execution order)
│   ├── 1-fetch-google-trends.ts   # Fetches trending keywords from Google Trends
│   ├── 2-filter-with-ai.ts        # Filters keywords using AI to match with songs
│   ├── 3-generate-social-posts.ts # Generates social media posts for filtered songs
│   └── 4-generate-lyrics-prompts.ts # Generates lyrics creation prompts for missing songs
├── data/                           # Input and intermediate data files
│   ├── trends-keywords.txt         # Raw trending keywords from Google Trends
│   ├── trends-keywords copy.txt    # Backup copy of trending keywords
│   ├── filtered-keywords.json      # AI-filtered keywords matched with songs
│   ├── filtered-keywords.txt       # Text version of filtered keywords
│   ├── missing-keywords.json       # Keywords that don't match any existing songs
│   └── missing-keywords.txt        # Text version of missing keywords
└── output/                         # Generated output files
    ├── social-posts.json           # Social media posts ready for publishing
    └── lyrics-prompts.json         # Prompts for creating missing song lyrics
```

## 🔄 Workflow Overview

The workflow consists of 4 sequential steps:

### Step 1: Fetch Google Trends (1-fetch-google-trends.ts)
- **Purpose**: Fetches trending search queries related to "lyrics" from Google Trends
- **Target Region**: India - Tamil Nadu (IN-TN)
- **Time Frames**: Last hour, 4 hours, day, or 7 days
- **Output**: `data/trends-keywords.txt`

### Step 2: Filter with AI (2-filter-with-ai.ts)
- **Purpose**: Uses AI to match trending keywords with existing songs in your database
- **Input**: `data/trends-keywords.txt`
- **Processing**:
  - Normalizes keywords for fuzzy matching
  - Matches keywords against existing song titles
  - Uses Gemini AI for intelligent matching
  - Ranks matches by relevance score
- **Output**:
  - `data/filtered-keywords.json` - Matched songs
  - `data/missing-keywords.json` - Keywords with no matching songs

### Step 3: Generate Social Posts (3-generate-social-posts.ts)
- **Purpose**: Creates SEO-optimized social media posts for matched songs
- **Input**: `data/filtered-keywords.json`
- **Features**:
  - Generates unique, engaging post descriptions using AI
  - Uses long-tail trending keywords for SEO
  - Includes hashtags from song categories
  - Rate-limited API calls to avoid quota issues
- **Output**: `output/social-posts.json`

### Step 4: Generate Lyrics Prompts (4-generate-lyrics-prompts.ts)
- **Purpose**: Creates prompts to help write lyrics for songs not yet in database
- **Input**: `data/missing-keywords.json`
- **Output**: `output/lyrics-prompts.json`

## 🚀 How to Run

### Prerequisites
```bash
# Ensure you have the required environment variables set
GOOGLE_AI_API_KEY=your_gemini_api_key
```

### Running Individual Scripts

From the project root directory:

```bash
# Step 1: Fetch trending keywords
npm run trends

# Step 2: Filter keywords with AI
npm run trends-ai

# Step 3: Generate social media posts
npm run generate-social

# Step 4: Generate lyrics prompts
npm run generate-lyrics-prompts
```

### Running Complete Workflow

To run the entire workflow sequentially:

```bash
npm run trends && npm run trends-ai && npm run generate-social && npm run generate-lyrics-prompts
```

## 📊 Data Files Explained

### trends-keywords.txt
- Raw output from Google Trends API
- Contains search queries that are trending in Tamil Nadu
- Related to the main keyword "lyrics"
- Updated each time Step 1 runs

### filtered-keywords.json
- Structured JSON with matched songs
- Format:
  ```json
  [
    {
      "keyword": "monica coolie lyrics",
      "frequency": 50,
      "songMatch": {
        "fileName": "monica-coolie-lyrics-tamil.json",
        "title": "Monica - Coolie",
        "matchScore": 0.95,
        "categories": ["Song:Monica - Coolie", "Coolie", "Anirudh"]
      }
    }
  ]
  ```

### missing-keywords.json
- Keywords that couldn't be matched to existing songs
- Opportunities to create new content
- Format:
  ```json
  [
    {
      "keyword": "new song lyrics tamil 2024",
      "frequency": 30,
      "reason": "No matching song found in database"
    }
  ]
  ```

### social-posts.json
- Ready-to-publish social media posts
- Format:
  ```json
  [
    {
      "keyword": "monica coolie lyrics",
      "title": "Monica - Coolie",
      "slug": "monica-coolie-lyrics-tamil",
      "url": "https://tsonglyrics.com/monica-coolie-lyrics-tamil",
      "description": "Get the trending Monica lyrics from Coolie movie...",
      "hashtags": ["#Coolie", "#Monica", "#AnirudhRavichander"],
      "categories": ["Song:Monica - Coolie", "Coolie", "Anirudh"]
    }
  ]
  ```

## 🎯 Use Cases

### 1. SEO Optimization
- Identify which songs are currently trending
- Create timely social media posts for trending content
- Improve search rankings by targeting trending keywords

### 2. Content Strategy
- Discover gaps in your content (missing keywords)
- Prioritize which songs to add based on trend data
- Generate ideas for new lyrics to create

### 3. Social Media Automation
- Use `social-posts.json` to automate Twitter/Facebook posts
- Schedule posts for trending songs at optimal times
- Track which keywords drive the most engagement

### 4. Analytics
- Track trending patterns over time
- Identify seasonal trends in song searches
- Measure the effectiveness of your content strategy

## 🔧 Configuration

### Modifying Search Parameters

Edit `scripts/1-fetch-google-trends.ts`:
```typescript
const searchKeyword: string = 'lyrics'; // Main search term
const geo: string = 'IN-TN';            // Geographic region
```

### Adjusting AI Model

Edit `scripts/2-filter-with-ai.ts` or `scripts/3-generate-social-posts.ts`:
```typescript
const GEMINI_MODEL = 'gemini-2.5-flash'; // AI model to use
```

### Rate Limiting

Adjust delays in scripts to avoid API quotas:
```typescript
const DELAY_BETWEEN_CALLS = 2000; // milliseconds
```

## 📈 Best Practices

1. **Run Regularly**: Execute the workflow daily or weekly to catch trends early
2. **Monitor Output**: Review `filtered-keywords.json` to verify match quality
3. **Act on Missing Keywords**: Use `missing-keywords.json` to plan new content
4. **Update Social Posts**: Publish content from `social-posts.json` promptly while trending
5. **Track Performance**: Monitor which trending keywords drive the most traffic

## 🔍 Troubleshooting

### Common Issues

**No trends found**
- Check if trends-keywords.txt has content
- Verify your internet connection
- Try different time frames (hour vs. day vs. 7days)

**AI filtering fails**
- Ensure GOOGLE_AI_API_KEY is set correctly
- Check API quota limits
- Verify input file `data/trends-keywords.txt` exists

**Too many missing keywords**
- May indicate songs database needs updating
- Consider adjusting the matching threshold in filter-with-ai.ts
- Review noise words filtering logic

## 🔗 Integration with Main App

The workflow outputs are designed to integrate with:
- **Homepage**: Display trending songs based on `filtered-keywords.json`
- **SEO Meta Tags**: Use trending keywords in page titles and descriptions
- **Social Media**: Automate posts using `social-posts.json`
- **Content Planning**: Prioritize song additions using `missing-keywords.json`

## 📝 Notes

- All scripts use TypeScript and require compilation or ts-node to run
- Scripts are optimized for Vercel Hobby Plan limits (minimal server-side processing)
- AI calls are rate-limited to avoid quota exhaustion
- The workflow is designed to run locally or in CI/CD pipelines

## 🎵 Example Workflow Result

Input (Google Trends):
```
monica coolie lyrics
unnakum ennakum song
vaa vaathi coming lyrics
```

After Filtering:
- ✅ Monica - Coolie (matched)
- ❌ Unnakum Ennakum (missing - add to database)
- ✅ Vaathi Coming (matched)

Generated Social Post:
```
🎵 Trending Now: Get Monica lyrics from Rajinikanth's Coolie! 
Composed by Anirudh Ravichander 🎼

#Coolie #Monica #AnirudhRavichander #TamilSongs
https://tsonglyrics.com/monica-coolie-lyrics-tamil
```

---

*Last Updated: February 2026*
