'use client';

import { useEncryptionStore } from '@/app/SecureKeyStorage';

export const logout = () => {
  try {
    // Clear localStorage items
    localStorage.removeItem('token');
    localStorage.removeItem('encryption-store');
    localStorage.removeItem('user');

    // Clear sessionStorage items
    sessionStorage.removeItem('unlockToken');
    sessionStorage.removeItem('pendingLogin');

    // Reset the encryption store
    const store = useEncryptionStore.getState();
    store.setEncryptionKey(null);
    store.setUserId(null);
    store.setUserKeys(null);

    console.log('User logged out successfully');
  } catch (error) {
    console.error('Error during logout:', error);
  }
};

export const isAuthenticated = () => {
  try {
    // Check if localStorage is available (SSR safety)
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }

    const token = localStorage.getItem('token');
    const userId = useEncryptionStore.getState().userId;

    console.log('Auth check:', {
      hasToken: !!token,
      tokenLength: token?.length,
      userId
    });

    return !!(token && userId);
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

export const getAuthToken = () => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};