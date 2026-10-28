import type { Metadata } from 'next';
import { Prompt } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';

// Self-hosted via next/font (no render-blocking request to fonts.googleapis.com).
// The generated class sets font-family on <body>, overriding the 'Prompt' rule in globals.css (@layer base).
// preload is off: 5 weights × 2 styles × 2 subsets would preload ~20 files; browsers fetch only the faces actually used.
const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: false,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'ระบบจัดการงาน Supplier (EV7 & GI)',
  description: 'Supplier Job Management สำหรับบริหารงานสั่งล้างรถ ขอรถสไลด์ ตรวจรับงาน และออกใบวางบิล โดยใช้ VIN เป็นข้อมูลหลัก',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '64x64' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className={`${prompt.className} min-h-full flex flex-col antialiased text-[#002114] bg-[#f4f9f5]`}>
        <AuthProvider>
          <AppProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
