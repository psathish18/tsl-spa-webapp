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
    vercel logs --since=1h --json --project="$VERCEL_PROJECT_ID" --token="$VERCEL_TOKEN" 2>&1 > "$LOG_FILE"
else
    vercel logs --since=1h --json --token="$VERCEL_TOKEN" 2>&1 > "$LOG_FILE"
fi

# Filter only valid JSON lines (skip CLI headers)
VALID_JSON_LOG="/tmp/vercel-logs-valid-$(date +%s).jsonl"
grep '^{' "$LOG_FILE" > "$VALID_JSON_LOG" || touch "$VALID_JSON_LOG"

FIXES_APPLIED=0
FIXES_LOG=""

## FIX 1: Block New 404 Patterns
echo ""
echo "🔍 Checking for new 404 patterns..."

# Extract unique 404 URLs using Python for proper JSON parsing
export VALID_JSON_LOG
NEW_404_PATTERNS=$(python3 - <<'PY404'
import json
import os

paths = set()
log_file = os.environ.get('VALID_JSON_LOG')
if not log_file or not os.path.exists(log_file):
    exit(0)

with open(log_file, "r") as f:
    for line in f:
        try:
            obj = json.loads(line)
            if obj.get("responseStatusCode") == 404:
                path = obj.get("requestPath", "")
                if path and not any(x in path for x in ["/_next/", "/favicon", "/api/"]):
                    paths.add(path)
        except:
            pass

for path in sorted(paths)[:10]:
    print(path)
PY404
)

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

# Extract serverless URLs using Python for proper JSON parsing
export VALID_JSON_LOG
SERVERLESS_URLS=$(python3 - <<'PYSERVERLESS'
import json
import os

paths = []
log_file = os.environ.get('VALID_JSON_LOG')
if not log_file or not os.path.exists(log_file):
    exit(0)

with open(log_file, "r") as f:
    for line in f:
        try:
            obj = json.loads(line)
            if obj.get("source") == "serverless":
                path = obj.get("requestPath", "")
                if path and path.endswith(".html"):
                    paths.append(path)
        except:
            pass

for path in sorted(set(paths)):
    print(path)
PYSERVERLESS
)

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

# Count serverless invocations using Python
export VALID_JSON_LOG
SERVERLESS_COUNT=$(python3 - <<'PYCOUNT'
import json
import os

count = 0
log_file = os.environ.get('VALID_JSON_LOG')
if not log_file or not os.path.exists(log_file):
    print(0)
    exit(0)

with open(log_file, "r") as f:
    for line in f:
        try:
            obj = json.loads(line)
            if obj.get("source") == "serverless":
                count += 1
        except:
            pass
print(count)
PYCOUNT
)

SERVERLESS_THRESHOLD=50

if [ "$SERVERLESS_COUNT" -gt "$SERVERLESS_THRESHOLD" ]; then
  echo "⚠️ HIGH SERVERLESS USAGE: $SERVERLESS_COUNT invocations/hour"
  echo "   Monthly projection: $((SERVERLESS_COUNT * 24 * 30)) invocations"
  
  # Get serverless endpoints for the alert
  export VALID_JSON_LOG
  SERVERLESS_ENDPOINTS=$(python3 - <<'PYENDPOINTS'
import json
import os
from collections import Counter

paths = []
log_file = os.environ.get('VALID_JSON_LOG')
if not log_file or not os.path.exists(log_file):
    exit(0)

with open(log_file, "r") as f:
    for line in f:
        try:
            obj = json.loads(line)
            if obj.get("source") == "serverless":
                path = obj.get("requestPath", "")
                if path:
                    paths.append(path)
        except:
            pass

for path, count in Counter(paths).most_common(10):
    print(f"{count:6d} {path}")
PYENDPOINTS
  )
  
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
$SERVERLESS_ENDPOINTS
\`\`\`
EOF

  FIXES_APPLIED=$((FIXES_APPLIED + 1))
  FIXES_LOG="${FIXES_LOG}\n- Created SERVERLESS_ALERT.md (high usage detected)"
  echo "✅ Fix applied: Created serverless usage alert"
fi

## FIX 4: Bot Detection and Blocking
echo ""
echo "🔍 Checking for bot patterns..."

# Check for suspicious user agents or patterns using Python
BOT_PATTERNS=$(python3 - <<'PYBOT'
import json

count = 0
with open("$VALID_JSON_LOG", "r") as f:
    for line in f:
        try:
            obj = json.loads(line)
            # Check message or path for bot patterns
            msg = (obj.get("message", "") or "").lower()
            if any(bot in msg for bot in ["bot", "crawler", "spider", "scraper"]):
                count += 1
        except:
            pass
print(count)
PYBOT
)

if [ "$BOT_PATTERNS" -gt 20 ]; then
  echo "⚠️ Detected $BOT_PATTERNS bot requests (>20/hour)"
  FIXES_LOG="${FIXES_LOG}\n- Recommendation: Consider adding bot filtering in middleware"
fi

## FIX 5: Remove Old Backup Files
if [ -f "$MIDDLEWARE_FILE.bak" ]; then
  rm "$MIDDLEWARE_FILE.bak"
  echo "🧹 Cleaned up backup file"
fi

# Cleanup
rm -f "$LOG_FILE"
rm -f "$VALID_JSON_LOG"

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
