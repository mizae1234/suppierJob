import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'ระบบจัดการงาน Supplier (EV7 & GI Fleet)',
  description: 'Supplier Job Management สำหรับบริหารงานสั่งล้างรถ ขอรถสไลด์ ตรวจรับงาน และออกใบวางบิล โดยใช้ VIN เป็นข้อมูลหลัก',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-full flex flex-col antialiased text-[#002114] bg-[#f4f9f5]">
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
