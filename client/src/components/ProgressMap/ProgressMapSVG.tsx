/**
 * ProgressMapSVG - Bird's-eye village map (Fix 5, 2026-04-11).
 * The 4 paths are walking trails through a single illustrated village.
 * Each landmark is its own hand-painted illustration sitting at its
 * x,y coordinate inside the 1200x800 viewBox.
 *
 * State -> visual:
 *   locked     -> grayscale + low opacity, dashed ring, cursor default
 *   unlocked   -> full color, colored ring, cursor pointer
 *   completed  -> full color, soft glow halo, checkmark badge
 *
 * Everything holds still. The rings used to pulse with SVG <animate>, which
 * never leaves the main thread, so the page restyled every frame and every
 * keystroke waited behind it (STEERING.md section 13).
 *
 * Keyboard and touch (2026-10-20). An open or walked landmark is a button:
 * Tab reaches it, Enter or Space opens it, and focus shows a ring drawn in
 * the SVG itself (.pm-focus in index.css), because Safari paints no outline
 * or box-shadow on a shape inside an SVG and Chrome outlines the group's
 * whole box. Hovering or focusing one shows its name above every landmark. A
 * locked landmark is a picture that says it is locked: out of the tab order,
 * and a tap on it does nothing. Each button carries an invisible hit disc
 * 44px across at the size the map is drawn (hitArea.ts).
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { PATHS, REGEN_TREE, buildPathCurve, type MapNode, type NodeState } from "./mapData";
import { MAP_ASSETS, getLandmarkSrc, getMapSrc } from "./mapAssets";
import { hitRadius, nearestCell, toPoints } from "./hitArea";
import type { ProgressMapState } from "./useProgressMap";

interface Props {
  progress: ProgressMapState;
  onNodeClick?: (node: MapNode) => void;
  selectedPath?: string | null;
}

const VIEW_W = 1200;
const VIEW_H = 800;
const LANDMARK_SIZE = 72; // px in viewBox units

/** Said after each landmark's name, so a screen reader hears its state. */
const STATE_WORDS: Record<NodeState, string> = {
  completed: "done",
  unlocked: "next step",
  locked: "locked",
};

/**
 * Pixels per viewBox unit as the map is drawn. The viewBox meets its box, so
 * the narrower side sets the scale. Rounded down, so a hit disc sized from it
 * is never under 44px. 0 until the first measure.
 */
function useDrawnScale(ref: RefObject<SVGSVGElement | null>) {
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const svg = ref.current;
    if (!svg || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setScale(Math.floor(Math.min(width / VIEW_W, height / VIEW_H) * 1000) / 1000);
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, [ref]);
  return scale;
}

