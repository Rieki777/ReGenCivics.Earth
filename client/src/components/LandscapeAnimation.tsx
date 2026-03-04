/**
 * LandscapeAnimation - Animated canvas landscape that evolves through
 * the 5 stages of the ReGen Civics token cycle.
 *
 * Stage 0 - Capital Enters: Barren/dry land, grey sky, cracked earth
 * Stage 1 - Capital Deployed: Seedlings planted, sky lightening
 * Stage 2 - Services Flow: Young trees, first crops, community paths
 * Stage 3 - Returns Generated: Mature forest, abundant crops, solar panels
 * Stage 4 - Rewards Distributed: Thriving village, food forest, golden sunset
 */

import { useRef, useEffect, useState, useCallback } from "react";

interface Stage {
  label: string;
  icon: string;
  tokenFlow: string;
  skyTop: string;
  skyBottom: string;
  groundColor: string;
  hillColor: string;
  description: string;
}

const STAGES: Stage[] = [
  {
    label: "Capital Enters",
    icon: "💰",
    tokenFlow: "$RCivics issued to investors",
    skyTop: "#4a5568",
    skyBottom: "#718096",
    groundColor: "#8B6914",
    hillColor: "#6B5012",
    description: "Investors bring capital into the ReGen Civics Fund",
  },
  {
    label: "Capital Deployed",
    icon: "🌱",
    tokenFlow: "RCVoice issued to Land Projects",
    skyTop: "#2d5a8e",
    skyBottom: "#5a8fc7",
    groundColor: "#5a7a3a",
    hillColor: "#4a6a2a",
    description: "Capital flows to vetted Land Projects",
  },
  {
    label: "Services Flow",
    icon: "🍄",
    tokenFlow: "RCVoice issued to Alliance Orgs",
    skyTop: "#1a4a6e",
    skyBottom: "#4a8fc7",
    groundColor: "#4a7a2a",
    hillColor: "#3a6a1a",
    description: "Alliance Organizations provide services to Land Projects",
  },
  {
    label: "Returns Generated",
    icon: "📈",
    tokenFlow: "Portfolio distributions accumulate",
    skyTop: "#1a3a5e",
    skyBottom: "#e8a030",
    groundColor: "#3a6a1a",
    hillColor: "#2a5a0a",
    description: "Land and community generate abundant returns",
  },
  {
    label: "Rewards Distributed",
    icon: "🎯",
    tokenFlow: "Distributions to all $RCivics holders",
    skyTop: "#1a2a4e",
    skyBottom: "#f0c060",
    groundColor: "#2a5a0a",
    hillColor: "#1a4a00",
    description: "Returns flow back to all $RCivics holders",
  },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function lerpColor(c1: string, c2: string, t: number) {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  return `rgb(${Math.round(lerp(a.r, b.r, t))},${Math.round(lerp(a.g, b.g, t))},${Math.round(lerp(a.b, b.b, t))})`;
}

function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  topColor: string,
  bottomColor: string
) {
  const grad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h * 0.55);
}

