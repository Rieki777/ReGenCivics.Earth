/**
 * QuestArcMap — SVG constellation diagram of the quest arc.
 * Nodes represent quests, lines connect sequential quests.
 * Season colors: spring #4a7c59, summer #f59e0b, fall #ef4444, winter #64748b
 */

interface QuestArcMapProps {
  onSelectQuest: (questId: string) => void;
  completedQuests?: Set<string>;
}

interface QuestNode {
  id: string;
  label: string;
  x: number;
  y: number;
  season: "spring" | "summer" | "fall" | "winter" | "any";
}

const SEASON_COLOR: Record<string, string> = {
  spring: "#4a7c59",
  summer: "#f59e0b",
  fall: "#ef4444",
  winter: "#64748b",
  any: "#4a7c59",
};

// Main arc — sequential quests
const MAIN_ARC_NODES: QuestNode[] = [
  { id: "quest-0",  label: "Fire",             x: 60,  y: 150, season: "spring" },
  { id: "quest-1",  label: "Potions",           x: 130, y: 120, season: "spring" },
  { id: "quest-2",  label: "Seeds",             x: 200, y: 100, season: "spring" },
  { id: "quest-3",  label: "Healing Whole",     x: 270, y: 120, season: "spring" },
  { id: "quest-4",  label: "Food Foresting",    x: 340, y: 150, season: "summer" },
  { id: "quest-10", label: "NVC",               x: 420, y: 150, season: "any"    },
];

// Branch nodes — lower arc
const BRANCH_NODES: QuestNode[] = [
  { id: "quest-5",  label: "Dreaming Spaces",   x: 300, y: 210, season: "summer" },
  { id: "quest-6",  label: "Rites of Love",     x: 360, y: 230, season: "summer" },
  { id: "quest-7",  label: "Healing Circles",   x: 420, y: 220, season: "fall"   },
  { id: "quest-8",  label: "Wild Foraging",     x: 470, y: 240, season: "fall"   },
  { id: "quest-9",  label: "Medicine Journey",  x: 500, y: 210, season: "fall"   },
  { id: "quest-11", label: "Comm Patterns",     x: 490, y: 130, season: "winter" },
  { id: "quest-12", label: "Coord Patterns",    x: 550, y: 150, season: "winter" },
];

const ALL_NODES: QuestNode[] = [...MAIN_ARC_NODES, ...BRANCH_NODES];

// Lines connecting main arc sequentially
const MAIN_LINES: Array<[string, string]> = [
  ["quest-0",  "quest-1"],
  ["quest-1",  "quest-2"],
  ["quest-2",  "quest-3"],
  ["quest-3",  "quest-4"],
  ["quest-4",  "quest-10"],
];

// Branch line connections
const BRANCH_LINES: Array<[string, string]> = [
  ["quest-4",  "quest-5"],
  ["quest-5",  "quest-6"],
  ["quest-6",  "quest-7"],
  ["quest-7",  "quest-8"],
  ["quest-8",  "quest-9"],
  ["quest-10", "quest-11"],
  ["quest-11", "quest-12"],
];

function nodeById(id: string): QuestNode | undefined {
  return ALL_NODES.find((n) => n.id === id);
}

export function QuestArcMap({ onSelectQuest, completedQuests }: QuestArcMapProps) {
  const completed = completedQuests ?? new Set<string>();

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-[#1a472a]/10 bg-[#faf6f1] p-2 shadow-sm">
      <svg
        viewBox="0 0 600 300"
        width="100%"
        height="auto"
        aria-label="Quest arc constellation map"
        role="img"
      >
        {/* Background */}
        <rect width="600" height="300" fill="#faf6f1" rx="12" />

        {/* Subtle grid dots */}
        {Array.from({ length: 12 }, (_, col) =>
          Array.from({ length: 6 }, (_, row) => (
            <circle
              key={`dot-${col}-${row}`}
              cx={col * 55 + 10}
              cy={row * 55 + 10}
              r="1"
              fill="#1a472a"
              opacity="0.08"
            />
          ))
        )}

        {/* Branch lines */}
        {BRANCH_LINES.map(([fromId, toId]) => {
          const from = nodeById(fromId);
          const to = nodeById(toId);
          if (!from || !to) return null;
          return (
            <line
              key={`branch-${fromId}-${toId}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#1a472a"
              strokeWidth="1"
              strokeOpacity="0.2"
              strokeDasharray="4 3"
            />
          );
        })}

        {/* Main arc lines */}
        {MAIN_LINES.map(([fromId, toId]) => {
          const from = nodeById(fromId);
          const to = nodeById(toId);
          if (!from || !to) return null;
          return (
            <line
              key={`main-${fromId}-${toId}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#1a472a"
              strokeWidth="1.5"
              strokeOpacity="0.35"
            />
          );
        })}

        {/* Nodes */}
        {ALL_NODES.map((node) => {
          const isCompleted = completed.has(node.id);
          const color = SEASON_COLOR[node.season] ?? SEASON_COLOR.spring;
          const isBranch = BRANCH_NODES.some((n) => n.id === node.id);

          return (
            <g
              key={node.id}
              onClick={() => onSelectQuest(node.id)}
              style={{ cursor: "pointer" }}
              role="button"
              aria-label={node.label}
            >
              <title>{node.label}</title>
              {/* Outer glow for completed */}
              {isCompleted && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isBranch ? 13 : 16}
                  fill={color}
                  opacity="0.18"
                />
              )}
              {/* Main circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={isBranch ? 9 : 12}
                fill={isCompleted ? color : "white"}
                stroke={color}
                strokeWidth={isBranch ? 1.5 : 2}
                fillOpacity={isCompleted ? 1 : 0.75}
              />
              {/* Completed checkmark */}
              {isCompleted && (
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill="white"
                  fontWeight="bold"
                >
                  ✓
                </text>
              )}
              {/* Label */}
              <text
                x={node.x}
                y={node.y + (isBranch ? 20 : 24)}
                textAnchor="middle"
                fontSize={isBranch ? "7" : "8"}
                fill="#1a472a"
                fontWeight={isBranch ? "400" : "600"}
                opacity="0.8"
              >
                {node.label}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(10, 270)">
          {(["spring", "summer", "fall", "winter"] as const).map((s, i) => (
            <g key={s} transform={`translate(${i * 80}, 0)`}>
              <circle cx="6" cy="6" r="5" fill={SEASON_COLOR[s]} opacity="0.85" />
              <text x="15" y="10" fontSize="8" fill="#1a472a" opacity="0.6">
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
