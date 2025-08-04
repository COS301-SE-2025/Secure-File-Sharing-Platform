import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function GoogleCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const processGoogleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (error) {
          setStatus('Authentication failed');
          setTimeout(() => {
            router.push('/auth?error=oauth_error');
          }, 2000);
          return;
        }
        
        if (!code) {
          setStatus('Missing authorization code');
          setTimeout(() => {
            router.push('/auth?error=missing_code');
          }, 2000);
          return;
        }

        setStatus('Authenticating with server...');
        
        // Call our API to exchange code for token
        const response = await fetch(`/api/auth/google/callback?code=${encodeURIComponent(code)}`);
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Server authentication failed');
        }

        // Store the token and redirect to dashboard
        localStorage.setItem('token', result.token);
        setStatus('Authentication successful! Redirecting...');
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
        
      } catch (error) {
        console.error('Google callback error:', error);
        setStatus('Authentication failed');
        setTimeout(() => {
          router.push('/auth?error=authentication_failed');
        }, 2000);
      }
    };

    processGoogleCallback();
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Google Authentication</h2>
        <p>{status}</p>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '20px auto'
        }}></div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
