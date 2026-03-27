import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type Language, t as translate, LANGUAGES, getLanguageInfo } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: Parameters<typeof translate>[0]) => string;
  languages: typeof LANGUAGES;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'regen-civics-language';

/**
 * Clear all Google Translate cookies so it can't auto-translate on load.
 * This runs on every mount to prevent stale cookies from hijacking the page.
 */
function clearGoogTransCookies() {
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;
  // Also clear for bare domain and www variant
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts.length >= 2) {
    const rootDomain = parts.slice(-2).join('.');
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + rootDomain;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start in English on fresh page load. We intentionally do NOT read
  // from localStorage here to prevent stale non-English settings from auto-
  // translating on load. The user must explicitly click the language switcher.
  const [language, setLanguageState] = useState<Language>('en');

  // On mount: nuke any stale Google Translate cookies and force English
  useEffect(() => {
    clearGoogTransCookies();
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    const info = getLanguageInfo(lang);
    document.documentElement.dir = info.dir;
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    const info = getLanguageInfo(language);
    document.documentElement.dir = info.dir;
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: Parameters<typeof translate>[0]) => {
    return translate(key, language);
  }, [language]);

  const isRTL = getLanguageInfo(language).dir === 'rtl';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
