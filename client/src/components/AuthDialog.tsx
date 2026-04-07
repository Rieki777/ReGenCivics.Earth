/**
 * AuthDialog  -  Unified auth modal.
 * Shows Google, Apple, and Email magic-link login options.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { getGoogleLoginUrl } from "@/const";

interface AuthDialogProps {
  title?: string;
  logo?: string;
  open?: boolean;
  onLogin: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function AuthDialog({
  title,
  logo,
  open = false,
  onOpenChange,
  onClose,
}: AuthDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (!onOpenChange) setInternalOpen(open);
  }, [open, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
    if (!nextOpen) {
      onClose?.();
      // Reset email state when closing
      setEmail("");
      setEmailSent(false);
      setEmailError("");
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailLoading(true);
    setEmailError("");
    try {
      const res = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setEmailSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setEmailError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setEmailError("Network error. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  const isOpen = onOpenChange ? open : internalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="py-5 bg-[#0d2818] rounded-[20px] w-[400px] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.4)] border border-[#7dd87d]/20 p-0 gap-0 text-center">
        <div className="flex flex-col items-center gap-2 p-6 pt-10">
          {logo ? (
            <div className="w-14 h-14 bg-[#1a472a] rounded-xl border border-[#7dd87d]/20 flex items-center justify-center mb-1">
              <img src={logo} alt="Dialog graphic" className="w-9 h-9 rounded-md" width={36} height={36} loading="lazy" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-[#1a472a] rounded-full border border-[#7dd87d]/30 flex items-center justify-center mb-1">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#7dd87d]" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}

          {title && (
            <DialogTitle className="text-xl font-semibold text-white leading-snug">
              {title}
            </DialogTitle>
          )}
          <DialogDescription className="text-sm text-white/50">
            Sign in to continue
          </DialogDescription>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-3">
          {emailSent ? (
            <div className="rounded-xl bg-[#1a472a]/60 border border-[#7dd87d]/30 p-4 text-center">
              <p className="text-[#7dd87d] font-semibold mb-1">Check your email!</p>
              <p className="text-white/60 text-sm">
                A login link was sent to <strong className="text-white/80">{email}</strong>. It expires in 15 minutes.
              </p>
            </div>
          ) : (
            <>
              {/* Google */}
              <a
                href={getGoogleLoginUrl()}
                className="flex items-center justify-center gap-3 w-full h-11 rounded-xl bg-white text-[#1a1a19] font-medium text-sm hover:bg-white/90 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285f4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34a853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fbbc05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ea4335"/>
                </svg>
                Continue with Google
              </a>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Email */}
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full h-11 rounded-xl bg-[#1a472a]/40 border border-[#7dd87d]/20 text-white placeholder-white/30 px-4 text-sm focus:outline-none focus:border-[#7dd87d]/50"
                />
                {emailError && (
                  <p className="text-red-400 text-xs text-left">{emailError}</p>
                )}
                <Button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full h-11 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-semibold rounded-xl text-sm"
                >
                  {emailLoading ? "Sending..." : "Send login link"}
                </Button>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
