#!/bin/bash

# Hourly Vercel Log Analysis Script
# Fetches logs from last hour and appends analysis to ANALYSIS_HISTORY.md
# Usage: ./scripts/analyze-hourly-logs.sh

set -e

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANALYSIS_FILE="$WORKSPACE_ROOT/web-site-optimization/ANALYSIS_HISTORY.md"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
TIMESTAMP_SAFE=$(date "+%Y-%m-%d_%H-%M")
LOG_FILE="$WORKSPACE_ROOT/web-site-optimization/hourly-vercel-logs-$TIMESTAMP_SAFE.jsonl"
CSV_FILE="$WORKSPACE_ROOT/web-site-optimization/hourly-vercel-logs-$TIMESTAMP_SAFE.csv"

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

# Fetch logs from last hour (JSONL for full messages)
echo "📥 Fetching logs from last 1 hour..."
if [ -n "$VERCEL_PROJECT_ID" ]; then
    LOG_OUTPUT=$(vercel logs --since=1h --json --project="$VERCEL_PROJECT_ID" --token="$VERCEL_TOKEN" 2>&1)
else
    LOG_OUTPUT=$(vercel logs --since=1h --json --token="$VERCEL_TOKEN" 2>&1)
fi

# Persist raw JSONL output
printf "%s\n" "$LOG_OUTPUT" > "$LOG_FILE"

# Filter only valid JSON lines (skip Vercel CLI headers like "Fetching logs...")
VALID_JSON_LOGS=$(echo "$LOG_OUTPUT" | grep '^{' || echo "")

# Generate CSV with full log messages
export LOG_FILE
export CSV_FILE
python3 - <<'PY'
import csv, json, os

log_file = os.environ.get('LOG_FILE')
csv_file = os.environ.get('CSV_FILE')

if not log_file or not csv_file:
    raise SystemExit("Missing LOG_FILE or CSV_FILE env")

fields = ["timestamp", "host", "level", "method", "path", "status", "message", "raw"]

def parse_line(line):
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        return None

    # Extract fields directly from Vercel log format
    timestamp = obj.get("timestamp") or obj.get("time") or obj.get("createdAt")
    host = obj.get("domain") or obj.get("host") or obj.get("hostname") or obj.get("requestHost")
    level = obj.get("level")
    message = obj.get("message") or obj.get("msg")
    method = obj.get("requestMethod") or obj.get("method")
    path = obj.get("requestPath") or obj.get("path") or obj.get("url")
    status = obj.get("responseStatusCode") or obj.get("status")

    return {
        "timestamp": timestamp,
        "host": host,
        "level": level,
        "method": method,
        "path": path,
        "status": status,
        "message": message,
        "raw": json.dumps(obj, ensure_ascii=False),
    }

with open(csv_file, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    with open(log_file, "r", encoding="utf-8") as lf:
        for line in lf:
            line = line.strip()
            if not line:
                continue
            row = parse_line(line)
            if row:
                writer.writerow(row)
PY

# Count metrics from CSV file (more reliable than grepping raw output)
# CSV has format: timestamp,host,level,method,path,status,message,raw
if [ -f "$CSV_FILE" ]; then
    # Count using Python to properly parse the CSV
    export CSV_FILE
    read -r TOTAL_REQUESTS EDGE_REQUESTS SERVERLESS_REQUESTS REDIRECTS BLOCKED_REQUESTS NOT_FOUND <<< $(python3 - <<'PYCOUNT'
import csv
import json
import os

csv_file = os.environ.get('CSV_FILE')
total = 0
edge = 0
serverless = 0
redirects = 0
blocked = 0
not_found = 0

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        total += 1
        
        # Parse the raw JSON to get source
        try:
            raw_data = json.loads(row['raw'])
            source = raw_data.get('source', '')
            
            # Count by source
            # Edge: edge-middleware, static, redirect (all handled at edge)
            if source in ['edge-middleware', 'static', 'redirect']:
                edge += 1
            elif source == 'serverless':
                serverless += 1
        except:
            pass
        
        # Count by status code
        try:
            status = int(row['status']) if row['status'] else 0
            if status in [308, 301]:
                redirects += 1
            elif status == 410:
                blocked += 1
            elif status == 404:
                not_found += 1
        except:
            pass

print(f"{total} {edge} {serverless} {redirects} {blocked} {not_found}")
PYCOUNT
    )
    
    # Extract unique serverless endpoints
    SERVERLESS_ENDPOINTS=$(python3 - <<'PYENDPOINTS'
import csv
import json
import os

csv_file = os.environ.get('CSV_FILE')
endpoints = set()

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            raw_data = json.loads(row['raw'])
            if raw_data.get('source') == 'serverless' and row['path']:
                endpoints.add(row['path'])
        except:
            pass

for endpoint in sorted(endpoints)[:10]:
    print(endpoint)
PYENDPOINTS
    )
else
    TOTAL_REQUESTS=0
    EDGE_REQUESTS=0
    SERVERLESS_REQUESTS=0
    REDIRECTS=0
    BLOCKED_REQUESTS=0
    NOT_FOUND=0
    SERVERLESS_ENDPOINTS=""
fi

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
if [ "$TOTAL_REQUESTS" -eq 0 ]; then
    EDGE_STATUS="ℹ️ No data"
    SERVERLESS_STATUS="ℹ️ No data"
elif [ "$MONTHLY_EDGE" -lt 800000 ]; then
    EDGE_STATUS="✅ Safe"
elif [ "$MONTHLY_EDGE" -lt 900000 ]; then
    EDGE_STATUS="⚠️ Monitor"
else
    EDGE_STATUS="🔴 Critical"
fi

if [ "$TOTAL_REQUESTS" -gt 0 ]; then
    if [ "$MONTHLY_SERVERLESS" -lt 2000 ]; then
        SERVERLESS_STATUS="✅ Safe"
    elif [ "$MONTHLY_SERVERLESS" -lt 5000 ]; then
        SERVERLESS_STATUS="⚠️ Monitor"
    else
        SERVERLESS_STATUS="🔴 Reduce"
    fi
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

### Raw Log Data
- JSONL (full log payloads): \`web-site-optimization/hourly-vercel-logs-$TIMESTAMP_SAFE.jsonl\`
- CSV (full messages): \`web-site-optimization/hourly-vercel-logs-$TIMESTAMP_SAFE.csv\`

---

EOF

echo "✅ Analysis complete and saved!"
echo ""

# Optional: Commit and push if running locally (not in CI/CD)
if [ "$CI" != "true" ] && [ "$GITHUB_ACTIONS" != "true" ]; then
    echo "🔄 Committing analysis to git..."
    cd "$WORKSPACE_ROOT"
    git config --global user.name "Vercel Log Analyzer"
    git config --global user.email "noreply@github.com"
    git add "$ANALYSIS_FILE"
    git commit -m "chore: hourly log analysis - $TIMESTAMP" || echo "No changes to commit"
    git push || echo "Push failed or no changes"
fi

echo "Done! 🎉"
