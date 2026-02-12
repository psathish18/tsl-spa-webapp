# Automated Hourly Vercel Log Analysis

This document explains how to set up automated hourly log analysis for your Vercel deployment.

---

## 📋 Overview

The system automatically:
- ✅ Fetches Vercel logs every hour
- ✅ Analyzes traffic patterns (Edge vs Serverless)
- ✅ Tracks monthly usage projections
- ✅ Identifies potential blob storage misses
- ✅ Appends results to `ANALYSIS_HISTORY.md`
- ✅ Commits changes to Git (optional)

---

## 🚀 Option 1: GitHub Actions (Recommended)

**Pros:**
- ✅ Free for public repos
- ✅ Runs in cloud (no local dependency)
- ✅ Reliable scheduling
- ✅ Auto-commits results

**Setup:**

### Step 1: Create Vercel Token

1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it: `GitHub Actions Log Analyzer`
4. Copy the token

### Step 2: Add Token to GitHub Secrets

1. Go to your repo: https://github.com/psathish18/tsl-spa-webapp/settings/secrets/actions
2. Click "New repository secret"
3. Name: `VERCEL_TOKEN`
4. Value: Paste your Vercel token
5. Click "Add secret"

### Step 3: Enable GitHub Actions

The workflow file is already created at:
`.github/workflows/hourly-log-analysis.yml`

It will automatically:
- Run every hour at :05 minutes (e.g., 00:05, 01:05, 02:05)
- Fetch logs from last hour
- Analyze and append to `ANALYSIS_HISTORY.md`
- Commit and push results

### Step 4: Test Manually

1. Go to: https://github.com/psathish18/tsl-spa-webapp/actions
2. Click "Hourly Vercel Log Analysis"
3. Click "Run workflow" → "Run workflow"
4. Wait 30-60 seconds and check the results

### Monitor GitHub Actions:

- View runs: https://github.com/psathish18/tsl-spa-webapp/actions
- Check logs for any errors
- Each run takes ~30 seconds

---

## 🖥️ Option 2: Local Cron Job (Mac)

**Pros:**
- ✅ Zero external dependencies
- ✅ Instant local results
- ✅ No GitHub secrets needed

**Cons:**
- ⚠️ Requires Mac to be running 24/7
- ⚠️ Manual Git commits (unless automated)

**Setup:**

### Step 1: Test Script Manually

```bash
cd /Users/psathish18/Documents/Github/tsl-spa-webapp
./scripts/analyze-hourly-logs.sh
```

Expected output:
```
📊 Analysis Results:
Total Requests: 85
Edge (ε): 80 (94.1%)
Serverless (λ): 5 (5.9%)
✅ Analysis complete and saved!
```

### Step 2: Set Up Cron Job

Open crontab editor:
```bash
crontab -e
```

Add this line (runs every hour at :05 minutes):
```bash
5 * * * * cd /Users/psathish18/Documents/Github/tsl-spa-webapp && ./scripts/analyze-hourly-logs.sh >> /tmp/vercel-analysis.log 2>&1
```

Save and exit (`:wq` if using vim)

### Step 3: Verify Cron Job

List your cron jobs:
```bash
crontab -l
```

Check logs after an hour:
```bash
tail -f /tmp/vercel-analysis.log
```

### Step 4: Auto-Commit (Optional)

To automatically commit results, add to cron:
```bash
5 * * * * cd /Users/psathish18/Documents/Github/tsl-spa-webapp && ./scripts/analyze-hourly-logs.sh && git add web-site-optimization/ANALYSIS_HISTORY.md && git commit -m "chore: hourly analysis $(date)" && git push >> /tmp/vercel-analysis.log 2>&1
```

---

## 📊 What Gets Analyzed

The script tracks:

### Traffic Metrics:
- **Total Requests** per hour
- **Edge (ε) %** - CDN cache hits
- **Serverless (λ) %** - Function invocations
- **Redirects (308/301)** - Old WordPress URLs
- **Blocked (410)** - Malicious requests
- **404 Errors** - Not found pages

### Monthly Projections:
- **Edge Invocations** (target: <1M/month)
- **Serverless Invocations** (minimize for Hobby plan)
- **Cache Hit Rate** (target: >85%)

### Optimization Insights:
- Serverless endpoints (blob storage misses)
- Status indicators (✅ Safe / ⚠️ Monitor / 🔴 Critical)
- Trends over time

---

## 📁 Output Format

Results appended to `web-site-optimization/ANALYSIS_HISTORY.md`:

