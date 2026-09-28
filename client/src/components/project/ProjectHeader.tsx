/**
 * The top of a project page: cover, name, place, one line about the project,
 * the Example badge for demo projects, Follow and Share.
 *
 * Follow is the one FollowControl (build spec 2026-09-27, section 12.5): it
 * follows the project, not one campaign, so it shows for signed-in viewers
 * on a project with no live campaign too. A follow before the first campaign
 * is how the "crowdpooling is open" notice reaches people. Signed out, it
 * offers the email follow on the live campaign, or the season form when
 * nothing is live; an example project always offers the season form. Share
 * sends the project page focused on its front campaign.
 */
import { MapPin } from "lucide-react";
import { BlurImage } from "@/components/BlurImage";
import { ShareButtons } from "@/components/ShareButtons";
import { FollowControl } from "@/components/crowdpool/FollowControl";
import { cdnImg } from "@/lib/utils";

export function ProjectHeader({
  name,
  location,
  country,
  isDemo,
  sharePath,
  tagline,
  coverUrl,
  projectKey,
  followCampaignId,
  followsProject,
  shareText,
}: {
  name: string;
  location: string | null;
  country: string | null;
  isDemo: boolean;
  /** {canonicalPath}?campaign={front.id}, or the canonical path with no campaign. */
  sharePath: string;
  /** The front campaign description's first sentence. */
  tagline?: string | null;
  coverUrl: string | null;
  /** The project page key (shared/projectKey.ts) Follow sends. */
  projectKey: string;
  /** The live campaign a signed-out email follow attaches to, or null when nothing is live. */
  followCampaignId: number | null;
  /** projects.getPublic viewer.followsProject. */
  followsProject: boolean;
  shareText: string;
}) {
  const place = [location, country].filter((p) => p && p.trim()).join(", ");

  return (
    <header className="bg-white/95 backdrop-blur rounded-3xl light-form-island overflow-hidden shadow-xl">
      {coverUrl ? (
        <BlurImage src={cdnImg(coverUrl, 1200)} alt={name} className="w-full h-36 sm:h-56 md:h-72" loading="eager" />
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
        {tagline && (
          <p className="text-[#1a472a]/85 mt-2 line-clamp-2 break-words">{tagline}</p>
        )}
        {/* Follow's form, when it opens, takes the row's last line, so Share stays beside Follow. */}
        <div className="flex flex-wrap gap-2 mt-4">
          <FollowControl
            mode="project"
            variant="header"
            projectKey={projectKey}
            campaignId={followCampaignId}
            projectName={name}
            initiallyFollowing={followsProject}
            isExample={isDemo}
          />
          <ShareButtons
            className="min-h-11"
            url={sharePath}
            title={name}
            description={shareText}
            hashtags={["ReGenCivics", "Regenerative", "CrowdPooling"]}
          />
        </div>
      </div>
    </header>
  );
}
