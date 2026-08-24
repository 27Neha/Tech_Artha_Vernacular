'use client';
import { useEffect, useState } from 'react';
import { useTranslation } from './TranslationProvider';

export default function GoogleTranslateWidget() {
  const { lang } = useTranslation();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  
  useEffect(() => {
    if (document.getElementById('google-translate-script')) return;

    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false },
        'google_translate_element'
      );
      setScriptLoaded(true);
    };

    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
    
    const observer = new MutationObserver(() => {
      if (document.body.style.top !== '0px' && document.body.style.top !== '') {
        document.body.style.setProperty('top', '0px', 'important');
      }
      if (document.documentElement.style.top !== '0px' && document.documentElement.style.top !== '') {
        document.documentElement.style.setProperty('top', '0px', 'important');
      }
      
      const frames = document.querySelectorAll('iframe.skiptranslate, iframe.goog-te-banner-frame, iframe[src*="translate.googleapis.com"]');
      frames.forEach((f) => {
        (f as HTMLElement).style.setProperty('display', 'none', 'important');
        (f as HTMLElement).style.setProperty('height', '0px', 'important');
      });
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const triggerChange = (element: HTMLSelectElement, value: string): boolean => {
      // CRITICAL FIX: Ensure Google Translate has actually populated the dropdown options via its secondary API call
      // If we set element.value before the option exists, the DOM ignores it, and the change event fires with a blank value.
      let hasOption = false;
      for (let i = 0; i < element.options.length; i++) {
        if (element.options[i].value === value || value === 'en') {
          hasOption = true;
          break;
        }
      }
      
      if (!hasOption && element.options.length === 0) {
        return false; // Options not yet loaded
      }

      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      return true;
    };

    const translateTo = (targetLang: string) => {
      document.cookie = `googtrans=/en/${targetLang}; path=/;`;
      document.cookie = `googtrans=/en/${targetLang}; domain=${window.location.hostname}; path=/;`;

      let retries = 0;
      const attemptTranslation = () => {
        const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (selectElement) {
          const success = triggerChange(selectElement, targetLang);
          if (!success) {
            retries++;
            if (retries < 25) setTimeout(attemptTranslation, 200); // Retry up to 5 seconds
          }
        } else {
          retries++;
          if (retries < 25) {
            setTimeout(attemptTranslation, 200); 
          }
        }
      };
      
      attemptTranslation();
    };

    if (lang === 'en') {
      const iframe = document.querySelector('iframe.goog-te-banner-frame') as HTMLIFrameElement;
      if (iframe) {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        const restoreButton = doc?.querySelector('button[id="restore"]') as HTMLButtonElement | null;
        if (restoreButton) {
          restoreButton.click();
        }
      }
      
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/;`;
      
      let retries = 0;
      const attemptRevert = () => {
        const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (selectElement) {
          const success = triggerChange(selectElement, 'en');
          if (!success) {
            retries++;
            if (retries < 15) setTimeout(attemptRevert, 200);
          }
        } else {
          retries++;
          if (retries < 15) setTimeout(attemptRevert, 200);
        }
      };
      attemptRevert();
      
    } else {
      translateTo(lang);
    }
  }, [lang]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .goog-te-banner-frame, .skiptranslate.goog-te-gadget, iframe.skiptranslate, iframe[src*="translate"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          height: 0px !important;
          width: 0px !important;
        }
        body, html {
          top: 0px !important;
          position: static !important;
          margin-top: 0px !important;
        }
        #goog-gt-tt, .goog-te-balloon-frame {
          display: none !important;
        }
        .goog-text-highlight {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}} />
      <div id="google_translate_element" style={{ display: 'none' }}></div>
    </>
  );
}
