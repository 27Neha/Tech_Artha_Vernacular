import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';
import { TranslationProvider } from './TranslationProvider';
import GlobalHeader from './GlobalHeader';
import GoogleTranslateWidget from './GoogleTranslateWidget';

export const metadata: Metadata = {
  title: 'TechArtha – Finance Simplified',
  description: 'Invest smartly in mutual funds. Finance simplified for every Indian.',
  manifest: '/manifest.json',
  themeColor: '#3C3985',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TechArtha'
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script src="https://hyperkyc.hyperverge.co/web/v3.0.0/hyperkyc.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen bg-[#F8F9FB]">
        <TranslationProvider>
          <GoogleTranslateWidget />
          <GlobalHeader />
          <div className="max-w-md mx-auto min-h-screen relative pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)] flex flex-col">
            {children}
          </div>
        </TranslationProvider>
      </body>
    </html>
  );
}
