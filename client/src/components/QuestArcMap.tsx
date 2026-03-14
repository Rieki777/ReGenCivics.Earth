/**
 * QuestArcMap — SVG constellation map of the quest arc (Quests 0-13).
 * Nodes are arranged in a loose spiral on a dark starfield background.
 * Element colors distinguish quest types. Completed quests glow.
 */

import { useState } from "react";

interface QuestArcMapProps {
  completedQuestIds?: string[];
  onSelectQuest: (questId: string) => void;
}

const ELEMENT_COLORS: Record<string, string> = {
  earth: "#7dd87d",
  water: "#60a5fa",
  fire:  "#fb923c",
  air:   "#c084fc",
};

// Element per quest index (0-13)
const QUEST_ELEMENTS: Record<number, string> = {
  0:  "fire",
  1:  "earth",
  2:  "water",
  3:  "earth",
  4:  "earth",
  5:  "air",
  6:  "water",
  7:  "fire",
  8:  "earth",
  9:  "water",
  10: "air",
  11: "air",
  12: "air",
  13: "fire",
};

// Short display labels for each quest number
const QUEST_LABELS: Record<number, string> = {
  0:  "Fire",
  1:  "Potions",
  2:  "Seeds",
  3:  "Healing Whole",
  4:  "Food Foresting",
  5:  "Dreaming",
  6:  "Love",
  7:  "Healing Circles",
  8:  "Wild Foraging",
  9:  "Medicine Journey",
  10: "NVC",
  11: "Coordination",
  12: "Breathplay",
  13: "Fasting",
};

// Node positions as percentages of viewBox 800x500
const QUEST_POSITIONS: Record<number, [number, number]> = {
  0:  [400, 55],
  1:  [200, 125],
  2:  [600, 125],
  3:  [100, 255],
  4:  [700, 255],
  5:  [180, 385],
  6:  [620, 385],
  7:  [305, 205],
  8:  [500, 205],
  9:  [350, 325],
  10: [450, 325],
  11: [250, 445],
  12: [550, 445],
  13: [400, 465],
};

// Connection edges between quest nodes
const CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
  [1, 7],
  [2, 8],
  [3, 5],
  [4, 6],
  [7, 9],
  [8, 9],
  [5, 11],
  [6, 12],
  [9, 10],
  [10, 13],
  [11, 13],
  [12, 13],
];

// Static starfield seed positions (pseudo-random, deterministic)
const STARS = [
  [42, 18], [97, 43], [153, 7], [218, 31], [274, 62], [339, 14],
  [391, 38], [447, 9], [503, 47], [561, 22], [617, 55], [673, 11],
  [729, 39], [784, 18], [21, 68], [78, 92], [134, 77], [189, 110],
  [245, 85], [301, 118], [357, 73], [413, 99], [469, 80], [525, 113],
  [581, 88], [637, 122], [693, 77], [749, 105], [63, 145], [119, 168],
  [175, 153], [231, 182], [287, 160], [343, 190], [399, 148], [455, 175],
  [511, 162], [567, 195], [623, 152], [679, 178], [735, 165], [791, 188],
  [30, 220], [86, 248], [142, 233], [198, 262], [254, 240], [310, 270],
  [366, 228], [422, 255], [478, 242], [534, 272], [590, 232], [646, 258],
  [702, 245], [758, 278], [15, 295], [71, 318], [127, 305], [183, 335],
  [239, 312], [295, 342], [351, 300], [407, 328], [463, 315], [519, 345],
  [575, 302], [631, 330], [687, 318], [743, 348], [799, 310], [50, 370],
  [106, 398], [162, 382], [218, 412], [274, 390], [330, 420], [386, 375],
  [442, 405], [498, 392], [554, 422], [610, 380], [666, 408], [722, 395],
  [778, 418], [20, 452], [76, 475], [132, 462], [188, 490], [244, 468],
  [300, 492], [356, 458], [412, 482], [468, 470], [524, 492], [580, 455],
  [636, 480], [692, 465], [748, 488], [795, 460],
];

const NODE_RADIUS = 18;

