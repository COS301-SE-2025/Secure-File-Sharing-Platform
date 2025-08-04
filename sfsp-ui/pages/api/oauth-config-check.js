export default function handler(req, res) {
  const config = {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING',
    next_public_client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    nextauth_url: process.env.NEXTAUTH_URL,
    expected_redirect_uri: 'http://localhost:3000/auth/google/callback'
  };

  res.status(200).json({
    message: 'Google OAuth Configuration Check',
    config,
    note: 'Make sure client_secret shows SET and redirect URI matches Google Cloud Console'
  });
}
