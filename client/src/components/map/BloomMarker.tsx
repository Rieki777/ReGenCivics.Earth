type BloomKind = "quest_completed" | "seed_claimed" | "session_joined";

const BLOOM_COLORS: Record<BloomKind, string> = {
  quest_completed: "#7dd87d",
  seed_claimed: "#ffd700",
  session_joined: "#4a7c59",
};

export function BloomMarker({ kind }: { kind: BloomKind }) {
  const petals = 5;
  const color = BLOOM_COLORS[kind] ?? "#7dd87d";
  return (
    <svg width="24" height="24" viewBox="-12 -12 24 24" className="bloom-enter" aria-hidden="true">
      {Array.from({ length: petals }).map((_, i) => {
        const a = (i / petals) * Math.PI * 2;
        return (
          <ellipse
            key={i}
            cx={Math.cos(a) * 5}
            cy={Math.sin(a) * 5}
            rx="4"
            ry="2"
            fill={color}
            opacity="0.7"
            transform={`rotate(${(i / petals) * 360})`}
          />
        );
      })}
      <circle r="3" fill={color} />
    </svg>
  );
}
