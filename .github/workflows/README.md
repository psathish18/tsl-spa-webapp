# GitHub Actions Workflows

This directory contains automated workflows for the TSL SPA WebApp.

## 📊 Hourly Log Analysis Workflow

**File:** `hourly-log-analysis.yml`

### Purpose
Automatically analyzes Vercel deployment logs every hour to track:
- Edge vs Serverless request distribution
- Monthly usage projections
- Cache hit rates
- Potential optimization opportunities

### ⚙️ Setup Required

The workflow requires a `VERCEL_TOKEN` to fetch logs from your Vercel deployment.

#### Step 1: Create Vercel Token

1. Go to [Vercel Account Tokens](https://vercel.com/account/tokens)
2. Click **"Create Token"**
3. Name it: `GitHub Actions Log Analyzer`
4. Set expiration as needed (or no expiration)
5. Copy the generated token

#### Step 2: Add Token to GitHub Secrets

1. Go to your repository settings: `https://github.com/<owner>/<repo>/settings/secrets/actions`
   - For this repo: https://github.com/psathish18/tsl-spa-webapp/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `VERCEL_TOKEN`
4. Value: Paste your Vercel token from Step 1
5. Click **"Add secret"**

#### Step 3: Test the Workflow

1. Go to the Actions tab: `https://github.com/<owner>/<repo>/actions`
   - For this repo: https://github.com/psathish18/tsl-spa-webapp/actions
2. Select **"Hourly Vercel Log Analysis"**
3. Click **"Run workflow"** → **"Run workflow"**
4. Wait 30-60 seconds and check the results

### 🔄 How It Works

Once the `VERCEL_TOKEN` is set up:

1. **Scheduled Runs**: Automatically runs every hour at :05 minutes (e.g., 00:05, 01:05, 02:05)
2. **Log Analysis**: Fetches logs from the last hour and analyzes traffic patterns
3. **Report Generation**: Appends analysis to `web-site-optimization/ANALYSIS_HISTORY.md`
4. **Auto-Commit**: Commits results to the `automated-log-analysis` branch
5. **PR Creation**: Creates/updates a PR with accumulated analyses

### ⚠️ Without VERCEL_TOKEN

If `VERCEL_TOKEN` is not set, the workflow will:
- ✅ Run successfully (no errors)
- ℹ️ Skip log analysis with helpful setup instructions
- 📋 Display setup steps in the workflow log

### 📈 What Gets Analyzed

- **Traffic Metrics**: Total requests, Edge (CDN) vs Serverless (Functions)
- **Response Codes**: 2xx, 3xx, 4xx, 5xx status codes
- **Cache Performance**: Hit rate and efficiency
- **Cost Projections**: Estimated monthly usage for Hobby plan limits
- **Optimization Opportunities**: Serverless endpoints that could use blob storage

### 📁 Output Location

All analysis results are saved to:
```
web-site-optimization/ANALYSIS_HISTORY.md
```

You can view the complete history there or check the automated PR.

### 🛠️ Troubleshooting

#### Workflow Failing with Vercel Token Error

- Ensure `VERCEL_TOKEN` secret is set in repository settings
- Verify the token is valid and not expired
- Check token has appropriate permissions for your Vercel project

#### No Logs Being Fetched

- Ensure your Vercel deployment is active
- Check that the token has access to the correct project
- Verify Vercel CLI version is up to date

#### Analysis Not Committing

- Check that the workflow has write permissions
- Ensure the `automated-log-analysis` branch is not protected
- Verify `GITHUB_TOKEN` has sufficient permissions

### 📚 Additional Resources

- [Vercel Logs Documentation](https://vercel.com/docs/cli/logs)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Workflow Setup Guide](../../web-site-optimization/HOURLY_ANALYSIS_SETUP.md)

---

## 🚀 Other Workflows

### Upload to Blob on Comment
**File:** `upload-to-blob-on-comment.yml`

Triggered by issue comments to upload song data to blob storage.

### Generate Song JSON on Issue
**File:** `generate-song-json-on-issue.yml`

Automatically generates song JSON files when new issues are created.

---

## 💡 Tips

1. **Monitor Usage**: Check the Actions tab regularly to ensure workflows are running smoothly
2. **Review PRs**: The automated log analysis PR should be reviewed weekly
3. **Token Rotation**: Rotate your Vercel token periodically for security
4. **Adjust Schedule**: If needed, modify the cron schedule in the workflow file

## 🔒 Security

- Never commit tokens directly to the repository
- Always use GitHub Secrets for sensitive credentials
- Limit token permissions to only what's necessary
- Set token expiration dates when possible

---

*For questions or issues, please open a GitHub issue.*
