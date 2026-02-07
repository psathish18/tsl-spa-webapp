#!/bin/bash

# Hourly Vercel Log Analysis Script
# Fetches logs from last hour and appends analysis to ANALYSIS_HISTORY.md
# Usage: ./scripts/analyze-hourly-logs.sh

set -e

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANALYSIS_FILE="$WORKSPACE_ROOT/web-site-optimization/ANALYSIS_HISTORY.md"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
LOG_FILE="/tmp/vercel-logs-$(date +%s).txt"

echo "========================================"
echo "Vercel Hourly Log Analysis"
echo "Timestamp: $TIMESTAMP"
echo "========================================"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Error: Vercel CLI not found. Install it with: npm install -g vercel"
    exit 1
fi

# Check if VERCEL_TOKEN is set
if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ Error: VERCEL_TOKEN environment variable is not set"
    echo ""
    echo "📋 To enable log analysis:"
    echo "1. Create a Vercel token at: https://vercel.com/account/tokens"
    echo "2. Export it: export VERCEL_TOKEN='your-token-here'"
    echo "3. For CI/CD, add it to your GitHub Secrets"
    echo ""
    exit 1
fi

# Fetch logs from last hour
echo "📥 Fetching logs from last 1 hour..."
if [ -n "$VERCEL_PROJECT_ID" ]; then
    vercel logs --since=1h --project="$VERCEL_PROJECT_ID" 2>&1 > "$LOG_FILE"
else
    vercel logs --since=1h 2>&1 > "$LOG_FILE"
fi

# Count total requests
TOTAL_REQUESTS=$(grep -c "GET " "$LOG_FILE" || echo "0")

# Count Edge (ε) requests
EDGE_REQUESTS=$(grep -c "ε GET" "$LOG_FILE" || echo "0")

# Count Serverless (λ) requests
SERVERLESS_REQUESTS=$(grep -c "λ GET" "$LOG_FILE" || echo "0")

# Count Redirects (308, 301)
REDIRECTS=$(grep -E "308|301" "$LOG_FILE" | wc -l | tr -d ' ')

# Count 410 (blocked)
BLOCKED_REQUESTS=$(grep -c "410" "$LOG_FILE" || echo "0")

# Count 404 errors
NOT_FOUND=$(grep -c "404" "$LOG_FILE" || echo "0")

# Extract unique serverless endpoints
SERVERLESS_ENDPOINTS=$(grep "λ GET" "$LOG_FILE" | sed -E 's/.*λ GET ([^ ]+).*/\1/' | sort -u | head -10)

# Calculate percentages
if [ "$TOTAL_REQUESTS" -gt 0 ]; then
    EDGE_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($EDGE_REQUESTS / $TOTAL_REQUESTS) * 100}")
    SERVERLESS_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($SERVERLESS_REQUESTS / $TOTAL_REQUESTS) * 100}")
    REDIRECT_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($REDIRECTS / $TOTAL_REQUESTS) * 100}")
else
    EDGE_PERCENT="0.0"
    SERVERLESS_PERCENT="0.0"
    REDIRECT_PERCENT="0.0"
fi

# Monthly projections (assuming consistent traffic)
MONTHLY_EDGE=$((EDGE_REQUESTS * 24 * 30))
MONTHLY_SERVERLESS=$((SERVERLESS_REQUESTS * 24 * 30))

# Status indicators
if [ "$MONTHLY_EDGE" -lt 800000 ]; then
    EDGE_STATUS="✅ Safe"
elif [ "$MONTHLY_EDGE" -lt 900000 ]; then
    EDGE_STATUS="⚠️ Monitor"
else
    EDGE_STATUS="🔴 Critical"
fi

if [ "$MONTHLY_SERVERLESS" -lt 2000 ]; then
    SERVERLESS_STATUS="✅ Safe"
elif [ "$MONTHLY_SERVERLESS" -lt 5000 ]; then
    SERVERLESS_STATUS="⚠️ Monitor"
else
    SERVERLESS_STATUS="🔴 Reduce"
fi

# Print summary to console
echo ""
echo "📊 Analysis Results:"
echo "-------------------"
echo "Total Requests: $TOTAL_REQUESTS"
echo "Edge (ε): $EDGE_REQUESTS ($EDGE_PERCENT%)"
echo "Serverless (λ): $SERVERLESS_REQUESTS ($SERVERLESS_PERCENT%)"
echo "Redirects: $REDIRECTS ($REDIRECT_PERCENT%)"
echo "Blocked (410): $BLOCKED_REQUESTS"
echo "Not Found (404): $NOT_FOUND"
echo ""
echo "📈 Monthly Projections:"
echo "Edge: $MONTHLY_EDGE / 1,000,000 $EDGE_STATUS"
echo "Serverless: $MONTHLY_SERVERLESS $SERVERLESS_STATUS"
echo ""

if [ -n "$SERVERLESS_ENDPOINTS" ]; then
    echo "🔍 Serverless Endpoints (Blob Misses):"
    echo "$SERVERLESS_ENDPOINTS"
    echo ""
fi

# Append to ANALYSIS_HISTORY.md
echo "📝 Appending to $ANALYSIS_FILE..."

cat >> "$ANALYSIS_FILE" << EOF

## Hourly Analysis - $TIMESTAMP

### Quick Stats:
- **Total Requests**: $TOTAL_REQUESTS
- **Edge (ε)**: $EDGE_REQUESTS ($EDGE_PERCENT%) → Monthly: $MONTHLY_EDGE / 1M $EDGE_STATUS
- **Serverless (λ)**: $SERVERLESS_REQUESTS ($SERVERLESS_PERCENT%) → Monthly: $MONTHLY_SERVERLESS $SERVERLESS_STATUS
- **Redirects (308/301)**: $REDIRECTS ($REDIRECT_PERCENT%)
- **Blocked (410)**: $BLOCKED_REQUESTS
- **Not Found (404)**: $NOT_FOUND

EOF

if [ -n "$SERVERLESS_ENDPOINTS" ] && [ "$SERVERLESS_REQUESTS" -gt 0 ]; then
    cat >> "$ANALYSIS_FILE" << EOF
### Serverless Endpoints (Potential Blob Misses):
\`\`\`
$SERVERLESS_ENDPOINTS
\`\`\`

EOF
fi

cat >> "$ANALYSIS_FILE" << EOF
### Status:
- Edge Usage: $EDGE_STATUS (${EDGE_PERCENT}% of traffic)
- Serverless Usage: $SERVERLESS_STATUS ($SERVERLESS_REQUESTS invocations this hour)
- Cache Hit Rate: ${EDGE_PERCENT}% (Target: >85%)

---

EOF

echo "✅ Analysis complete and saved!"
echo ""

# Cleanup
rm -f "$LOG_FILE"

# Optional: Commit and push if running in CI/CD
if [ "$CI" = "true" ] || [ "$GITHUB_ACTIONS" = "true" ]; then
    echo "🔄 Committing analysis to git..."
    cd "$WORKSPACE_ROOT"
    git config --global user.name "Vercel Log Analyzer"
    git config --global user.email "noreply@github.com"
    git add "$ANALYSIS_FILE"
    git commit -m "chore: hourly log analysis - $TIMESTAMP" || echo "No changes to commit"
    git push || echo "Push failed or no changes"
fi

echo "Done! 🎉"
