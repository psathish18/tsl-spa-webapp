# Testing the GitHub Actions Workflow

## ⚠️ Important: GitHub Actions Limitation

**Issue-triggered workflows ONLY run from the default branch (main), not from PR branches.**

This is a GitHub security limitation. When you create an issue, GitHub will:
- Look for workflow files in the **main branch** (not PR branches)
- Run workflows found in main branch
- Use the workflow code from main branch

**This means:**
- ❌ Creating an issue while on a PR branch will NOT trigger the PR's workflow
- ✅ The workflow will only work after merging to main
- ✅ You can test the script logic locally before merging

## How to Test Before Merging to Main

Since issue-triggered workflows don't run from PR branches, here are your testing options:

## Option 1: Test Script Locally (Recommended) ⭐

**Test the actual script logic without triggering the workflow.**

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
   - This confirms the script works correctly

5. **Clean up test files** (optional):
   ```bash
   git checkout blob-data/
   ```

### Why this works:
- ✅ Tests the actual script that the workflow will run
- ✅ Same parameters that workflow will use
- ✅ Validates logic before merging
- ✅ No waiting for workflow to run

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

## Option 2: Test Pattern Matching Logic

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
    echo "  ✓ Would run: npm run generate-song-json -- --limit=$LIMIT"
    
  elif echo "$title" | grep -iq "generate json for category"; then
    CATEGORY=$(echo "$title" | grep -io "category .*" | cut -d' ' -f2- | xargs)
    echo "  ✓ Would run: npm run generate-song-json -- --category=\"$CATEGORY\""
  else
    echo "  ✗ No match - workflow would fail"
  fi
  echo
done
EOF

