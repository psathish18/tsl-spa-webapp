# Workflow Examples and Testing

## Quick Reference

### Example Issue Titles and Expected Behavior

#### Scenario 1: Generate JSON for Recent Songs

| Issue Title | Command Executed | Notes |
|-------------|------------------|-------|
| `generate json for recent 5 song` | `npm run generate-song-json -- --limit=5` | Basic format |
| `Generate JSON for recent 10 song` | `npm run generate-song-json -- --limit=10` | Case insensitive |
| `GENERATE JSON FOR RECENT 3 SONG` | `npm run generate-song-json -- --limit=3` | All caps works |
| `generate json for recent song` | `npm run generate-song-json -- --limit=5` | No number defaults to 5 |

#### Scenario 2: Generate JSON for Category

| Issue Title | Command Executed | Notes |
|-------------|------------------|-------|
| `generate json for category Song:Coolie` | `npm run generate-song-json -- --category="Song:Coolie"` | Basic format |
| `Generate JSON for category Movie:Kanguva` | `npm run generate-song-json -- --category="Movie:Kanguva"` | Case insensitive |
| `GENERATE JSON FOR CATEGORY Singer:ARRahman` | `npm run generate-song-json -- --category="Singer:ARRahman"` | All caps works |
| `generate json for category Test:Category With Spaces` | `npm run generate-song-json -- --category="Test:Category With Spaces"` | Supports spaces |

## Testing the Workflow

### Method 1: Create a Test Issue (Recommended)

1. Go to your repository on GitHub
2. Navigate to **Issues** tab
3. Click **New Issue**
4. Enter one of the example titles above
5. Click **Submit new issue**
6. Watch the **Actions** tab to see the workflow run

### Method 2: Simulate Locally

Run this test script to verify pattern matching works correctly:

```bash
# Create test script
cat > /tmp/test-patterns.sh << 'EOF'
#!/bin/bash

# Test different issue titles
titles=(
  "generate json for recent 5 song"
  "GENERATE JSON FOR RECENT 3 SONG"
  "generate json for category Song:Coolie"
  "generate json for category Movie:Test With Spaces"
)

for title in "${titles[@]}"; do
  echo "Testing: $title"
  
  if echo "$title" | grep -iq "generate json for recent.*song"; then
    LIMIT=$(echo "$title" | grep -io "recent [0-9]*" | grep -o "[0-9]\+" || echo "")
    [ -z "$LIMIT" ] && LIMIT=5
    echo "  → npm run generate-song-json -- --limit=$LIMIT"
    
  elif echo "$title" | grep -iq "generate json for category"; then
    CATEGORY=$(echo "$title" | grep -io "category .*" | cut -d' ' -f2- | xargs)
    echo "  → npm run generate-song-json -- --category=\"$CATEGORY\""
  fi
  echo
done
EOF

chmod +x /tmp/test-patterns.sh
/tmp/test-patterns.sh
```

## Workflow Behavior

### Success Flow
1. Issue is created with matching title
2. Workflow is triggered
3. Dependencies are installed
4. Script runs and generates JSON files
5. Files are committed and pushed to `blob-data/` directory
6. Success comment is posted on the issue
7. Issue is automatically closed

### Failure Flow
1. Issue is created with matching title
2. Workflow is triggered
3. Script fails during execution
4. Error comment is posted on the issue
5. Issue is automatically closed
6. Check workflow logs for details

### Invalid Title Flow
1. Issue is created with non-matching title
2. Workflow is triggered
3. Script exits with error (no matching pattern)
4. Error comment is posted on the issue
5. Issue is automatically closed

## Monitoring

### Check Workflow Status
1. Go to repository **Actions** tab
2. Look for "Generate Song JSON from Issue" workflow
3. Click on a specific run to see details
4. View logs for each step

### Check Generated Files
1. Navigate to `blob-data/` directory
2. Look for newly created/updated `.json` files
3. Check commit history for automatic commits

## Troubleshooting

### Workflow doesn't trigger
- Verify the issue title matches expected patterns
- Check that GitHub Actions is enabled
- Check workflow permissions

### Script fails
- Check workflow logs for error messages
- Verify Blogger API is accessible
- Verify category name is correct

### No files committed
- Script may have generated no new files
- Files may already exist (no changes to commit)
- Check workflow logs for "No changes to commit"

## Integration with Existing System

### Blogger Post Flow
1. Post new lyrics to `tsonglyricsapp.blogspot.com`
2. Create GitHub issue: `generate json for recent 5 song`
3. Workflow automatically generates JSON files
4. Files are committed to repository
5. Vercel automatically deploys with new content

### Category Update Flow
1. Add new songs to a category in Blogger
2. Create GitHub issue: `generate json for category Song:MovieName`
3. Workflow generates JSON for all songs in that category
4. Files are committed and deployed automatically

## Security Considerations

- Workflow uses GitHub Actions bot for commits
- Only repository collaborators can create issues
- Workflow has minimal permissions (contents: write, issues: write)
- No secrets or API keys exposed in workflow
- Generated files are safe JSON data

## Performance Considerations

- Recent songs (limit): Fast, processes only specified number
- Category filtering: Speed depends on category size
- Workflow includes rate limiting (500ms delay between requests)
- Large categories may take several minutes

## Future Enhancements

Potential improvements for this workflow:
- [ ] Add support for date range filtering
- [ ] Add support for multiple categories
- [ ] Add option to update existing files only
- [ ] Add summary statistics in issue comment
- [ ] Add option to skip related songs fetching
- [ ] Add option to skip Tamil lyrics fetching
