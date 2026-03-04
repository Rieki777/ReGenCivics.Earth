/**
 * Newsletter Signup Component
 * Compact CTA button that links to /form for newsletter signup
 * Heading and description are provided by the parent component
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight } from "lucide-react";

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
        🌱 We respect your inbox. Unsubscribe anytime. No spam, just regeneration.
      </p>
    </div>
  );
}
