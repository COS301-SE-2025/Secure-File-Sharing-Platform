'use client';

import { ThemeProvider } from 'next-themes';
import KeyHydrator from '@/app/dashboard/components/KeyHydrator';
import Script from 'next/script';

export default function ClientWrapper({ children }) {
  // Preload Google OAuth library
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
      {/* Preload the Google API script */}
      {googleClientId && (
        <Script
          src={`https://accounts.google.com/gsi/client`}
          strategy="beforeInteractive"
        />
      )}
      
      <KeyHydrator />
      {children}
    </ThemeProvider>
  );
}
