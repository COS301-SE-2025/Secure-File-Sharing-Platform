export default function GoogleOAuthTest() {
  const handleGoogleAuth = () => {
    const clientId = '268933123816-t08ihbeer5monhdg79lq61o07jthr9m3.apps.googleusercontent.com';
    const redirectUri = 'http://localhost:3000';  // Use root domain
    const scope = 'openid email profile';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent(scope)}&` +
      `include_granted_scopes=true&` +
      `state=test123`;

    // Open in popup
    const popup = window.open(
      authUrl,
      'googleAuth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    // Monitor popup
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        alert('Popup closed - check console for any tokens');
      }
    }, 1000);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Google OAuth Test</h2>
      <p>This test uses root domain redirect (http://localhost:3000)</p>
      <button 
        onClick={handleGoogleAuth}
        style={{
          padding: '10px 20px',
          backgroundColor: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Test Google OAuth
      </button>
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Add "http://localhost:3000" to your Google Cloud Console redirect URIs</li>
          <li>Click the test button above</li>
          <li>Complete Google authentication</li>
          <li>Check browser console for access token</li>
        </ol>
      </div>
    </div>
  );
}
