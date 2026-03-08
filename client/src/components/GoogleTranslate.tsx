/**
 * GoogleTranslate - Integrates Google Translate for automatic site-wide translation
 * Replaces the custom i18n system with Google's machine translation for all page content.
 * Uses the Google Translate Element API v2.
 */
import { useEffect, useRef } from 'react';

// Language code mapping from our internal codes to Google Translate codes
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

// All supported language codes for Google Translate widget
const SUPPORTED_LANGS = Object.values(GOOGLE_LANG_MAP).join(',');

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}

/**
 * Injects the Google Translate script and initializes the widget.
 * This component renders a hidden container that Google Translate uses,
 * then we expose a custom styled trigger through LanguageSwitcher.
 */
const AUTO_DETECT_KEY = 'regen-civics-auto-lang-detected';
const LANG_STORAGE_KEY = 'regen-civics-language';

/**
 * Detect the browser's preferred language and return the matching
 * Google Translate language code, or null if English or unsupported.
 */
function detectBrowserLanguage(): string | null {
  if (typeof navigator === 'undefined') return null;
  const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
  if (!browserLang || browserLang === 'en') return null;
  return GOOGLE_LANG_MAP[browserLang] || null;
}

export function GoogleTranslateProvider() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Define the callback Google Translate will call
    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: SUPPORTED_LANGS,
            layout: 0, // SIMPLE layout (dropdown)
            autoDisplay: false,
            multilanguagePage: false,
          },
          'google_translate_element'
        );

        // Auto-detect: on first visit, if browser is non-English,
        // auto-trigger translation after a short delay for the widget to initialize
        const alreadyDetected = localStorage.getItem(AUTO_DETECT_KEY);
        const manuallyChosen = localStorage.getItem(LANG_STORAGE_KEY);
        if (!alreadyDetected && !manuallyChosen) {
          const detectedLang = detectBrowserLanguage();
          if (detectedLang) {
            // Mark as detected so we don't auto-trigger again
            localStorage.setItem(AUTO_DETECT_KEY, 'true');
            // Wait for Google Translate widget to fully render
            setTimeout(() => {
              const selectEl = document.querySelector('.goog-te-combo') as HTMLSelectElement;
              if (selectEl) {
                selectEl.value = detectedLang;
                selectEl.dispatchEvent(new Event('change'));
              }
            }, 1500);
          } else {
            // English browser, mark as detected to skip future checks
            localStorage.setItem(AUTO_DETECT_KEY, 'true');
          }
        }
      }
    };

    // Load the Google Translate script
    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup
      delete window.googleTranslateElementInit;
    };
  }, []);

  return (
    <>
      {/* Hidden container for Google Translate widget */}
      <div id="google_translate_element" className="hidden" />
      {/* CSS to hide Google Translate's default bar and branding */}
      <style>{`
        .goog-te-banner-frame { display: none !important; }
        body { top: 0 !important; }
        .goog-te-gadget { font-size: 0 !important; }
        .goog-te-gadget .goog-te-combo {
          font-size: 14px !important;
          padding: 4px 8px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(26, 71, 42, 0.9);
          color: white;
          font-family: var(--font-body);
          cursor: pointer;
          outline: none;
        }
        .goog-te-gadget .goog-te-combo:focus {
          border-color: #7dd87d;
        }
        .goog-te-gadget .goog-te-combo option {
          background: #1a472a;
          color: white;
        }
        /* Hide "Powered by Google" text */
        .goog-te-gadget > span { display: none !important; }
        .goog-logo-link { display: none !important; }
        /* Fix Google Translate tooltip */
        .goog-tooltip { display: none !important; }
        .goog-tooltip:hover { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
        /* Prevent Google Translate from adding top padding */
        .skiptranslate { display: none !important; }
        #google_translate_element .skiptranslate { display: block !important; }
      `}</style>
    </>
  );
}

/**
 * Programmatically trigger Google Translate to switch language.
 * This works by finding and manipulating the hidden select element.
 */
export function triggerGoogleTranslate(langCode: string) {
  const googleLang = GOOGLE_LANG_MAP[langCode] || langCode;
  
  // Find the Google Translate select element
  const selectEl = document.querySelector('.goog-te-combo') as HTMLSelectElement;
  if (selectEl) {
    selectEl.value = googleLang;
    selectEl.dispatchEvent(new Event('change'));
  }
}

/**
 * Reset Google Translate back to original English content.
 * Google Translate doesn't expose a clean "restore original" API, so we
 * clear the translation cookie and reload to ensure a clean English state.
 */
export function resetGoogleTranslate() {
  // Clear the googtrans cookie (this persists the chosen language across pages)
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;

  // Try widget select first (works when widget is visible)
  const selectEl = document.querySelector('.goog-te-combo') as HTMLSelectElement;
  if (selectEl) {
    // Set to English explicitly  -  empty string is unreliable
    selectEl.value = 'en';
    selectEl.dispatchEvent(new Event('change'));
    // Reload after a short delay to ensure the translation state is fully cleared
    setTimeout(() => window.location.reload(), 300);
  } else {
    // Widget not found  -  reload directly clears translation state via cleared cookie
    window.location.reload();
  }
}
