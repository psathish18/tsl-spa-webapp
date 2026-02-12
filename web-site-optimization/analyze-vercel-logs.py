#!/usr/bin/env python3
"""
Analyze Vercel logs for optimization opportunities
Supports both CSV (exported from dashboard) and JSON Lines (from CLI)
Usage: python analyze-vercel-logs.py <file.csv|file.jsonl>
"""
import csv
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime

def parse_jsonl_logs(file_path):
    """Parse Vercel JSON Lines log file from CLI output"""
    logs = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                log_entry = json.loads(line)
                logs.append(log_entry)
            except json.JSONDecodeError:
                # Skip CLI header lines or malformed JSON
                continue
    
    return logs

def normalize_jsonl_to_csv_format(logs):
    """Convert JSON Lines format to CSV-like dict format for unified processing"""
    normalized = []
    
    for log in logs:
        row = {
            'requestPath': log.get('requestPath', 'unknown'),
            'responseStatusCode': str(log.get('responseStatusCode', 0)),
            'vercelCache': log.get('cache', ''),
            'type': log.get('source', 'unknown'),  # static, serverless, edge-middleware, etc.
            'durationMs': '',  # Not available in JSON Lines format
            'maxMemoryUsed': '',  # Not available in JSON Lines format
            'requestUserAgent': '',  # Not available in JSON Lines format
            'message': log.get('message', ''),
            'requestMethod': log.get('requestMethod', 'GET'),
            'domain': log.get('domain', ''),
            'timestamp': log.get('timestamp', 0),
        }
        normalized.append(row)
    
    return normalized

def detect_format(file_path):
    """Detect if file is CSV or JSON Lines"""
    if file_path.endswith('.jsonl') or file_path.endswith('.json'):
        return 'jsonl'
    elif file_path.endswith('.csv'):
        return 'csv'
    
    # Try to detect by content
    with open(file_path, 'r', encoding='utf-8') as f:
        first_line = f.readline().strip()
        if first_line.startswith('{'):
            return 'jsonl'
    
    return 'csv'

def load_logs(file_path):
    """Load logs from either CSV or JSON Lines format"""
    fmt = detect_format(file_path)
    
    if fmt == 'jsonl':
        print(f"📄 Detected format: JSON Lines (Vercel CLI)")
        logs = parse_jsonl_logs(file_path)
        return normalize_jsonl_to_csv_format(logs), fmt
    else:
        print(f"📄 Detected format: CSV (Dashboard Export)")
        rows = []
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        return rows, fmt

