/**
 * Google OAuth utility for handling Google sign-in
 */

class GoogleOAuth {
  constructor() {
    // For client-side, use NEXT_PUBLIC_ prefix
    this.clientId = typeof window !== 'undefined' 
      ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID 
      : process.env.GOOGLE_CLIENT_ID;
    
    // Use the appropriate base URL based on environment
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';
      
    this.redirectUri = `${baseUrl}/auth/google/callback`;
    this.scope = 'openid email profile';
  }

  /**
   * Generate Google OAuth URL
   */
  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scope,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens (server-side only)
   */
  async exchangeCodeForTokens(code) {
    try {
      console.log('Exchanging code for tokens...');
      console.log('Client ID:', this.clientId);
      console.log('Redirect URI:', this.redirectUri);
      console.log('Code:', code);

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
        }),
      });

      console.log('Google token response status:', response.status);
      const responseText = await response.text();
      console.log('Google token response:', responseText);

      if (!response.ok) {
        throw new Error(`Failed to exchange code for tokens: ${response.status} ${responseText}`);
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  /**
   * Get user info from Google (server-side only)
   */
  async getUserInfo(accessToken) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }
}

export default GoogleOAuth;
