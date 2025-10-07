"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useEncryptionStore } from "@/app/SecureKeyStorage";
import { isAuthenticated, logout } from "@/app/lib/auth";
import Loader from "@/app/dashboard/components/Loader";

const AuthGuard = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticatedState, setIsAuthenticatedState] = useState(false);

  const protectedRoutes = ["/dashboard", "/Settings", "/test-protected"];

  const authRoutes = ["/auth"];

  const publicRoutes = [
    "/",
    "/Company",
    "/Support",
    "/requestReset",
    "/confirmReset",
    "/auth/verify-email",
    "/auth/google",
  ];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!pathname) {
          setIsChecking(false);
          return;
        }

        const isPublicRoute = publicRoutes.some(
          (route) => pathname === route || pathname.startsWith(route + "/")
        );

        if (isPublicRoute) {
          setIsChecking(false);
          return;
        }

        const isProtectedRoute = protectedRoutes.some((route) =>
          pathname.startsWith(route)
        );

        const isAuthRoute = authRoutes.some(
          (route) => pathname === route || pathname.startsWith(route + "/")
        );

        const hasValidAuth = isAuthenticated();

        setIsAuthenticatedState(hasValidAuth);

        console.log("AuthGuard check:", {
          pathname,
          isProtectedRoute,
          isAuthRoute,
          isPublicRoute,
          hasValidAuth,
        });

        if (isProtectedRoute && !hasValidAuth) {
          const loginUrl = `/auth${
            pathname !== "/dashboard"
              ? `?redirect=${encodeURIComponent(pathname)}`
              : ""
          }`;
          router.replace(loginUrl);
          return;
        }

        if (isAuthRoute && hasValidAuth) {
          const isPendingVerification =
            sessionStorage.getItem("pendingVerification") === "true";

          if (isPendingVerification) {
            setIsChecking(false);
            return;
          }

          const redirectUrl =
            new URLSearchParams(window.location.search).get("redirect") ||
            "/dashboard";
          router.replace(redirectUrl);
          return;
        }

        setIsChecking(false);
      } catch (error) {
        console.error("Auth check error:", error);

        const isProtectedRoute = protectedRoutes.some((route) =>
          pathname.startsWith(route)
        );

        if (isProtectedRoute) {
          router.replace("/auth");
        } else {
          setIsChecking(false);
        }
      }
    };

    checkAuth();

    const intervalId = setInterval(() => {
      if (!pathname) return;

      const hasValidAuth = isAuthenticated();
      setIsAuthenticatedState(hasValidAuth);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [pathname, router]);

  if (isChecking) {
    return <Loader message="Checking authentication..." />;
  }

  return children;
};

export default AuthGuard;
