import GoogleOAuth from '../../../lib/googleOAuth';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const googleOAuth = new GoogleOAuth();
    const authUrl = googleOAuth.getAuthUrl();
    
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    res.redirect('/auth?error=oauth_init_failed');
  }
}
