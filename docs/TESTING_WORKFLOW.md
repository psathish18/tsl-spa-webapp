# Testing the GitHub Actions Workflow

## How to Test Before Merging to Main

You can test this workflow directly on this PR branch! Here are the recommended testing approaches:

## Option 1: Test on PR Branch (Recommended) ⭐

**This is the safest way to test without affecting main branch.**

### Steps:
1. **Create a test issue on this PR branch:**
   - Go to your repository's **Issues** tab
   - Click **"New Issue"**
   - Enter title: `generate json for recent 3 song` (or any other pattern)
   - Add label `[TEST]` in the description to mark it as a test
   - Click **"Submit new issue"**

2. **Monitor the workflow:**
   - Go to **Actions** tab
   - Look for "Generate Song JSON from Issue" workflow
   - Click on the running workflow to see live logs
   - The workflow will run on the current branch (this PR branch)

3. **Verify the results:**
   - Check if workflow completed successfully
   - Look for the success comment on the issue
   - Go to **Files changed** tab in this PR to see new commits
   - Generated JSON files will appear in `blob-data/` directory

4. **Important Notes:**
   - The workflow runs on **whatever branch the issue is created from**
   - Since the workflow file is in this PR branch, it will use this branch's code
   - Files will be committed to this PR branch, not main
   - This is perfect for testing!

### Example Test Scenarios:

**Test 1: Recent Songs**
```
Issue Title: generate json for recent 3 song
Expected: Generates 3 recent song JSON files
```

**Test 2: Category**
```
Issue Title: generate json for category Song:Coolie
Expected: Generates all JSON files for Song:Coolie category
```

**Test 3: Edge Cases**
```
Issue Title: GENERATE JSON FOR RECENT 5 SONG
Expected: Case-insensitive matching works
```

## Option 2: Manual Local Testing

You can also test the underlying script locally without triggering the workflow:

### Steps:
1. **Clone this PR branch:**
   ```bash
   git fetch origin
   git checkout copilot/trigger-workflow-for-json-generation
   ```

2. **Install dependencies:**
   ```bash
   npm ci
   ```

3. **Test the script directly:**
   ```bash
   # Test Scenario 1: Recent songs
   npm run generate-song-json -- --limit=3
   
   # Test Scenario 2: Category
   npm run generate-song-json -- --category="Song:Coolie"
   ```

4. **Verify the output:**
   - Check `blob-data/` directory for generated JSON files
   - Verify file content and format

## Option 3: Test Pattern Matching

Test just the pattern matching logic without generating files:

```bash
# Create a test script
cat > /tmp/test-patterns.sh << 'EOF'
#!/bin/bash

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

## What Happens After Testing

### On PR Branch:
- ✅ Test issues are created and automatically closed
- ✅ Generated files are committed to PR branch
- ✅ You can review the files in "Files changed" tab
- ✅ No impact on main branch until you merge

### After Merging to Main:
- The workflow becomes active on main branch
- Future issues created will trigger the workflow on main
- Generated files will be committed directly to main

## Cleanup After Testing

If you create test issues for testing:
1. The workflow automatically closes them (no manual cleanup needed)
2. You can add `[TEST]` label in issue body to identify test issues
3. You can delete test commits before merging if desired (not required)

## Recommended Testing Checklist

Before merging to main, test these scenarios:

- [ ] Create issue: `generate json for recent 3 song`
  - Verify workflow runs successfully
  - Check 3 JSON files generated
  - Verify success comment posted
  - Verify issue auto-closed

- [ ] Create issue: `generate json for category Song:Coolie`
  - Verify workflow runs successfully
  - Check JSON files for category generated
  - Verify success comment with category name
  - Verify issue auto-closed

- [ ] Create issue: `invalid title format`
  - Verify workflow runs but shows error
  - Verify error comment posted
  - Verify issue auto-closed

- [ ] Check Actions tab for all workflow runs
  - All steps completed successfully
  - No unexpected errors in logs

## Troubleshooting

### Workflow doesn't appear in Actions tab
- Make sure GitHub Actions is enabled for the repository
- Check that the workflow file is in `.github/workflows/` directory
- Ensure the branch has the workflow file

### Workflow doesn't trigger on issue creation
- Verify the issue was created (not edited)
- Check that the workflow file exists in the branch where you created the issue
- Look for workflow run in Actions tab (it should appear within seconds)

### Script fails with errors
- Check workflow logs in Actions tab for detailed error messages
- Verify Blogger API is accessible
- Check that category name is correct (case-sensitive in Blogger)

## Summary

**✅ Best Approach**: Test directly on this PR branch by creating test issues. The workflow will run safely on the PR branch without affecting main, and you can review all generated files before merging.
