/**
 * About this land (build spec 2026-09-25, section 8.1 item 10): the story of
 * the project, collapsed at every width so the needs come first on a phone.
 * It opens when the page's hash is #about (a link, or the address bar), and
 * holds everything the old campaign page showed about the project: the
 * campaign's full description, its video and photos, every public story
 * field, and the website, video and DAO links.
 *
 * Stored text is entity-encoded once (sanitizeInput), so it is decoded
 * before React prints it.
 */
import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import VideoEmbed from "@/components/VideoEmbed";
import { CampaignPhotoGallery } from "@/components/campaign-needs/CampaignPhotoGallery";
import { decodeBasicEntities } from "@shared/htmlText";
import type { ProjectFront } from "./StewardTools";

function hashIsAbout(): boolean {
  return typeof window !== "undefined" && window.location.hash === "#about";
}

/** The story fields, in the order a reader meets them. */
export function aboutRows(front: ProjectFront): Array<[string, string]> {
  const rows: Array<[string, string | number | null | undefined]> = [
    ["Vision", front.vision],
    ["Land size", front.landSize],
    ["Land status", front.landStatus],
    ["Current phase", front.currentPhase],
    ["Timeline", front.timeline],
    ["Legal structure", front.legalStructure],
    ["Team size", front.teamSize && front.teamSize > 0 ? `${front.teamSize} ${front.teamSize === 1 ? "person" : "people"}` : null],
    ["Governance", front.governanceModel],
    ["Membership", front.membershipModel],
    ["Housing", front.housingPlans],
    ["Food", front.foodSystems],
    ["Water", front.waterSystems],
    ["Energy", front.energySystems],
    ["Education", front.educationPrograms],
    ["Community", front.communityEngagement],
    ["Impact", front.impactMetrics],
    ["Regenerative practices", front.regenerativePractices],
    ["Known challenges", front.challenges],
    ["Team", front.teamDescription],
  ];
  return rows
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([label, v]) => [label, decodeBasicEntities(String(v))]);
}

export function AboutThisLand({ front }: { front: ProjectFront }) {
  const [open, setOpen] = useState(hashIsAbout);

  // A link to #about opens it, on arrival or later (a hash change, or
  // wouter's pushState from a notice).
  useEffect(() => {
    const check = () => { if (hashIsAbout()) setOpen(true); };
    window.addEventListener("hashchange", check);
    window.addEventListener("pushState", check);
    return () => {
      window.removeEventListener("hashchange", check);
      window.removeEventListener("pushState", check);
    };
  }, []);

  const description = front.description ? decodeBasicEntities(front.description) : "";
  const rows = aboutRows(front);
  const images = Array.isArray(front.images) ? front.images : [];
  const links = [
    front.websiteUrl ? { href: front.websiteUrl, label: "Website" } : null,
    front.videoUrl ? { href: front.videoUrl, label: "Video" } : null,
    front.daoLink ? { href: front.daoLink, label: "DAO and governance" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;
  if (!description && rows.length === 0 && links.length === 0 && images.length === 0) return null;

  return (
    <section id="about" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 mb-6 shadow-xl scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="about-body"
        className="w-full flex items-center justify-between gap-2 text-left min-h-11 pointer-coarse:min-h-11"
      >
        <h2 className="text-xl font-bold text-[#1a472a] flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
          <Leaf className="w-5 h-5 text-[#4a7c59]" aria-hidden="true" />
          About this land
        </h2>
        <ChevronDown className={`w-5 h-5 text-[#4a7c59] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div id="about-body" className="mt-4 space-y-5">
          {description && (
            <p className="text-[#1a472a]/85 leading-relaxed whitespace-pre-line break-words">{description}</p>
          )}
          {front.videoUrl && <VideoEmbed url={front.videoUrl} title={decodeBasicEntities(front.title)} />}
          {images.length > 0 && <CampaignPhotoGallery images={images} variant="inline" />}
          {rows.length > 0 && (
            <dl className="space-y-4">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-bold text-[#4a7c59] uppercase tracking-wide mb-1">{label}</dt>
                  <dd className="text-sm text-[#1a472a]/85 leading-relaxed whitespace-pre-line break-words">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {links.map((l) => (
                <Button key={l.label} asChild variant="outline" size="sm" className="border-[#4a7c59] text-[#4a7c59] min-h-11">
                  <a href={l.href} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
                    {l.label}
                  </a>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
