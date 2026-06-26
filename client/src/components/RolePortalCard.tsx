/**
 * RolePortalCard - Click-to-expand role card with modal detail view.
 * Used on the Team page for the 13 Infinite Game roles.
 */
import { useState, useCallback } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { GameRole } from "@/data/gameRoles";
import { seasons } from "@/data/gameRoles";
import { SmartImage } from "@/components/SmartImage";

export type { GameRole };

function getAssignmentStyle(assignment: string) {
  const lower = assignment.toLowerCase();
  if (lower.includes("golden")) {
    return {
      className: "role-golden-opportunity bg-[#d4a574]/20 text-[#d4a574] border-[#d4a574]/40",
      label: "Golden opportunity",
    };
  }
  if (lower.startsWith("open")) {
    return {
      className: "bg-[#7dd87d]/20 text-[#7dd87d] border-[#7dd87d]/40",
      label: assignment,
    };
  }
  if (lower.includes("partially") || lower.includes("seeking")) {
    return {
      className: "bg-amber-500/20 text-amber-400 border-amber-500/40",
      label: assignment,
    };
  }
  return {
    className: "bg-[#7dd87d]/10 text-[#7dd87d]/80 border-[#7dd87d]/20",
    label: assignment,
  };
}

function SeasonDots({ activeSeasons }: { activeSeasons: string[] }) {
  return (
    <div className="flex items-center gap-1" title={`Active: ${activeSeasons.join(", ")}`}>
      {seasons.map((s) => {
        const isActive = activeSeasons.includes(s.name.toLowerCase());
        return (
          <span
            key={s.name}
            className="w-2.5 h-2.5 rounded-full border"
            style={{
              backgroundColor: isActive ? s.color : "transparent",
              borderColor: isActive ? s.color : "rgba(255,255,255,0.15)",
            }}
            title={s.name}
          />
        );
      })}
    </div>
  );
}

