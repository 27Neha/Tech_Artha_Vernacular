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
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            window.updateTheme = function() {
              var theme = localStorage.getItem('appTheme') || 'system';
              if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            }
            window.updateTheme();
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
              if ((localStorage.getItem('appTheme') || 'system') === 'system') {
                window.updateTheme();
              }
            });

            // CRITICAL FIX FOR NEXT.JS + GOOGLE TRANSLATE CRASHES
            // Safely swallow NotFoundError for insertBefore and removeChild when extensions hijack the DOM
            if (typeof Node === 'function' && Node.prototype) {
              var originalInsertBefore = Node.prototype.insertBefore;
              Node.prototype.insertBefore = function(newNode, referenceNode) {
                if (referenceNode && referenceNode.parentNode !== this) {
                  return newNode;
                }
                return originalInsertBefore.call(this, newNode, referenceNode);
              };
              var originalRemoveChild = Node.prototype.removeChild;
              Node.prototype.removeChild = function(child) {
                if (child && child.parentNode !== this) {
                  return child;
                }
                return originalRemoveChild.call(this, child);
              };
            }
          } catch (e) {}
        `}} />
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
