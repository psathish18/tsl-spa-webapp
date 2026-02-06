#!/usr/bin/env python3
"""
Analyze Vercel logs for optimization opportunities
"""
import csv
import sys
from collections import Counter, defaultdict

def analyze_logs(csv_path):
    paths = Counter()
    status = Counter()
    cache = Counter()
    types = Counter()
    durations = defaultdict(list)
    memory = []
    bots = Counter()
    wordpress_404 = []
    blogger_api_calls = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            path = row['requestPath']
            paths[path] += 1
            status[row['responseStatusCode']] += 1
            
            if row['vercelCache']:
                cache[row['vercelCache']] += 1
            if row['type']:
                types[row['type']] += 1
            
            # Track durations
            if row['durationMs'] and row['type'] == 'serverless':
                try:
                    durations[path].append(float(row['durationMs']))
                except:
                    pass
            
            # Track memory
            if row['maxMemoryUsed']:
                try:
                    memory.append(int(row['maxMemoryUsed']))
                except:
                    pass
            
            # Track bots
            ua = row.get('requestUserAgent', '').lower()
            if 'bot' in ua or 'crawler' in ua or 'spider' in ua:
                bots[row['requestUserAgent']] += 1
            
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
    
    print('\n📊 TOP 20 REQUESTED PATHS:')
    print('-'*80)
    for i, (p, c) in enumerate(paths.most_common(20), 1):
        print(f'{i:2}. {c:6,}x - {p[:65]}')
    
    print('\n🔢 STATUS CODES:')
    print('-'*80)
    total = sum(status.values())
    for s, c in sorted(status.items()):
        pct = (c/total)*100
        print(f'  {s}: {c:,} ({pct:.2f}%)')
    
    print('\n💾 CACHE PERFORMANCE (ISR):')
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
    for t, c in types.most_common():
        pct = (c/type_total)*100
        print(f'  {t}: {c:,} ({pct:.2f}%)')
    
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
    
    print('\n🤖 TOP 10 BOT TRAFFIC (Consuming Bandwidth):')
    print('-'*80)
    bot_total = sum(bots.values())
    for i, (bot, c) in enumerate(bots.most_common(10), 1):
        pct = (c/bot_total)*100
        print(f'{i:2}. {c:5,}x ({pct:5.2f}%) - {bot[:58]}')
    
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
        miss_count = sum(1 for msg in blogger_api_calls if 'Cache MISS' in msg)
        hit_count = api_count - miss_count
        if api_count > 0:
            api_cache_rate = (hit_count / api_count) * 100
            print(f'API Cache Hit Rate: {api_cache_rate:.2f}%')
    
    print(f'\n{"="*80}')
    print('SUMMARY & RECOMMENDATIONS')
    print('='*80)
    print(f'📈 Total Requests Analyzed: {sum(paths.values()):,}')
    print(f'⚡ Serverless Requests: {types.get("serverless", 0):,} ({types.get("serverless", 0)/type_total*100:.2f}%)')
    print(f'🌐 Edge/Middleware Requests: {types.get("middleware", 0):,} ({types.get("middleware", 0)/type_total*100:.2f}%)')
    print(f'💾 ISR Cache Hit Rate: {cache_hit_rate:.2f}%')
    print(f'❌ Error Rate (410): {status.get("410", 0):,} ({status.get("410", 0)/total*100:.2f}%)')
    print(f'🤖 Bot Traffic: {bot_total:,} ({bot_total/total*100:.2f}%)')
    
    print('\n🎯 OPTIMIZATION OPPORTUNITIES:')
    print('-'*80)
    
    if cache_hit_rate < 80:
        print('  ⚠️  LOW CACHE HIT RATE: Increase ISR revalidation time')
    
    if status.get('410', 0) > 100:
        print('  ⚠️  HIGH 410 ERRORS: Add redirects in vercel.json for old WordPress URLs')
    
    if types.get('serverless', 0) / type_total > 0.5:
        print('  ⚠️  HIGH SERVERLESS USAGE: Move more logic to edge or static generation')
    
    slow_routes = [p for p, avg in avg_dur.items() if avg > 3000]
    if slow_routes:
        print(f'  ⚠️  {len(slow_routes)} ROUTES >3s: Optimize Blogger API calls or pre-generate')
    
    if avg_mem > 500:
        print(f'  ⚠️  HIGH MEMORY USAGE: Optimize data fetching and processing')
    
    print('\n' + '='*80)

if __name__ == '__main__':
    csv_path = sys.argv[1] if len(sys.argv) > 1 else '/Users/psathish18/Downloads/vercel - Sheet1.csv'
    analyze_logs(csv_path)
