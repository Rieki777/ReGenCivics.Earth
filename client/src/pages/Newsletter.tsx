/**
 * Newsletter Page - Subscribe to ReGen Civics updates
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { SEO, pageSEO } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { markNewsletterSubscribed } from "@/utils/newsletter";
import { analytics } from "@/lib/analytics";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const subscribeMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => {
      markNewsletterSubscribed();
      analytics.newsletterSignup();
      setStatus("success");
      setMessage("Thank you for subscribing! You'll hear from us soon.");
      setEmail("");
    },
    onError: (err) => {
      setStatus("error");
      setMessage(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    subscribeMutation.mutate({ email, source: "homepage" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO 
        title="Newsletter | ReGen Civics"
        description="Subscribe to ReGen Civics updates and stay informed about the ReGenerative Renaissance."
      />

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          {/* Back Link */}
          <Link href="/" className="inline-flex items-center gap-2 text-[#7dd87d] hover:text-[#ffd700] transition-colors mb-8">
            <span>← Back to Home</span>
          </Link>

          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                <Mail className="w-8 h-8 text-[#7dd87d]" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Stay Connected
            </h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              Subscribe to receive updates about ReGen Civics, new land projects, alliance opportunities, and the ReGenerative Renaissance.
            </p>
          </div>

          {/* Newsletter Form */}
          <div className="bg-white/5 border border-[#7dd87d]/30 rounded-2xl p-8 md:p-12 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-[#7dd87d]/30 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:border-[#7dd87d] transition-colors"
                />
              </div>

              <Button
                type="submit"
                disabled={status === "loading" || subscribeMutation.isPending}
                className="w-full bg-[#7dd87d] hover:bg-[#7dd87d]/90 text-[#1a472a] font-bold py-3 rounded-lg transition-all"
              >
                {(status === "loading" || subscribeMutation.isPending) ? "Subscribing..." : "Subscribe to Newsletter"}
              </Button>
            </form>

            {/* Status Messages */}
            {status === "success" && (
              <div className="mt-6 p-4 bg-[#7dd87d]/20 border border-[#7dd87d] rounded-lg flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
                <p className="text-[#7dd87d] text-sm">{message}</p>
              </div>
            )}

            {status === "error" && (
              <div className="mt-6 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-500 text-sm">{message}</p>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <h3 className="font-bold text-[#7dd87d] mb-2">Monthly Updates</h3>
              <p className="text-white/70 text-sm">Hear about new projects, alliance partners, and movement milestones</p>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-[#7dd87d] mb-2">No Spam</h3>
              <p className="text-white/70 text-sm">We respect your inbox. Unsubscribe anytime with one click</p>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-[#7dd87d] mb-2">Exclusive Content</h3>
              <p className="text-white/70 text-sm">Subscribers get early access to new opportunities and research</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
