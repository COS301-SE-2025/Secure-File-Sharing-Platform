'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useEncryptionStore } from '@/app/SecureKeyStorage';
import { isAuthenticated, logout } from '@/app/lib/auth';
import Loader from '@/app/dashboard/components/Loader';

const AuthGuard = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticatedState, setIsAuthenticatedState] = useState(false);

  // Define protected routes
  const protectedRoutes = [
    '/dashboard',
    '/Settings',
    '/test-protected'
  ];

  // Define public routes that should redirect authenticated users
  const authRoutes = [
    '/auth'
  ];

  // Define completely public routes (no auth check needed)
  const publicRoutes = [
    '/',
    '/Company',
    '/Support',
    '/requestReset',
    '/confirmReset',
    '/auth/verify-email',
    '/auth/google'
  ];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Don't check auth until we have a pathname
        if (!pathname) {
          setIsChecking(false);
          return;
        }

        // Check if current path is public (no auth check needed)
        const isPublicRoute = publicRoutes.some(route =>
          pathname === route || pathname.startsWith(route + '/')
        );

        // If it's a public route, allow access immediately
        if (isPublicRoute) {
          setIsChecking(false);
          return;
        }

        // Check if current path is protected
        const isProtectedRoute = protectedRoutes.some(route =>
          pathname.startsWith(route)
        );

        // Check if current path is auth route
        const isAuthRoute = authRoutes.some(route =>
          pathname === route || pathname.startsWith(route + '/')
        );

        // Check authentication status
        const hasValidAuth = isAuthenticated();

        setIsAuthenticatedState(hasValidAuth);

        console.log('AuthGuard check:', {
          pathname,
          isProtectedRoute,
          isAuthRoute,
          isPublicRoute,
          hasValidAuth
        });

        // Handle routing based on authentication status
        if (isProtectedRoute && !hasValidAuth) {
          // Protected route without auth - redirect to login
          const loginUrl = `/auth${pathname !== '/dashboard' ? `?redirect=${encodeURIComponent(pathname)}` : ''}`;
          console.log('Redirecting to login:', loginUrl);
          router.replace(loginUrl);
          return;
        }

        if (isAuthRoute && hasValidAuth) {
          // Auth route with valid auth - redirect to intended page or dashboard
          const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
          console.log('Redirecting authenticated user to:', redirectUrl);
          router.replace(redirectUrl);
          return;
        }

        // For valid auth states or other routes, proceed normally
        setIsChecking(false);

      } catch (error) {
        console.error('Auth check error:', error);
        // On error, allow access to public routes, redirect protected routes to auth
        const isProtectedRoute = protectedRoutes.some(route =>
          pathname.startsWith(route)
        );

        if (isProtectedRoute) {
          router.replace('/auth');
        } else {
          setIsChecking(false);
        }
      }
    };

    // Run check immediately, but also set up a timeout for safety
    checkAuth();

    // Also set up an interval to periodically recheck
    const intervalId = setInterval(() => {
      if (!pathname) return;

      const hasValidAuth = isAuthenticated();
      setIsAuthenticatedState(hasValidAuth);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [pathname, router]);

  // Show loading while checking authentication
  if (isChecking) {
    return <Loader message="Checking authentication..." />;
  }

  return children;
};

export default AuthGuard;