function Landmark({
  node,
  state,
  color,
  hit,
  onOpen,
  onPoint,
  onKeyFocus,
}: {
  node: MapNode;
  state: NodeState;
  color: string;
  /** The invisible hit disc: its radius and the clip that keeps it to this landmark's share. */
  hit?: { r: number; clip: string };
  onOpen?: () => void;
  onPoint?: (on: boolean) => void;
  onKeyFocus?: (on: boolean) => void;
}) {
  const half = LANDMARK_SIZE / 2;
  const x = node.x - half;
  const y = node.y - half;
  const open = state !== "locked";

  const filterId =
    state === "locked" ? "url(#grayscale)" : state === "completed" ? "url(#warmGlow)" : undefined;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onOpen?.();
  };
  // Only keyboard focus shows the name: a click focuses the landmark too, and
  // its name would then stay up after the pointer left.
  const keyboardFocus = (el: Element) => {
    try {
      return el.matches(":focus-visible");
    } catch {
      return false;
    }
  };

  return (
    <g
      role={open ? "button" : "img"}
      tabIndex={open ? 0 : undefined}
      aria-label={`${node.landmark}: ${node.label}, ${STATE_WORDS[state]}`}
      data-node-id={node.id}
      className={open ? "pm-landmark" : undefined}
      onClick={open ? onOpen : undefined}
      onKeyDown={open ? onKeyDown : undefined}
      onMouseEnter={open ? () => onPoint?.(true) : undefined}
      onMouseLeave={open ? () => onPoint?.(false) : undefined}
      onFocus={open ? (e) => onKeyFocus?.(keyboardFocus(e.currentTarget)) : undefined}
      onBlur={open ? () => onKeyFocus?.(false) : undefined}
      style={{ cursor: open ? "pointer" : "default" }}
    >
      {/* Invisible hit disc: nothing drawn, still tappable */}
      {hit && (
        <circle cx={node.x} cy={node.y} r={hit.r} fill="none" pointerEvents="fill" clipPath={`url(#${hit.clip})`} />
      )}

      {/* Soft halo for completed */}
      {state === "completed" && (
        <circle cx={node.x} cy={node.y} r={half + 12} fill={color} opacity={0.15} />
      )}

      {/* Ring for unlocked, at the old pulse's brightest */}
      {state === "unlocked" && (
        <circle cx={node.x} cy={node.y} r={half + 4} fill="none" stroke={color} strokeWidth={1.5} opacity={0.55} />
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

      {/* Keyboard focus ring, white on a dark edge so it reads on any part
          of the painting; the strokes stay 3px however small the map is */}
      {open && (
        <g className="pm-focus" aria-hidden="true">
          <circle cx={node.x} cy={node.y} r={half + 9} fill="none" stroke="#0a1a10" strokeWidth={7} vectorEffect="non-scaling-stroke" />
          <circle cx={node.x} cy={node.y} r={half + 9} fill="none" stroke="#ffffff" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        </g>
      )}
    </g>
  );
}

/** A landmark's name and step, above it. Drawn after every landmark so none covers it. */
function NameTag({ node, color }: { node: MapNode; color: string }) {
  const half = LANDMARK_SIZE / 2;
  return (
    <g pointerEvents="none" aria-hidden="true">
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
  );
}

export function ProgressMapSVG({ progress, onNodeClick, selectedPath }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const scale = useDrawnScale(svgRef);
  const clipPrefix = `pm-hit-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [pointed, setPointed] = useState<string | null>(null);
  const [keyed, setKeyed] = useState<string | null>(null);

  // Every landmark on the map (one path's, when a path is picked).
  const shown = useMemo(
    () =>
      PATHS.filter((path) => !selectedPath || selectedPath === path.id).flatMap((path) => {
        const pathProgress = progress.paths.find((p) => p.pathId === path.id);
        return path.nodes.map((node) => ({
          node,
          color: path.color,
          state: pathProgress?.nodeStates.get(node.id) ?? ("locked" as NodeState),
        }));
      }),
    [progress.paths, selectedPath],
  );

  // Each open landmark's share of the map around it. Locked ones count as
  // neighbours, so a tap on a locked landmark never opens the one beside it.
  const r = hitRadius(scale, LANDMARK_SIZE / 2);
  const cells = useMemo(
    () =>
      shown
        .filter((s) => s.state !== "locked")
        .map((s) => ({
          id: s.node.id,
          points: toPoints(nearestCell(s.node, shown.filter((o) => o !== s).map((o) => o.node), r)),
        })),
    [shown, r],
  );

  const tagged = shown.find((s) => s.node.id === (pointed ?? keyed) && s.state !== "locked");

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="w-full h-full"
      style={{ background: "#0a1a10" }}
      role="group"
      aria-label="Map of your four paths"
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
        {cells.map((cell) => (
          <clipPath key={cell.id} id={`${clipPrefix}-${cell.id}`}>
            <polygon points={cell.points} />
          </clipPath>
        ))}
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
        <line x1={350} y1={200} x2={REGEN_TREE.x} y2={REGEN_TREE.y} stroke="#7dd87d" strokeWidth={1.5} strokeDasharray="6 4" />
        <line x1={920} y1={570} x2={REGEN_TREE.x} y2={REGEN_TREE.y} stroke="#f97316" strokeWidth={1.5} strokeDasharray="6 4" />
        <line x1={900} y1={370} x2={REGEN_TREE.x} y2={REGEN_TREE.y} stroke="#7dd87d" strokeWidth={1.5} strokeDasharray="6 4" />
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
        <circle cx={REGEN_TREE.x} cy={REGEN_TREE.y} r={38} fill="none" stroke="#7dd87d" strokeWidth={1} opacity={0.25} />
      </g>

      {/* Landmark illustrations as interactive nodes */}
      {shown.map(({ node, state, color }) => (
        <Landmark
          key={node.id}
          node={node}
          state={state}
          color={color}
          hit={state !== "locked" ? { r, clip: `${clipPrefix}-${node.id}` } : undefined}
          onOpen={() => onNodeClick?.(node)}
          onPoint={(on) => setPointed((cur) => (on ? node.id : cur === node.id ? null : cur))}
          onKeyFocus={(on) => setKeyed((cur) => (on ? node.id : cur === node.id ? null : cur))}
        />
      ))}

      {/* The hovered or keyboard-focused landmark's name, above them all */}
      {tagged && <NameTag node={tagged.node} color={tagged.color} />}
    </svg>
  );
}