function drawSun(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stage: number,
  t: number
) {
  // Sun rises and grows brighter across stages
  const sunX = w * 0.75;
  const sunY = lerp(h * 0.5, h * 0.12, (stage + t) / 4);
  const sunR = lerp(8, 28, (stage + t) / 4);
  const sunAlpha = lerp(0.1, 1.0, (stage + t) / 4);

  // Glow
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3);
  glow.addColorStop(0, `rgba(255,220,80,${sunAlpha * 0.6})`);
  glow.addColorStop(1, "rgba(255,220,80,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 3, 0, Math.PI * 2);
  ctx.fill();

  // Sun disc
  ctx.fillStyle = `rgba(255,230,100,${sunAlpha})`;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stage: number,
  t: number,
  time: number
) {
  // Clouds thin out as stages progress (clearing skies)
  const cloudAlpha = lerp(0.7, 0.15, (stage + t) / 4);
  const cloudPositions = [
    { x: 0.15, y: 0.08, r: 0.06 },
    { x: 0.35, y: 0.06, r: 0.05 },
    { x: 0.55, y: 0.1, r: 0.07 },
  ];
  ctx.fillStyle = `rgba(200,210,220,${cloudAlpha})`;
  cloudPositions.forEach(({ x, y, r }) => {
    const cx = (x * w + Math.sin(time * 0.3 + x * 10) * 8) % w;
    const cy = y * h;
    const rx = r * w;
    const ry = r * h * 0.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.4, cy + ry * 0.2, rx * 0.7, ry * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + rx * 0.4, cy + ry * 0.2, rx * 0.6, ry * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHills(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hillColor: string
) {
  ctx.fillStyle = hillColor;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.55);
  ctx.bezierCurveTo(w * 0.2, h * 0.35, w * 0.4, h * 0.3, w * 0.5, h * 0.4);
  ctx.bezierCurveTo(w * 0.6, h * 0.5, w * 0.75, h * 0.32, w, h * 0.45);
  ctx.lineTo(w, h * 0.55);
  ctx.closePath();
  ctx.fill();
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  groundColor: string
) {
  const grad = ctx.createLinearGradient(0, h * 0.55, 0, h);
  grad.addColorStop(0, groundColor);
  grad.addColorStop(1, "#1a2a0a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
}

function drawCracks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  alpha: number
) {
  if (alpha <= 0) return;
  ctx.strokeStyle = `rgba(80,50,10,${alpha * 0.6})`;
  ctx.lineWidth = 1;
  const cracks = [
    [0.2, 0.65, 0.25, 0.72, 0.22, 0.78],
    [0.5, 0.62, 0.55, 0.7, 0.52, 0.76],
    [0.75, 0.67, 0.8, 0.73, 0.77, 0.8],
    [0.35, 0.75, 0.38, 0.82],
    [0.65, 0.72, 0.68, 0.79],
  ];
  cracks.forEach((pts) => {
    ctx.beginPath();
    ctx.moveTo(pts[0] * w, pts[1] * h);
    for (let i = 2; i < pts.length; i += 2) {
      ctx.lineTo(pts[i] * w, pts[i + 1] * h);
    }
    ctx.stroke();
  });
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  leafColor: string,
  trunkColor: string,
  alpha: number
) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  // Trunk
  ctx.fillStyle = trunkColor;
  ctx.fillRect(x - size * 0.08, y - size * 0.4, size * 0.16, size * 0.4);
  // Canopy layers
  ctx.fillStyle = leafColor;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.5, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - size * 0.2, y - size * 0.35, size * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size * 0.2, y - size * 0.35, size * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawSeedling(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number
) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#7dd87d";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - size);
  ctx.stroke();
  // Leaves
  ctx.fillStyle = "#7dd87d";
  ctx.beginPath();
  ctx.ellipse(x - size * 0.4, y - size * 0.6, size * 0.3, size * 0.15, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + size * 0.4, y - size * 0.7, size * 0.3, size * 0.15, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawHouse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number
) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  // Walls
  ctx.fillStyle = "#d4a574";
  ctx.fillRect(x - size * 0.5, y - size * 0.6, size, size * 0.6);
  // Roof
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.moveTo(x - size * 0.6, y - size * 0.6);
  ctx.lineTo(x, y - size * 1.1);
  ctx.lineTo(x + size * 0.6, y - size * 0.6);
  ctx.closePath();
  ctx.fill();
  // Door
  ctx.fillStyle = "#5a3010";
  ctx.fillRect(x - size * 0.12, y - size * 0.35, size * 0.24, size * 0.35);
  // Window
  ctx.fillStyle = "#aad4f0";
  ctx.fillRect(x - size * 0.38, y - size * 0.5, size * 0.2, size * 0.18);
  ctx.fillRect(x + size * 0.18, y - size * 0.5, size * 0.2, size * 0.18);
  ctx.globalAlpha = 1;
}

function drawSolarPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number
) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#1a3a6e";
  ctx.fillRect(x - size * 0.4, y - size * 0.3, size * 0.8, size * 0.4);
  ctx.strokeStyle = "#4a8fc7";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x - size * 0.4, y - size * 0.3, size * 0.8, size * 0.4);
  // Grid lines
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.3);
  ctx.lineTo(x, y + size * 0.1);
  ctx.moveTo(x - size * 0.4, y - size * 0.1);
  ctx.lineTo(x + size * 0.4, y - size * 0.1);
  ctx.stroke();
  // Post
  ctx.fillStyle = "#888";
  ctx.fillRect(x - size * 0.04, y + size * 0.1, size * 0.08, size * 0.3);
  ctx.globalAlpha = 1;
}

function drawCrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
  color: string
) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  for (let i = -2; i <= 2; i++) {
    const cx = x + i * size * 0.25;
    ctx.strokeStyle = "#5a8a3a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx, y - size * 0.5);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, y - size * 0.55, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTokenCoins(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stage: number,
  t: number,
  time: number
) {
  if (stage < 4 && t < 0.8) return;
  const alpha = stage === 4 ? Math.min(1, (t - 0) * 2) : 0;
  if (alpha <= 0) return;

  const coins = [
    { x: 0.15, baseY: 0.75 },
    { x: 0.35, baseY: 0.7 },
    { x: 0.55, baseY: 0.78 },
    { x: 0.75, baseY: 0.72 },
    { x: 0.9, baseY: 0.76 },
  ];

  coins.forEach(({ x, baseY }, i) => {
    const floatY = baseY - 0.04 * Math.abs(Math.sin(time * 1.5 + i * 1.2));
    const cx = x * w;
    const cy = floatY * h;

    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c8a000";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#c8a000";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", cx, cy);
    ctx.globalAlpha = 1;
  });
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stage: number,
  t: number,
  time: number
) {
  const nextStage = Math.min(stage + 1, STAGES.length - 1);
  const curr = STAGES[stage];
  const next = STAGES[nextStage];

  // Sky
  const skyTop = lerpColor(curr.skyTop, next.skyTop, t);
  const skyBottom = lerpColor(curr.skyBottom, next.skyBottom, t);
  drawSky(ctx, w, h, skyTop, skyBottom);

  // Sun
  drawSun(ctx, w, h, stage, t);

  // Clouds
  drawClouds(ctx, w, h, stage, t, time);

  // Hills
  const hillColor = lerpColor(curr.hillColor, next.hillColor, t);
  drawHills(ctx, w, h, hillColor);

  // Ground
  const groundColor = lerpColor(curr.groundColor, next.groundColor, t);
  drawGround(ctx, w, h, groundColor);

  // Stage 0: cracks in dry earth
  drawCracks(ctx, w, h, Math.max(0, 1 - stage - t));

  // Seedlings appear at stage 1
  const seedAlpha = Math.max(0, Math.min(1, (stage + t - 0.8) * 3));
  const seedPositions = [0.1, 0.22, 0.38, 0.52, 0.68, 0.82, 0.92];
  seedPositions.forEach((sx) => {
    drawSeedling(ctx, sx * w, h * 0.58, 12, seedAlpha);
  });

  // Young trees appear at stage 2
  const youngTreeAlpha = Math.max(0, Math.min(1, (stage + t - 1.5) * 2));
  const youngTrees = [
    { x: 0.08, y: 0.62 },
    { x: 0.28, y: 0.6 },
    { x: 0.48, y: 0.63 },
    { x: 0.7, y: 0.61 },
    { x: 0.88, y: 0.62 },
  ];
  youngTrees.forEach(({ x, y }) => {
    drawTree(ctx, x * w, y * h, 28, "#4a8a2a", "#5a3a10", youngTreeAlpha);
  });

  // Crops appear at stage 2
  const cropAlpha = Math.max(0, Math.min(1, (stage + t - 1.8) * 2.5));
  drawCrop(ctx, w * 0.38, h * 0.72, 18, cropAlpha, "#ffd700");
  drawCrop(ctx, w * 0.62, h * 0.74, 18, cropAlpha, "#ff8c42");

  // Mature trees at stage 3
  const matureTreeAlpha = Math.max(0, Math.min(1, (stage + t - 2.5) * 2));
  const matureTrees = [
    { x: 0.06, y: 0.65 },
    { x: 0.18, y: 0.6 },
    { x: 0.32, y: 0.63 },
    { x: 0.78, y: 0.62 },
    { x: 0.92, y: 0.64 },
  ];
  matureTrees.forEach(({ x, y }) => {
    drawTree(ctx, x * w, y * h, 44, "#2a7a1a", "#4a2a08", matureTreeAlpha);
  });

  // Solar panels at stage 3
  const solarAlpha = Math.max(0, Math.min(1, (stage + t - 2.7) * 3));
  drawSolarPanel(ctx, w * 0.55, h * 0.68, 30, solarAlpha);
  drawSolarPanel(ctx, w * 0.65, h * 0.7, 24, solarAlpha * 0.8);

  // Houses appear at stage 3-4
  const houseAlpha = Math.max(0, Math.min(1, (stage + t - 2.8) * 2.5));
  drawHouse(ctx, w * 0.42, h * 0.72, 36, houseAlpha);
  drawHouse(ctx, w * 0.72, h * 0.73, 30, houseAlpha * 0.9);

  // Abundant crops at stage 4
  const abundantCropAlpha = Math.max(0, Math.min(1, (stage + t - 3.5) * 3));
  drawCrop(ctx, w * 0.25, h * 0.75, 22, abundantCropAlpha, "#7dd87d");
  drawCrop(ctx, w * 0.5, h * 0.77, 22, abundantCropAlpha, "#ffd700");
  drawCrop(ctx, w * 0.78, h * 0.76, 20, abundantCropAlpha, "#ff8c42");

  // Token coins at stage 4
  drawTokenCoins(ctx, w, h, stage, t, time);

  // Stage label overlay at bottom
  const stageData = STAGES[stage];
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, h - 44, w, 44);
  ctx.fillStyle = "#7dd87d";
  ctx.font = `bold ${Math.round(w * 0.035)}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`${stageData.icon} ${stageData.label}`, 12, h - 22);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `${Math.round(w * 0.025)}px sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(stageData.tokenFlow, w - 12, h - 22);
}

