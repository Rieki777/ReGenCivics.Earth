/**
 * RolePortalCard - Click-to-expand role card with modal detail view.
 * Used on the Team page for the 13 Infinite Game roles.
 */
import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { GameRole } from "@/data/gameRoles";
import { seasons } from "@/data/gameRoles";

export type { GameRole };

function getAssignmentStyle(assignment: string) {
  const lower = assignment.toLowerCase();
  if (lower.includes("golden")) {
    return {
      className: "role-golden-opportunity bg-[#fbbf24]/20 text-[#fbbf24] border-[#fbbf24]/40",
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
    className: "bg-[#7dd87d]/10 text-[#7dd87d]/60 border-[#7dd87d]/20",
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
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        {/* Top area with gradient + emoji */}
        <div
          className="relative h-[140px] flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${role.color}30 0%, ${role.color}10 50%, transparent 100%)`,
          }}
        >
          <span className="text-[64px] leading-none select-none drop-shadow-lg">
            {role.emoji}
          </span>

          {/* Assignment badge - top right */}
          <span
            className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-[#7dd87d] text-[10px] font-bold uppercase tracking-wider mb-1">
            {role.circle}
          </p>
          <h3
            className="text-white font-bold text-sm leading-tight mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {role.title}
          </h3>
          <p className="text-white/60 text-xs line-clamp-2 mb-4">
            {role.purpose}
          </p>

          {/* Bottom: season dots + token award */}
          <div className="flex items-center justify-between">
            <SeasonDots activeSeasons={role.seasons} />
            <span className="text-[10px] text-[#fbbf24]/80 font-medium truncate ml-2">
              $ReGen
            </span>
          </div>
        </div>
      </div>

      {/* Modal (expanded state) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0d2818] border-[#1a472a] max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {/* Banner */}
          <div
            className="relative h-[160px] flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${role.color}40 0%, ${role.color}15 50%, #0d2818 100%)`,
            }}
          >
            <span className="text-[72px] leading-none select-none drop-shadow-lg">
              {role.emoji}
            </span>
          </div>

          <div className="px-6 pb-6 space-y-6">
            {/* Title + circle */}
            <div>
              <DialogTitle>
                <span
                  className="text-2xl font-bold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {role.title}
                </span>
              </DialogTitle>
              <DialogDescription asChild>
                <p className="text-[#7dd87d] text-xs font-bold uppercase tracking-wider mt-1">
                  {role.circle}
                </p>
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
              <div className="bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded-xl p-5">
                <h4
                  className="text-[#fbbf24] font-bold text-base mb-3"
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

            {/* Token award */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h4 className="text-[#7dd87d] text-xs font-bold uppercase tracking-wider mb-2">
                Token Award
              </h4>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] text-xs font-bold border border-[#fbbf24]/30">
                  $ReGen
                </span>
                <span className="text-white/80 text-sm">{role.tokenAward}</span>
              </div>
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
              href="/connect"
              className="block w-full text-center bg-[#7dd87d] hover:bg-[#6bc86b] text-[#0d2818] font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Apply for This Role
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
