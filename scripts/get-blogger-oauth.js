// scripts/get-blogger-oauth.js
// This file provides instructions for obtaining a Blogger API OAuth token

console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║           HOW TO GET BLOGGER API OAUTH TOKEN                           ║
╚════════════════════════════════════════════════════════════════════════╝

NOTE: The analyze script uses the public Blogger feed (no auth needed).
      You only need OAuth token for the apply script (write operations).

Step 1: Go to Google Cloud Console
---------------------------------------
URL: https://console.cloud.google.com/

Step 2: Create or Select a Project
---------------------------------------
1. Click on the project dropdown at the top
2. Create a new project or select an existing one

Step 3: Enable Blogger API
---------------------------------------
1. Go to "APIs & Services" > "Library"
2. Search for "Blogger API v3"
3. Click "Enable"

Step 4: Create OAuth 2.0 Credentials
---------------------------------------
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: Your app name
   - User support email: Your email
   - Add your email to "Test users"
4. Application type: "Web application"
5. Add authorized redirect URI:
   https://developers.google.com/oauthplayground
6. Click "Create"
7. Download the credentials JSON (you'll need Client ID and Client Secret)

Step 5: Get Access Token using OAuth Playground
---------------------------------------
1. Go to: https://developers.google.com/oauthplayground
2. Click the gear icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your OAuth Client ID and Client Secret
5. In the left panel, find "Blogger API v3"
6. Select: https://www.googleapis.com/auth/blogger
7. Click "Authorize APIs"
8. Sign in with your Google account (the one that owns the blog)
9. Click "Exchange authorization code for tokens"
10. Copy the "Access token" value

Step 6: Set Environment Variable
---------------------------------------
For analysis (read-only, using public feed):
  No environment variables needed!

For updates (write access):
  export BLOGGER_ACCESS_TOKEN='your-access-token-here'

Step 7: Run the Scripts
---------------------------------------
Analysis:
  node scripts/analyze-blogger-updates.js

Apply updates:
  node scripts/apply-blogger-updates.js

╔════════════════════════════════════════════════════════════════════════╗
║                           IMPORTANT NOTES                              ║
╚════════════════════════════════════════════════════════════════════════╝

- Access tokens expire after 1 hour. Get a new one if needed.
- For long-term automation, consider using a refresh token flow.
- The API key is for read operations (no expiration).
- Keep your credentials secure - never commit them to git.

For more information:
https://developers.google.com/blogger/docs/3.0/using
`);
