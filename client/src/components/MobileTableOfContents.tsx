import { useState, useCallback } from 'react';
import { ChevronUp, Compass, X } from 'lucide-react';
import { useThrottledScroll } from '@/hooks/useThrottledScroll';

export interface TocSection {
  id: string;
  title: string;
}

// Default sections for the Opportunity page (backward compat)
const OPPORTUNITY_SECTIONS: TocSection[] = [
  { id: 'what-is-alliance', title: 'What Is The Alliance?' },
  { id: 'fund-snapshot', title: 'Fund Snapshot' },
  { id: 'governance', title: 'Why On-Chain Governance?' },
  { id: 'carried-interest', title: 'How Carried Interest Works' },
  { id: 'fund-structure', title: 'Fund Structure' },
  { id: 'opportunity', title: 'The Opportunity' },
  { id: 'investment-thesis', title: 'Investment Thesis' },
  { id: 'risk-factors', title: 'What Could Go Wrong?' },
  { id: 'impact', title: 'Impact Framework' },
  { id: 'strategy', title: 'Investment Strategy' },
  { id: 'team', title: 'Team & Operating Model' },
  { id: 'competitive', title: 'Competitive Positioning' },
  { id: 'portfolio', title: 'Portfolio Overview' },
  { id: 'is-right', title: 'Is This Right For You?' },
  { id: 'investment-process', title: 'Investment Process' },
  { id: 'faq', title: 'Frequently Asked Questions' },
  { id: 'vision-2040', title: 'The Vision: 2040' },
];

interface MobileTableOfContentsProps {
  sections?: TocSection[];
  fallbackTitle?: string;
}

export function MobileTableOfContents({ sections = OPPORTUNITY_SECTIONS, fallbackTitle = 'Sections' }: MobileTableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<string>('');

  // Detect current section as user scrolls
  const handleScroll = useCallback(() => {
    let activeSection = '';

    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2) {
          activeSection = section.id;
        }
      }
    }

    setCurrentSection(activeSection);
  }, [sections]);

  useThrottledScroll(handleScroll);

  const handleSectionClick = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsOpen(false);
    }
  };

  const currentSectionTitle = sections.find(s => s.id === currentSection)?.title || fallbackTitle;

  return (
    <>
      {/* Sticky Current Section Pill - Mobile Only */}
      <div className="fixed top-20 left-0 right-0 z-40 md:hidden px-4 py-2">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full bg-[#7dd87d]/90 hover:bg-[#7dd87d] backdrop-blur-sm text-[#1a472a] px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Compass className="w-4 h-4" />
          <span className="truncate">{currentSectionTitle}</span>
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Action Button - Mobile Only */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 z-40 md:hidden w-14 h-14 rounded-full bg-[#7dd87d] hover:bg-[#5fc85f] text-[#1a472a] shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label="Jump to section"
      >
        <Compass className="w-6 h-6" />
      </button>

      {/* Navigation Drawer - Mobile Only */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 bg-[#1a472a] rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-[#1a472a] border-b border-[#7dd87d]/20 px-4 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Jump to Section</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Section List */}
            <div className="px-4 py-3 space-y-2 pb-8">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    currentSection === section.id
                      ? 'bg-[#7dd87d] text-[#1a472a] font-semibold'
                      : 'bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
