export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential' });
    }

    // Verify the Google JWT token
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const googleUser = await response.json();

    if (!response.ok || googleUser.error) {
      throw new Error('Invalid Google token');
    }

    // Send user data to your backend
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        google_id: googleUser.sub,
      }),
    });

    const backendResult = await backendResponse.json();

    if (!backendResponse.ok) {
      throw new Error(backendResult.message || 'Backend authentication failed');
    }

    res.status(200).json({
      success: true,
      token: backendResult.token,
      user: backendResult.user,
    });

  } catch (error) {
    console.error('Google Simple Auth error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Authentication failed',
    });
  }
}
