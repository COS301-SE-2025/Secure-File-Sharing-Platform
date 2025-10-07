"use client";

import { useState, useEffect } from "react";
import { isAuthenticated, getAuthToken } from "@/app/lib/auth";
import { useEncryptionStore } from "@/app/SecureKeyStorage";

const AuthStatus = () => {
  const [authState, setAuthState] = useState({
    isAuth: false,
    token: null,
    userId: null,
  });

  useEffect(() => {
    const checkAuth = () => {
      setAuthState({
        isAuth: isAuthenticated(),
        token: getAuthToken(),
        userId: useEncryptionStore.getState().userId,
      });
    };

    checkAuth();

    const interval = setInterval(checkAuth, 5000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-lg shadow-lg text-xs max-w-xs">
      <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">
        Auth Status (Dev)
      </h4>
      <div className="space-y-1 text-blue-700 dark:text-blue-300">
        <div>Authenticated: {authState.isAuth ? "✅ Yes" : "❌ No"}</div>
        <div>
          Token:{" "}
          {authState.token
            ? `✅ ${authState.token.substring(0, 20)}...`
            : "❌ None"}
        </div>
        <div>
          User ID: {authState.userId ? `✅ ${authState.userId}` : "❌ None"}
        </div>
      </div>
    </div>
  );
};

export default AuthStatus;
