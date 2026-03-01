# Automatic Blogger Token Management

This system provides automatic token refresh for Blogger API, eliminating the need to manually refresh tokens every hour.

## How It Works

1. **One-time setup**: Authenticate once and get a refresh token
2. **Automatic refresh**: Tokens are automatically refreshed when they expire
3. **Seamless posting**: No more manual token management needed

## Setup (One-Time)

Run this command to set up authentication:

```bash
npm run setup-blogger-auth
```

This will:
1. Open an OAuth URL in your browser
2. Ask you to authorize the app
3. Save your refresh token locally
4. Enable automatic token refresh

### Detailed Setup Steps

1. **Run setup command**:
   ```bash
   npm run setup-blogger-auth
   ```

2. **Open the displayed URL** in your browser

3. **Sign in** with the Google account that owns the blog

4. **Grant permissions** when prompted

5. **Copy the authorization code** from the redirect URL
   - After authorization, you'll be redirected to: `https://developers.google.com/oauthplayground/?code=4/0A...XYZ`
   - Copy the long code after `code=`

6. **Paste the code** into the terminal and press Enter

7. **Done!** Tokens are saved to `scripts/.blogger-tokens.json`

## Usage

After setup, just run:

```bash
npm run post-social-media
```

The script will:
- ✅ Check if token is expired
- ✅ Automatically refresh if needed
- ✅ Post to Blogger without manual intervention

## Files Created

- `scripts/.blogger-tokens.json` - Stores access & refresh tokens (in .gitignore)
- `scripts/blogger-client-secret.json` - OAuth client credentials (in .gitignore)
- `scripts/blogger-token-manager.js` - Token management module

## Security

🔐 **Important**: Token files are automatically excluded from git via `.gitignore`:
- `scripts/.blogger-tokens.json`
- `scripts/blogger-client-secret.json`

Never commit these files to version control.

## Token Information

To check token status:

```javascript
const BloggerTokenManager = require('./scripts/blogger-token-manager');
const manager = new BloggerTokenManager();
console.log(manager.getTokenInfo());
```

Output:
```json
{
  "hasToken": true,
  "hasRefreshToken": true,
  "isExpired": false,
  "expiresIn": 3542,
  "expiresAt": "2026-03-01T12:34:56.789Z"
}
```

## Troubleshooting

### "No refresh token received"

This happens if you've already authenticated before. To fix:

1. Go to https://myaccount.google.com/permissions
2. Find and remove your app
3. Run `npm run setup-blogger-auth` again

### "Token refresh failed"

Your refresh token may have been revoked. Re-run setup:

```bash
npm run setup-blogger-auth
```

### "Client secret not found"

Make sure `blogger-client-secret.json` exists in the scripts directory:

```bash
ls -la scripts/blogger-client-secret.json
```

## Complete Workflow

```bash
# 1. One-time setup (only needed once)
npm run setup-blogger-auth

# 2. Generate social media posts with AI
npm run trends
npm run trends-ai

# 3. Post to Blogger (tokens refresh automatically)
npm run post-social-media

# 4. Repeat step 2-3 anytime - no re-authentication needed!
```

## Benefits

✅ **No manual token refresh** - Automatically refreshes when expired  
✅ **Long-term authentication** - Works indefinitely with refresh token  
✅ **Secure** - Tokens never exposed in environment variables  
✅ **Simple** - One command to post, no token management  
✅ **Reliable** - 5-minute expiry buffer prevents mid-operation failures

## Technical Details

- **Access Token Lifetime**: 1 hour
- **Refresh Buffer**: 5 minutes (refreshes 5 min before expiry)
- **Refresh Token**: Never expires (unless revoked)
- **Scope**: `https://www.googleapis.com/auth/blogger`
- **Token Storage**: Local JSON file

## Comparison: Old vs New

### Old Way (Manual)
```bash
# Every hour:
1. Go to OAuth Playground
2. Click "Refresh access token"
3. Copy new token
4. Export BLOGGER_ACCESS_TOKEN="..."
5. Run script
```

### New Way (Automatic)
```bash
# Once:
npm run setup-blogger-auth

# Forever:
npm run post-social-media
```

## Environment Variables

No environment variables needed! Everything is managed automatically through the token manager.

Old variables (no longer needed):
- ~~`BLOGGER_ACCESS_TOKEN`~~ ❌
- ~~`BLOGGER_SHARED_BLOG_ID`~~ ❌ (now hardcoded in script)

## Migration from Manual Tokens

If you were using the old manual token method:

1. Run `npm run setup-blogger-auth`
2. Delete old environment variables from `.env`
3. Start using `npm run post-social-media`

That's it! The new system is fully automatic.
