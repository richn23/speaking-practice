"use client";

import React from "react";

type Level = {
  id: string;
  name: string;
  cefr: string;
  color: string;
  unlocked: boolean;
  route?: string;
};

type Props = {
  level: Level;
  rotation: number;
  zIndex: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  highlight?: boolean;
};

export default function LevelCard({
  level,
  rotation,
  zIndex,
  isHovered,
  onHover,
  onLeave,
  onClick,
  highlight,
}: Props) {
  const baseTransform = `rotate(${rotation}deg)`;
  const hoverTransform = "rotate(0deg) translateY(-40px) scale(1.08)";

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={level.unlocked ? onClick : undefined}
      style={{
        width: 280,
        height: 180,
        position: "absolute",
        bottom: 0,
        left: "50%",
        transform: `translateX(-50%) ${isHovered ? hoverTransform : baseTransform}`,
        transformOrigin: "center bottom",
        background: "rgba(30, 30, 35, 0.8)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderLeft: `4px solid ${level.color}`,
        borderRadius: 12,
        padding: "1.5rem",
        cursor: level.unlocked ? "pointer" : "default",
        transition: "transform 0.3s ease-out, box-shadow 0.3s ease",
        boxShadow: isHovered
          ? "0 20px 40px rgba(0,0,0,0.4)"
          : highlight
            ? "0 0 20px rgba(124, 58, 237, 0.3)"
            : "0 4px 15px rgba(0,0,0,0.35)",
        zIndex: isHovered ? 10 : zIndex,
        color: "#e5e7eb",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.85rem", padding: "0.25rem 0.6rem", borderRadius: 999, background: "#1f2937" }}>
          {level.cefr}
        </span>
        {!level.unlocked && <span style={{ fontSize: "0.9rem", color: "#cbd5e1" }}>🔒 Coming Soon</span>}
      </div>
      <div style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>{level.name}</div>
      <div style={{ fontSize: "0.95rem", color: "#cbd5e1" }}>
        {level.unlocked ? "Start" : "Locked"}
      </div>
    </div>
  );
}