export function QuestArcMap({ completedQuestIds = [], onSelectQuest }: QuestArcMapProps) {
  const [hoveredQuest, setHoveredQuest] = useState<number | null>(null);
  const completedSet = new Set(completedQuestIds);

  const questIds = Object.keys(QUEST_POSITIONS).map(Number);

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-[#7dd87d]/20">
      {/* CSS animations injected via style tag */}
      <style>{`
        @keyframes quest-node-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes quest-star-twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        .quest-node-pulse {
          transform-origin: center;
          transform-box: fill-box;
          animation: quest-node-pulse 2.8s ease-in-out infinite;
        }
        .quest-star-a { animation: quest-star-twinkle 3.1s ease-in-out infinite; }
        .quest-star-b { animation: quest-star-twinkle 4.7s ease-in-out infinite 0.9s; }
        .quest-star-c { animation: quest-star-twinkle 2.5s ease-in-out infinite 1.8s; }
      `}</style>

      <svg
        viewBox="0 0 800 510"
        width="100%"
        height="auto"
        aria-label="Quest arc constellation map"
        role="img"
        style={{ background: "#0d1f10", display: "block" }}
      >
        {/* Dark green starfield background */}
        <defs>
          <radialGradient id="bgGrad" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#152a18" />
            <stop offset="100%" stopColor="#0a1a0c" />
          </radialGradient>
          {/* Glow filter for completed nodes */}
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle glow for connection lines */}
          <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="800" height="510" fill="url(#bgGrad)" />

        {/* Starfield */}
        {STARS.map(([sx, sy], i) => {
          const cls = i % 3 === 0 ? "quest-star-a" : i % 3 === 1 ? "quest-star-b" : "quest-star-c";
          const r = i % 5 === 0 ? 1.2 : 0.7;
          return (
            <circle
              key={`star-${i}`}
              cx={sx}
              cy={sy}
              r={r}
              fill="white"
              className={cls}
            />
          );
        })}

        {/* Connection lines */}
        {CONNECTIONS.map(([fromIdx, toIdx]) => {
          const [x1, y1] = QUEST_POSITIONS[fromIdx];
          const [x2, y2] = QUEST_POSITIONS[toIdx];
          const fromColor = ELEMENT_COLORS[QUEST_ELEMENTS[fromIdx]];
          const toColor   = ELEMENT_COLORS[QUEST_ELEMENTS[toIdx]];
          const isHovered = hoveredQuest === fromIdx || hoveredQuest === toIdx;
          const gradId = `line-grad-${fromIdx}-${toIdx}`;

          return (
            <g key={`conn-${fromIdx}-${toIdx}`}>
              <defs>
                <linearGradient id={gradId} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={fromColor} />
                  <stop offset="100%" stopColor={toColor} />
                </linearGradient>
              </defs>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={`url(#${gradId})`}
                strokeWidth={isHovered ? 1.8 : 1}
                strokeOpacity={isHovered ? 0.55 : 0.28}
                strokeLinecap="round"
                filter={isHovered ? "url(#line-glow)" : undefined}
                style={{ transition: "stroke-opacity 0.25s, stroke-width 0.25s" }}
              />
            </g>
          );
        })}

        {/* Quest nodes */}
        {questIds.map((qNum) => {
          const [cx, cy] = QUEST_POSITIONS[qNum];
          const element = QUEST_ELEMENTS[qNum];
          const color = ELEMENT_COLORS[element];
          const questId = `quest-${qNum}`;
          const isCompleted = completedSet.has(questId);
          const isHovered = hoveredQuest === qNum;
          const label = QUEST_LABELS[qNum];

          // Tooltip position: flip to left if node is far right, up if near bottom
          const tooltipX = cx > 650 ? cx - 8 : cx < 150 ? cx + 8 : cx;
          const tooltipAnchor = cx > 650 ? "end" : cx < 150 ? "start" : "middle";
          const tooltipY = cy > 420 ? cy - NODE_RADIUS - 28 : cy - NODE_RADIUS - 12;

          return (
            <g
              key={questId}
              onClick={() => onSelectQuest(questId)}
              onMouseEnter={() => setHoveredQuest(qNum)}
              onMouseLeave={() => setHoveredQuest(null)}
              style={{ cursor: "pointer" }}
              role="button"
              aria-label={`Quest ${qNum}: ${label}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectQuest(questId);
              }}
            >
              {/* Pulse ring for uncompleted nodes */}
              {!isCompleted && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={NODE_RADIUS + 6}
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  strokeOpacity="0.35"
                  className="quest-node-pulse"
                />
              )}

              {/* Glow halo for completed nodes */}
              {isCompleted && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={NODE_RADIUS + 10}
                  fill={color}
                  fillOpacity="0.18"
                  filter="url(#node-glow)"
                />
              )}

              {/* Hover ring */}
              {isHovered && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={NODE_RADIUS + 8}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  strokeOpacity="0.6"
                />
              )}

              {/* Main node circle */}
              <circle
                cx={cx}
                cy={cy}
                r={NODE_RADIUS}
                fill={isCompleted ? color : "#0d1f10"}
                stroke={color}
                strokeWidth={isCompleted ? 2.5 : 1.8}
                fillOpacity={isCompleted ? 0.9 : 1}
                filter={isCompleted ? "url(#node-glow)" : undefined}
                style={{ transition: "r 0.2s" }}
              />

              {/* Quest number inside node */}
              <text
                x={cx}
                y={cy + 5}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={isCompleted ? "#0d1f10" : color}
                style={{ userSelect: "none", pointerEvents: "none" }}
              >
                {qNum}
              </text>

              {/* Checkmark for completed quests */}
              {isCompleted && (
                <text
                  x={cx + NODE_RADIUS - 5}
                  y={cy - NODE_RADIUS + 5}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#0d1f10"
                  fontWeight="bold"
                  style={{ userSelect: "none", pointerEvents: "none" }}
                >
                  ✓
                </text>
              )}

              {/* Hover tooltip showing quest title */}
              {isHovered && (
                <g>
                  <rect
                    x={tooltipAnchor === "end" ? tooltipX - 120 : tooltipAnchor === "start" ? tooltipX : tooltipX - 60}
                    y={tooltipY - 20}
                    width="120"
                    height="22"
                    rx="5"
                    fill="#0d1f10"
                    stroke={color}
                    strokeWidth="1"
                    fillOpacity="0.92"
                  />
                  <text
                    x={tooltipAnchor === "end" ? tooltipX - 60 : tooltipAnchor === "start" ? tooltipX + 60 : tooltipX}
                    y={tooltipY - 5}
                    textAnchor="middle"
                    fontSize="9"
                    fill={color}
                    fontWeight="600"
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  >
                    {label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Element legend */}
        <g transform="translate(16, 482)">
          {(["fire", "earth", "water", "air"] as const).map((el, i) => (
            <g key={el} transform={`translate(${i * 110}, 0)`}>
              <circle cx="7" cy="7" r="6" fill={ELEMENT_COLORS[el]} fillOpacity="0.85" />
              <text x="18" y="11" fontSize="9" fill={ELEMENT_COLORS[el]} fontWeight="500" opacity="0.8">
                {el.charAt(0).toUpperCase() + el.slice(1)}
              </text>
            </g>
          ))}
          <text x="470" y="11" fontSize="9" fill="white" opacity="0.4" textAnchor="end">
            Click a node to open quest
          </text>
        </g>
      </svg>
    </div>
  );
}
