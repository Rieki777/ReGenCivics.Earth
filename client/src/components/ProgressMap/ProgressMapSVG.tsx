/**
 * ProgressMapSVG - Bird's-eye village map (Fix 5, 2026-04-11).
 * The 4 paths are walking trails through a single illustrated village.
 * Each landmark is its own hand-painted illustration sitting at its
 * x,y coordinate inside the 1200x800 viewBox.
 *
 * State -> visual:
 *   locked     -> grayscale + low opacity, dashed ring, cursor default
 *   unlocked   -> full color, gentle pulse ring, cursor pointer
 *   completed  -> full color, soft glow halo, checkmark badge
 */
import { useState } from "react";
import { PATHS, REGEN_TREE, buildPathCurve, type MapNode, type NodeState } from "./mapData";
import { MAP_ASSETS, getLandmarkSrc, getMapSrc } from "./mapAssets";
import type { ProgressMapState } from "./useProgressMap";

interface Props {
  progress: ProgressMapState;
  onNodeClick?: (node: MapNode) => void;
  selectedPath?: string | null;
}

const LANDMARK_SIZE = 72; // px in viewBox units

function Landmark({
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
  const half = LANDMARK_SIZE / 2;
  const x = node.x - half;
  const y = node.y - half;

  const filterId =
    state === "locked" ? "url(#grayscale)" : state === "completed" ? "url(#warmGlow)" : undefined;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ cursor: state !== "locked" ? "pointer" : "default" }}
      role={state !== "locked" ? "button" : undefined}
      aria-label={`${node.landmark}: ${node.label}`}
    >
      {/* Soft halo for completed */}
      {state === "completed" && (
        <circle cx={node.x} cy={node.y} r={half + 12} fill={color} opacity={0.15}>
          <animate attributeName="r" values={`${half + 8};${half + 14};${half + 8}`} dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.18;0.08;0.18" dur="4s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Pulse for unlocked */}
      {state === "unlocked" && (
        <circle cx={node.x} cy={node.y} r={half + 4} fill="none" stroke={color} strokeWidth={1.5} opacity={0.55}>
          <animate attributeName="r" values={`${half + 2};${half + 10};${half + 2}`} dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.55;0.15;0.55" dur="2.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Landmark illustration */}
      <image
        href={getLandmarkSrc(node.id)}
        x={x}
        y={y}
        width={LANDMARK_SIZE}
        height={LANDMARK_SIZE}
        preserveAspectRatio="xMidYMid meet"
        opacity={state === "locked" ? 0.45 : 1}
        filter={filterId}
      />

      {/* Locked dashed ring */}
      {state === "locked" && (
        <circle
          cx={node.x}
          cy={node.y}
          r={half - 2}
          fill="none"
          stroke="#3d4d40"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      )}

      {/* Completed check badge, top-right of landmark */}
      {state === "completed" && (
        <g>
          <circle cx={node.x + half - 6} cy={node.y - half + 8} r={9} fill={color} stroke="#0d2818" strokeWidth={1.5} />
          <path
            d={`M ${node.x + half - 10} ${node.y - half + 8} l 3 3 l 6 -6`}
            fill="none"
            stroke="#0d2818"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* Tooltip on hover */}
      {hovered && state !== "locked" && (
        <g pointerEvents="none">
          <rect
            x={node.x - 90}
            y={node.y - half - 44}
            width={180}
            height={36}
            rx={8}
            fill="#0d2818"
            stroke={color}
            strokeWidth={1}
            opacity={0.96}
          />
          <text
            x={node.x}
            y={node.y - half - 30}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={11}
            fontWeight={600}
            fontFamily="var(--font-body)"
          >
            {node.landmark}
          </text>
          <text
            x={node.x}
            y={node.y - half - 16}
            textAnchor="middle"
            dominantBaseline="central"
            fill={color}
            fontSize={9}
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
      {/* Defs first so filters apply correctly across browsers */}
      <defs>
        <filter id="grayscale">
          <feColorMatrix
            type="matrix"
            values="0.33 0.33 0.33 0 0
                    0.33 0.33 0.33 0 0
                    0.33 0.33 0.33 0 0
                    0    0    0    1 0"
          />
        </filter>
        <filter id="warmGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="pathGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Village canvas background (full bleed) */}
      <image
        href={getMapSrc(MAP_ASSETS.village_canvas)}
        x={0}
        y={0}
        width={1200}
        height={800}
        preserveAspectRatio="xMidYMid slice"
        opacity={0.85}
      />

      {/* Soft vignette overlay so landmarks pop */}
      <rect x={0} y={0} width={1200} height={800} fill="#0a1a10" opacity={0.18} />

      {/* Underground mycelium lines connecting shared nodes to the tree */}
      <g opacity={0.25}>
        <line x1={350} y1={480} x2={REGEN_TREE.x} y2={REGEN_TREE.y} stroke="#7dd87d" strokeWidth={1.5} strokeDasharray="6 4" />
        <line x1={350} y1={200} x2={REGEN_TREE.x} y2={REGEN_TREE.y} stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="6 4" />
        <line x1={920} y1={570} x2={REGEN_TREE.x} y2={REGEN_TREE.y} stroke="#f97316" strokeWidth={1.5} strokeDasharray="6 4" />
        <line x1={900} y1={370} x2={REGEN_TREE.x} y2={REGEN_TREE.y} stroke="#c084fc" strokeWidth={1.5} strokeDasharray="6 4" />
      </g>

      {/* Path curves (walking trails between landmarks) */}
      {PATHS.map((path) => {
        const pathProgress = progress.paths.find((p) => p.pathId === path.id);
        const dimmed = selectedPath && selectedPath !== path.id;
        const completedNodes = path.nodes.filter(
          (n) => pathProgress?.nodeStates.get(n.id) === "completed",
        );
        const allCurve = buildPathCurve(path.nodes);

        return (
          <g key={path.id} opacity={dimmed ? 0.18 : 1}>
            {/* Full trail (dashed, dim) */}
            <path
              d={allCurve}
              fill="none"
              stroke={path.color}
              strokeWidth={2.5}
              strokeDasharray="8 6"
              opacity={0.35}
            />
            {/* Walked portion (solid, glowing) */}
            {completedNodes.length >= 2 && (
              <path
                d={buildPathCurve(completedNodes)}
                fill="none"
                stroke={path.color}
                strokeWidth={3.5}
                opacity={0.8}
                filter="url(#pathGlow)"
              />
            )}
          </g>
        );
      })}

      {/* ReGen Tree at center */}
      <g>
        <circle cx={REGEN_TREE.x} cy={REGEN_TREE.y} r={32} fill="#1a472a" stroke="#7dd87d" strokeWidth={2.5} opacity={0.85} />
        <text
          x={REGEN_TREE.x}
          y={REGEN_TREE.y - 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={26}
        >
          🌳
        </text>
        <circle cx={REGEN_TREE.x} cy={REGEN_TREE.y} r={38} fill="none" stroke="#7dd87d" strokeWidth={1} opacity={0.25}>
          <animate attributeName="r" values="34;46;34" dur="5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.25;0.06;0.25" dur="5s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Landmark illustrations as interactive nodes */}
      {PATHS.map((path) => {
        const pathProgress = progress.paths.find((p) => p.pathId === path.id);
        const dimmed = selectedPath && selectedPath !== path.id;
        if (dimmed) return null;

        return path.nodes.map((node) => {
          const state = pathProgress?.nodeStates.get(node.id) ?? "locked";
          return (
            <Landmark
              key={node.id}
              node={node}
              state={state}
              color={path.color}
              onClick={() => onNodeClick?.(node)}
            />
          );
        });
      })}
    </svg>
  );
}
