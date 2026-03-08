/**
 * ExitIntentCapture - Subtle modal triggered on exit intent.
 * Desktop: mouse moves toward browser close button.
 * Mobile: after 60 seconds of inactivity.
 * Messaging adapts to the current page context.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, FileText, Shield, Leaf, Handshake, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

type PageContext = "investor" | "land" | "alliance" | "game" | "community" | "default";

function getPageContext(pathname: string): PageContext {
  if (
    pathname === "/opportunity" ||
    pathname === "/fund" ||
    pathname === "/investor" ||
    pathname === "/loi" ||
    pathname === "/risk-disclosure"
  ) return "investor";
  if (pathname === "/land" || pathname === "/apply") return "land";
  if (pathname === "/ally") return "alliance";
  if (pathname === "/play" || pathname === "/game" || pathname === "/quest" || pathname.startsWith("/quest")) return "game";
  if (pathname.startsWith("/community") || pathname.startsWith("/blog")) return "community";
  return "default";
}

const contextConfig: Record<PageContext, {
  icon: React.ReactNode;
  headline: string;
  subline: string;
  body: string;
  cta: string;
  successMessage: string;
}> = {
  investor: {
    icon: <FileText className="w-5 h-5 text-[#7dd87d]" />,
    headline: "Before You Go",
    subline: "Take the investment thesis with you",
    body: "Get our full investment thesis and fund overview sent directly to your inbox. No spam  -  just the information you need to make an informed decision.",
    cta: "Send Me the Thesis",
    successMessage: "We'll send you the investment thesis and keep you updated on the regenerative renaissance.",
  },
  land: {
    icon: <Leaf className="w-5 h-5 text-[#7dd87d]" />,
    headline: "Steward the Land",
    subline: "Stay connected with the land project community",
    body: "Get updates on Season 2 land project applications, community calls, and regenerative practice resources. Join the movement.",
    cta: "Keep Me Updated",
    successMessage: "You're in! We'll keep you informed about land project opportunities and community events.",
  },
  alliance: {
    icon: <Handshake className="w-5 h-5 text-[#7dd87d]" />,
    headline: "Join the Alliance",
    subline: "Connect with regenerative organizations",
    body: "Stay updated on alliance partner opportunities, governance events, and how your organization can contribute to the regenerative renaissance.",
    cta: "Stay Connected",
    successMessage: "Welcome to the alliance network! We'll reach out about partnership opportunities.",
  },
  game: {
    icon: <Gamepad2 className="w-5 h-5 text-[#7dd87d]" />,
    headline: "Play the Infinite Game",
    subline: "Get quest updates and community news",
    body: "Be the first to know about new quests, community challenges, and ways to earn rewards while regenerating your local ecosystem.",
    cta: "Join the Game",
    successMessage: "You're in the game! Expect quest updates and community highlights in your inbox.",
  },
  community: {
    icon: <Mail className="w-5 h-5 text-[#7dd87d]" />,
    headline: "Stay in the Loop",
    subline: "Join the regenerative community newsletter",
    body: "Get monthly updates on community discussions, featured projects, and the latest from the regenerative renaissance.",
    cta: "Join the Newsletter",
    successMessage: "Welcome! Monthly updates are on their way to your inbox.",
  },
  default: {
    icon: <Mail className="w-5 h-5 text-[#7dd87d]" />,
    headline: "Before You Go",
    subline: "Join the regenerative renaissance",
    body: "Stay connected with updates on the ReGen Civics Fund, Infinite Game, land projects, and community events.",
    cta: "Stay Updated",
    successMessage: "Thanks for joining! We'll keep you in the loop on all things ReGen Civics.",
  },
};

export function ExitIntentCapture() {
  const [location] = useLocation();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const context = getPageContext(location);
  const config = contextConfig[context];

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("exitIntentDismissed");
    if (wasDismissed) setDismissed(true);
  }, []);

  const triggerModal = useCallback(() => {
    if (dismissed || show || submitted) return;
    const hasSubmitted = sessionStorage.getItem("formSubmitted");
    if (hasSubmitted) return;
    // Don't show on investor pages if the visitor already gave their email
    const investorVerified =
      localStorage.getItem('investor_verified') === 'true' ||
      sessionStorage.getItem('investor_verified') === 'true';
    if (investorVerified && context === 'investor') return;
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
      toast.success(config.successMessage);
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] rounded-2xl border border-[#7dd87d]/30 p-6 md:p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-white/40 hover:text-white/70 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              <div className="text-center py-4">
                <SeedOfLifeIcon className="w-12 h-12 text-[#7dd87d] mx-auto mb-4" size={48} />
                <h3
                  className="text-white text-lg font-bold mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Check Your Inbox
                </h3>
                <p className="text-white/60 text-sm">{config.successMessage}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                    {config.icon}
                  </div>
                  <div>
                    <h3
                      className="text-white text-lg font-bold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {config.headline}
                    </h3>
                    <p className="text-white/50 text-xs">{config.subline}</p>
                  </div>
                </div>

                <p className="text-white/70 text-sm mb-5 leading-relaxed">{config.body}</p>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/55 focus:border-[#7dd87d]/50"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={newsletterMutation.isPending}
                    className="w-full bg-[#7dd87d] text-[#1a472a] hover:bg-[#6cc86c] font-bold"
                  >
                    {newsletterMutation.isPending ? "Sending..." : config.cta}
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
