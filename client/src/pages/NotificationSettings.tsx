/**
 * /settings/notifications: per-type email cadence, muted people, and muted
 * threads. Email unsubscribe links land here. The global email switch is
 * emailDigestFrequency 'never' (managed on the profile page); this page
 * covers the forum notification channels.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/BackButton';
import { TaoSpinner } from '@/components/TaoSpinner';
import { PageTransition } from '@/components/PageTransition';
import { toast } from 'sonner';
import { X, BellOff, Bell, Smartphone } from 'lucide-react';
import {
  isPushSupported,
  isIosBrowserContext,
  subscribeToPush,
  unsubscribeFromPush,
  hasLocalSubscription,
} from '@/lib/pushManager';

/** Push opt-in toggle. Permission is requested only from this explicit tap. */
function PushSection() {
  const utils = trpc.useUtils();
  const { data: keyData } = trpc.notifications.push.publicKey.useQuery();
  const [localSubscribed, setLocalSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    hasLocalSubscription().then(setLocalSubscribed);
  }, []);

  const subscribeMutation = trpc.notifications.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.notifications.push.unsubscribe.useMutation();

  if (!keyData?.enabled) return null;

  if (!isPushSupported()) {
    return (
      <section className="bg-white rounded-xl border border-[#e8e4de] p-5">
        <h2 className="font-bold text-[#1a472a] mb-1">Push notifications</h2>
        <p className="text-sm text-[#1a472a]/60">This browser does not support push notifications.</p>
      </section>
    );
  }

  if (isIosBrowserContext()) {
    return (
      <section className="bg-white rounded-xl border border-[#e8e4de] p-5">
        <h2 className="font-bold text-[#1a472a] mb-1">Push notifications</h2>
        <p className="text-sm text-[#1a472a]/70 flex items-start gap-2">
          <Smartphone className="w-4 h-4 mt-0.5 flex-shrink-0" />
          On iPhone, push works once the app is on your home screen: tap the share button in Safari, then "Add to Home Screen", and turn push on from the installed app.
        </p>
      </section>
    );
  }

  const toggle = async () => {
    setBusy(true);
    try {
      if (localSubscribed) {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) await unsubscribeMutation.mutateAsync({ endpoint });
        setLocalSubscribed(false);
        toast.success('Push notifications are off for this browser');
      } else {
        const keys = await subscribeToPush(keyData.key!);
        if (!keys) {
          toast.error('Push permission was not granted');
          return;
        }
        await subscribeMutation.mutateAsync({ ...keys, userAgent: navigator.userAgent.slice(0, 255) });
        setLocalSubscribed(true);
        toast.success('Push notifications are on for this browser');
      }
      utils.notifications.push.status.invalidate();
    } catch (err) {
      console.error('[push] toggle failed', err);
      toast.error('Something went wrong setting up push');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-[#e8e4de] p-5">
      <h2 className="font-bold text-[#1a472a] mb-1">Push notifications</h2>
      <p className="text-xs text-[#1a472a]/70 mb-3">
        Mentions, replies, and gratitude reach this device even when the site is closed.
      </p>
      <Button
        variant={localSubscribed ? 'outline' : 'default'}
        size="sm"
        disabled={busy}
        onClick={toggle}
        aria-pressed={localSubscribed}
        className={localSubscribed ? 'border-[#7dd87d]/50 text-[#1a472a]' : 'bg-[#1a472a] hover:bg-[#2d5a3d] text-white'}
      >
        {busy ? 'Working…' : localSubscribed ? 'Turn off on this browser' : 'Turn on push'}
      </Button>
    </section>
  );
}

type Cadence = 'immediate' | 'daily' | 'off';

