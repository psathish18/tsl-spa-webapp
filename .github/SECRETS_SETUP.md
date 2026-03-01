# GitHub Secrets Setup for Blogger Automation

This guide explains how to set up GitHub Secrets for automated Blogger posting in GitHub Actions.

## Required Secrets

You need to add 2 secrets to your GitHub repository:

1. `BLOGGER_CLIENT_SECRET` - OAuth client credentials
2. `BLOGGER_TOKENS` - Access and refresh tokens

## Setup Instructions

### Step 1: Get Client Secret Content

Run this command locally:

```bash
cat scripts/blogger-client-secret.json
```

Copy the entire JSON output. It should look like:

```json
{"web":{"client_id":"876679878715...","project_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"GOCSPX-...","redirect_uris":["https://developers.google.com/oauthplayground"]}}
```

### Step 2: Get Tokens Content

After running `npm run setup-blogger-auth` locally, get the tokens:

```bash
cat scripts/.blogger-tokens.json
```

Copy the entire JSON output. It should look like:

```json
{
  "access_token": "ya29.a0...",
  "refresh_token": "1//0g...",
  "expires_at": 1234567890123,
  "token_type": "Bearer"
}
```

### Step 3: Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

#### Add BLOGGER_CLIENT_SECRET

- Name: `BLOGGER_CLIENT_SECRET`
- Value: Paste the entire content from `blogger-client-secret.json`
- Click **Add secret**

#### Add BLOGGER_TOKENS

- Name: `BLOGGER_TOKENS`
- Value: Paste the entire content from `.blogger-tokens.json`
- Click **Add secret**

## Verification

### Test the Workflow

1. Go to **Actions** tab in your repository
2. Select "Fetch Google Trends and Post to Blogger" workflow
3. Click **Run workflow** → **Run workflow**
4. Wait for completion (~2-5 minutes)
5. Check the logs to verify posting succeeded

### Check Results

After the workflow runs:

1. Visit https://tslshared.blogspot.com to see posted content
2. Download artifacts from the workflow run to view results:
   - `social-media-blogger-results.json` - Posting results
   - `filtered-keywords.json` - Filtered keywords
   - `missing-keywords.json` - Keywords without lyrics

## Token Refresh

The workflow automatically refreshes tokens when expired. However, the refresh token in the secret will remain valid indefinitely unless:

1. You revoke access at https://myaccount.google.com/permissions
2. You change your Google account password
3. You manually revoke the token

### Updating Tokens (if needed)

If tokens become invalid:

1. Run locally: `npm run setup-blogger-auth`
2. Get new tokens: `cat scripts/.blogger-tokens.json`
3. Update `BLOGGER_TOKENS` secret in GitHub
4. Re-run the workflow

## Schedule

The workflow runs:
- **Daily at 6 PM UTC** (adjust in `.github/workflows/google-trends.yaml`)
- **Manual trigger** via "Run workflow" button

To change the schedule, edit the cron expression:

```yaml
schedule:
  # Run at 6 PM UTC daily
  - cron: '0 18 * * *'
  
  # For IST (6 PM = 12:30 PM UTC)
  - cron: '30 12 * * *'
  
  # For EST (6 PM = 11 PM UTC)
  - cron: '0 23 * * *'
```

## Security Notes

🔐 **GitHub Secrets are encrypted** and only exposed to workflow runs.

✅ **Safe practices:**
- Secrets are masked in logs
- Only accessible during workflow execution
- Not visible to anyone viewing the repository

⚠️ **Keep secure:**
- Never commit token files to git (already in `.gitignore`)
- Don't share secret values
- Rotate tokens if compromised

## Troubleshooting

### "BLOGGER_CLIENT_SECRET not set" error

**Cause**: Secret not added or has wrong name.

**Fix**: 
1. Check secret name is exactly `BLOGGER_CLIENT_SECRET` (case-sensitive)
2. Verify the secret value is valid JSON
3. Re-add the secret if needed

### "No refresh token available" error

**Cause**: Tokens secret is missing or doesn't have refresh token.

**Fix**:
1. Run `npm run setup-blogger-auth` locally
2. Update `BLOGGER_TOKENS` secret with new content
3. Make sure the tokens JSON has `refresh_token` field

### "unauthorized_client" error

**Cause**: Client secret doesn't match the authorization.

**Fix**:
1. Verify `BLOGGER_CLIENT_SECRET` matches your OAuth credentials
2. Go to Google Cloud Console and check redirect URIs
3. Re-run setup locally and update both secrets

### Posts not appearing on blog

**Cause**: Authentication succeeded but posting failed.

**Fix**:
1. Download workflow artifacts to check `social-media-blogger-results.json`
2. Look for error messages in the results
3. Verify blog ID is correct in `post-social-media-to-blogger.js`

## Workflow Steps

The complete workflow:

1. ✅ Fetch trending keywords from Google Trends
2. ✅ Filter keywords with GitHub Copilot AI
3. ✅ Generate social media posts with AI
4. ✅ Setup Blogger authentication from secrets
5. ✅ Post to Blogger with automatic token refresh
6. ✅ Upload results as artifacts

## Testing Locally

Before relying on GitHub Actions, test locally:

```bash
# Complete workflow
npm run trends
npm run trends-ai
npm run post-social-media

# Check results
cat social-media-blogger-results.json
```

Visit https://tslshared.blogspot.com to verify posts were created.

## Monitoring

### Check Workflow Runs

- **Actions** tab shows all workflow runs
- Click a run to see detailed logs
- Download artifacts for detailed results

### Email Notifications

GitHub sends emails when workflows fail. To configure:

1. Go to GitHub profile → **Settings** → **Notifications**
2. Enable "Actions" notifications
3. Choose email preferences

### Success Metrics

A successful run will show:
- ✅ All steps completed
- 📊 Artifacts uploaded
- 📱 Posts visible on blog
- 🎉 No error messages in logs

## Cost Considerations

All services used are free:
- ✅ GitHub Actions (2000 minutes/month on free tier)
- ✅ Blogger API (free)
- ✅ GitHub Copilot Models (free for GitHub users)

Daily 6 PM run uses ~5 minutes per day = 150 minutes/month (well within limits).
