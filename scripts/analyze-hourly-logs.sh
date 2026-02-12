#!/bin/bash

# Hourly Vercel Log Analysis Script
# Fetches logs from last hour and appends analysis to ANALYSIS_HISTORY.md
# Usage: ./scripts/analyze-hourly-logs.sh

set -e

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
TIMESTAMP_SAFE=$(date "+%Y-%m-%d_%H-%M")
# LOG_FILE="$WORKSPACE_ROOT/web-site-optimization/hourly-vercel-logs-$TIMESTAMP_SAFE.jsonl"  # Not needed
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

# Fetch logs from last full hour using Vercel REST API (CLI no longer supports historical logs)
# Running at :55 minute but fetching 1hr ensures we don't miss any logs before retention expires
echo "📥 Fetching logs from last 1 hour via Vercel API..."

# Get project ID from .vercel/project.json
if [ -f ".vercel/project.json" ]; then
    PROJECT_ID=$(cat .vercel/project.json | python3 -c "import sys, json; print(json.load(sys.stdin).get('projectId', ''))")
else
    echo "❌ Error: .vercel/project.json not found. Run 'vercel link' first."
    exit 1
fi

# Calculate timestamp for 1 hour ago in milliseconds
SINCE_MS=$(($(date +%s) * 1000 - 3600000))

# Fetch logs via Vercel REST API
LOG_OUTPUT=$(curl -s "https://api.vercel.com/v3/deployments/$PROJECT_ID/events?since=$SINCE_MS&limit=10000" \
    -H "Authorization: Bearer $VERCEL_TOKEN" 2>&1)

# Generate CSV directly from log output (no JSONL intermediate file needed)
export CSV_FILE
echo "$LOG_OUTPUT" | python3 - <<'PY'
import csv, json, sys, os

csv_file = os.environ.get('CSV_FILE')
if not csv_file:
    raise SystemExit("Missing CSV_FILE env")

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
    for line in sys.stdin:
        line = line.strip()
        if not line or not line.startswith('{'):
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

echo "✅ CSV saved: $CSV_FILE"
echo ""

# Commit CSV file to git
if [ "$CI" != "true" ] && [ "$GITHUB_ACTIONS" != "true" ]; then
    echo "🔄 Committing CSV to git..."
    cd "$WORKSPACE_ROOT"
    git config --global user.name "Vercel Log Analyzer"
    git config --global user.email "noreply@github.com"
    git add "$CSV_FILE"
    git commit -m "chore: hourly vercel logs - $TIMESTAMP" || echo "No changes to commit"
    git push || echo "Push failed or no changes"
else
    echo "🔄 CI/CD mode: Committing CSV to git..."
    cd "$WORKSPACE_ROOT"
    git add "$CSV_FILE" 2>/dev/null || true
fi

echo "Done! 🎉"
