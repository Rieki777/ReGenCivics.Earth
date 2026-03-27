/**
 * GoogleTranslate - On-demand Google Translate integration
 *
 * IMPORTANT: This does NOT auto-translate on load. Translation only happens
 * when the user explicitly clicks a language in the LanguageSwitcher.
 * All googtrans cookies are cleared on mount to prevent stale translations.
 */
import { useEffect, useRef } from 'react';

// Language code mapping to Google Translate codes
const GOOGLE_LANG_MAP: Record<string, string> = {
  en: 'en',
  es: 'es',
  ru: 'ru',
  pt: 'pt',
  fr: 'fr',
  id: 'id',
  de: 'de',
  zh: 'zh-CN',
  ar: 'ar',
  hi: 'hi',
  ja: 'ja',
};

const SUPPORTED_LANGS = Object.values(GOOGLE_LANG_MAP).join(',');

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

/**
 * Loads Google Translate widget in a hidden container.
 * Does NOT auto-translate. The widget just sits ready until triggered.
 */
export function GoogleTranslateProvider({ children }: { children?: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Clear ALL googtrans cookies immediately so the page stays in English
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length >= 2) {
      const rootDomain = parts.slice(-2).join('.');
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + rootDomain;
    }

    // Define the callback Google Translate will call
    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: SUPPORTED_LANGS,
            layout: 0,
            autoDisplay: false,
            multilanguagePage: false,
          },
          'google_translate_element'
        );
      }
    };

    // Defer loading so it never blocks the page
    const loadScript = () => {
      const script = document.createElement('script');
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    };
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(loadScript, { timeout: 5000 });
    } else {
      setTimeout(loadScript, 4000);
    }

    return () => {
      delete window.googleTranslateElementInit;
    };
  }, []);

  return (
    <>
      {children}
      <div id="google_translate_element" className="hidden" />
      <style>{`
        .goog-te-banner-frame { display: none !important; }
        body { top: 0 !important; }
        .goog-te-gadget { font-size: 0 !important; }
        .goog-te-gadget > span { display: none !important; }
        .goog-logo-link { display: none !important; }
        .goog-tooltip { display: none !important; }
        .goog-tooltip:hover { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
        .skiptranslate { display: none !important; }
        #google_translate_element .skiptranslate { display: block !important; }
      `}</style>
    </>
  );
}

/**
 * Trigger Google Translate to switch to a specific language.
 * Only call this in response to an explicit user action.
 */
export function triggerGoogleTranslate(langCode: string) {
  const googleLang = GOOGLE_LANG_MAP[langCode] || langCode;
  const selectEl = document.querySelector('.goog-te-combo') as HTMLSelectElement;
  if (selectEl) {
    selectEl.value = googleLang;
    selectEl.dispatchEvent(new Event('change'));
  }
}

/**
 * Reset back to English. Clears cookies and reloads to get a clean state.
 */
export function resetGoogleTranslate() {
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts.length >= 2) {
    const rootDomain = parts.slice(-2).join('.');
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + rootDomain;
  }

  const selectEl = document.querySelector('.goog-te-combo') as HTMLSelectElement;
  if (selectEl) {
    selectEl.value = 'en';
    selectEl.dispatchEvent(new Event('change'));
    setTimeout(() => window.location.reload(), 300);
  } else {
    window.location.reload();
  }
}
