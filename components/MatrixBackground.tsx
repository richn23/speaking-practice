/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef } from "react";

type Column = {
  x: number;
  headY: number;
  speed: number;
  trailLength: number;
  active: boolean;
  chars: string[];
  alphaBase: number;
};

const symbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzəʃʒθðæŋɪʊɔɑ";
const columnWidth = 15; // target spacing ~14–16px
const minSpeed = 15;
const maxSpeed = 60;
const fontSize = 14;
const minTrail = 15;
const maxTrail = 30;
const headAlpha = 1;
const minTrailAlpha = 0.3;

function getCssColor(variable: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable);
  return value?.trim() || fallback;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type MatrixBackgroundProps = {
  colorScheme?: "purple" | "grey";
  speedScale?: number;
};

export default function MatrixBackground({ colorScheme = "purple", speedScale = 1 }: MatrixBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const columnsRef = useRef<Column[]>([]);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bgColor = getCssColor("--bg-deep", "#0f0a18");
    const headColor =
      colorScheme === "grey" ? "#a0a0a0" : getCssColor("--purple-bright", "#a78bfa");
    const trailColor =
      colorScheme === "grey" ? "#707070" : getCssColor("--purple-dim", "#4c1d95");
    const trailDarkColor = colorScheme === "grey" ? "#404040" : trailColor;
    const activeRatio = colorScheme === "grey" ? { min: 0.25, max: 0.3 } : { min: 0.7, max: 0.8 };

    const initColumns = () => {
      const minSpeedScaled = minSpeed * speedScale;
      const maxSpeedScaled = maxSpeed * speedScale;

      const { innerWidth, innerHeight } = window;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      ctx.font = `${fontSize}px var(--font-mono, monospace)`;
      ctx.textBaseline = "top";

      const maxX = Math.max(0, innerWidth - 20);
      const totalColumns = Math.floor(maxX / columnWidth);
      columnsRef.current = Array.from({ length: totalColumns }).map((_, i) => ({
        x: i * columnWidth,
        headY: -Math.random() * innerHeight,
        speed: Math.random() * (maxSpeedScaled - minSpeedScaled) + minSpeedScaled,
        trailLength:
          Math.floor(Math.random() * (maxTrail - minTrail + 1)) + minTrail,
        active: Math.random() < (activeRatio.min + activeRatio.max) / 2,
        chars: [],
        alphaBase: Math.random() * 0.4 + 0.1, // 0.1–0.5 for opacity variation
      }));

      // initialize chars to match trailLength
      columnsRef.current.forEach((col) => {
        col.chars = Array.from({ length: col.trailLength }).map(
          () => symbols[Math.floor(Math.random() * symbols.length)] ?? "A",
        );
        col.alphaBase = Math.random() * 0.4 + 0.1;
      });

      lastTimeRef.current = performance.now();
    };

    const ensureActiveRatio = () => {
      const cols = columnsRef.current;
      const minTarget = Math.floor(cols.length * activeRatio.min);
      const maxTarget = Math.floor(cols.length * activeRatio.max);
      let activeCount = cols.filter((c) => c.active).length;

      if (activeCount < minTarget) {
        const inactive = cols.filter((c) => !c.active);
        const toActivate = Math.min(inactive.length, minTarget - activeCount);
        for (let i = 0; i < toActivate; i++) {
          const idx = Math.floor(Math.random() * inactive.length);
          const col = inactive[idx];
          if (!col) continue;
          col.active = true;
          col.headY = -Math.random() * window.innerHeight;
        }
      } else if (activeCount > maxTarget) {
        const activeCols = cols.filter((c) => c.active);
        const toDeactivate = Math.min(activeCols.length, activeCount - maxTarget);
        for (let i = 0; i < toDeactivate; i++) {
          const idx = Math.floor(Math.random() * activeCols.length);
          const col = activeCols[idx];
          if (!col) continue;
          col.active = false;
        }
      }
    };

    const render = (now: number) => {
      const deltaSeconds = lastTimeRef.current ? (now - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = now;
      const { innerHeight } = window;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cols = columnsRef.current;
      for (const col of cols) {
        if (!col.active) continue;

        col.headY += col.speed * deltaSeconds;
        const trailLen = col.trailLength;

        // Occasionally randomize characters in the trail
        for (let i = 0; i < trailLen; i++) {
          if (Math.random() < 0.1) {
            col.chars[i] = symbols[Math.floor(Math.random() * symbols.length)] ?? "A";
          }
        }

        for (let i = 0; i < trailLen; i++) {
          const y = col.headY - i * fontSize;
          if (y < -fontSize || y > innerHeight) continue;

          const char = col.chars[i] ?? "A";
          const baseTrailAlpha = colorScheme === "grey" ? col.alphaBase : minTrailAlpha;
          const headAlphaLocal =
            colorScheme === "grey" ? Math.min(0.8, col.alphaBase + 0.3) : headAlpha;
          let alpha =
            baseTrailAlpha + (headAlphaLocal - baseTrailAlpha) * Math.max(0, 1 - i / trailLen);

          // fade out near bottom
          if (y > innerHeight - 100) {
            const fade = Math.max(0, 1 - (y - (innerHeight - 100)) / 100);
            alpha *= fade;
          }

          if (i === 0) {
            ctx.fillStyle = hexToRgba(headColor, alpha);
          } else {
            ctx.fillStyle =
              colorScheme === "grey"
                ? hexToRgba(trailDarkColor, alpha)
                : hexToRgba(trailColor, alpha);
          }
          ctx.fillText(char, col.x, y);
        }

        if (col.headY - trailLen * fontSize > innerHeight) {
          col.headY = -Math.random() * innerHeight * 0.5;
          const minSpeedScaled = minSpeed * speedScale;
          const maxSpeedScaled = maxSpeed * speedScale;
          col.speed = Math.random() * (maxSpeedScaled - minSpeedScaled) + minSpeedScaled;
          col.trailLength =
            Math.floor(Math.random() * (maxTrail - minTrail + 1)) + minTrail;
          col.chars = Array.from({ length: col.trailLength }).map(
            () => symbols[Math.floor(Math.random() * symbols.length)] ?? "A",
          );
          col.active = Math.random() < activeRatio.max;
        }
      }

      ensureActiveRatio();
      frameRef.current = requestAnimationFrame(render);
    };

    initColumns();
    const handleResize = () => initColumns();
    window.addEventListener("resize", handleResize);
    frameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        zIndex: -1,
        background: "var(--bg-deep)",
        pointerEvents: "none",
      }}
    />
  );
}

