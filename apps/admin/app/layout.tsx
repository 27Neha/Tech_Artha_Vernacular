import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { AdminShell } from '@/components/layout/AdminShell';

export const metadata: Metadata = {
  title: 'TechArtha Operations & Admin Portal',
  description: 'Enterprise administration, KYC monitoring, order operations, and user management for TechArtha.',
  icons: {
    icon: '/techartha-logo.png',
    apple: '/techartha-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F8F9FB] text-[#102A54] antialiased">
        <AuthProvider>
          <AdminShell>{children}</AdminShell>
        </AuthProvider>
      </body>
    </html>
  );
}
