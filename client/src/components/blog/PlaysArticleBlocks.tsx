/**
 * Blog blocks for the plays series, plus the reusable article quest card.
 *
 * Markers (registered in BlogPost.tsx SPECIAL_MARKERS):
 *   [WATCH_TGS_CURRIE]   video card for TGS 229 (Jeff Currie)
 *   [WATCH_TGS_HAMANT]   video card for TGS 230 (Olivier Hamant)
 *   [STEERING_EMOTIONS]  the steering-emotions graphic
 *   [PLAY_QUEST_CTA]     the article quest card (config in data/articleQuests.ts,
 *                        keyed by post slug, so every article can end with a quest)
 */
import { useParams } from "wouter";
import { Link } from "wouter";
import { ExternalLink, Play, Scroll, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { articleQuests } from "@/data/articleQuests";

/* ── Video card ─────────────────────────────────────────────────────── */

function VideoCard({
  videoId,
  title,
  channel,
  note,
}: {
  videoId: string;
  title: string;
  channel: string;
  note: string;
}) {
  const url = `https://youtu.be/${videoId}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="not-prose group block my-8 bg-white/5 border border-white/10 hover:border-[#7dd87d]/40 rounded-2xl overflow-hidden transition-all"
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative sm:w-64 shrink-0">
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt={title}
            loading="lazy"
            className="w-full h-40 sm:h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#1a472a]/80 border border-[#7dd87d]/60 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 text-[#7dd87d] fill-current ml-0.5" />
            </div>
          </div>
        </div>
        <div className="p-5 flex flex-col justify-center">
          <p className="text-[#7dd87d] text-xs font-semibold uppercase tracking-wider mb-1">
            Watch
          </p>
          <p className="text-white font-bold leading-snug mb-1">{title}</p>
          <p className="text-white/60 text-sm mb-2">{channel}</p>
          <p className="text-white/60 text-sm leading-relaxed">{note}</p>
          <span className="inline-flex items-center gap-1.5 text-[#7dd87d] text-xs mt-3">
            <ExternalLink className="w-3.5 h-3.5" /> Opens on YouTube
          </span>
        </div>
      </div>
    </a>
  );
}

export function WatchTgsCurrie() {
  return (
    <VideoCard
      videoId="ij1_uxiXmm8"
      title="The End of Globalization: Why Abundance Is an Illusion, with Jeff Currie"
      channel="The Great Simplification with Nate Hagens, episode 229"
      note="One of the old game's best players explains its steering from inside the cockpit."
    />
  );
}

export function WatchTgsHamant() {
  return (
    <VideoCard
      videoId="Kzzr15cEg3o"
      title="The Optimization Trap: Why Too Much Efficiency Makes Us Fragile, with Olivier Hamant"
      channel="The Great Simplification with Nate Hagens, episode 230"
      note="A biologist on what 3.8 billion years of living systems can teach the designers of new ones."
    />
  );
}

/* ── Steering emotions graphic ──────────────────────────────────────── */

const STEERING_COLUMNS = [
  {
    label: "Markets",
    emotions: "Fear + Greed",
    detail: "The for-profit world's two hands on the wheel",
    tone: "border-red-400/30 bg-red-500/10",
    accent: "text-red-300",
  },
  {
    label: "Charity",
    emotions: "Guilt + Shame",
    detail: "The nonprofit world's pull on the heartstrings",
    tone: "border-amber-400/30 bg-amber-500/10",
    accent: "text-amber-300",
  },
  {
    label: "New Games",
    emotions: "Love + Joy",
    detail: "The seats still empty in the cockpit",
    tone: "border-[#7dd87d]/40 bg-[#7dd87d]/10",
    accent: "text-[#7dd87d]",
  },
];

export function SteeringEmotions() {
  return (
    <div className="not-prose my-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STEERING_COLUMNS.map((col) => (
          <div
            key={col.label}
            className={`rounded-2xl border p-5 text-center ${col.tone}`}
          >
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">
              {col.label}
            </p>
            <p className={`text-lg font-bold mb-1 ${col.accent}`} style={{ fontFamily: "var(--font-display)" }}>
              {col.emotions}
            </p>
            <p className="text-white/60 text-xs leading-relaxed">{col.detail}</p>
          </div>
        ))}
      </div>
      <p className="text-white/60 text-xs text-center mt-2">
        The emotions steering organized human effort. Two pairs run almost everything.
      </p>
    </div>
  );
}

/* ── Article quest card ─────────────────────────────────────────────── */

/**
 * Reads the current post's slug and renders its quest from
 * data/articleQuests.ts. Drop [PLAY_QUEST_CTA] at the end of any post's
 * content and add a config entry; that's the whole integration.
 */
export function ArticleQuestCTA() {
  const params = useParams<{ slug: string }>();
  const quest = params.slug ? articleQuests[params.slug] : undefined;
  if (!quest) return null;

  return (
    <div className="not-prose my-10 rounded-2xl border border-[#7dd87d]/40 bg-gradient-to-br from-[#7dd87d]/15 via-[#1a472a]/40 to-[#0d2818]/60 overflow-hidden">
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-2">
          <Scroll className="w-4 h-4 text-[#7dd87d]" />
          <span className="text-[#7dd87d] text-xs font-bold uppercase tracking-widest">
            {quest.eyebrow}
          </span>
        </div>
        <h3
          className="text-white text-2xl sm:text-3xl font-bold mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {quest.title}
        </h3>
        <p className="text-white/70 leading-relaxed mb-5">{quest.tagline}</p>

        <ol className="space-y-3 mb-6">
          {quest.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/40 text-[#7dd87d] text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-white/70 text-sm leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>

        <div className="flex items-center gap-2 mb-6 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <Sparkles className="w-4 h-4 text-[#7dd87d] shrink-0" />
          <p className="text-sm">
            <span className="text-white font-bold">{quest.rewardLine}</span>
            {quest.rewardNote && (
              <span className="text-white/60"> {quest.rewardNote}</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href={quest.primary.href}>
            <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold">
              {quest.primary.label}
            </Button>
          </Link>
          {quest.secondary && (
            <Link href={quest.secondary.href}>
              <Button className="bg-[#7dd87d]/15 text-[#7dd87d] border border-[#7dd87d]/30 hover:bg-[#7dd87d]/25">
                {quest.secondary.label}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
