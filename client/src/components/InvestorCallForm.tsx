import { X, Calendar } from "lucide-react";
import { useEffect } from "react";

interface InvestorCallFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InvestorCallForm({ isOpen, onClose }: InvestorCallFormProps) {
  // Load Calendly widget script
  useEffect(() => {
    if (isOpen) {
      // Check if script already exists
      const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://assets.calendly.com/assets/external/widget.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#f5f0e8] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border-4 border-[#7dd87d]">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a472a] p-4 z-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#1a472a]" />
            </div>
            <div>
              <h2 
                className="text-xl font-bold text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Schedule an Investor Call
              </h2>
              <p className="text-white/70 text-sm">Book a 30-minute call to discuss joining the ReGenerative Renaissance</p>
            </div>
          </div>
        </div>

        {/* Calendly Embed */}
        <div className="bg-white" style={{ height: '650px' }}>
          <div 
            className="calendly-inline-widget" 
            data-url="https://calendly.com/rieki-cordon/30min?hide_gdpr_banner=1&background_color=f5f0e8&text_color=1a472a&primary_color=7dd87d"
            style={{ minWidth: '320px', height: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}
