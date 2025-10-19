'use client';

import { useEncryptionStore } from '@/app/SecureKeyStorage';
import { isAuthenticated } from '@/app/lib/auth';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TestProtectedPage() {
  const [authState, setAuthState] = useState({});

  useEffect(() => {
    const updateAuthState = () => {
      setAuthState({
        isAuth: isAuthenticated(),
        token: localStorage.getItem('token')?.substring(0, 20) + '...',
        userId: useEncryptionStore.getState().userId,
        unlockToken: sessionStorage.getItem('unlockToken'),
      });
    };

    updateAuthState();
    const interval = setInterval(updateAuthState, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Protected Test Page</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Authenticated:</span>
              <span className={authState.isAuth ? 'text-green-600' : 'text-red-600'}>
                {authState.isAuth ? '✅ Yes' : '❌ No'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Token:</span>
              <span className="font-mono text-sm">
                {authState.token || '❌ None'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>User ID:</span>
              <span className="font-mono text-sm">
                {authState.userId || '❌ None'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Unlock Token:</span>
              <span className="font-mono text-sm">
                {authState.unlockToken ? '✅ Present' : '❌ None'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Success!</h2>
          <p className="text-gray-700">
            If you can see this page, route protection is working correctly.
            Only authenticated users should be able to access this page.
          </p>

          <div className="mt-4 space-x-4">
            <Link href="/auth" className="text-blue-600 hover:underline">Go to Auth Page</Link>
            <Link href="/dashboard" className="text-blue-600 hover:underline">Go to Dashboard</Link>
            <Link href="/" className="text-blue-600 hover:underline">Go to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}