def analyze_logs(file_path):
    rows, source_format = load_logs(file_path)
    
    paths = Counter()
    status = Counter()
    cache = Counter()
    types = Counter()
    durations = defaultdict(list)
    memory = []
    bots = Counter()
    wordpress_404 = []
    blogger_api_calls = []
    domains = Counter()
    methods = Counter()
    timestamps = []
    
    for row in rows:
        path = row['requestPath']
        paths[path] += 1
        status[row['responseStatusCode']] += 1
        
        if row.get('domain'):
            domains[row['domain']] += 1
        if row.get('requestMethod'):
            methods[row['requestMethod']] += 1
        if row.get('timestamp'):
            try:
                timestamps.append(int(row['timestamp']))
            except:
                pass
        
        if row['vercelCache']:
            cache[row['vercelCache']] += 1
        if row['type']:
            # Normalize type names
            t = row['type']
            if t in ['edge-middleware', 'edge-function']:
                t = 'edge'
            elif t in ['lambda', 'serverless']:
                t = 'serverless'
            types[t] += 1
        
        # Track durations (only available in CSV format)
        if row.get('durationMs') and row['type'] == 'serverless':
            try:
                durations[path].append(float(row['durationMs']))
            except:
                pass
        
        # Track memory (only available in CSV format)
        if row.get('maxMemoryUsed'):
            try:
                memory.append(int(row['maxMemoryUsed']))
            except:
                pass
        
        # Track bots (only available in CSV format with user agent)
        ua = row.get('requestUserAgent', '').lower()
        if ua and ('bot' in ua or 'crawler' in ua or 'spider' in ua):
            bots[row.get('requestUserAgent', '')] += 1
        
        # Track WP 404s
        if row['responseStatusCode'] == '410' and '/wp-content/' in path:
            wordpress_404.append(path)
        
        # Track Blogger API calls in messages
        msg = row.get('message', '')
        if 'tsonglyricsapp.blogspot.com' in msg:
            blogger_api_calls.append(msg)
    
    print('='*80)
    print('VERCEL LOG ANALYSIS - OPTIMIZATION REPORT')
    print('='*80)
    
    total_requests = len(rows)
    print(f'\n📊 OVERVIEW')
    print(f'Total Requests Analyzed: {total_requests:,}')
    print(f'Source Format: {source_format.upper()}')
    
    # Time range for JSONL format
    if timestamps:
        start_time = min(timestamps)
        end_time = max(timestamps)
        start_dt = datetime.fromtimestamp(start_time / 1000)
        end_dt = datetime.fromtimestamp(end_time / 1000)
        print(f'Time Range: {start_dt.strftime("%Y-%m-%d %H:%M:%S")} to {end_dt.strftime("%Y-%m-%d %H:%M:%S")}')
        duration_mins = (end_time - start_time) / 1000 / 60
        print(f'Duration: {duration_mins:.1f} minutes')
    
    if domains:
        print(f'\n🌐 DOMAINS')
        print('-'*80)
        for domain, count in domains.most_common():
            pct = (count/total_requests)*100
            print(f'  {domain}: {count:,} ({pct:.1f}%)')
    
    if methods:
        print(f'\n🔄 HTTP METHODS')
        print('-'*80)
        for method, count in methods.most_common():
            pct = (count/total_requests)*100
            print(f'  {method}: {count:,} ({pct:.1f}%)')
    
    print('\n📊 TOP 20 REQUESTED PATHS:')
    print('-'*80)
    for i, (p, c) in enumerate(paths.most_common(20), 1):
        print(f'{i:2}. {c:6,}x - {p[:65]}')
    
    print('\n🔢 STATUS CODES:')
    print('-'*80)
    for s, c in sorted(status.items()):
        pct = (c/total_requests)*100
        status_label = s if s != '0' else '0 (Log only)'
        print(f'  {status_label}: {c:,} ({pct:.2f}%)')
    
    print('\n💾 CACHE PERFORMANCE:')
    print('-'*80)
    cache_total = sum(v for k,v in cache.items() if k in ['HIT','MISS'])
    for c, count in cache.most_common():
        if c in ['HIT', 'MISS']:
            pct = (count/cache_total)*100 if cache_total > 0 else 0
            print(f'  {c}: {count:,} ({pct:.2f}%)')
        elif c:
            print(f'  {c}: {count:,}')
    
    cache_hit_rate = (cache.get('HIT', 0) / cache_total * 100) if cache_total > 0 else 0
    print(f'\n  ⚡ Cache Hit Rate: {cache_hit_rate:.2f}% (Target: >80%)')
    
    print('\n⚡ REQUEST TYPES (Edge vs Serverless):')
    print('-'*80)
    type_total = sum(types.values())
    for t, c in sorted(types.items(), key=lambda x: x[1], reverse=True):
        pct = (c/type_total)*100
        icon = {'edge': 'ε', 'serverless': 'λ', 'static': '◇', 'redirect': '↪'}.get(t, '?')
        print(f'  {icon} {t}: {c:,} ({pct:.2f}%)')
    
    serverless_pct = (types.get('serverless', 0) / type_total * 100) if type_total > 0 else 0
    edge_pct = (types.get('edge', 0) / type_total * 100) if type_total > 0 else 0
    
    if durations:
        print('\n🐌 TOP 15 SLOWEST ROUTES (High CPU Usage):')
        print('-'*80)
        avg_dur = {p: sum(d)/len(d) for p, d in durations.items() if d}
        for i, (p, avg) in enumerate(sorted(avg_dur.items(), key=lambda x: x[1], reverse=True)[:15], 1):
            count = len(durations[p])
            max_dur = max(durations[p])
            print(f'{i:2}. Avg: {avg:6.0f}ms | Max: {max_dur:6.0f}ms | {count:5} reqs | {p[:35]}')
    
    if memory:
        avg_mem = sum(memory)/len(memory)
        print(f'\n🧠 MEMORY USAGE:')
        print('-'*80)
        print(f'  Average: {avg_mem:.0f} MB')
        print(f'  Maximum: {max(memory)} MB')
        print(f'  Minimum: {min(memory)} MB')
    
    if bots:
        print('\n🤖 TOP 10 BOT TRAFFIC (Consuming Bandwidth):')
        print('-'*80)
        bot_total = sum(bots.values())
        for i, (bot, c) in enumerate(bots.most_common(10), 1):
            pct = (c/bot_total)*100
            print(f'{i:2}. {c:5,}x ({pct:5.2f}%) - {bot[:58]}')
        
        bot_pct = (bot_total / total_requests * 100) if total_requests > 0 else 0
        print(f'\n  🤖 Bot Traffic: {bot_total:,} ({bot_pct:.2f}% of total)')
    
    if wordpress_404:
        wp_count = Counter(wordpress_404)
        print('\n⚠️  WORDPRESS 404 ERRORS (Wasting Resources):')
        print('-'*80)
        print(f'Total 410 errors for old WordPress URLs: {len(wordpress_404):,}')
        print('Top offenders:')
        for path, c in wp_count.most_common(10):
            print(f'  {c:4}x - {path}')
    
    if blogger_api_calls:
        api_count = len(blogger_api_calls)
        print(f'\n🌐 BLOGGER API CALLS DETECTED:')
        print('-'*80)
        print(f'Total API calls to Blogger: {api_count:,}')
        
        # Count cache misses
        miss_count = sum(1 for msg in blogger_api_calls if 'Cache MISS' in msg or 'Trying CDN' in msg)
        hit_count = api_count - miss_count
        if api_count > 0:
            api_cache_rate = (hit_count / api_count) * 100
            print(f'API Cache Hit Rate: {api_cache_rate:.2f}%')
    
    print(f'\n{"="*80}')
    print('SUMMARY & RECOMMENDATIONS')
    print('='*80)
    print(f'📈 Total Requests Analyzed: {total_requests:,}')
    print(f'λ Serverless Requests: {types.get("serverless", 0):,} ({serverless_pct:.2f}%)')
    print(f'ε Edge Requests: {types.get("edge", 0):,} ({edge_pct:.2f}%)')
    print(f'💾 Cache Hit Rate: {cache_hit_rate:.2f}%')
    print(f'❌ Error Rate (410): {status.get("410", 0):,} ({status.get("410", 0)/total_requests*100:.2f}%)')
    if bots:
        bot_total = sum(bots.values())
        print(f'🤖 Bot Traffic: {bot_total:,} ({bot_total/total_requests*100:.2f}%)')
    
    print('\n🎯 OPTIMIZATION OPPORTUNITIES:')
    print('-'*80)
    
    if cache_hit_rate < 80 and cache_total > 0:
        print('  ⚠️  LOW CACHE HIT RATE: Increase ISR revalidation time or implement CDN strategy')
    
    if status.get('410', 0) > 100:
        print('  ⚠️  HIGH 410 ERRORS: Add redirects in vercel.json for old WordPress URLs')
    
    if serverless_pct > 50:
        print(f'  ⚠️  HIGH SERVERLESS USAGE ({serverless_pct:.1f}%): Move more logic to edge or static generation')
    elif serverless_pct < 30:
        print(f'  ✅ EXCELLENT SERVERLESS USAGE ({serverless_pct:.1f}%): Within target (<30%)')
    
    if edge_pct > 50:
        print(f'  ✅ EXCELLENT EDGE USAGE ({edge_pct:.1f}%): Target achieved (>50%)')
    
    if durations:
        slow_routes = [p for p, avg in {p: sum(d)/len(d) for p, d in durations.items() if d}.items() if avg > 3000]
        if slow_routes:
            print(f'  ⚠️  {len(slow_routes)} ROUTES >3s: Optimize Blogger API calls or pre-generate')
    
    if memory and sum(memory)/len(memory) > 500:
        print(f'  ⚠️  HIGH MEMORY USAGE: Optimize data fetching and processing')
    
    print('\n' + '='*80)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python analyze-vercel-logs.py <file.csv|file.jsonl>")
        print("  Supports CSV (dashboard export) and JSON Lines (CLI output)")
        sys.exit(1)
    
    file_path = sys.argv[1]
    analyze_logs(file_path)
