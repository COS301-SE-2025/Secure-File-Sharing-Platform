// middleware.js
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/confidential"];
const LOGIN_PATH = "/auth";

export async function middleware(req) {
  const { pathname, origin } = req.nextUrl;

  // Skip API routes and login pages
  if (pathname.startsWith('/api/') || pathname === LOGIN_PATH || pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  
  if (!needsAuth) return NextResponse.next();

  // Get both cookies
  const token = req.cookies.get("auth_token")?.value;
  const currentUser = req.cookies.get("current_user")?.value;
  
  console.log('Token exists:', !!token);
  console.log('Current user:', currentUser);

  // If either cookie is missing, redirect to login
  if (!token || !currentUser) {
    console.log('Missing token or user context, redirecting to login');
    const response = NextResponse.redirect(new URL(LOGIN_PATH, origin));
    // Clear any partial cookies
    response.cookies.delete('auth_token');
    response.cookies.delete('current_user');
    return response;
  }

  // Verify token is valid AND belongs to the current user
  try {
    const verifyResponse = await fetch(`${origin}/api/auth/verify-token`, {
      method: 'GET',
      headers: {
        'Cookie': req.headers.get('cookie') || '',
      },
    });

    if (!verifyResponse.ok) {
      console.log('Token verification failed');
      return redirectToLoginAndClearCookies(LOGIN_PATH, origin);
    }

    const result = await verifyResponse.json();
    console.log('Verification result:', result);
    
    // Critical check: Does the token's user match the current_user cookie?
    if (!result.valid || !result.user || result.user.id !== currentUser) {
      console.log('User context mismatch! Token user:', result.user?.id, 'Current user:', currentUser);
      return redirectToLoginAndClearCookies(LOGIN_PATH, origin);
    }

    console.log('Authentication successful for user:', currentUser);
    return NextResponse.next();

  } catch (error) {
    console.error('Token verification error:', error);
    return redirectToLoginAndClearCookies(LOGIN_PATH, origin);
  }
}

// Helper function to clear cookies and redirect
function redirectToLoginAndClearCookies(loginPath, origin) {
  const response = NextResponse.redirect(new URL(loginPath, origin));
  
  // Clear both cookies to prevent session confusion
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  
  response.cookies.set('current_user', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", 
    path: "/",
    maxAge: 0,
  });
  
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*", 
    "/confidential/:path*",
    "/dashboard",
    "/admin",
    "/confidential"
  ],
};