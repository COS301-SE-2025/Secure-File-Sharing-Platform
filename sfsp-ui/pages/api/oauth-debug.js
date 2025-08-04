export default function handler(req, res) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;
  
  const redirectUris = [
    `${baseUrl}/auth/google/callback`,
    `${baseUrl}/api/auth/google/callback`,
    `${baseUrl}`,
    `http://localhost:3000/auth/google/callback`,
    `http://localhost:3000/api/auth/google/callback`,
    `http://localhost:3000`
  ];

  res.status(200).json({
    message: 'Add ONE of these redirect URIs to your Google Cloud Console',
    current_base_url: baseUrl,
    recommended_redirect_uris: redirectUris,
    instructions: [
      '1. Go to https://console.cloud.google.com/',
      '2. Navigate to APIs & Services → Credentials',
      '3. Click on your OAuth 2.0 Client ID',
      '4. In "Authorized redirect URIs", add ONE of the URIs above',
      '5. Click Save',
      '6. Test the authentication'
    ],
    note: 'Start with the simplest one: http://localhost:3000'
  });
}
