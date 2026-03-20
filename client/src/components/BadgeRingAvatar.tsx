/**
 * BadgeRingAvatar — wraps an avatar with a glowing badge ring.
 * Shows a colored gradient ring when the user has earned badges.
 * Falls back to an initials-based circle when no avatarUrl is provided.
 */
import { BADGE_DEF_MAP, getHighestBadgeId } from "@/const/badges";

interface Props {
  avatarUrl?: string | null;
  displayName?: string | null;
  badges?: string[] | null;
  size?: number;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function BadgeRingAvatar({ avatarUrl, displayName, badges, size = 40, className = "" }: Props) {
  const badgeIds: string[] = (() => {
    if (!badges) return [];
    if (Array.isArray(badges)) return badges;
    try { return JSON.parse(badges as unknown as string); } catch { return []; }
  })();

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
      src={avatarUrl}
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
      <div className={className} style={{ width: size, height: size, flexShrink: 0 }}>
        {avatar}
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
      }}
    >
      {avatar}
    </div>
  );
}
