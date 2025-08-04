import { useState, useEffect } from 'react';

export default function GoogleAuthSimple() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      // Send the Google JWT token to your backend
      const res = await fetch('/api/auth/google-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: response.credential,
        }),
      });

      const result = await res.json();
      
      if (result.success) {
        // Store token and redirect to dashboard
        localStorage.setItem('token', result.token);
        window.location.href = '/dashboard';
      } else {
        alert('Authentication failed: ' + result.message);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert('Authentication failed');
    }
  };

  const signInWithGoogle = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    }
  };

  return (
    <button
      onClick={signInWithGoogle}
      className="w-full flex items-center justify-center space-x-2 border dark:border-gray-400 border-gray-300 rounded-md py-2 hover:bg-gray-100 transition"
    >
      <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3">
        <path fill="#4285f4" d="M533.5 278.4c0-17.6-1.5-34.6-4.4-51.1H272v96.9h146.7c-6.3 34.3-25 63.4-53.6 82.9v68h86.7c50.7-46.7 79.7-115.7 79.7-196.7z"/>
        <path fill="#34a853" d="M272 544.3c72.9 0 134.1-24.1 178.7-65.3l-86.7-68c-24.1 16.1-55 25.7-91.9 25.7-70.7 0-130.6-47.7-152.1-111.9h-90.3v70.4c44.8 88.2 136.5 149.1 242.4 149.1z"/>
        <path fill="#fbbc04" d="M119.9 322.8c-10.4-30.8-10.4-64.3 0-95.1v-70.4h-90.3c-37.8 74.8-37.8 164.7 0 239.5l90.3-73.9z"/>
        <path fill="#ea4335" d="M272 107.7c39.4-.6 77.2 14 106 40.4l79.3-79.3C402.1 22.2 344.4-1.6 272 0 166.1 0 74.4 60.9 29.6 149.1l90.3 70.4c21.6-64.2 81.5-111.9 152.1-111.9z"/>
      </svg>
      <span className="text-sm font-medium text-gray-700">Continue with Google</span>
    </button>
  );
}
