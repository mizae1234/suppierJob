import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';

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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased text-[#002114] bg-[#f4f9f5]">
        <AuthProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
