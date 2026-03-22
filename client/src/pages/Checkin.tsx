/**
 * #16 — Self-service Check-in Page
 * URL: /checkin/:token
 * Shows event title, email input, check-in button.
 * On success awards 33 $ReGen tokens.
 */

import { useState } from 'react';
import { useParams } from 'wouter';
import { Check, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { SEO } from '@/components/SEO';
import { PageWrapper } from '@/components/PageWrapper';

export default function Checkin() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? '';

  const [email, setEmail] = useState('');
  const [result, setResult] = useState<{
    success: boolean;
    alreadyCheckedIn?: boolean;
    tokensAwarded?: number;
    eventTitle?: string;
  } | null>(null);
  const [error, setError] = useState('');

  const checkinMutation = trpc.events.checkin.useMutation({
    onSuccess: (data) => {
      setResult(data as any);
      setError('');
    },
    onError: (err) => {
      setError(err.message || 'Something went wrong. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    checkinMutation.mutate({ token, email: email.trim() });
  };

  return (
    <PageWrapper>
      <SEO
        title="Check In | ReGen Civics"
        description="Check in to a ReGen Civics event and earn $ReGen tokens."
      />
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Success state */}
          {result?.success && !result.alreadyCheckedIn && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/40 p-8 text-center">
              <div className="w-20 h-20 bg-[#7dd87d] rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-[#1a472a]" strokeWidth={3} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">You're checked in!</h1>
              {result.eventTitle && (
                <p className="text-white/70 text-lg mb-4">{result.eventTitle}</p>
              )}
              <div className="bg-[#7dd87d]/20 rounded-xl p-4 border border-[#7dd87d]/30">
                <p className="text-[#7dd87d] text-2xl font-bold">+33 $ReGen</p>
                <p className="text-white/60 text-sm mt-1">Tokens earned for attending</p>
              </div>
            </div>
          )}

          {/* Already checked in */}
          {result?.success && result.alreadyCheckedIn && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/40 p-8 text-center">
              <div className="w-20 h-20 bg-[#7dd87d]/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-[#7dd87d]" strokeWidth={3} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Already checked in</h1>
              {result.eventTitle && (
                <p className="text-white/70 mb-4">{result.eventTitle}</p>
              )}
              <p className="text-white/60">You've already checked in to this event. Your $ReGen tokens were awarded previously.</p>
            </div>
          )}

          {/* Check-in form */}
          {!result && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/30 p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#7dd87d]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-[#7dd87d]" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Event Check-in</h1>
                <p className="text-white/60">Enter your email to confirm your attendance and earn 33 $ReGen tokens.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#7dd87d]/60"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={checkinMutation.isPending || !email.trim()}
                  className="w-full bg-[#7dd87d] hover:bg-[#6bc86b] disabled:opacity-50 text-[#1a472a] px-6 py-3 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  {checkinMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Checking in...
                    </>
                  ) : (
                    'Check In'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
