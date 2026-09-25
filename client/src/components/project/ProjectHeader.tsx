/**
 * The top of a project page: cover, name, place, the Example badge for demo
 * projects, Follow and Share. Follow acts on the project's front campaign;
 * signed out, it offers the email follow (campaigns.subscribeByEmail) with a
 * nudge to make an account.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, BellRing, Loader2, MapPin } from "lucide-react";
import { BlurImage } from "@/components/BlurImage";
import { ShareButtons } from "@/components/ShareButtons";
import { cdnImg } from "@/lib/utils";

export function ProjectHeader({
  name,
  location,
  country,
  isDemo,
  canonicalPath,
  coverUrl,
  followCampaignId,
  initiallyFollowing,
  shareText,
}: {
  name: string;
  location: string | null;
  country: string | null;
  isDemo: boolean;
  canonicalPath: string;
  coverUrl: string | null;
  followCampaignId: number | null;
  initiallyFollowing: boolean;
  shareText: string;
}) {
  const { isAuthenticated } = useAuth();
  const [following, setFollowing] = useState(initiallyFollowing);
  useEffect(() => setFollowing(initiallyFollowing), [initiallyFollowing, followCampaignId]);
  const [showEmailFollow, setShowEmailFollow] = useState(false);
  const [email, setEmail] = useState("");

  const follow = trpc.campaigns.follow.useMutation({
    onError: () => { setFollowing(false); toast.error("Couldn't follow this project. Try again."); },
  });
  const unfollow = trpc.campaigns.unfollow.useMutation({
    onError: () => { setFollowing(true); toast.error("Couldn't unfollow this project. Try again."); },
  });
  const subscribe = trpc.campaigns.subscribeByEmail.useMutation({
    onSuccess: () => {
      toast.success("You're on the list. News from this project will reach your inbox.");
      setEmail("");
      setShowEmailFollow(false);
    },
    onError: (err) => toast.error(err.message || "Couldn't add you. Try again."),
  });

  const toggleFollow = () => {
    if (!followCampaignId) return;
    if (!isAuthenticated) {
      setShowEmailFollow((v) => !v);
      return;
    }
    const next = !following;
    setFollowing(next);
    if (next) follow.mutate({ campaignId: followCampaignId });
    else unfollow.mutate({ campaignId: followCampaignId });
  };

  const place = [location, country].filter((p) => p && p.trim()).join(", ");

  return (
    <header className="bg-white/95 backdrop-blur rounded-3xl light-form-island overflow-hidden shadow-xl">
      {coverUrl ? (
        <BlurImage src={cdnImg(coverUrl, 1200)} alt={name} className="w-full h-44 sm:h-56 md:h-72" loading="eager" />
      ) : (
        <div className="w-full h-28 sm:h-36 bg-gradient-to-br from-[#4a7c59] via-[#6b8f5e] to-[#a0845c]" aria-hidden="true" />
      )}
      <div className="p-4 sm:p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {isDemo && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Example project</span>
          )}
        </div>
        <h1 className="text-2xl md:text-4xl font-bold text-[#1a472a] break-words" style={{ fontFamily: "var(--font-display)" }}>
          {name}
        </h1>
        {place && (
          <p className="flex items-center gap-2 text-[#1a472a]/80 mt-1">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="break-words min-w-0">{place}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          {followCampaignId && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFollow}
              aria-expanded={!isAuthenticated ? showEmailFollow : undefined}
              className={following
                ? "bg-[#4a7c59] text-white border-[#4a7c59] hover:bg-[#1a472a]"
                : "border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59] hover:text-white"}
            >
              {following ? <BellRing className="w-4 h-4 mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
              {following ? "Following" : "Follow"}
            </Button>
          )}
          <ShareButtons
            url={canonicalPath}
            title={name}
            description={shareText}
            hashtags={["ReGenCivics", "Regenerative", "CrowdPooling"]}
          />
        </div>
        {showEmailFollow && !isAuthenticated && followCampaignId && (
          <form
            className="mt-4 bg-[#f0f7f0] rounded-xl p-3 sm:p-4 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = email.trim();
              if (!v || !v.includes("@")) { toast.error("Enter a valid email address"); return; }
              subscribe.mutate({ campaignId: followCampaignId, email: v });
            }}
          >
            <p className="text-sm text-[#1a472a]/85">
              Get news from this project by email. A free account lets you follow it from your notifications too.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                aria-label="Your email for project news"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="bg-white border-[#4a7c59]/40"
              />
              <Button type="submit" size="sm" disabled={subscribe.isPending} className="bg-[#4a7c59] hover:bg-[#1a472a] text-white sm:self-center">
                {subscribe.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send me news"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </header>
  );
}
