'use client';
import { useEffect } from 'react';
import Script from 'next/script';

export default function GoogleTranslateWidget() {
  useEffect(() => {
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false },
        'google_translate_element'
      );
    };

    (window as any).changeGoogleTranslate = (langCode: string) => {
      const cookieDomain = window.location.hostname;
      
      if (langCode === 'en') {
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${cookieDomain}; path=/;`;
        
        // If the page was translated, the best way to natively revert without 
        // triggering first-option fallbacks (like Abkhaz) is to reload safely.
        if (document.documentElement.classList.contains('translated-ltr') || 
            document.documentElement.classList.contains('translated-rtl')) {
          window.location.reload();
        }
        return; // Stop here so we never touch .goog-te-combo for English
      } else {
        document.cookie = `googtrans=/en/${langCode}; path=/; domain=${cookieDomain}`;
        document.cookie = `googtrans=/en/${langCode}; path=/;`;
      }

      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select) {
        select.value = langCode;
        select.dispatchEvent(new Event('change'));
      }
    };
  }, []);

  return (
    <>
      {/* Run inline script immediately to kill googtrans cookie before GT initializes */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=" + window.location.hostname + "; path=/;";
      `}} />
      <div id="google_translate_element" style={{ display: 'none' }}></div>
      <Script
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
      <style dangerouslySetInnerHTML={{ __html: `
        .goog-te-banner-frame { display: none !important; }
        body { top: 0 !important; }
        .goog-tooltip { display: none !important; }
        .goog-tooltip:hover { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; border: none !important; box-shadow: none !important; }
        #goog-gt-tt { display: none !important; }
      `}} />
    </>
  );
}
