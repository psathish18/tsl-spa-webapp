# Web Site Optimization Folder

**Purpose**: Central location for all Vercel log analysis, optimization strategies, and tracking documentation.

---

## 📁 Folder Structure

```
web-site-optimization/
├── README.md                          # This file - folder overview
├── VERCEL_OPTIMIZATION_PLAN.md        # Master optimization strategy
├── CACHE_LAYERS_EXPLAINED.md          # Cache hierarchy documentation
├── ANALYSIS_HISTORY.md                # Timestamped analysis results
└── analyze-vercel-logs.py             # Python script for log analysis
```

---

## 📋 File Descriptions

### `VERCEL_OPTIMIZATION_PLAN.md`
**Purpose**: Comprehensive optimization strategy based on log analysis findings  
**Contains**:
- Critical issues identified from log analysis
- 3-week implementation plan
- Priority-based optimization tasks
- Success metrics and targets

**Update Policy**: Add timestamp section at top when findings change

### `CACHE_LAYERS_EXPLAINED.md`
**Purpose**: Documentation explaining cache hierarchy in the app  
**Contains**:
- Layer 1: Next.js ISR (Page-level cache)
- Layer 2: API Fetch Options (Blogger API cache)
- Layer 3: Vercel CDN (Automatic edge caching)
- Common misconceptions and clarifications

**Update Policy**: Add timestamp when cache strategy changes

### `ANALYSIS_HISTORY.md`
**Purpose**: Track all log analysis iterations over time  
**Contains**:
- Timestamped analysis updates
- Key findings for each analysis
- Optimization actions taken
- Metrics comparison (before/after)
- Next steps and planned analyses

**Update Policy**: **ALWAYS append new analysis** with timestamp, NEVER create new files

### `analyze-vercel-logs.py`
**Purpose**: Python script to analyze Vercel CSV log exports  
**Usage**:
```bash
python analyze-vercel-logs.py /path/to/vercel-logs.csv
```

**Output**:
- Request pattern analysis
- Cache hit rate calculations
- Bot traffic detection
- Error analysis (404, 410, 500)
- Performance metrics (slow routes, memory usage)
- Top 20 paths by requests

---

## 🔄 Update Workflow

### When Running New Analysis:

1. **Export Vercel Logs**
   - Go to Vercel Dashboard → Deployments → Logs
   - Export logs as CSV
   - Save with descriptive name: `vercel-logs-YYYY-MM-DD.csv`

2. **Run Analysis Script**
   ```bash
   cd /Users/psathish18/Documents/Github/tsl-spa-webapp/web-site-optimization
   python analyze-vercel-logs.py /path/to/vercel-logs-YYYY-MM-DD.csv > analysis-output.txt
   ```

3. **Update ANALYSIS_HISTORY.md**
   - Add new section with current timestamp
   - Copy key findings from script output
   - Document optimization actions taken
   - Compare metrics with previous analysis
   - Set next steps

4. **Update VERCEL_OPTIMIZATION_PLAN.md** (if strategy changes)
   - Add timestamp to "Update History" section
   - Update critical issues if new ones found
   - Adjust priority tasks based on new data
   - Update success metrics

5. **Update CACHE_LAYERS_EXPLAINED.md** (if cache strategy changes)
   - Add timestamp at top
   - Document new cache layer interactions
   - Add examples of new cache configurations

---

## ⚠️ Important Rules

### ❌ DO NOT:
- Create new markdown files for each analysis
- Overwrite historical data in ANALYSIS_HISTORY.md
- Delete timestamp sections from any file
- Create duplicate documentation files

### ✅ DO:
- Always append to ANALYSIS_HISTORY.md with timestamps
- Update existing files with timestamp sections
- Keep all historical analysis data
- Use the provided template for consistency
- Compare metrics with previous analyses

---

## 📊 Key Metrics to Track

| Metric | Baseline (2026-02-06) | Target | Current |
|--------|------------------------|--------|---------|
| Cache Hit Rate | 10.97% | >80% | - |
| Serverless Usage | 72.61% | <30% | - |
| Avg Response Time | TBD | <500ms | - |
| Bot Traffic % | 56.65% | <40% | - |
| 410 Errors | 1,874 | 0 | - |
| Bandwidth/Month | TBD | <80GB | - |
| Function GB-Hrs | TBD | <50 | - |

**Note**: Update "Current" column after each analysis iteration

---

## 🎯 Optimization Goals

### Short-term (Week 1-2)
- Reduce WordPress 410 errors to 0
- Improve cache hit rate by optimizing ISR strategy
- Reduce bot traffic impact with crawl delays

### Medium-term (Week 3-4)
- Reduce serverless usage below 50%
- Improve average response time to <500ms
- Optimize API call patterns

### Long-term (Month 2+)
- Maintain bandwidth under 80GB/month
- Keep function execution under 50 GB-Hrs/month
- Achieve >60% cache hit rate for popular content
- Edge function usage >50%

---

## 🛠️ Tools Reference

### Vercel CLI Commands
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# View real-time logs
vercel logs --follow

# View logs from last hour
vercel logs --since 1h

# Export logs (requires dashboard)
# Go to: Dashboard → Deployments → Functions → Export
```

### Python Script Usage
```bash
# Basic usage
python analyze-vercel-logs.py /path/to/logs.csv

# Save output to file
python analyze-vercel-logs.py /path/to/logs.csv > analysis-results.txt

# With custom thresholds (modify script)
# Edit SLOW_THRESHOLD = 3.0 # seconds
# Edit HIGH_MEMORY_THRESHOLD = 100 # MB
```

---

## 📚 Related Documentation

- **Vercel Hobby Plan Limits**: https://vercel.com/docs/accounts/plans#hobby
- **Next.js ISR**: https://nextjs.org/docs/pages/building-your-application/data-fetching/incremental-static-regeneration
- **Vercel Edge Network**: https://vercel.com/docs/edge-network/overview
- **Web Vitals**: https://web.dev/vitals/

---

**Last Updated**: 2026-02-06  
**Maintained By**: Website Optimization Agent
