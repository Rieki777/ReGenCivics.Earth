import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type Language, t as translate, detectLanguage, LANGUAGES, getLanguageInfo } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: Parameters<typeof translate>[0]) => string;
  languages: typeof LANGUAGES;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'regen-civics-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && LANGUAGES.some(l => l.code === stored)) {
        return stored as Language;
      }
    }
    return detectLanguage();
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    // Update document direction for RTL languages
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
