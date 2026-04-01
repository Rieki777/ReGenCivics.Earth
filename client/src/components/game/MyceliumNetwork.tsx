/**
 * MyceliumNetwork - SVG force-directed network visualization showing a
 * player's referral connections. Renders on the player profile page.
 *
 * Uses simple spring physics (Coulomb repulsion + Hooke attraction +
 * center gravity) with requestAnimationFrame. No external dependencies
 * beyond React.
 *
 * Max 2 degrees of separation, max 50 nodes displayed.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NetworkNode {
  id: number;
  label: string;
  /** 0 = self, 1 = direct referral, 2 = second-degree */
  degree: number;
}

interface NetworkEdge {
  source: number;
  target: number;
}

interface SimNode extends NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface MyceliumNetworkProps {
  userId: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Mock data (used when tRPC endpoint is unavailable)
// ---------------------------------------------------------------------------

const MOCK_NODES: NetworkNode[] = [
  { id: 1, label: "You", degree: 0 },
  { id: 2, label: "A", degree: 1 },
  { id: 3, label: "B", degree: 1 },
  { id: 4, label: "C", degree: 2 },
];

const MOCK_EDGES: NetworkEdge[] = [
  { source: 1, target: 2 },
  { source: 1, target: 3 },
  { source: 2, target: 4 },
];

const MAX_NODES = 50;

// ---------------------------------------------------------------------------
// Physics constants
// ---------------------------------------------------------------------------

const REPULSION_STRENGTH = 800;
const SPRING_STRENGTH = 0.04;
const SPRING_REST_LENGTH = 60;
const CENTER_GRAVITY = 0.02;
const DAMPING = 0.85;
const SIM_ITERATIONS = 100;

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const COLOR_SELF = "#7dd87d";
const COLOR_DIRECT = "#a8e6a8";
const COLOR_SECOND = "rgba(255, 255, 255, 0.4)";

const RADIUS_SELF = 14;
const RADIUS_DIRECT = 9;
const RADIUS_SECOND = 6;

function nodeColor(degree: number): string {
  if (degree === 0) return COLOR_SELF;
  if (degree === 1) return COLOR_DIRECT;
  return COLOR_SECOND;
}

function nodeRadius(degree: number): number {
  if (degree === 0) return RADIUS_SELF;
  if (degree === 1) return RADIUS_DIRECT;
  return RADIUS_SECOND;
}

// ---------------------------------------------------------------------------
// Force simulation
// ---------------------------------------------------------------------------

function initSimNodes(
  nodes: NetworkNode[],
  centerX: number,
  centerY: number,
): SimNode[] {
  return nodes.slice(0, MAX_NODES).map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const dist = n.degree === 0 ? 0 : 30 + n.degree * 30;
    return {
      ...n,
      x: centerX + Math.cos(angle) * dist,
      y: centerY + Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
    };
  });
}

