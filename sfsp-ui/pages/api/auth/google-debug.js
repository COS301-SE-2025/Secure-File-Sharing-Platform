import GoogleOAuth from '../../../lib/googleOAuth';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const googleOAuth = new GoogleOAuth();
    
    // Return debug info instead of redirecting
    res.status(200).json({
      redirect_uri: googleOAuth.redirectUri,
      client_id: googleOAuth.clientId,
      auth_url: googleOAuth.getAuthUrl(),
      message: 'Debug info - use this redirect_uri in Google Cloud Console'
    });
  } catch (error) {
    console.error('Error getting OAuth info:', error);
    res.status(500).json({ error: error.message });
  }
}