function CadencePicker({ value, onChange, allowImmediate = true, idPrefix }: {
  value: Cadence;
  onChange: (v: Cadence) => void;
  allowImmediate?: boolean;
  idPrefix: string;
}) {
  const options: { v: Cadence; label: string }[] = [
    ...(allowImmediate ? [{ v: 'immediate' as Cadence, label: 'Right away' }] : []),
    { v: 'daily', label: 'Daily summary' },
    { v: 'off', label: 'Off' },
  ];
  return (
    <div className="flex gap-2" role="radiogroup" aria-labelledby={`${idPrefix}-label`}>
      {options.map(o => (
        <button
          key={o.v}
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            value === o.v
              ? 'bg-[#1a472a] text-white font-semibold'
              : 'bg-white text-[#4a7c59] border border-[#7dd87d]/40 hover:bg-[#f0f7f0]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function NotificationSettings() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const prefsQuery = trpc.notifications.prefs.get.useQuery(undefined, { enabled: !!user });
  const mutesQuery = trpc.notifications.mutes.listMine.useQuery(undefined, { enabled: !!user });
  const subsQuery = trpc.notifications.subscriptions.listMine.useQuery(undefined, { enabled: !!user });

  const setPrefs = trpc.notifications.prefs.set.useMutation({
    onSuccess: () => {
      utils.notifications.prefs.get.invalidate();
      toast.success('Saved');
    },
  });
  const removeMute = trpc.notifications.mutes.remove.useMutation({
    onSuccess: () => utils.notifications.mutes.listMine.invalidate(),
  });
  const setThreadMuted = trpc.notifications.subscriptions.set.useMutation({
    onSuccess: () => utils.notifications.subscriptions.listMine.invalidate(),
  });

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><TaoSpinner /></div>;
  }
  if (!user) {
    navigate('/');
    return null;
  }

  const prefs = prefsQuery.data;
  const mutedThreads = (subsQuery.data ?? []).filter(s => s.muted);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#faf8f5] pb-20">
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <BackButton />
          <h1 className="text-2xl font-bold text-[#1a472a] mt-4 mb-1" style={{ fontFamily: 'Righteous, cursive' }}>
            Notification settings
          </h1>
          <p className="text-sm text-[#1a472a]/70 mb-6">
            Choose how each kind of notification reaches your inbox. Everything still shows in the bell.
          </p>

          {!prefs ? (
            <div className="p-10 flex justify-center"><TaoSpinner /></div>
          ) : (
            <div className="space-y-4">
              <section className="bg-white rounded-xl border border-[#e8e4de] p-5 space-y-5">
                <h2 className="font-bold text-[#1a472a]">Email</h2>
                <div>
                  <p id="mentions-label" className="text-sm font-semibold text-[#1a472a] mb-2">When someone mentions you</p>
                  <CadencePicker idPrefix="mentions" value={prefs.mentionsEmail}
                    onChange={(v) => setPrefs.mutate({ mentionsEmail: v })} />
                </div>
                <div>
                  <p id="replies-label" className="text-sm font-semibold text-[#1a472a] mb-2">When someone replies to you</p>
                  <CadencePicker idPrefix="replies" value={prefs.repliesEmail}
                    onChange={(v) => setPrefs.mutate({ repliesEmail: v })} />
                </div>
                <div>
                  <p id="gratitude-label" className="text-sm font-semibold text-[#1a472a] mb-2">When someone sends you gratitude</p>
                  <CadencePicker idPrefix="gratitude" value={prefs.gratitudeEmail} allowImmediate={false}
                    onChange={(v) => setPrefs.mutate({ gratitudeEmail: v as 'daily' | 'off' })} />
                </div>
                {prefs.emailDigestFrequency === 'never' && (
                  <p className="text-xs text-[#92400e] bg-[#f0ebe3] rounded-lg p-3">
                    Your account email setting is currently "never", so these emails stay paused until you change it on your profile.
                  </p>
                )}
              </section>

              <PushSection />

              <section className="bg-white rounded-xl border border-[#e8e4de] p-5">
                <h2 className="font-bold text-[#1a472a] mb-1">Muted people</h2>
                <p className="text-xs text-[#1a472a]/70 mb-3">
                  Their mentions and replies stay out of your notifications and inbox. Mute someone from their profile.
                </p>
                {(mutesQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-[#1a472a]/60">No one muted.</p>
                ) : (
                  <ul className="space-y-2">
                    {(mutesQuery.data ?? []).map(m => (
                      <li key={m.id} className="flex items-center justify-between gap-2 text-sm text-[#1a472a]">
                        <span>
                          {m.mutedUserName}
                          {m.mutedUserHandle && <span className="text-[#1a472a]/60"> @{m.mutedUserHandle}</span>}
                        </span>
                        <Button variant="ghost" size="sm"
                          onClick={() => removeMute.mutate({ mutedUserId: m.mutedUserId })}
                          className="text-xs text-[#4a7c59]">
                          <X className="w-3.5 h-3.5 mr-1" /> Unmute
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="bg-white rounded-xl border border-[#e8e4de] p-5">
                <h2 className="font-bold text-[#1a472a] mb-1">Muted threads</h2>
                <p className="text-xs text-[#1a472a]/70 mb-3">
                  Threads you follow but silenced. Direct mentions still reach you.
                </p>
                {mutedThreads.length === 0 ? (
                  <p className="text-sm text-[#1a472a]/60">No muted threads.</p>
                ) : (
                  <ul className="space-y-2">
                    {mutedThreads.map(s => (
                      <li key={s.id} className="flex items-center justify-between gap-2 text-sm text-[#1a472a]">
                        <button className="text-left underline decoration-[#7dd87d]/60 truncate"
                          onClick={() => navigate(`/community/post/${s.postId}`)}>
                          {s.postTitle || `Thread #${s.postId}`}
                        </button>
                        <Button variant="ghost" size="sm"
                          onClick={() => setThreadMuted.mutate({ postId: s.postId, muted: false })}
                          className="text-xs text-[#4a7c59] flex-shrink-0">
                          <Bell className="w-3.5 h-3.5 mr-1" /> Unmute
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <p className="text-xs text-[#1a472a]/75 flex items-center gap-1.5">
                <BellOff className="w-3.5 h-3.5" />
                A hard cap of 20 notification emails per day protects your inbox no matter what.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