chmod +x /tmp/test-patterns.sh
/tmp/test-patterns.sh
```

### Why this works:
- ✅ Validates regex patterns work correctly
- ✅ Tests all scenarios quickly
- ✅ No API calls or file generation
- ✅ Confirms parameter extraction logic

## Option 3: Test After Merging to Main

**The most complete test, but requires merging first.**

### Steps:
1. **Merge this PR to main**
2. **Create a test issue:**
   - Go to **Issues** tab
   - Click **"New Issue"**
   - Title: `generate json for recent 3 song`
   - Add `[TEST]` in body
   - Submit issue

3. **Monitor workflow:**
   - Go to **Actions** tab
   - Look for "Generate Song JSON from Issue" workflow
   - Should start within seconds

4. **Verify:**
   - ✅ Workflow runs successfully
   - ✅ Success comment on issue
   - ✅ Files committed to main
   - ✅ Issue auto-closed

### Why this is the complete test:
- ✅ Tests full end-to-end workflow
- ✅ Tests GitHub Actions integration
- ✅ Tests issue comments and auto-close
- ⚠️ Commits files to main branch

## Understanding GitHub Actions Workflow Triggers

### How Issue-Triggered Workflows Work:

1. **Workflow file location matters:**
   - GitHub looks for workflows in the **default branch** (main)
   - PR branches' workflows are ignored for issue events
   - This is a security feature

2. **What this means for testing:**
   - You cannot test issue-triggered workflows from PR branches
   - The workflow file must be in main to be triggered by issues
   - Other trigger types (push, pull_request) work from PR branches

3. **Why GitHub does this:**
   - Security: Prevents malicious workflow code in PRs
   - Consistency: All issues use same workflow version
   - Simplicity: One workflow version for all issues

### Alternative Testing Approaches:

**For PR Testing:**
- ✅ Test the script logic locally (Option 1)
- ✅ Test pattern matching (Option 2)
- ✅ Review workflow YAML syntax
- ✅ Code review the workflow steps

**For Full Integration Testing:**
- ✅ Merge to main first
- ✅ Create test issue
- ✅ Verify complete workflow

## What You Can Test on PR Branch

Even though the workflow won't trigger from issues, you can still test:

1. **✅ Script functionality:**
   ```bash
   npm run generate-song-json -- --limit=3
   npm run generate-song-json -- --category="Song:Coolie"
   ```

2. **✅ Pattern matching:**
   - Run pattern test script (see Option 2)
   - Verify all title formats work

3. **✅ Workflow YAML syntax:**
   ```bash
   # Validate YAML
   npx js-yaml .github/workflows/generate-song-json-on-issue.yml
   ```

4. **✅ Dependencies:**
   ```bash
   npm ci  # Verify all dependencies install
   ```

## Recommended Testing Strategy

**Before Merging:**
1. ✅ Test script locally with `--limit` and `--category` flags
2. ✅ Verify pattern matching with test script
3. ✅ Review workflow YAML for correctness
4. ✅ Code review all workflow steps

**After Merging:**
1. ✅ Create test issue with `[TEST]` marker
2. ✅ Verify workflow runs and completes
3. ✅ Check issue comments and auto-close
4. ✅ Verify files committed correctly

This approach gives you confidence before merging while understanding GitHub's limitations.

## What Happens After Testing

## What Happens After Merging to Main

### After Merging:
- ✅ The workflow becomes active on main branch
- ✅ Future issues created will trigger the workflow
- ✅ Generated files will be committed directly to main
- ✅ Issues will be auto-closed with comments

### First Test After Merge:
1. Create test issue: `generate json for recent 3 song [TEST]`
2. Watch Actions tab - workflow should start within seconds
3. Verify success comment on issue
4. Check that files were committed to main

## Cleanup After Testing

If you create test issues after merging:
1. ✅ Issues are automatically closed by workflow (no manual cleanup needed)
2. ✅ You can add `[TEST]` in issue title/body to identify test issues
3. ✅ Test issue commits are normal commits (part of project history)

## Recommended Testing Strategy

### Before Merging to Main:

**Test Locally (Required):**
- [ ] Run `npm run generate-song-json -- --limit=3`
  - ✅ Check 3 JSON files generated in `blob-data/`
  - ✅ Verify file content and format
  
- [ ] Run `npm run generate-song-json -- --category="Song:Coolie"`
  - ✅ Check JSON files for category generated
  - ✅ Verify correct category files

**Test Pattern Matching (Required):**
- [ ] Run pattern test script (see Option 2)
  - ✅ All patterns match correctly
  - ✅ Parameters extracted correctly

**Review Workflow (Required):**
- [ ] YAML syntax is valid
- [ ] All steps make sense
- [ ] Permissions are minimal and correct
- [ ] Error handling is proper

### After Merging to Main:

**Integration Test (Recommended):**
- [ ] Create issue: `generate json for recent 3 song [TEST]`
  - ✅ Workflow runs successfully in Actions tab
  - ✅ 3 JSON files committed to main
  - ✅ Success comment posted
  - ✅ Issue auto-closed

- [ ] Create issue: `generate json for category Song:Coolie [TEST]`
  - ✅ Workflow runs successfully
  - ✅ Category JSON files committed
  - ✅ Success comment with category name
  - ✅ Issue auto-closed

- [ ] Create issue: `invalid title format`
  - ✅ Workflow runs but reports error
  - ✅ Error comment posted
  - ✅ Issue auto-closed

## Troubleshooting

### Workflow doesn't appear in Actions tab
**Before merging:**
- This is expected! Issue-triggered workflows only run from main branch
- Test the script locally instead (see Option 1)

**After merging:**
- Verify GitHub Actions is enabled for the repository
- Check that issue title matches expected patterns
- Look for workflow file in main branch: `.github/workflows/generate-song-json-on-issue.yml`

### Workflow doesn't trigger on issue creation
**Before merging:**
- This is expected and normal! Issue workflows don't run from PR branches
- This is a GitHub security limitation, not a bug
- Test locally instead (see Option 1)

**After merging:**
- Verify issue was created (not edited - editing doesn't trigger workflows)
- Check that workflow file exists in main: `.github/workflows/generate-song-json-on-issue.yml`
- Look for workflow run in Actions tab (should appear within 5-10 seconds)
- Verify issue title matches expected patterns exactly

### Script fails with errors
- Check workflow logs in Actions tab for detailed error messages
- Verify Blogger API is accessible
- Check that category name is correct (case-sensitive in Blogger API)
- Ensure dependencies installed correctly (`npm ci`)

### No files committed
- Check workflow logs - script may have generated no new files
- Files might already exist (no changes to commit is normal)
- Verify script completed successfully before commit step

## Summary

**⚠️ Key Point:** Issue-triggered workflows ONLY run from the main branch due to GitHub's security model.

**Before Merging:**
- ✅ Test script locally: `npm run generate-song-json -- --limit=3`
- ✅ Test pattern matching with test script
- ✅ Review workflow code and logic
- ❌ Cannot test full workflow from PR (GitHub limitation)

**After Merging:**
- ✅ Create test issue to verify full end-to-end workflow
- ✅ Check Actions tab for workflow runs
- ✅ Verify issue comments and auto-close
- ✅ Confirm files committed correctly

**Recommended approach:** Merge after local testing, then verify with a test issue on main.
