import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { code } = await request.json();

    console.log('Received code:', code ? 'present' : 'missing');
    console.log('Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'present' : 'missing');
    console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'present' : 'missing');

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET, // This should be server-only
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/auth/google/callback',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      
      return NextResponse.json(
        { 
          error: 'Token exchange failed',
          details: errorData 
        },
        { status: 400 }
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get user information from Google' },
        { status: 400 }
      );
    }

    const googleUser = await userResponse.json();

    return NextResponse.json({
      user: googleUser,
      tokens: {
        access_token: tokens.access_token,
        // Don't return refresh_token to frontend for security
      }
    });

  } catch (error) {
    console.error('Google auth API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
