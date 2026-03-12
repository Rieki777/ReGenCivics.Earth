/**
 * Newsletter Signup Component
 * Compact CTA button that links to /form for newsletter signup
 * Heading and description are provided by the parent component
 *
 * Also exports NewsletterSignupInline for embeddable direct-subscribe widget (C12).
 */

import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { isNewsletterSubscribed, markNewsletterSubscribed } from "@/utils/newsletter";
import { analytics } from "@/lib/analytics";

export default function NewsletterSignup() {
  return (
    <div className="text-center">
      {/* CTA Button - Links to /form */}
      <Link href="/form">
        <Button
          className="rounded-xl bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold px-8 py-6 h-auto text-lg transition-all hover:scale-105"
          style={{ fontFamily: 'var(--font-accent)' }}
        >
          <Mail className="w-5 h-5 mr-2" />
          Subscribe
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </Link>

      {/* Privacy note */}
      <p className="text-white/50 text-sm mt-6">
        We respect your inbox. Unsubscribe anytime. No spam, just regeneration.
      </p>
    </div>
  );
}

/**
 * NewsletterSignupInline
 * Embeddable inline email subscribe widget that calls the tRPC newsletter.subscribe endpoint.
 */
export function NewsletterSignupInline({ className = "" }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(() => isNewsletterSubscribed());

  const subscribeMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => {
      markNewsletterSubscribed();
      analytics.newsletterSignup();
      setSubscribed(true);
    },
    onError: () => {
      // Silently fail — newsletter signup errors should not interrupt the user
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    subscribeMutation.mutate({ email: trimmed, source: "footer" });
  }

  if (subscribed) {
    return (
      <div className={`flex items-center gap-2 text-[#7dd87d] text-sm ${className}`} style={{ fontFamily: "var(--font-body)" }}>
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        <span>You are subscribed to the ReGen Civics digest.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-1 max-w-xs">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#7dd87d]/50 text-sm"
          style={{ fontFamily: "var(--font-body)" }}
        />
      </div>
      <Button
        type="submit"
        disabled={subscribeMutation.isPending || !email.trim()}
        size="sm"
        className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold rounded-full px-4 flex-shrink-0"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {subscribeMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Subscribe"
        )}
      </Button>
    </form>
  );
}
