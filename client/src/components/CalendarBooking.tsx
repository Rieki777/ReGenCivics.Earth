/**
 * Calendar Booking Component
 * Embeds Calendly or Cal.com scheduling widget
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, ExternalLink, Clock, Video, Phone } from "lucide-react";

interface CalendarBookingProps {
  calendlyUrl?: string;
  calcomUrl?: string;
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "ghost";
  buttonSize?: "default" | "sm" | "lg";
  className?: string;
  showInline?: boolean;
}

export function CalendarBooking({
  calendlyUrl = "https://calendly.com/rieki-cordon/30min",
  calcomUrl,
  buttonText = "Schedule a Call",
  buttonVariant = "default",
  buttonSize = "default",
  className = "",
  showInline = false,
}: CalendarBookingProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const bookingUrl = calcomUrl || calendlyUrl;
  const isCalendly = !calcomUrl;

  // Inline embed version
  if (showInline) {
    return (
      <div className={`rounded-2xl overflow-hidden border-2 border-[#7dd87d]/20 bg-white ${className}`}>
        <div className="bg-[#1a472a] px-6 py-4">
          <h3 
            className="text-xl font-bold text-white flex items-center gap-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <Calendar className="w-5 h-5 text-[#7dd87d]" />
            Book Your Discovery Call
          </h3>
          <p className="text-white/70 text-sm mt-1">
            Select a time that works best for you
          </p>
        </div>
        <div className="p-4">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-[#f0ebe3] rounded-lg">
              <Clock className="w-5 h-5 text-[#1a472a]" />
              <div>
                <p className="font-semibold text-[#1a472a] text-sm">30 Minutes</p>
                <p className="text-xs text-[#1a472a]/60">Duration</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f0ebe3] rounded-lg">
              <Video className="w-5 h-5 text-[#1a472a]" />
              <div>
                <p className="font-semibold text-[#1a472a] text-sm">Video Call</p>
                <p className="text-xs text-[#1a472a]/60">Google Meet / Zoom</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f0ebe3] rounded-lg">
              <Phone className="w-5 h-5 text-[#1a472a]" />
              <div>
                <p className="font-semibold text-[#1a472a] text-sm">Or Phone</p>
                <p className="text-xs text-[#1a472a]/60">Your preference</p>
              </div>
            </div>
          </div>
          <iframe
            src={`${bookingUrl}?embed_domain=${window.location.hostname}&embed_type=Inline`}
            width="100%"
            height="630"
            frameBorder="0"
            className="rounded-lg"
            title="Schedule a call"
          />
        </div>
      </div>
    );
  }

  // Modal/dialog version
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={buttonVariant} 
          size={buttonSize}
          className={className}
        >
          <Calendar className="w-4 h-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle 
            className="text-2xl text-[#1a472a] flex items-center gap-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <Calendar className="w-6 h-6 text-[#7dd87d]" />
            Schedule Your Discovery Call
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Call info */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-[#f0ebe3] rounded-lg">
              <Clock className="w-5 h-5 text-[#1a472a]" />
              <div>
                <p className="font-semibold text-[#1a472a] text-sm">30 Minutes</p>
                <p className="text-xs text-[#1a472a]/60">Duration</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f0ebe3] rounded-lg">
              <Video className="w-5 h-5 text-[#1a472a]" />
              <div>
                <p className="font-semibold text-[#1a472a] text-sm">Video Call</p>
                <p className="text-xs text-[#1a472a]/60">Google Meet / Zoom</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f0ebe3] rounded-lg">
              <Phone className="w-5 h-5 text-[#1a472a]" />
              <div>
                <p className="font-semibold text-[#1a472a] text-sm">Or Phone</p>
                <p className="text-xs text-[#1a472a]/60">Your preference</p>
              </div>
            </div>
          </div>

          {/* Calendly/Cal.com embed */}
          <div className="rounded-lg overflow-hidden border border-[#1a472a]/10">
            <iframe
              src={`${bookingUrl}?embed_domain=${window.location.hostname}&embed_type=Inline`}
              width="100%"
              height="630"
              frameBorder="0"
              title="Schedule a call"
            />
          </div>

          {/* External link fallback */}
          <div className="text-center pt-2">
            <a 
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#1a472a]/60 hover:text-[#1a472a] inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Open in new window
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simplified button that just opens Calendly in new tab
export function CalendarBookingButton({
  calendlyUrl = "https://calendly.com/rieki-cordon/30min",
  buttonText = "Schedule a Call",
  buttonVariant = "default",
  buttonSize = "default",
  className = "",
}: Omit<CalendarBookingProps, 'showInline'>) {
  return (
    <Button 
      variant={buttonVariant} 
      size={buttonSize}
      className={className}
      onClick={() => window.open(calendlyUrl, '_blank')}
    >
      <Calendar className="w-4 h-4 mr-2" />
      {buttonText}
    </Button>
  );
}

export default CalendarBooking;
