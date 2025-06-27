'use client';

import { ThemeProvider } from 'next-themes';
import KeyHydrator from '@/app/dashboard/components/KeyHydrator';

export default function ClientWrapper({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
      <KeyHydrator />
      {children}
    </ThemeProvider>
  );
}
