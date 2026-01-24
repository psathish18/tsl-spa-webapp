# Generate Song JSON Workflow

## Overview
This GitHub Actions workflow automatically generates song JSON files when a new issue is created with a specific title pattern.

## Trigger
The workflow is triggered when a new issue is **opened** in the repository.

## Supported Scenarios

### Scenario 1: Generate JSON for Recent Songs
**Issue Title Format:** `generate json for recent X song` (where X is a number)

**Examples:**
- `generate json for recent 5 song` → runs `npm run generate-song-json -- --limit=5`
- `generate json for recent 10 song` → runs `npm run generate-song-json -- --limit=10`
- `generate json for recent 3 song` → runs `npm run generate-song-json -- --limit=3`

**What it does:**
- Fetches the X most recent songs from the Blogger API
- Generates JSON files for each song
- Saves them in the `blob-data/` directory

### Scenario 2: Generate JSON for Specific Category
**Issue Title Format:** `generate json for category CategoryName`

**Examples:**
- `generate json for category Song:Coolie` → runs `npm run generate-song-json -- --category="Song:Coolie"`
- `generate json for category Movie:Kanguva` → runs `npm run generate-song-json -- --category="Movie:Kanguva"`
- `generate json for category Singer:ARRahman` → runs `npm run generate-song-json -- --category="Singer:ARRahman"`

**What it does:**
- Fetches all songs from the Blogger API matching the specified category
- Generates JSON files for each song in that category
- Saves them in the `blob-data/` directory

## Workflow Steps

1. **Checkout repository** - Clones the repository code
2. **Setup Node.js** - Installs Node.js v20 with npm caching
3. **Install dependencies** - Runs `npm ci` to install all dependencies
4. **Parse issue title and run script** - Extracts parameters from the issue title and runs the appropriate command
5. **Commit and push generated files** - Commits the generated JSON files to the repository
6. **Add comment to issue** - Posts a success/failure comment on the issue
7. **Close issue** - Automatically closes the issue after completion

## How to Use

### Option 1: Generate Recent Songs
1. Go to the Issues tab in the GitHub repository
2. Click "New Issue"
3. Enter title: `generate json for recent 5 song` (adjust the number as needed)
4. Click "Submit new issue"
5. The workflow will automatically run and generate JSON files

### Option 2: Generate Category Songs
1. Go to the Issues tab in the GitHub repository
2. Click "New Issue"
3. Enter title: `generate json for category Song:Coolie` (adjust the category name as needed)
4. Click "Submit new issue"
5. The workflow will automatically run and generate JSON files

## Workflow Outputs

- **Generated Files:** JSON files in `blob-data/` directory
- **Git Commit:** Automatically committed with message: `chore: generate song JSON files (triggered by issue #X)`
- **Issue Comment:** Success/failure message posted on the issue
- **Issue Status:** Automatically closed after completion

## Troubleshooting

### Issue title doesn't match expected pattern
If the issue title doesn't match one of the expected patterns, the workflow will fail with an error message explaining the correct formats.

### Workflow doesn't trigger
- Ensure the issue title matches one of the expected patterns exactly
- Check the Actions tab to see if the workflow ran
- Verify that GitHub Actions is enabled for the repository

### No files generated
- Check the workflow logs in the Actions tab
- Verify the Blogger API is accessible
- Ensure the category name is correct (case-sensitive)

## Technical Details

### Workflow File Location
`.github/workflows/generate-song-json-on-issue.yml`

### Required Permissions
The workflow requires the following permissions:
- `contents: write` - To commit and push generated files
- `issues: write` - To comment on and close issues

### Environment
- **Runner:** Ubuntu Latest
- **Node.js Version:** 20.x
- **Package Manager:** npm

## Related Scripts

- `scripts/generate-song-json.ts` - The main script that generates JSON files
- `lib/lyricsUtils.ts` - Utility functions for lyrics processing
- `lib/seoUtils.ts` - Utility functions for SEO metadata
- `lib/slugUtils.ts` - Utility functions for URL slug generation
