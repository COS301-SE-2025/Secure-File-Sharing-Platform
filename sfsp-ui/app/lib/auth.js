"use client";

import { useEncryptionStore } from "@/app/SecureKeyStorage";

export const logout = () => {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("encryption-store");
    localStorage.removeItem("user");

    sessionStorage.removeItem("unlockToken");
    sessionStorage.removeItem("pendingLogin");
    sessionStorage.removeItem("pendingVerification");

    const store = useEncryptionStore.getState();
    store.setEncryptionKey(null);
    store.setUserId(null);
    store.setUserKeys(null);
  } catch (error) {
    console.error("Error during logout:", error);
  }
};

export const isAuthenticated = () => {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return false;
    }

    const token = localStorage.getItem("token");
    const userId = useEncryptionStore.getState().userId;
    const userKeys = useEncryptionStore.getState().userKeys;
    console.log("isAuthenticated check:", { token, userId, userKeys });

    return !!(token && userId && userKeys);
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
};

export const getAuthToken = () => {
  try {
    return localStorage.getItem("token");
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};
