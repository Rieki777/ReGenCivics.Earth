/**
 * ExitIntentCapture - Subtle modal triggered on exit intent
 * Desktop: mouse moves toward browser close button
 * Mobile: after 60 seconds of inactivity
 * Offers to send investment thesis PDF to email
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ExitIntentCaptureProps {
  /** Page context for tracking */
  pageName?: string;
}

export function ExitIntentCapture({ pageName = "opportunity" }: ExitIntentCaptureProps) {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if already dismissed in this session
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("exitIntentDismissed");
    if (wasDismissed) setDismissed(true);
  }, []);

  const triggerModal = useCallback(() => {
    if (dismissed || show || submitted) return;
    // Don't show if user has already submitted a form on this page
    const hasSubmitted = sessionStorage.getItem("formSubmitted");
    if (hasSubmitted) return;
    setShow(true);
  }, [dismissed, show, submitted]);

  // Desktop: detect mouse leaving viewport toward top
  useEffect(() => {
    if (dismissed) return;
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && e.relatedTarget === null) {
        triggerModal();
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [triggerModal, dismissed]);

  // Mobile: trigger after 60 seconds of inactivity
  useEffect(() => {
    if (dismissed) return;
    let timeout: ReturnType<typeof setTimeout>;
    let lastActivity = Date.now();

    const resetTimer = () => {
      lastActivity = Date.now();
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (Date.now() - lastActivity >= 60000) {
          triggerModal();
        }
      }, 60000);
    };

    resetTimer();
    window.addEventListener("touchstart", resetTimer, { passive: true });
    window.addEventListener("scroll", resetTimer, { passive: true });

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("touchstart", resetTimer);
      window.removeEventListener("scroll", resetTimer);
    };
  }, [triggerModal, dismissed]);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem("exitIntentDismissed", "true");
  };

  const newsletterMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("We'll send you the investment thesis shortly!");
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    newsletterMutation.mutate({ email, source: "exit_intent" });
  };

  return (
    <AnimatePresence>
      {show && !dismissed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={handleDismiss}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] rounded-2xl border border-[#7dd87d]/30 p-6 md:p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-white/40 hover:text-white/70 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              /* Success state */
              <div className="text-center py-4">
                <SeedOfLifeIcon className="w-12 h-12 text-[#7dd87d] mx-auto mb-4" size={48} />
                <h3
                  className="text-white text-lg font-bold mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Check Your Inbox
                </h3>
                <p className="text-white/60 text-sm">
                  We'll send you the investment thesis and keep you updated on the regenerative renaissance.
                </p>
              </div>
            ) : (
              /* Capture form */
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#7dd87d]" />
                  </div>
                  <div>
                    <h3
                      className="text-white text-lg font-bold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Before You Go
                    </h3>
                    <p className="text-white/50 text-xs">
                      Take the investment thesis with you
                    </p>
                  </div>
                </div>

                <p className="text-white/70 text-sm mb-5 leading-relaxed">
                  Get our full investment thesis and fund overview sent directly to your inbox. No spam, just the information you need to make an informed decision.
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#7dd87d]/50"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={newsletterMutation.isPending}
                    className="w-full bg-[#7dd87d] text-[#1a472a] hover:bg-[#6cc86c] font-bold"
                  >
                    {newsletterMutation.isPending ? "Sending..." : "Send Me the Thesis"}
                  </Button>
                </form>

                <div className="flex items-center gap-1.5 mt-3 text-white/30 text-[10px]">
                  <Shield className="w-3 h-3" />
                  <span>Your email is encrypted and never shared.</span>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ExitIntentCapture;
