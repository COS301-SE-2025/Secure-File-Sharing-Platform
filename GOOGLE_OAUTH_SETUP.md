# Google OAuth Setup Instructions

## 1. Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3001/api/auth/google/callback` (for development - adjust port as needed)
     - Your production domain when deploying

## 2. Configure Environment Variables

Update your `.env.local` file with your Google OAuth credentials:

```bash
# Replace with your actual Google OAuth credentials
GOOGLE_CLIENT_ID=your_actual_google_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_actual_google_client_id_here

# Generate a random secret for NextAuth
NEXTAUTH_SECRET=your_random_32_character_secret_here
```

## 3. How to Generate NEXTAUTH_SECRET

Run this command in your terminal:
```bash
openssl rand -base64 32
```

## 4. Features Implemented

- ✅ "Continue with Google" button on both login and signup forms
- ✅ OAuth flow handling with proper redirects
- ✅ Automatic user creation for new Google users
- ✅ Google ID linking for existing users
- ✅ Default vault creation for new users
- ✅ Proper error handling and loading states
- ✅ JWT token generation and session management

## 5. Testing

1. Make sure your backend server is running on `http://localhost:5000`
2. Make sure your frontend is running on `http://localhost:3001` (or adjust port as needed)
3. Click "Continue with Google" on the auth page
4. Complete Google OAuth flow
5. You should be redirected to the dashboard

## 6. Production Deployment

When deploying to production:
1. Update `NEXTAUTH_URL` to your production domain
2. Add your production callback URL to Google OAuth settings
3. Update `NEXT_PUBLIC_API_URL` to your production API URL

## 7. Troubleshooting

- **"Client ID not found"**: Make sure you've set the environment variables correctly
- **"Redirect URI mismatch"**: Ensure the callback URL in Google Console matches your setup
- **"OAuth error"**: Check the browser console and server logs for detailed error messages
