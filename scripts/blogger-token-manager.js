// scripts/blogger-token-manager.js
// Automatic token refresh management for Blogger API

const fs = require('fs');
const path = require('path');

const CLIENT_SECRET_PATH = path.join(__dirname, 'blogger-client-secret.json');
const TOKEN_STORAGE_PATH = path.join(__dirname, '.blogger-tokens.json');

class BloggerTokenManager {
  constructor() {
    this.clientSecret = null;
    this.tokens = null;
    this.loadClientSecret();
    this.loadTokens();
  }

  /**
   * Load OAuth client secret
   */
  loadClientSecret() {
    if (!fs.existsSync(CLIENT_SECRET_PATH)) {
      throw new Error(`Client secret not found at: ${CLIENT_SECRET_PATH}`);
    }
    
    const data = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8'));
    this.clientSecret = data.web || data.installed;
    
    if (!this.clientSecret) {
      throw new Error('Invalid client secret format');
    }
  }

  /**
   * Load stored tokens (access token, refresh token, expiry)
   */
  loadTokens() {
    if (fs.existsSync(TOKEN_STORAGE_PATH)) {
      try {
        this.tokens = JSON.parse(fs.readFileSync(TOKEN_STORAGE_PATH, 'utf8'));
      } catch (error) {
        console.warn('Warning: Could not parse stored tokens. Will need to re-authenticate.');
        this.tokens = null;
      }
    }
  }

  /**
   * Save tokens to disk
   */
  saveTokens(tokens) {
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || this.tokens?.refresh_token, // Keep existing refresh token if not provided
      expires_at: Date.now() + ((tokens.expires_in || 3600) * 1000),
      token_type: tokens.token_type || 'Bearer'
    };
    
    fs.writeFileSync(TOKEN_STORAGE_PATH, JSON.stringify(tokenData, null, 2));
    this.tokens = tokenData;
  }

  /**
   * Check if current access token is expired or about to expire (within 5 minutes)
   */
  isTokenExpired() {
    if (!this.tokens || !this.tokens.expires_at) {
      return true;
    }
    
    const now = Date.now();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes buffer
    return now >= (this.tokens.expires_at - expiryBuffer);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    if (!this.tokens || !this.tokens.refresh_token) {
      throw new Error('No refresh token available. Please run initial setup: node scripts/setup-blogger-auth.js');
    }

    console.log('🔄 Refreshing access token...');

    const response = await fetch(this.clientSecret.token_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientSecret.client_id,
        client_secret: this.clientSecret.client_secret,
        refresh_token: this.tokens.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const newTokens = await response.json();
    this.saveTokens(newTokens);
    
    console.log('✅ Access token refreshed successfully');
    return this.tokens.access_token;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken() {
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
    
    return this.tokens.access_token;
  }

  /**
   * Check if initial setup is complete
   */
  hasRefreshToken() {
    return !!(this.tokens && this.tokens.refresh_token);
  }

  /**
   * Store initial tokens from OAuth flow
   */
  storeInitialTokens(accessToken, refreshToken, expiresIn = 3600) {
    this.saveTokens({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn
    });
  }

  /**
   * Get OAuth authorization URL for initial setup
   */
  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.clientSecret.client_id,
      redirect_uri: this.clientSecret.redirect_uris[0],
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/blogger',
      access_type: 'offline', // Important: to get refresh token
      prompt: 'consent' // Force consent screen to ensure refresh token
    });

    return `${this.clientSecret.auth_uri}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(authCode) {
    const response = await fetch(this.clientSecret.token_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: authCode,
        client_id: this.clientSecret.client_id,
        client_secret: this.clientSecret.client_secret,
        redirect_uri: this.clientSecret.redirect_uris[0],
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokens = await response.json();
    this.saveTokens(tokens);
    
    return tokens;
  }

  /**
   * Get token info for debugging
   */
  getTokenInfo() {
    if (!this.tokens) {
      return { hasToken: false };
    }

    const expiresIn = this.tokens.expires_at ? 
      Math.max(0, Math.floor((this.tokens.expires_at - Date.now()) / 1000)) : 0;

    return {
      hasToken: true,
      hasRefreshToken: !!this.tokens.refresh_token,
      isExpired: this.isTokenExpired(),
      expiresIn: expiresIn,
      expiresAt: this.tokens.expires_at ? new Date(this.tokens.expires_at).toISOString() : null
    };
  }
}

module.exports = BloggerTokenManager;
