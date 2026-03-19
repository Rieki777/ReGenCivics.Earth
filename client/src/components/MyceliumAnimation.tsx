/**
 * MyceliumAnimation Component
 * Animated mycelium network background for the Co-Govern section
 */

import { useEffect, useRef } from 'react';
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number[];
  pulsePhase: number;
  size: number;
}

export default function MyceliumAnimation() {
  const skipAnim = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const nodesRef = useRef<Node[]>([]);

  useEffect(() => {
    if (skipAnim) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize nodes
    const nodeCount = 60;
    const nodes: Node[] = [];
    
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        connections: [],
        pulsePhase: Math.random() * Math.PI * 2,
        size: Math.random() * 2 + 1,
      });
    }

    // Create connections based on proximity
    const maxDistance = 120;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < maxDistance && nodes[i].connections.length < 4) {
          nodes[i].connections.push(j);
        }
      }
    }

    nodesRef.current = nodes;

    let time = 0;

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      time += 0.02;

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Gentle movement
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.offsetWidth) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.offsetHeight) node.vy *= -1;

        // Keep in bounds
        node.x = Math.max(0, Math.min(canvas.offsetWidth, node.x));
        node.y = Math.max(0, Math.min(canvas.offsetHeight, node.y));

        // Draw connections with pulse effect
        node.connections.forEach((j) => {
          const other = nodes[j];
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Pulse traveling along the connection
          const pulsePosition = (Math.sin(time * 2 + node.pulsePhase) + 1) / 2;
          const pulseX = node.x + dx * pulsePosition;
          const pulseY = node.y + dy * pulsePosition;

          // Draw connection line
          const alpha = Math.max(0, 1 - distance / maxDistance) * 0.4;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(125, 216, 125, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();

          // Draw pulse
          const pulseAlpha = Math.sin(time * 3 + node.pulsePhase) * 0.3 + 0.3;
          ctx.beginPath();
          ctx.fillStyle = `rgba(125, 216, 125, ${pulseAlpha})`;
          ctx.arc(pulseX, pulseY, 2, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw node with glow
        const glowIntensity = Math.sin(time * 2 + node.pulsePhase) * 0.3 + 0.7;
        
        // Outer glow
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.size * 4
        );
        gradient.addColorStop(0, `rgba(125, 216, 125, ${glowIntensity * 0.5})`);
        gradient.addColorStop(1, 'rgba(125, 216, 125, 0)');
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(node.x, node.y, node.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core node
        ctx.beginPath();
        ctx.fillStyle = `rgba(125, 216, 125, ${glowIntensity})`;
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (skipAnim) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}