function SeasonBar({ activeSeasons }: { activeSeasons: string[] }) {
  return (
    <div className="flex rounded-lg overflow-hidden h-6 border border-white/10">
      {seasons.map((s) => {
        const isActive = activeSeasons.includes(s.name.toLowerCase());
        return (
          <div
            key={s.name}
            className="flex-1 flex items-center justify-center text-[10px] font-medium"
            style={{
              backgroundColor: isActive ? s.color + "30" : "rgba(255,255,255,0.03)",
              color: isActive ? s.color : "rgba(255,255,255,0.25)",
            }}
          >
            {s.emoji} {s.name}
          </div>
        );
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    copyToClipboard(text).then((ok) => {
      if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs transition-colors"
      type="button"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy prompt"}
    </button>
  );
}

export function RolePortalCard({ role }: { role: GameRole }) {
  const [open, setOpen] = useState(false);
  const badge = getAssignmentStyle(role.assignment);

  return (
    <>
      {/* Card (closed state) */}
      <div
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        role="button"
        tabIndex={0}
        className="role-card-shimmer relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1 border border-white/10 hover:border-white/25 bg-[#0d2818]/80"
      >
        {/* Top area with character image. Height bumped from 140 to 180px
            and default objectPosition shifted down from "center top" to
            "50% 18%" so portraits keep the crown of the head in frame on
            every card. Roles can still override via cardImagePosition. */}
        <div
          className="relative h-[180px] overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${role.color}30 0%, ${role.color}10 50%, transparent 100%)`,
          }}
        >
          {role.characterImage ? (
            <SmartImage
              src={role.characterImage}
              alt={role.characterName}
              className="w-full h-full object-cover"
              style={{ objectPosition: role.cardImagePosition || "50% 18%" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[64px] leading-none select-none drop-shadow-lg">
                {role.emoji}
              </span>
            </div>
          )}
          {/* Gradient fade to card background */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0d2818] to-transparent" />
          {/* Emoji overlay bottom-left */}
          <div className="absolute bottom-2 left-3 w-9 h-9 bg-[#0d2818]/80 rounded-full flex items-center justify-center">
            <span className="text-lg">{role.emoji}</span>
          </div>

          {/* Assignment badge - top right */}
          <span
            className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3
            className="text-white font-bold text-base leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {role.characterName}
          </h3>
          <p className="text-[#7dd87d] text-[10px] font-bold uppercase tracking-wider mb-1">
            {role.title}
          </p>
          <p className="text-white/65 text-xs italic mb-3">
            {role.tagline}
          </p>

          {/* Bottom: season dots + band + hours */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <SeasonDots activeSeasons={role.seasons} />
            <div className="flex items-center gap-2">
              <span className="text-white/65 text-xs">~{role.hoursPerWeek}h/wk</span>
              <span className="bg-[#7dd87d]/20 text-[#7dd87d] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                B{role.band}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal (expanded state) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0d2818] border-[#1a472a] max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {/* Banner with scene image */}
          <div
            className="relative h-[280px] overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${role.color}40 0%, ${role.color}15 50%, #0d2818 100%)`,
            }}
          >
            {(role.sceneImage || role.characterImage) ? (
              <SmartImage
                src={role.sceneImage || role.characterImage!}
                alt={role.characterName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[72px] leading-none select-none drop-shadow-lg">
                  {role.emoji}
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0d2818] to-transparent" />
          </div>

          <div className="px-6 pb-6 space-y-6">
            {/* Title + circle */}
            <div>
              <DialogTitle>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{role.emoji}</span>
                  <div>
                    <span
                      className="text-2xl font-bold text-white"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {role.characterName}
                    </span>
                    <span className="text-white/65 text-lg ml-2">{role.title}</span>
                  </div>
                </div>
              </DialogTitle>
              <DialogDescription asChild>
                <div>
                  <p className="text-white/70 text-sm italic mt-1">{role.tagline}</p>
                  <p className="text-[#7dd87d] text-xs font-bold uppercase tracking-wider mt-2">
                    {role.circle}
                  </p>
                </div>
              </DialogDescription>
              <p className="text-white/70 text-sm mt-3">{role.purpose}</p>
            </div>

            {/* Powers */}
            <div>
              <h4 className="text-[#7dd87d] text-xs font-bold uppercase tracking-wider mb-3">
                Powers
              </h4>
              <ul className="space-y-2">
                {role.powers.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-white/80 text-sm">
                    <span className="shrink-0 mt-0.5">{"\u26A1"}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rights */}
            <div>
              <h4 className="text-[#7dd87d] text-xs font-bold uppercase tracking-wider mb-3">
                Rights
              </h4>
              <ul className="space-y-2">
                {role.rights.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-white/80 text-sm">
                    <span className="shrink-0 mt-0.5">{"\u{1F511}"}</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Responsibilities */}
            <div>
              <h4 className="text-[#7dd87d] text-xs font-bold uppercase tracking-wider mb-3">
                Responsibilities
              </h4>
              <ul className="space-y-2">
                {role.responsibilities.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-white/80 text-sm">
                    <span className="shrink-0 mt-0.5">{"\u2705"}</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Domains */}
            <div>
              <h4 className="text-[#7dd87d] text-xs font-bold uppercase tracking-wider mb-3">
                Domains of Creation
              </h4>
              <p className="text-white/70 text-sm">{role.domains}</p>
            </div>

            {/* Special content (Skills Builder) */}
            {role.specialContent && (
              <div className="bg-[#d4a574]/10 border border-[#d4a574]/30 rounded-xl p-5">
                <h4
                  className="text-[#d4a574] font-bold text-base mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {role.specialContent.title}
                </h4>
                <p className="text-white/70 text-sm mb-4">
                  {role.specialContent.body}
                </p>
                <div className="bg-black/30 rounded-lg p-4 mb-3 font-mono text-xs text-white/60 whitespace-pre-wrap break-words">
                  {role.specialContent.prompt}
                </div>
                <CopyButton text={role.specialContent.prompt} />
              </div>
            )}

            {/* Seed and Harvest */}
            <div>
              <h4 className="text-xs uppercase tracking-wider text-[#7dd87d] font-semibold mb-4">
                Seed & Harvest
              </h4>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🌱</span>
                    <span className="text-[#7dd87d] font-semibold text-sm">Seed</span>
                    <span className="text-white/65 text-xs ml-auto">Did you plant it?</span>
                  </div>
                  <p className="text-white/70 text-sm">{role.seed}</p>
                </div>
                <div className="bg-[#d4a574]/10 border border-[#d4a574]/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🌾</span>
                    <span className="text-[#d4a574] font-semibold text-sm">Harvest</span>
                    <span className="text-white/65 text-xs ml-auto">Did it grow?</span>
                  </div>
                  <p className="text-white/70 text-sm">{role.harvest}</p>
                </div>
              </div>
              <p className="text-white/65 text-xs mt-3 text-center">
                Both met = +30% bonus on base. One met = +15%. Reviewed at the Season Festival.
              </p>
            </div>

            {/* Compensation */}
            <div>
              <h4 className="text-xs uppercase tracking-wider text-[#7dd87d] font-semibold mb-3">
                Compensation
              </h4>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#7dd87d] font-bold text-lg">{role.tokenAward.split(" ")[0]}</span>
                    <span className="text-white/70 text-sm">{role.kind === "fund" ? "$RCivics" : "$ReGen"} / season</span>
                  </div>
                  <span className="bg-[#7dd87d]/20 text-[#7dd87d] text-xs font-semibold px-2 py-1 rounded-full">
                    Band {role.band}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/65">
                  <span>~{role.hoursPerWeek} hrs/week</span>
                  <span>Up to {role.maxTokenAward.split(" ")[0]} with Seed + Harvest</span>
                </div>
              </div>
            </div>

            {/* Deliverables */}
            <div>
              <h4 className="text-xs uppercase tracking-wider text-white/70 font-semibold mb-2">
                Deliverables
              </h4>
              <ul className="space-y-1.5">
                {role.deliverables.map((d: string) => (
                  <li key={d} className="flex items-start gap-2 text-white/60 text-sm">
                    <span className="text-[#7dd87d] mt-0.5">📦</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Season bar */}
            <div>
              <h4 className="text-[#7dd87d] text-xs font-bold uppercase tracking-wider mb-3">
                Active Seasons
              </h4>
              <SeasonBar activeSeasons={role.seasons} />
            </div>

            {/* Apply button */}
            <a
              href={`/connect?path=role&role=${encodeURIComponent(role.title)}&circle=${encodeURIComponent(role.circle)}&purpose=${encodeURIComponent(role.purpose)}`}
              className="block w-full text-center bg-[#7dd87d] hover:bg-[#9de89d] text-[#0d2818] font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Apply for This Role
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
