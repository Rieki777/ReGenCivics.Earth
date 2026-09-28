import { useState, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { useThrottledScroll } from '@/hooks/useThrottledScroll';
import type { TocSection } from '@/components/MobileTableOfContents';

interface TableOfContentsProps {
  /**
   * The sections to list, in page order. Each id must match an element on the
   * page. The page passes the same list to MobileTableOfContents, so the two
   * can't drift apart; pass a stable (module-level) array, because the scroll
   * handler re-subscribes whenever it changes.
   */
  sections: TocSection[];
}

export function TableOfContents({ sections }: TableOfContentsProps) {
  const [activeSection, setActiveSection] = useState<string>('');

  const handleScroll = useCallback(() => {
    // Find which section is currently in view
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.top <= 200 && rect.bottom >= 200) {
          setActiveSection(section.id);
          break;
        }
      }
    }
  }, [sections]);

  useThrottledScroll(handleScroll);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  return (
    <div className="hidden lg:block fixed right-8 top-32 w-72 max-h-[calc(100vh-200px)] overflow-y-auto z-40">
      <div className="bg-[#1a472a]/90 backdrop-blur-sm rounded-xl border border-[#7dd87d]/30 p-5 sticky top-32">
        {/* h2: this sidebar renders ahead of the page h1, so an h3 read as a
            level skip on any page that opens with it. */}
        <h2 className="text-sm font-bold text-[#7dd87d] mb-4 uppercase tracking-wide">
          On This Page
        </h2>

        <nav className="space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-start gap-2 group ${
                activeSection === section.id
                  ? 'bg-[#7dd87d]/20 text-[#7dd87d] font-semibold'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <ChevronRight className={`w-4 h-4 mt-0.5 flex-shrink-0 transition-transform ${
                activeSection === section.id ? 'translate-x-1' : ''
              }`} />
              <span className="text-xs leading-relaxed">
                {section.title}
              </span>
            </button>
          ))}
        </nav>

        {/* Scroll indicator */}
        <div className="mt-4 pt-4 border-t border-[#7dd87d]/20">
          <p className="text-xs text-white/60 text-center">
            Scroll to explore
          </p>
        </div>
      </div>
    </div>
  );
}
