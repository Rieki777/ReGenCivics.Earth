import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { getLanguageInfo } from '@/lib/i18n';
import { triggerGoogleTranslate, resetGoogleTranslate } from '@/components/GoogleTranslate';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentLang = getLanguageInfo(language);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-full transition-all duration-200 hover:bg-white/10 ${
          compact 
            ? 'p-1.5 text-sm' 
            : 'px-3 py-1.5 text-sm border border-white/20'
        }`}
        aria-label="Change language"
        title="Change language"
      >
        <Globe className="w-4 h-4 text-[#7dd87d]" />
        {!compact && (
          <span className="text-white/80 text-xs font-medium">
            {currentLang.flag} {currentLang.code.toUpperCase()}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a472a] border border-[#7dd87d]/30 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-[#7dd87d]/20">
            <p className="text-[#7dd87d] text-xs font-semibold px-2 py-1" style={{ fontFamily: 'var(--font-accent)' }}>
              Select Language
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  // Trigger Google Translate for the whole page
                  if (lang.code === 'en') {
                    resetGoogleTranslate();
                  } else {
                    triggerGoogleTranslate(lang.code);
                  }
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  language === lang.code
                    ? 'bg-[#7dd87d]/20 text-[#7dd87d]'
                    : 'text-white/80 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lang.nativeName}</p>
                  <p className="text-xs opacity-60">{lang.name}</p>
                </div>
                {language === lang.code && (
                  <div className="w-2 h-2 rounded-full bg-[#7dd87d]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
