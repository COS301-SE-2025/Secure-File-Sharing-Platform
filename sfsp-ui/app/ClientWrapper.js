'use client';

import { ThemeProvider } from 'next-themes';
import KeyHydrator from '@/app/dashboard/components/KeyHydrator';
import AuthGuard from '@/app/components/AuthGuard';
import AuthStatus from '@/app/components/AuthStatus';

export default function ClientWrapper({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
      <KeyHydrator />
      <AuthGuard>
        {children}
      </AuthGuard>
      <AuthStatus />
    </ThemeProvider>
  );
}