export default function LandscapeAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const stageRef = useRef(0);
  const tRef = useRef(0);
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const lastTimestampRef = useRef<number | null>(null);

  const [displayStage, setDisplayStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    drawScene(ctx, w, h, stageRef.current, tRef.current, timeRef.current);
  }, []);

  const animate = useCallback(
    (timestamp: number) => {
      if (!playingRef.current) return;
      if (lastTimestampRef.current === null) lastTimestampRef.current = timestamp;
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      timeRef.current += delta;
      tRef.current += delta * 0.4; // speed: each stage takes ~2.5s

      if (tRef.current >= 1) {
        tRef.current = 0;
        stageRef.current = Math.min(stageRef.current + 1, STAGES.length - 1);
        setDisplayStage(stageRef.current);
        if (stageRef.current >= STAGES.length - 1) {
          tRef.current = 1;
          playingRef.current = false;
          setIsPlaying(false);
          setIsComplete(true);
          render();
          return;
        }
      }

      render();
      animRef.current = requestAnimationFrame(animate);
    },
    [render]
  );

  const handlePlay = useCallback(() => {
    stageRef.current = 0;
    tRef.current = 0;
    timeRef.current = 0;
    lastTimestampRef.current = null;
    playingRef.current = true;
    setDisplayStage(0);
    setIsPlaying(true);
    setIsComplete(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const handleStepTo = useCallback(
    (s: number) => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      playingRef.current = false;
      setIsPlaying(false);
      stageRef.current = s;
      tRef.current = 0;
      setDisplayStage(s);
      setIsComplete(s === STAGES.length - 1);
      render();
    },
    [render]
  );

  // Initial render
  useEffect(() => {
    render();
  }, [render]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = Math.round(parent.clientWidth * 0.5);
      render();
    });
    observer.observe(canvas.parentElement!);
    // Initial size
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = Math.round(parent.clientWidth * 0.5);
      render();
    }
    return () => {
      observer.disconnect();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [render]);

  const curr = STAGES[displayStage];

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#7dd87d]/30 bg-[#0d2818]">
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ imageRendering: "pixelated" }}
        />
        {/* Play overlay when not playing and at stage 0 */}
        {!isPlaying && displayStage === 0 && !isComplete && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <button
              onClick={handlePlay}
              className="w-20 h-20 rounded-full bg-[#7dd87d] text-[#1a472a] flex items-center justify-center shadow-2xl shadow-[#7dd87d]/40 hover:bg-[#6bc76b] transition-all hover:scale-110 active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 ml-1">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Stage indicators */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
        {STAGES.map((s, i) => (
          <button
            key={i}
            onClick={() => handleStepTo(i)}
            className={`flex-1 min-w-0 flex flex-col items-center gap-1 p-2 rounded-xl transition-all border ${
              i === displayStage
                ? "bg-[#7dd87d]/20 border-[#7dd87d]/60 scale-105"
                : i < displayStage
                ? "bg-white/5 border-white/10 opacity-70"
                : "bg-white/5 border-white/5 opacity-40"
            }`}
          >
            <span className="text-lg sm:text-xl">{s.icon}</span>
            <span className="text-xs text-white/70 hidden sm:block text-center leading-tight">{s.label}</span>
            <div
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === displayStage ? "bg-[#7dd87d] scale-125" : i < displayStage ? "bg-[#7dd87d]/60" : "bg-white/20"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Description */}
      <div
        className="rounded-xl p-4 border transition-all duration-500"
        style={{ borderColor: "#7dd87d40", background: "rgba(13,40,24,0.7)" }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{curr.icon}</span>
          <div>
            <p className="font-bold text-[#7dd87d] text-sm mb-1">
              Stage {displayStage + 1}: {curr.label}
            </p>
            <p className="text-white/75 text-sm leading-relaxed">{curr.description}</p>
            <div
              className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: "#7dd87d25", color: "#7dd87d", border: "1px solid #7dd87d50" }}
            >
              <span>⟳</span> {curr.tokenFlow}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={handlePlay}
          disabled={isPlaying}
          className="px-6 py-3 bg-[#7dd87d] text-[#1a472a] rounded-xl font-bold hover:bg-[#6bc76b] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {isPlaying ? (
            <>
              <span className="w-4 h-4 border-2 border-[#1a472a] border-t-transparent rounded-full animate-spin" />
              Animating...
            </>
          ) : isComplete ? (
            "▶ Replay Full Cycle"
          ) : (
            "▶ Play Full Cycle"
          )}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => handleStepTo(Math.max(0, displayStage - 1))}
            disabled={isPlaying}
            className="px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all disabled:opacity-40"
          >
            ←
          </button>
          <button
            onClick={() => handleStepTo(Math.min(STAGES.length - 1, displayStage + 1))}
            disabled={isPlaying}
            className="px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all disabled:opacity-40"
          >
            →
          </button>
        </div>
        <span className="text-white/40 text-sm">
          {displayStage + 1} / {STAGES.length}
        </span>
      </div>
    </div>
  );
}
