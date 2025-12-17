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
  highlight?: boolean;
  onClick: () => void;
};

export default function LevelCard({ level, highlight, onClick }: Props) {
  const isLocked = !level.unlocked;

  return (
    <div
      onClick={isLocked ? undefined : onClick}
      style={{
        background: "rgba(20, 10, 30, 0.6)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderLeft: `4px solid ${level.color}`,
        borderRadius: 12,
        padding: "1.5rem",
        color: "#e5e7eb",
        transition: "all 0.2s ease",
        boxShadow: highlight ? "0 0 20px rgba(124, 58, 237, 0.3)" : "0 4px 15px rgba(0,0,0,0.35)",
        opacity: isLocked ? 0.6 : 1,
        cursor: isLocked ? "not-allowed" : "pointer",
        transform: isLocked ? "none" : undefined,
      }}
      onMouseEnter={(e) => {
        if (isLocked) return;
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.4)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
      }}
      onMouseLeave={(e) => {
        if (isLocked) return;
        e.currentTarget.style.transform = "translateY(0px)";
        e.currentTarget.style.boxShadow = highlight ? "0 0 20px rgba(124, 58, 237, 0.3)" : "0 4px 15px rgba(0,0,0,0.35)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
        <span
          style={{
            fontSize: "0.8rem",
            padding: "0.25rem 0.6rem",
            borderRadius: 999,
            background: level.color,
            color: "#0b0b0f",
            fontWeight: 700,
          }}
        >
          {level.cefr}
        </span>
        {isLocked && <span style={{ fontSize: "0.9rem", color: "#cbd5e1" }}>🔒 Coming Soon</span>}
      </div>
      <div style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.35rem", fontFamily: "var(--font-heading, 'Orbitron')" }}>
        {level.name}
      </div>
      <div style={{ fontSize: "1rem", color: "#d1d5db" }}>{isLocked ? "Coming Soon" : "Start"}</div>
    </div>
  );
}

