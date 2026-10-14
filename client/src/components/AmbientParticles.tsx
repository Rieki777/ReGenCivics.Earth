import { useEffect, useRef } from "react";
import { isTyping, onTypingChange } from "@/lib/stillWhileTyping";

const COLORS = ["rgba(125,216,125,0.4)", "rgba(255,215,0,0.3)", "rgba(125,216,125,0.2)"];

export function AmbientParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let onScreen = true;
    const particles = Array.from({ length: 10 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.2 - 0.1,
      r: 1.5 + Math.random() * 2.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    let last = 0;
    const draw = (t: number) => {
      if (t - last < 33) { animId = requestAnimationFrame(draw); return; } // 30fps
      last = t;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    // Draw only while the canvas is on screen and nobody is typing: a canvas
    // loop asks for a frame every vsync, and each frame costs the main thread
    // that keystrokes need (STEERING.md section 13).
    const sync = () => {
      const run = onScreen && !isTyping();
      if (run && !animId) animId = requestAnimationFrame(draw);
      if (!run && animId) { cancelAnimationFrame(animId); animId = 0; }
    };
    const io = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); });
    io.observe(canvas);
    const offTyping = onTypingChange(sync);
    sync();
    return () => {
      io.disconnect();
      offTyping();
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" aria-hidden="true" />;
}
