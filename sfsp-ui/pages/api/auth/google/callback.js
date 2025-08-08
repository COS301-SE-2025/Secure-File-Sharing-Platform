import GoogleOAuth from '@/lib/googleOAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error } = req.query;

  if (error) {
    console.error('OAuth error:', error);
    return res.status(400).json({ error: 'OAuth error: ' + error });
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const googleOAuth = new GoogleOAuth();
    
    const tokens = await googleOAuth.exchangeCodeForTokens(code);
    
    const userInfo = await googleOAuth.getUserInfo(tokens.access_token);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        google_id: userInfo.id,
      }),
    });

    const responseText = await response.text();
    console.log('Backend response status:', response.status);
    console.log('Backend response body:', responseText);

    if (!response.ok) {
      let errorMessage = 'Failed to authenticate with backend';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        console.error('Backend error (non-JSON):', responseText);
        errorMessage = `Backend error: ${response.status} - ${responseText.substring(0, 200)}`;
      }
      throw new Error(errorMessage);
    }

    const authResult = JSON.parse(responseText);
    
    res.status(200).json({
      success: true,
      token: authResult.token,
      user: authResult.user,
      message: 'Authentication successful'
    });
    
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
}
