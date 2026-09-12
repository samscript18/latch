"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulseOffset: number;
}

interface PulseRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
      x: width * 0.5,
      y: height * 0.35,
      active: false,
    };

    const particleCount = Math.min(Math.floor((width * height) / 16000), 65);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.75,
        vy: (Math.random() - 0.5) * 0.75,
        radius: Math.random() * 2 + 1.2,
        baseAlpha: Math.random() * 0.45 + 0.35,
        pulseSpeed: Math.random() * 0.03 + 0.015,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    const shockwaves: PulseRing[] = [];
    let lastWaveTime = 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    let animTime = 0;
    let animFrameId: number;

    const render = () => {
      animTime += 0.018;
      ctx.clearRect(0, 0, width, height);

      // --- 1. Cyber Perspective Floor Grid ---
      const horizonY = height * 0.38;
      const speedOffset = (animTime * 35) % 50;
      ctx.save();

      // Horizontal perspective grid lines flowing forward
      for (let y = horizonY; y < height; y += 45) {
        const progress = (y - horizonY) / (height - horizonY);
        const dynamicY =
          horizonY + Math.pow(progress, 1.8) * (height - horizonY) + speedOffset;
        const mappedY =
          horizonY + ((dynamicY - horizonY) % (height - horizonY));
        const alpha = 0.02 + ((mappedY - horizonY) / height) * 0.12;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(78, 250, 148, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.moveTo(0, mappedY);
        ctx.lineTo(width, mappedY);
        ctx.stroke();
      }

      // Radiating perspective lines from horizon vanishing center
      const centerX = width * 0.5;
      const horizonPointY = horizonY - 40;
      for (let i = -24; i <= 24; i++) {
        const spreadX = centerX + i * 85;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(78, 250, 148, 0.035)";
        ctx.lineWidth = 1;
        ctx.moveTo(centerX, horizonPointY);
        ctx.lineTo(spreadX, height);
        ctx.stroke();
      }
      ctx.restore();

      // --- 2. Expanding Sonar Pulse Waves ---
      const now = Date.now();
      if (now - lastWaveTime > 2600) {
        shockwaves.push({
          x: width * 0.5,
          y: height * 0.3,
          radius: 20,
          maxRadius: Math.max(width, height) * 0.7,
          alpha: 0.45,
          speed: 2.5,
        });
        lastWaveTime = now;
      }

      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const wave = shockwaves[i];
        if (!wave) continue;

        wave.radius += wave.speed;
        wave.alpha = (1 - wave.radius / wave.maxRadius) * 0.45;

        if (wave.radius >= wave.maxRadius || wave.alpha <= 0) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(78, 250, 148, ${wave.alpha})`;
        ctx.lineWidth = 1.3;
        ctx.stroke();

        if (wave.radius > 50) {
          ctx.beginPath();
          ctx.arc(wave.x, wave.y, wave.radius - 28, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(52, 211, 153, ${wave.alpha * 0.45})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
        ctx.restore();
      }

      // --- 3. Constellation Proximity Lines ---
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        if (!p1) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          if (!p2) continue;
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            const lineAlpha = (1 - dist / 140) * 0.28;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(78, 250, 148, ${lineAlpha})`;
            ctx.lineWidth = 0.9;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // --- 4. Particle Physics & Mouse Gravity Lasers ---
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        if (mouse.active) {
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mDist < 180) {
            const force = (1 - mDist / 180) * 0.85;
            p.x -= (mdx / mDist) * force * 1.8;
            p.y -= (mdy / mDist) * force * 1.8;

            ctx.beginPath();
            ctx.strokeStyle = `rgba(78, 250, 148, ${(1 - mDist / 180) * 0.45})`;
            ctx.lineWidth = 1.1;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        // Particle glowing core + outer halo
        const pulse = Math.sin(animTime * p.pulseSpeed * 60 + p.pulseOffset);
        const currentAlpha = p.baseAlpha + 0.25 * pulse;
        const currentRadius = p.radius + 0.8 * pulse;

        // Outer glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(78, 250, 148, ${Math.max(0, currentAlpha * 0.22)})`;
        ctx.fill();

        // Bright nucleus
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, currentAlpha * 0.95)})`;
        ctx.fill();
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full pointer-events-none select-none"
      style={{
        maskImage:
          "linear-gradient(180deg, black 0%, black 75%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(180deg, black 0%, black 75%, transparent 100%)",
      }}
    />
  );
}
