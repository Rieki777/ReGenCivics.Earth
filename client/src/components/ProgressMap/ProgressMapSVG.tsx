/**
 * ProgressMapSVG - The illustrated SVG map with 4 paths, nodes, and zone backgrounds.
 * Uses the 7 map illustrations as zone backgrounds with interactive SVG overlays.
 */
import { useState } from "react";
import { PATHS, REGEN_TREE, buildPathCurve, type MapNode, type NodeState } from "./mapData";
import { MAP_ASSETS } from "./mapAssets";
import type { ProgressMapState } from "./useProgressMap";

interface Props {
  progress: ProgressMapState;
  onNodeClick?: (node: MapNode) => void;
  selectedPath?: string | null;
}

function NodeCircle({
  node,
  state,
  color,
  onClick,
}: {
  node: MapNode;
  state: NodeState;
  color: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const r = 14;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ cursor: state !== "locked" ? "pointer" : "default" }}
    >
      {/* Glow for completed */}
      {state === "completed" && (
        <circle cx={node.x} cy={node.y} r={r + 8} fill={color} opacity={0.15}>
          <animate attributeName="r" values={`${r + 6};${r + 10};${r + 6}`} dur="3s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Pulse for unlocked */}
      {state === "unlocked" && (
        <circle cx={node.x} cy={node.y} r={r + 4} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4}>
          <animate attributeName="r" values={`${r + 2};${r + 8};${r + 2}`} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Main circle */}
      <circle
        cx={node.x}
        cy={node.y}
        r={r}
        fill={state === "completed" ? color : state === "unlocked" ? "#1a472a" : "#0d1a12"}
        stroke={state === "locked" ? "#2d3b30" : color}
        strokeWidth={state === "locked" ? 1 : 2}
        strokeDasharray={state === "locked" ? "4 3" : "none"}
        opacity={state === "locked" ? 0.4 : 1}
      />

      {/* Checkmark for completed */}
      {state === "completed" && (
        <path
          d={`M ${node.x - 5} ${node.y} l 3 4 l 6 -7`}
          fill="none"
          stroke="#0d2818"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Node index for non-completed */}
      {state !== "completed" && (
        <text
          x={node.x}
          y={node.y + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fill={state === "locked" ? "#3d4d40" : color}
          fontSize={11}
          fontWeight={700}
          fontFamily="var(--font-display)"
        >
          {node.index + 1}
        </text>
      )}

      {/* Tooltip on hover */}
      {hovered && state !== "locked" && (
        <g>
          <rect
            x={node.x - 80}
            y={node.y - 42}
            width={160}
            height={32}
            rx={8}
            fill="#0d2818"
            stroke={color}
            strokeWidth={1}
            opacity={0.95}
          />
          <text
            x={node.x}
            y={node.y - 30}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={10}
            fontFamily="var(--font-body)"
          >
            {node.landmark}
          </text>
          <text
            x={node.x}
            y={node.y - 18}
            textAnchor="middle"
            dominantBaseline="central"
            fill={color}
            fontSize={8}
            fontFamily="var(--font-body)"
          >
            {node.label}
          </text>
        </g>
      )}
    </g>
  );
}

export function ProgressMapSVG({ progress, onNodeClick, selectedPath }: Props) {
  return (
    <svg
      viewBox="0 0 1200 800"
      className="w-full h-full"
      style={{ background: "#0a1a10" }}
    >
      {/* Background illustration */}
      <image
        href={MAP_ASSETS.hero}
        x={0}
        y={0}
        width={1200}
        height={800}
        preserveAspectRatio="xMidYMid slice"
        opacity={0.35}
      />

      {/* Dark overlay for readability */}
      <rect x={0} y={0} width={1200} height={800} fill="#0a1a10" opacity={0.4} />

      {/* Underground mycelium lines connecting shared nodes */}
      <g opacity={0.15}>
        <line x1={350} y1={480} x2={600} y2={400} stroke="#7dd87d" strokeWidth={1} strokeDasharray="6 4" />
        <line x1={350} y1={200} x2={600} y2={400} stroke="#60a5fa" strokeWidth={1} strokeDasharray="6 4" />
        <line x1={920} y1={570} x2={600} y2={400} stroke="#f97316" strokeWidth={1} strokeDasharray="6 4" />
        <line x1={900} y1={370} x2={600} y2={400} stroke="#c084fc" strokeWidth={1} strokeDasharray="6 4" />
      </g>

      {/* Path lines */}
      {PATHS.map(path => {
        const pathProgress = progress.paths.find(p => p.pathId === path.id);
        const isSelected = !selectedPath || selectedPath === path.id;
        const dimmed = selectedPath && selectedPath !== path.id;

        // Split into completed and remaining segments
        const completedNodes = path.nodes.filter(n =>
          pathProgress?.nodeStates.get(n.id) === "completed"
        );
        const allCurve = buildPathCurve(path.nodes);

        return (
          <g key={path.id} opacity={dimmed ? 0.2 : 1}>
            {/* Full path (dashed, dim) */}
            <path
              d={allCurve}
              fill="none"
              stroke={path.color}
              strokeWidth={2}
              strokeDasharray="8 6"
              opacity={0.25}
            />

            {/* Completed portion (solid, glowing) */}
            {completedNodes.length >= 2 && (
              <path
                d={buildPathCurve(completedNodes)}
                fill="none"
                stroke={path.color}
                strokeWidth={3}
                opacity={0.7}
                filter="url(#glow)"
              />
            )}
          </g>
        );
      })}

      {/* ReGen Tree at center */}
      <g>
        <circle cx={REGEN_TREE.x} cy={REGEN_TREE.y} r={24} fill="#1a472a" stroke="#7dd87d" strokeWidth={2} opacity={0.8} />
        <text
          x={REGEN_TREE.x}
          y={REGEN_TREE.y - 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={18}
        >
          🌳
        </text>
        {/* Pulse based on overall progress */}
        <circle cx={REGEN_TREE.x} cy={REGEN_TREE.y} r={28} fill="none" stroke="#7dd87d" strokeWidth={1} opacity={0.2}>
          <animate attributeName="r" values="26;34;26" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.2;0.05;0.2" dur="4s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Nodes */}
      {PATHS.map(path => {
        const pathProgress = progress.paths.find(p => p.pathId === path.id);
        const dimmed = selectedPath && selectedPath !== path.id;
        if (dimmed) return null;

        return path.nodes.map(node => {
          const state = pathProgress?.nodeStates.get(node.id) ?? "locked";
          return (
            <NodeCircle
              key={node.id}
              node={node}
              state={state}
              color={path.color}
              onClick={() => onNodeClick?.(node)}
            />
          );
        });
      })}

      {/* SVG filters */}
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
