#!/bin/bash

# Apply Critical Fixes Based on Log Analysis
# Automatically fixes issues detected in hourly analysis
# Usage: ./scripts/apply-critical-fixes.sh

set -e

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIDDLEWARE_FILE="$WORKSPACE_ROOT/middleware.ts"
LOG_FILE="/tmp/vercel-logs-fixes-$(date +%s).txt"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")

echo "========================================"
echo "Critical Fixes Application"
echo "Timestamp: $TIMESTAMP"
echo "========================================"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Error: Vercel CLI not found"
    exit 1
fi

# Check if VERCEL_TOKEN is set
if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ Error: VERCEL_TOKEN environment variable is not set"
    echo ""
    echo "📋 To enable automated fixes:"
    echo "1. Create a Vercel token at: https://vercel.com/account/tokens"
    echo "2. Export it: export VERCEL_TOKEN='your-token-here'"
    echo "3. For CI/CD, add it to your GitHub Secrets"
    echo ""
    exit 1
fi

# Fetch logs from last hour
echo "📥 Fetching logs for analysis..."
if [ -n "$VERCEL_PROJECT_ID" ]; then
    vercel logs --since=1h --project="$VERCEL_PROJECT_ID" --token="$VERCEL_TOKEN" 2>&1 > "$LOG_FILE"
else
    vercel logs --since=1h --token="$VERCEL_TOKEN" 2>&1 > "$LOG_FILE"
fi

FIXES_APPLIED=0
FIXES_LOG=""

## FIX 1: Block New 404 Patterns
echo ""
echo "🔍 Checking for new 404 patterns..."

# Extract unique 404 URLs (excluding already handled patterns)
NEW_404_PATTERNS=$(grep "404" "$LOG_FILE" | \
  grep -oE "GET [^ ]+" | \
  sed 's/GET //' | \
  grep -v "/_next/" | \
  grep -v "/favicon" | \
  grep -v "/api/" | \
  sort -u | \
  head -10)

if [ -n "$NEW_404_PATTERNS" ]; then
  echo "Found 404 patterns:"
  echo "$NEW_404_PATTERNS"
  
  # Check for common WordPress patterns not yet blocked
  if echo "$NEW_404_PATTERNS" | grep -qE "/(page|paged|date|category|archives)/"; then
    echo "⚠️ Detected WordPress pagination/archive patterns"
    
    # Check if pattern already exists in middleware
    if ! grep -q "\/page\/" "$MIDDLEWARE_FILE"; then
      echo "✅ Adding WordPress pagination block to middleware..."
      
      # Insert new pattern after /author/ line
      sed -i.bak '/^[[:space:]]*\/\^\\\/author\\\/,/a\
    /^\\\/page\//,                   // Old WordPress pagination' "$MIDDLEWARE_FILE"
      
      FIXES_APPLIED=$((FIXES_APPLIED + 1))
      FIXES_LOG="${FIXES_LOG}\n- Blocked WordPress pagination URLs (/page/)"
      echo "✅ Fix applied: Blocked /page/ pattern"
    fi
  fi
  
  # Check for date-based URL patterns
  if echo "$NEW_404_PATTERNS" | grep -qE "/20[0-9]{2}/"; then
    if ! grep -q "date-based" "$MIDDLEWARE_FILE" 2>/dev/null; then
      echo "⚠️ Consider adding date-based URL blocking in vercel.json redirects"
      FIXES_LOG="${FIXES_LOG}\n- Recommendation: Add date-based redirect rules"
    fi
  fi
fi

## FIX 2: Detect Missing Blob Files
echo ""
echo "🔍 Checking for missing blob files (serverless invocations)..."

SERVERLESS_URLS=$(grep "λ GET" "$LOG_FILE" | \
  grep -oE "GET [^ ]+" | \
  sed 's/GET //' | \
  grep "\.html$" | \
  sort -u)

MISSING_BLOBS=""
MISSING_COUNT=0

