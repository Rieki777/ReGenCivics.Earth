/**
 * GoogleTranslate - On-demand Google Translate integration
 *
 * IMPORTANT: This does NOT auto-translate on load. Translation only happens
 * when the user explicitly clicks a language in the LanguageSwitcher.
 * All googtrans cookies are cleared on mount to prevent stale translations.
 *
 * The script itself loads only when someone opens the language menu
 * (loadGoogleTranslate). It used to load on everyone's first click, scroll or
 * keypress: that froze the first keystroke for about 300ms on a mid-range
 * phone, and Google's hidden loading spinner then animated forever, making
 * the browser restyle the page every frame and every keystroke wait behind it.
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

let loadPromise: Promise<HTMLSelectElement | null> | null = null;

/**
 * Load the Google Translate widget once and resolve with its language select,
 * or null if it does not appear within 10 seconds (blocked, offline). Call it
 * when someone shows intent to translate, such as opening the language menu.
 */
export function loadGoogleTranslate(): Promise<HTMLSelectElement | null> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve) => {
    // Google calls this once its script has loaded.
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

    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    const nonce = (window as any).__NONCE__;
    if (nonce) script.setAttribute('nonce', nonce);
    document.body.appendChild(script);

    // The select appears a moment after the callback runs.
    const started = Date.now();
    const poll = window.setInterval(() => {
      const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo');
      if (combo || Date.now() - started > 10_000) {
        window.clearInterval(poll);
        if (!combo) loadPromise = null; // let a later attempt try again
        resolve(combo);
      }
    }, 100);
  });
  return loadPromise;
}

/**
 * Holds the hidden container Google Translate mounts into, and clears stale
 * googtrans cookies. Does NOT load the script or auto-translate.
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
        /* Google's loading spinner sits off-screen but animates forever, which
           restyles the page every frame. Nobody can see it; switch it off. */
        .VIpgJd-ZVi9od-aZ2wEe-wOHMyf, svg.VIpgJd-ZVi9od-aZ2wEe { display: none !important; }
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
  void loadGoogleTranslate().then((selectEl) => {
    if (selectEl) {
      selectEl.value = googleLang;
      selectEl.dispatchEvent(new Event('change'));
    }
  });
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
