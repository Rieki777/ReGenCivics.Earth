/**
 * ContinueYourJourneyRow — horizontal row of quest cards the player has started.
 * Reads from trpc.quest.myActiveQuests and renders nothing when the user has
 * no active quests or is not signed in.
 */

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { questData } from "@/data/questData";
import { seasonalQuestsData } from "@/data/seasonalQuestsData";
import { QUEST_MASTER_CONTENT } from "@/data/questMasterContent";
import { QuestCarousel } from "@/components/QuestCarousel";
import { ArrowRight, Play } from "lucide-react";
import { cdnImg } from "@/lib/utils";

const QUEST_IMG_BASE = cdnImg("https://assets.regencivics.earth/quests");

type ResumeEntry = {
  questId: string;
  title: string;
  subtitle?: string;
  imgUrl?: string;
  videoUrl?: string;
};

function buildRiteIndex(): Record<string, ResumeEntry> {
  const map: Record<string, ResumeEntry> = {};
  const addRite = (q: { id: number; slug?: string; title: string; subtitle?: string }) => {
    const key = `quest-${q.id}`;
    map[key] = {
      questId: key,
      title: q.title,
      subtitle: q.subtitle,
      imgUrl: q.slug ? `${QUEST_IMG_BASE}/quest-${String(q.id).padStart(2, "0")}-${q.slug}.webp` : undefined,
      videoUrl: (QUEST_MASTER_CONTENT as Record<number | string, any>)[q.id]?.videoUrl,
    };
  };
  addRite(questData.intro);
  questData.spring.forEach(addRite);
  questData.summer.forEach(addRite);
  questData.fall.forEach(addRite);
  questData.winter.forEach(addRite);
  return map;
}

function buildDepthIndex(): Record<string, ResumeEntry> {
  const map: Record<string, ResumeEntry> = {};
  for (const sq of seasonalQuestsData) {
    map[sq.id] = {
      questId: sq.id,
      title: sq.title,
      subtitle: sq.tagline,
    };
  }
  return map;
}

function ResumeCard({ entry }: { entry: ResumeEntry }) {
  return (
    <div className="group relative bg-white rounded-xl border-2 border-[#4a7c59]/30 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden">
      <a href={`/quest#${entry.questId}`} className="block">
        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-[#1a472a]/40 via-[#2d5a3d]/30 to-[#4a7c59]/20 overflow-hidden">
          {entry.imgUrl && (
            <img
              src={entry.imgUrl}
              alt={entry.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          )}
          {entry.videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-black/55 border border-white/40 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                <Play className="w-5 h-5 text-white translate-x-0.5" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute top-3 left-3">
            <span className="bg-[#4a7c59] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow">
              In Progress
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h4
              className="text-white font-semibold text-base leading-snug line-clamp-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {entry.title}
            </h4>
            {entry.subtitle && (
              <p className="text-white/80 text-sm line-clamp-1 mt-0.5">{entry.subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-[#4a7c59] font-medium">Resume</span>
          <ArrowRight className="w-4 h-4 text-[#4a7c59]" />
        </div>
      </a>
    </div>
  );
}

export function ContinueYourJourneyRow() {
  const { isAuthenticated } = useAuth();
  const myActiveQuests = trpc.quest.myActiveQuests.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const riteIndex = useMemo(buildRiteIndex, []);
  const depthIndex = useMemo(buildDepthIndex, []);

  if (!isAuthenticated) return null;
  const activeIds = myActiveQuests.data ?? [];
  if (activeIds.length === 0) return null;

  const entries: ResumeEntry[] = activeIds
    .map((id: string) => riteIndex[id] ?? depthIndex[id] ?? null)
    .filter((e: ResumeEntry | null): e is ResumeEntry => e !== null);

  if (entries.length === 0) return null;

  return (
    <section className="py-10 bg-gradient-to-b from-[#faf6f1] to-[#f0ebe3]">
      <div className="container">
        <div className="flex items-end justify-between mb-4">
          <h2
            className="text-2xl md:text-3xl font-bold text-[#1a472a]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Continue Your <span className="text-[#7dd87d]">Journey</span>
          </h2>
          <p className="text-sm text-[#1a472a]/80">
            {entries.length} quest{entries.length === 1 ? "" : "s"} in progress
          </p>
        </div>
        <QuestCarousel totalCount={entries.length}>
          {entries.map((entry) => (
            <ResumeCard key={entry.questId} entry={entry} />
          ))}
        </QuestCarousel>
      </div>
    </section>
  );
}
