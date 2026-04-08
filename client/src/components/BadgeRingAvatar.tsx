/**
 * BadgeRingAvatar, wraps an avatar with a glowing badge ring.
 * Shows a colored gradient ring when the user has earned badges.
 * Falls back to an initials-based circle when no avatarUrl is provided.
 * Optionally renders an SVG quest-completion progress ring around the avatar.
 */
import React from "react";
import { BADGE_DEF_MAP, getHighestBadgeId } from "@/const/badges";
import { resolveAssetUrl } from "@/lib/utils";

const QUEST_MAX = 10;

interface Props {
  avatarUrl?: string | null;
  displayName?: string | null;
  badges?: string[] | null;
  size?: number;
  className?: string;
  /** JSON string or pre-parsed array of completed quest IDs */
  questsCompleted?: string | string[] | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Thin SVG progress ring drawn around the avatar circle */
function QuestProgressRing({ size, completed }: { size: number; completed: number }) {
  const strokeWidth = Math.max(2, size * 0.05);
  // The ring is drawn just outside the avatar; add a small gap
  const gap = strokeWidth + 3;
  const svgSize = size + gap * 2;
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(completed / QUEST_MAX, 1);
  const dashOffset = circumference * (1 - pct);

  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      style={{
        position: "absolute",
        top: -gap,
        left: -gap,
        pointerEvents: "none",
        // Rotate so progress starts at the top
        transform: "rotate(-90deg)",
      }}
      aria-hidden="true"
    >
      {/* Track ring */}
      <circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={radius}
        fill="none"
        stroke="rgba(125,216,125,0.18)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      {pct > 0 && (
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="#7dd87d"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 3px #7dd87d88)" }}
        />
      )}
    </svg>
  );
}

export function BadgeRingAvatar({ avatarUrl, displayName, badges, size = 40, className = "", questsCompleted }: Props) {
  const badgeIds: string[] = (() => {
    if (!badges) return [];
    if (Array.isArray(badges)) return badges;
    try { return JSON.parse(badges as unknown as string); } catch { return []; }
  })();

  const completedCount: number = (() => {
    if (!questsCompleted) return 0;
    if (Array.isArray(questsCompleted)) return questsCompleted.length;
    try { return (JSON.parse(questsCompleted) as string[]).length; } catch { return 0; }
  })();

  const showProgressRing = completedCount > 0;

  const highestId = getHighestBadgeId(badgeIds);
  const ring = highestId ? BADGE_DEF_MAP[highestId] : null;

  const outerSize = size + (ring ? 6 : 0);
  const innerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
  };

  const avatar = avatarUrl ? (
    <img
      src={resolveAssetUrl(avatarUrl)}
      alt={displayName ?? "Player"}
      width={size}
      height={size}
      style={innerStyle}
      className="object-cover"
    />
  ) : (
    <div
      style={{
        ...innerStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #4a7c59, #7dd87d)",
        color: "white",
        fontSize: size * 0.35,
        fontWeight: 700,
      }}
    >
      {displayName ? getInitials(displayName) : "?"}
    </div>
  );

  if (!ring) {
    return (
      <div
        className={className}
        style={{ width: size, height: size, flexShrink: 0, position: "relative" }}
      >
        {avatar}
        {showProgressRing && <QuestProgressRing size={size} completed={completedCount} />}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: outerSize,
        height: outerSize,
        borderRadius: "50%",
        background: ring.ringGradient,
        boxShadow: `0 0 12px ${ring.ringColor}60`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: 3,
        position: "relative",
      }}
    >
      {avatar}
      {showProgressRing && <QuestProgressRing size={size} completed={completedCount} />}
    </div>
  );
}
