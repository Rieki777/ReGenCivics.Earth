/**
 * #19 - Dedicated Event Page
 * URL: /events/:id
 * Before event: title, date, description, signup form, countdown
 * After event: recording replay, AI summary, forum thread link
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import {
  Calendar,
  Clock,
  Users,
  Video,
  ExternalLink,
  Bell,
  Check,
  Share2,
  Copy,
  Loader2,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { SEO } from '@/components/SEO';
import { PageWrapper } from '@/components/PageWrapper';

export default function EventDetail() {
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id ?? '0', 10);

  const { data: event, isLoading, error } = trpc.events.getById.useQuery(
    { id: eventId },
    { enabled: eventId > 0 }
  );

  const [email, setEmail] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const signupMutation = trpc.events.signup.useMutation({
    onSuccess: () => {
      setSignupSuccess(true);
      setEmail('');
    },
  });

  // Countdown
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!event?.startTime) return;
    const target = new Date(event.startTime).getTime();
    const update = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft('');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${mins}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m`);
      } else {
        setTimeLeft(`${mins}m`);
      }
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [event?.startTime]);

  const isPast = event?.startTime ? new Date(event.startTime) < new Date() : false;
  const isCompleted = event?.status === 'completed';

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !eventId) return;
    signupMutation.mutate({ eventId, email: email.trim() });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTwitter = () => {
    if (!event) return;
    const text = encodeURIComponent(`${event.title} - ReGen Civics`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareWhatsApp = () => {
    if (!event) return;
    const text = encodeURIComponent(`${event.title} - ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#7dd87d] animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  if (error || !event) {
    return (
      <PageWrapper>
        <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a] flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-3">Event not found</h1>
            <p className="text-white/60 mb-6">This event may have been removed or the link is incorrect.</p>
            <Link href="/schedule" className="text-[#7dd87d] hover:underline">Back to Schedule</Link>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const startDate = new Date(event.startTime);
  const dateStr = startDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
  const tz = event.timezone ?? 'UTC';

  return (
    <PageWrapper>
      <SEO
        title={`${event.title} | ReGen Civics`}
        description={event.description ?? `Join ${event.title} with ReGen Civics.`}
      />
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a]">
        {/* Back nav */}
        <div className="container mx-auto max-w-3xl px-4 pt-6">
          <Link href="/schedule" className="inline-flex items-center gap-2 text-white/60 hover:text-[#7dd87d] transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Schedule
          </Link>
        </div>

        {/* Main content */}
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/30 overflow-hidden">

            {/* Header */}
            <div className="p-8 pb-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {event.type === 'open' && (
                  <span className="bg-[#7dd87d] text-[#1a472a] text-xs font-bold px-2 py-1 rounded-full">OPEN ACCESS</span>
                )}
                {event.season && (
                  <span className="text-xs text-white/60">{event.season}{event.episodeNumber ? ` · Episode ${event.episodeNumber}` : ''}</span>
                )}
                {isCompleted && (
                  <span className="bg-gray-500/20 text-gray-400 text-xs font-medium px-2 py-1 rounded-full">Completed</span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                {event.title}
              </h1>

              {/* Date/time */}
              <div className="flex flex-wrap items-center gap-4 text-white/60 mb-4">
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#7dd87d]" />
                  {dateStr}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#7dd87d]" />
                  {timeStr} {tz}
                </span>
                {event.signupCount > 0 && (
                  <span className="flex items-center gap-2 text-[#7dd87d]/80">
                    <Users className="w-5 h-5" />
                    {event.signupCount} {event.signupCount === 1 ? 'person' : 'people'} signed up
                  </span>
                )}
              </div>

              {/* Countdown */}
              {timeLeft && !isPast && (
                <div className="inline-flex items-center gap-2 bg-[#7dd87d]/20 px-4 py-2 rounded-xl border border-[#7dd87d]/30 mb-4">
                  <Clock className="w-4 h-4 text-[#7dd87d]" />
                  <span className="text-[#7dd87d] font-medium">Starts in {timeLeft}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="px-8 pb-6">
                <p className="text-white/70 leading-relaxed">{event.description}</p>
              </div>
            )}

            {/* Post-event content */}
            {isCompleted && (
              <div className="px-8 pb-6 space-y-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-white/50 text-sm mb-3">This event has ended.</p>

                  {/* Recording replay */}
                  {event.recording?.youtubeUrl && (
                    <a
                      href={event.recording.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium transition-colors mr-2 mb-2"
                    >
                      <Video className="w-4 h-4" />
                      Watch Recording
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {/* Forum thread */}
                  {event.forumThreadId && (
                    <Link
                      href={`/community/post/${event.forumThreadId}`}
                      className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors mb-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Discussion Thread
                    </Link>
                  )}
                </div>

                {/* AI Summary */}
                {event.recording?.aiSummary && (
                  <div className="bg-[#f0f7f0]/10 border-l-4 border-[#7dd87d] rounded-r-xl p-4">
                    <p className="text-[#7dd87d] font-medium text-sm mb-2">Session Summary</p>
                    <p className="text-white/70 text-sm leading-relaxed">{event.recording.aiSummary}</p>
                  </div>
                )}
              </div>
            )}

            {/* Pre-event: signup + join links */}
            {!isCompleted && (
              <div className="px-8 pb-6 space-y-4">
                {/* Join link */}
                {(event.riversideRoomUrl || event.zoomUrl) && (
                  <a
                    href={event.riversideRoomUrl ?? event.zoomUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 ${event.riversideRoomUrl ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#2d8cff] hover:bg-[#2681eb]'} text-white px-5 py-3 rounded-xl font-semibold transition-colors`}
                  >
                    <Video className="w-5 h-5" />
                    {event.riversideRoomUrl ? 'Join on Riverside' : 'Join on Zoom'}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                {/* Reminder signup */}
                {signupSuccess ? (
                  <div className="bg-[#7dd87d]/20 border border-[#7dd87d]/30 rounded-xl px-4 py-3 flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#7dd87d]" />
                    <span className="text-[#7dd87d] font-medium">Reminder set! We'll email you before the event.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSignup} className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#7dd87d]/60"
                    />
                    <button
                      type="submit"
                      disabled={signupMutation.isPending || !email.trim()}
                      className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-medium transition-colors whitespace-nowrap flex items-center gap-2 border border-white/10"
                    >
                      <Bell className="w-4 h-4" />
                      {signupMutation.isPending ? '...' : 'Get Reminder'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Share buttons */}
            <div className="px-8 pb-8 pt-2 border-t border-white/10">
              <p className="text-white/60 text-sm mb-3 flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share this event
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={shareTwitter}
                  className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors border border-white/10"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Post on X
                </button>
                <button
                  onClick={shareWhatsApp}
                  className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors border border-white/10"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </button>
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors border border-white/10"
                >
                  {copied ? <Check className="w-4 h-4 text-[#7dd87d]" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