function runSimulation(
  nodes: SimNode[],
  edges: NetworkEdge[],
  centerX: number,
  centerY: number,
  iterations: number,
): SimNode[] {
  const simNodes = nodes.map((n) => ({ ...n }));
  const edgeLookup = new Map<number, number[]>();

  for (const e of edges) {
    if (!edgeLookup.has(e.source)) edgeLookup.set(e.source, []);
    if (!edgeLookup.has(e.target)) edgeLookup.set(e.target, []);
    edgeLookup.get(e.source)!.push(e.target);
    edgeLookup.get(e.target)!.push(e.source);
  }

  for (let iter = 0; iter < iterations; iter++) {
    // Coulomb repulsion between all node pairs
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const a = simNodes[i];
        const b = simNodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);
        const force = REPULSION_STRENGTH / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Hooke spring attraction along edges
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));
    for (const e of edges) {
      const a = nodeById.get(e.source);
      const b = nodeById.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - SPRING_REST_LENGTH;
      const force = SPRING_STRENGTH * displacement;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Center gravity
    for (const n of simNodes) {
      n.vx += (centerX - n.x) * CENTER_GRAVITY;
      n.vy += (centerY - n.y) * CENTER_GRAVITY;
    }

    // Apply velocity with damping
    for (const n of simNodes) {
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  return simNodes;
}

// ---------------------------------------------------------------------------
// Curved edge path (mycelium thread effect)
// ---------------------------------------------------------------------------

function edgePath(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): string {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  // Perpendicular offset for curvature
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const offset = dist * 0.15;
  const cx = mx + (-dy / dist) * offset;
  const cy = my + (dx / dist) * offset;
  return `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MyceliumNetwork({ userId, className }: MyceliumNetworkProps) {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [breathPhase, setBreathPhase] = useState(0);
  const breathRef = useRef<number>(0);

  // Attempt to use tRPC if available, fall back to mock data
  let networkNodes: NetworkNode[] = MOCK_NODES;
  let networkEdges: NetworkEdge[] = MOCK_EDGES;

  try {
    // Dynamic import attempt for tRPC hook. If the endpoint or module
    // does not exist, we catch and use mock data instead.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { trpc } = require("@/lib/trpc");
    const query = trpc.sharing?.getReferralNetwork?.useQuery?.({ userId });
    if (query?.data) {
      const data = query.data as {
        nodes: NetworkNode[];
        edges: NetworkEdge[];
      };
      if (data.nodes?.length > 0) {
        networkNodes = data.nodes.slice(0, MAX_NODES);
        networkEdges = data.edges;
      }
    }
  } catch {
    // tRPC endpoint not available yet, using mock data
  }

  const size = 300;
  const center = size / 2;

  // Run physics simulation once on data change
  const simNodes = useMemo(() => {
    const initial = initSimNodes(networkNodes, center, center);
    return runSimulation(initial, networkEdges, center, center, SIM_ITERATIONS);
  }, [networkNodes, networkEdges, center]);

  const nodeMap = useMemo(
    () => new Map(simNodes.map((n) => [n.id, n])),
    [simNodes],
  );

  // Breathing animation loop
  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      breathRef.current += 0.015;
      setBreathPhase(breathRef.current);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => {
      running = false;
    };
  }, []);

  const breathScale = 1 + Math.sin(breathPhase) * 0.03;
  const glowOpacity = 0.3 + Math.sin(breathPhase) * 0.15;

  const handleNodeHover = useCallback((id: number | null) => {
    setHoveredNode(id);
  }, []);

  // Empty state
  if (networkNodes.length <= 1) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "rgba(255,255,255,0.5)",
          fontSize: 14,
          padding: 24,
          lineHeight: 1.5,
        }}
      >
        Your mycelium network grows as you invite others into the game.
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ width: "100%", maxWidth: size, aspectRatio: "1 / 1" }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        height="100%"
        style={{ background: "transparent", display: "block" }}
      >
        <defs>
          {/* Glow filter for edges */}
          <filter id={`myc-glow-${userId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Radial glow for center node */}
          <radialGradient id={`myc-center-glow-${userId}`}>
            <stop offset="0%" stopColor={COLOR_SELF} stopOpacity="0.4" />
            <stop offset="100%" stopColor={COLOR_SELF} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background glow around center */}
        <circle
          cx={simNodes[0]?.x ?? center}
          cy={simNodes[0]?.y ?? center}
          r={40 * breathScale}
          fill={`url(#myc-center-glow-${userId})`}
          opacity={glowOpacity}
        />

        {/* Edges (mycelium threads) */}
        <g filter={`url(#myc-glow-${userId})`}>
          {networkEdges.map((e, i) => {
            const a = nodeMap.get(e.source);
            const b = nodeMap.get(e.target);
            if (!a || !b) return null;
            return (
              <path
                key={`edge-${i}`}
                d={edgePath(a.x, a.y, b.x, b.y)}
                fill="none"
                stroke={COLOR_DIRECT}
                strokeWidth={1.2}
                strokeOpacity={0.35 + Math.sin(breathPhase + i * 0.5) * 0.1}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* Nutrient pulse dots traveling along edges */}
        {networkEdges.map((e, i) => {
          const a = nodeMap.get(e.source);
          const b = nodeMap.get(e.target);
          if (!a || !b) return null;
          const t = ((breathPhase * 0.3 + i * 1.2) % 1 + 1) % 1;
          const px = a.x + (b.x - a.x) * t;
          const py = a.y + (b.y - a.y) * t;
          return (
            <circle
              key={`pulse-${i}`}
              cx={px}
              cy={py}
              r={1.5}
              fill={COLOR_SELF}
              opacity={0.5 + Math.sin(breathPhase + i) * 0.3}
            />
          );
        })}

        {/* Nodes */}
        {simNodes.map((node) => {
          const r = nodeRadius(node.degree);
          const isHovered = hoveredNode === node.id;
          const fill = nodeColor(node.degree);
          const scale = node.degree === 0 ? breathScale : 1;

          return (
            <g
              key={`node-${node.id}`}
              onMouseEnter={() => handleNodeHover(node.id)}
              onMouseLeave={() => handleNodeHover(null)}
              onTouchStart={() => handleNodeHover(node.id)}
              onTouchEnd={() => handleNodeHover(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Outer glow ring on hover */}
              {isHovered && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 6}
                  fill="none"
                  stroke={fill}
                  strokeWidth={1}
                  strokeOpacity={0.4}
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={r * scale}
                fill={fill}
                fillOpacity={node.degree === 2 ? 0.4 : 0.8}
                stroke={fill}
                strokeWidth={node.degree === 0 ? 2 : 1}
                strokeOpacity={0.6}
              />
              {/* Initial letter on hover or for the center node */}
              {(isHovered || node.degree === 0) && (
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={node.degree === 0 ? "#1a472a" : "#fff"}
                  fontSize={node.degree === 0 ? 11 : 9}
                  fontWeight={600}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {node.label.charAt(0).toUpperCase()}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default MyceliumNetwork;
