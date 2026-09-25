/**
 * /sign-in: a page that is only the sign-in dialog. The contribution emails
 * link here ("Make your account") with ?returnTo=<project path>, and so can
 * anything else that wants a plain sign-in link.
 *
 * After sign-in it goes to returnTo when that is a same-site path (starts
 * with "/" and not "//"), else to /profile. The email address is never
 * carried in the URL.
 *
 * Google sign-in comes back to this same URL (AuthDialog passes the current
 * path as its returnTo), sees the session and moves on. The email link opens
 * in a new tab at "/"; when the person comes back to this tab it checks the
 * session again and moves on from here too.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AuthDialog } from "@/components/AuthDialog";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { normalizeReturnTo } from "@shared/oauthReturnTo";

/** Where to go after signing in, from the page's query string. */
export function signInDestination(search: string): string {
  const raw = new URLSearchParams(search).get("returnTo");
  const safe = normalizeReturnTo(raw);
  if (!safe || safe.startsWith("/sign-in")) return "/profile";
  return safe;
}

export default function SignIn() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(true);
  const destination = signInDestination(typeof window !== "undefined" ? window.location.search : "");

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    navigate(destination, { replace: true });
  }, [loading, isAuthenticated, destination, navigate]);

  // Someone who signs in through the email link does it in another tab.
  // When they come back here, check the session again.
  useEffect(() => {
    if (isAuthenticated) return;
    const recheck = () => { void utils.auth.me.invalidate(); };
    const onVisible = () => { if (document.visibilityState === "visible") recheck(); };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isAuthenticated, utils]);

  return (
    <div className="min-h-[70vh] px-4 py-16 flex items-start justify-center">
      <SEO title="Sign in" description="Sign in to ReGen Civics or make a free account." url="/sign-in" noIndex />
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Sign in to ReGen Civics</h1>
        <p className="text-foreground/80 mb-6">
          New here? Signing in makes your free account. Use the email you offered with, and your offers
          link to your account.
        </p>
        {!open && !isAuthenticated && (
          <Button onClick={() => setOpen(true)} className="bg-[#4a7c59] hover:bg-[#1a472a] text-white">
            Sign in
          </Button>
        )}
      </div>
      <AuthDialog
        title="Sign in or make your account"
        open={open && !isAuthenticated}
        onOpenChange={setOpen}
        onLogin={() => setOpen(false)}
      />
    </div>
  );
}