if [ -n "$SERVERLESS_URLS" ]; then
  echo "Found serverless requests:"
  
  while IFS= read -r url; do
    # Convert URL to blob filename
    BLOB_FILE=$(echo "$url" | sed 's/\.html$//' | sed 's/^\///')
    BLOB_PATH="$WORKSPACE_ROOT/blob-data/${BLOB_FILE}.json"
    
    if [ ! -f "$BLOB_PATH" ]; then
      echo "  ⚠️ Missing: $BLOB_FILE.json"
      MISSING_BLOBS="${MISSING_BLOBS}${BLOB_FILE}\n"
      MISSING_COUNT=$((MISSING_COUNT + 1))
    fi
  done <<< "$SERVERLESS_URLS"
  
  if [ $MISSING_COUNT -gt 0 ]; then
    echo ""
    echo "📝 Creating missing blob files list..."
    echo -e "$MISSING_BLOBS" > "$WORKSPACE_ROOT/web-site-optimization/missing-blob-files.txt"
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
    FIXES_LOG="${FIXES_LOG}\n- Created list of $MISSING_COUNT missing blob files"
    echo "✅ Fix applied: Created missing-blob-files.txt"
  fi
fi

## FIX 3: High Serverless Usage Warning
echo ""
echo "🔍 Checking serverless usage..."

SERVERLESS_COUNT=$(grep -c "λ GET" "$LOG_FILE" || echo "0")
SERVERLESS_THRESHOLD=50

if [ "$SERVERLESS_COUNT" -gt "$SERVERLESS_THRESHOLD" ]; then
  echo "⚠️ HIGH SERVERLESS USAGE: $SERVERLESS_COUNT invocations/hour"
  echo "   Monthly projection: $((SERVERLESS_COUNT * 24 * 30)) invocations"
  
  # Create alert file
  cat > "$WORKSPACE_ROOT/web-site-optimization/SERVERLESS_ALERT.md" << EOF
# 🔴 High Serverless Usage Alert

**Detected**: $TIMESTAMP  
**Hourly Rate**: $SERVERLESS_COUNT invocations  
**Monthly Projection**: $((SERVERLESS_COUNT * 24 * 30)) invocations

## ⚠️ Impact on Hobby Plan:
- Increased function execution time
- Higher CPU costs
- Potential limit approach

## 🎯 Recommended Actions:
1. Generate missing blob files (see missing-blob-files.txt)
2. Review ISR revalidation periods
3. Check for bot traffic patterns
4. Consider adding more aggressive caching

## 📊 Current Serverless Endpoints:
\`\`\`
$(grep "λ GET" "$LOG_FILE" | grep -oE "GET [^ ]+" | sed 's/GET //' | sort | uniq -c | sort -rn | head -10)
\`\`\`
EOF

  FIXES_APPLIED=$((FIXES_APPLIED + 1))
  FIXES_LOG="${FIXES_LOG}\n- Created SERVERLESS_ALERT.md (high usage detected)"
  echo "✅ Fix applied: Created serverless usage alert"
fi

## FIX 4: Bot Detection and Blocking
echo ""
echo "🔍 Checking for bot patterns..."

# Check for suspicious user agents or patterns
BOT_PATTERNS=$(grep -E "(bot|crawler|spider|scraper)" "$LOG_FILE" -i | wc -l | tr -d ' ')

if [ "$BOT_PATTERNS" -gt 20 ]; then
  echo "⚠️ Detected $BOT_PATTERNS bot requests (>20/hour)"
  
  # Extract common bot user agents
  COMMON_BOTS=$(grep -oE "bot|crawler|spider|scraper" "$LOG_FILE" -i | sort | uniq -c | sort -rn | head -5)
  
  echo "Common bots detected:"
  echo "$COMMON_BOTS"
  
  FIXES_LOG="${FIXES_LOG}\n- Recommendation: Consider adding bot filtering in middleware"
fi

## FIX 5: Remove Old Backup Files
if [ -f "$MIDDLEWARE_FILE.bak" ]; then
  rm "$MIDDLEWARE_FILE.bak"
  echo "🧹 Cleaned up backup file"
fi

# Cleanup
rm -f "$LOG_FILE"

# Summary
echo ""
echo "========================================"
echo "📊 Summary"
echo "========================================"
echo "Fixes Applied: $FIXES_APPLIED"

if [ $FIXES_APPLIED -gt 0 ]; then
  echo ""
  echo "✅ Applied Fixes:"
  echo -e "$FIXES_LOG"
  echo ""
  echo "🔄 Changes ready for commit"
else
  echo "✅ No critical issues detected - system running optimally"
fi

echo ""
echo "Done! 🎉"

exit 0
