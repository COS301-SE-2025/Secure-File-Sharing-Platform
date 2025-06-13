// app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from 'next-themes';
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "SecureShare | End-to-End Encrypted File Sharing",
  description: "A privacy-focused platform for secure file sharing using end-to-end encryption.",
  icons: {
    icon: [
      { media: '(prefers-color-scheme: light)', url: '/img/shield-emp-black.png' },
      { media: '(prefers-color-scheme: dark)', url: '/img/shield-emp-white.png' }
    ],
    apple: '/img/shield-emp-black.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class" // applies "dark" or "light" to <html>
          defaultTheme="system"
          enableSystem={true}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}