```markdown
## Hourly Analysis - 2026-02-06 21:05

### Quick Stats:
- **Total Requests**: 85
- **Edge (ε)**: 80 (94.1%) → Monthly: 57,600 / 1M ✅ Safe
- **Serverless (λ)**: 5 (5.9%) → Monthly: 3,600 ✅ Safe
- **Redirects (308/301)**: 12 (14.1%)
- **Blocked (410)**: 3
- **Not Found (404)**: 0

### Serverless Endpoints (Potential Blob Misses):
```
/oh-priya-priya-song-lyrics-geethanjali.html
/kadal-songs-lyrics.html
```

### Status:
- Edge Usage: ✅ Safe (94.1% of traffic)
- Serverless Usage: ✅ Safe (5 invocations this hour)
- Cache Hit Rate: 94.1% (Target: >85%)
```

---

## 🔍 Analyzing Results

### Check Current Status:

```bash
tail -50 web-site-optimization/ANALYSIS_HISTORY.md
```

### Find Trends:

```bash
# Count total hourly analyses
grep "## Hourly Analysis" web-site-optimization/ANALYSIS_HISTORY.md | wc -l

# Find high serverless usage hours
grep "Serverless (λ):" web-site-optimization/ANALYSIS_HISTORY.md | grep -v "0 (0.0%)"

# Track edge invocations trend
grep "Monthly:" web-site-optimization/ANALYSIS_HISTORY.md | grep "Edge"
```

### Alert Conditions:

**🔴 Critical - Take Action:**
- Edge invocations: >900,000/month (approaching 1M limit)
- Serverless: >100 invocations/hour (2,400+/day)
- Cache hit rate: <70%

**⚠️ Monitor:**
- Edge invocations: 800,000-900,000/month
- Serverless: 50-100/hour
- Cache hit rate: 70-85%

**✅ Safe:**
- Edge invocations: <800,000/month
- Serverless: <50/hour
- Cache hit rate: >85%

---

## 🛠️ Troubleshooting

### GitHub Actions Not Running:

1. Check workflow syntax:
   ```bash
   cat .github/workflows/hourly-log-analysis.yml
   ```

2. Verify VERCEL_TOKEN secret:
   - Go to repo settings → Secrets
   - Ensure `VERCEL_TOKEN` exists

3. Check Actions tab for errors:
   - https://github.com/psathish18/tsl-spa-webapp/actions

### Script Fails Locally:

1. Ensure Vercel CLI is installed:
   ```bash
   vercel --version
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Check permissions:
   ```bash
   ls -la scripts/analyze-hourly-logs.sh
   # Should show: -rwxr-xr-x (executable)
   ```

4. Test manually:
   ```bash
   ./scripts/analyze-hourly-logs.sh
   ```

### Cron Job Not Running:

1. Check cron is active:
   ```bash
   ps aux | grep cron
   ```

2. View cron logs:
   ```bash
   tail -f /tmp/vercel-analysis.log
   ```

3. Test cron schedule:
   ```bash
   # This should print next 5 run times
   crontab -l | tail -1 | awk '{print $1, $2, $3, $4, $5}'
   ```

---

## 📈 Optimization Workflow

Based on hourly analysis:

### 1. Daily Check (Morning):
```bash
# View last 24 hours of analyses
tail -200 web-site-optimization/ANALYSIS_HISTORY.md
```

**Look for:**
- ⚠️ Increasing serverless invocations
- 🔴 Spikes in 404 errors
- 📊 Traffic patterns (peak hours)

### 2. Weekly Review:
- Compare weekly serverless totals
- Identify missing blob files
- Track 308 redirect decrease (WordPress migration)

### 3. Monthly Report:
- Generate summary from all hourly analyses
- Calculate actual vs projected usage
- Plan next month's optimizations

---

## 🎯 Recommended: GitHub Actions

For Hobby plan sustainability, I recommend **GitHub Actions**:

1. ✅ Set and forget - runs automatically
2. ✅ Free for public repos
3. ✅ No local dependency
4. ✅ Auto-commits to track history
5. ✅ Email notifications on failures

**Setup time: 5 minutes**

Just add the `VERCEL_TOKEN` secret and you're done! 🚀

---

## 📊 Expected Results

With 3000 songs and moderate traffic:

| Metric | Hourly | Daily | Monthly | Status |
|--------|--------|-------|---------|--------|
| Edge Invocations | 50-100 | 1,200-2,400 | 36K-72K | ✅ 3-7% of limit |
| Serverless | 2-10 | 48-240 | 1.4K-7.2K | ✅ Safe |
| Cache Hit Rate | 90-95% | 90-95% | 90-95% | ✅ Excellent |
| Bandwidth | ~50MB | ~1.2GB | ~36GB | ✅ 36% of limit |

**These numbers indicate a healthy, optimized deployment.** 🎉

---

## Next Steps:

1. ✅ Add `VERCEL_TOKEN` to GitHub Secrets
2. ✅ Test workflow manually
3. ✅ Wait for first automated run (next hour at :05)
4. ✅ Review `ANALYSIS_HISTORY.md` after 24 hours
5. ✅ Adjust cron schedule if needed (e.g., every 4 hours instead)

Happy monitoring! 📊
