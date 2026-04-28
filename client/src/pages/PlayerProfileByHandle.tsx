/**
 * PlayerProfileByHandle: public profile page keyed by @handle.
 * Renders a minimal read-only view (avatar, display name, handle, bio,
 * badges, quest count). For your own profile, links to /profile for editing.
 */
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { GratitudeButton } from "@/components/GratitudeButton";
import { Sparkles, Trophy, ArrowLeft } from "lucide-react";

export default function PlayerProfileByHandle() {
  const params = useParams<{ handle: string }>();
  const rawHandle = params.handle ?? "";
  const handle = rawHandle.startsWith("@") ? rawHandle.slice(1) : rawHandle;
  const { user: currentUser } = useAuth();

  const profileQuery = trpc.playerProfiles.getByHandle.useQuery({ handle }, { enabled: handle.length >= 3 });

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center">
        <div className="text-white/60 text-sm">Loading...</div>
      </div>
    );
  }

  const profile = profileQuery.data;
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold text-white mb-2">No one with that handle</h1>
        <p className="text-white/60 mb-6">@{handle} doesn't exist yet. Maybe a typo, or they haven't set their handle.</p>
        <Link href="/community" className="text-[#7dd87d] hover:underline">Back to community</Link>
      </div>
    );
  }

  const completed = (() => {
    try { return JSON.parse(profile.questsCompleted ?? "[]") as string[]; }
    catch { return []; }
  })();
  const badges = (() => {
    try { return JSON.parse(profile.badges ?? "[]") as string[]; }
    catch { return []; }
  })();

  const isMe = currentUser?.id === profile.userId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO title={`@${handle} | ReGen Civics`} description={profile.bio || `${profile.displayName}'s profile on ReGen Civics`} />

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-16">
        <Link href="/community" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.displayName} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#7dd87d]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                {profile.displayName}
              </h1>
              <p className="text-[#7dd87d] text-sm">@{handle}</p>
              {profile.bio && <p className="text-white/70 text-sm mt-2 leading-relaxed">{profile.bio}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-[#7dd87d]">{completed.length}</div>
              <div className="text-xs text-white/70 uppercase tracking-wide">Quests done</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-[#d4a574]">{badges.length}</div>
              <div className="text-xs text-white/70 uppercase tracking-wide">Badges</div>
            </div>
          </div>

          {badges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {badges.map((b) => (
                <span key={b} className="text-[10px] px-2 py-1 rounded-full bg-[#7dd87d]/15 text-[#7dd87d] border border-[#7dd87d]/30 inline-flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> {b}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            {!isMe && profile.handle && (
              <GratitudeButton recipientHandle={profile.handle} sourceType="profile" />
            )}
            {isMe && (
              <Link href="/profile" className="inline-flex items-center gap-2 text-sm text-[#7dd87d] hover:underline">
                Edit your profile
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
