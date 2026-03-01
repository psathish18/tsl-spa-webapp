# Automated Blogger Posting Workflow - Quick Reference

## Overview

Your GitHub Actions workflow now automatically:
1. 🔍 Fetches trending Tamil song keywords from Google Trends
2. 🤖 Filters keywords with GitHub Copilot AI
3. ✍️ Generates social media posts with AI
4. 📱 Posts content to Blogger (tslshared.blogspot.com)

**Schedule**: Daily at 6 PM UTC

## Setup Checklist

### ✅ Step 1: Add GitHub Secrets

Run this command to see your secret values:

```bash
npm run get-github-secrets
```

Then add to GitHub:

1. Go to: https://github.com/psathish18/tsl-spa-webapp/settings/secrets/actions
2. Click "New repository secret"
3. Add **BLOGGER_CLIENT_SECRET** (copy entire JSON)
4. Add **BLOGGER_TOKENS** (copy entire JSON)

See detailed guide: [.github/SECRETS_SETUP.md](.github/SECRETS_SETUP.md)

### ✅ Step 2: Test the Workflow

1. Go to [Actions](https://github.com/psathish18/tsl-spa-webapp/actions)
2. Select "Fetch Google Trends and Post to Blogger"
3. Click "Run workflow" → "Run workflow"
4. Wait 2-5 minutes for completion
5. Check logs for any errors

### ✅ Step 3: Verify Posts

Visit https://tslshared.blogspot.com to see posted content.

## Local Testing

Test the complete flow locally before relying on automation:

```bash
# 1. Fetch trending keywords
npm run trends

# 2. Filter with AI and generate posts
npm run trends-ai

# 3. Post to Blogger
npm run post-social-media
```

## Workflow Features

### Automatic Authentication
- ✅ Tokens refresh automatically when expired
- ✅ No manual intervention needed
- ✅ Secure: Secrets are encrypted in GitHub

### Image Handling
- ✅ Extracts song images from JSON files
- ✅ Formats posts with proper HTML
- ✅ Includes movie thumbnails

### Error Handling
- ✅ Graceful failure handling
- ✅ Results saved as artifacts
- ✅ Detailed logs for debugging

### Rate Limiting
- ✅ 2-second delay between posts
- ✅ Prevents API throttling
- ✅ Safe for batch posting

## Schedule Configuration

Current: **Daily at 6 PM UTC**

To change timezone, edit [.github/workflows/google-trends.yaml](.github/workflows/google-trends.yaml):

```yaml
schedule:
  # UTC time (default)
  - cron: '0 18 * * *'
  
  # IST (India Standard Time) - 6 PM IST = 12:30 PM UTC
  - cron: '30 12 * * *'
  
  # EST (Eastern Standard Time) - 6 PM EST = 11 PM UTC
  - cron: '0 23 * * *'
  
  # PST (Pacific Standard Time) - 6 PM PST = 2 AM UTC (next day)
  - cron: '0 2 * * *'
```

## Monitoring

### Check Workflow Status

**Latest run**: https://github.com/psathish18/tsl-spa-webapp/actions

**Email notifications**: Enabled by default for failures

### View Results

After each run, download artifacts:
- `social-media-blogger-results.json` - Posting results
- `filtered-keywords.json` - Filtered keywords
- `missing-keywords.json` - Keywords without lyrics

### Success Indicators

✅ All workflow steps completed  
✅ Green checkmark in Actions tab  
✅ Posts visible on https://tslshared.blogspot.com  
✅ No error messages in logs

## Troubleshooting

### Workflow fails at "Setup Blogger Authentication"

**Cause**: Secrets not configured

**Fix**: 
```bash
npm run get-github-secrets
```
Then add both secrets to GitHub.

### Workflow succeeds but no posts created

**Cause**: No trending keywords matched existing songs

**Fix**: Check `missing-keywords.json` artifact to see what's missing. Add lyrics for those songs.

### "unauthorized_client" error

**Cause**: Client secret doesn't match

**Fix**:
1. Run `npm run setup-blogger-auth` locally
2. Run `npm run get-github-secrets`
3. Update both GitHub secrets

### Token expired errors

**Cause**: Refresh token was revoked

**Fix**:
1. Run `npm run setup-blogger-auth` locally
2. Update `BLOGGER_TOKENS` secret in GitHub

## Manual Workflow Trigger

Run workflow anytime:

1. Go to [Actions → Fetch Google Trends and Post to Blogger](https://github.com/psathish18/tsl-spa-webapp/actions/workflows/google-trends.yaml)
2. Click "Run workflow"
3. Select branch (usually: `main` or `copilot/update-google-trends-workflow`)
4. Click "Run workflow"

## Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run trends` | Fetch Google Trends keywords |
| `npm run trends-ai` | Filter keywords & generate posts |
| `npm run setup-blogger-auth` | One-time authentication setup |
| `npm run get-github-secrets` | Display secrets for GitHub |
| `npm run post-social-media` | Post to Blogger |

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/fetch-google-trends.ts` | Fetch trending keywords |
| `scripts/filter-with-ai.ts` | AI filtering & post generation |
| `scripts/blogger-token-manager.js` | Automatic token refresh |
| `scripts/post-social-media-to-blogger.js` | Post to Blogger |
| `scripts/setup-blogger-auth.js` | Initial auth setup |
| `scripts/get-secrets-for-github.js` | Display secret values |
| `.github/workflows/google-trends.yaml` | GitHub Actions workflow |

## Security

🔐 **Secrets are secure**:
- Encrypted in GitHub
- Masked in logs
- Not visible in repository
- Only accessible during workflow runs

⚠️ **Never commit**:
- `scripts/.blogger-tokens.json`
- `scripts/blogger-client-secret.json`

These are in `.gitignore`.

## Costs

All free:
- ✅ GitHub Actions: 2000 min/month free
- ✅ Blogger API: Free
- ✅ GitHub Copilot Models: Free

Daily 6 PM run = ~5 min/day = 150 min/month (well within limits)

## Support

- 📖 [Full Setup Guide](.github/SECRETS_SETUP.md)
- 📖 [Auto Auth Guide](BLOGGER_AUTO_AUTH.md)
- 📖 [Social Media Posting Guide](SOCIAL_MEDIA_POSTING_GUIDE.md)
- 🐛 [GitHub Issues](https://github.com/psathish18/tsl-spa-webapp/issues)

## Next Steps

1. ✅ Add GitHub secrets (if not done)
2. ✅ Test workflow manually
3. ✅ Verify posts on blog
4. ✅ Monitor first automated run at 6 PM UTC
5. ✅ Adjust schedule if needed

---

**Status**: ✅ Ready to use!

Last updated: March 1, 2026
