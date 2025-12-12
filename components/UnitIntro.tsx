"use client";

import type { Unit } from "@/data/unit1";
import { Square } from "lucide-react";

type UnitIntroProps = {
  unit: Pick<Unit, "title" | "objectives" | "canDo">;
};

export default function UnitIntro({ unit }: UnitIntroProps) {
  return (
    <div
      style={{
        background: "rgba(20, 10, 30, 0.6)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(124, 58, 237, 0.3)",
        borderRadius: 12,
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          fontSize: "1.4rem",
          fontWeight: 700,
          color: "#e9e4f0",
          fontFamily: "var(--font-heading), 'Orbitron', system-ui, sans-serif",
          letterSpacing: "0.04em",
        }}
      >
        Welcome to Unit 1
      </div>
      <div style={{ color: "#9f8fc0", lineHeight: 1.6 }}>
        In this unit, you will practice:
      </div>
      <ul
        style={{
          margin: 0,
          paddingLeft: "1.1rem",
          color: "#e9e4f0",
          lineHeight: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        {unit.objectives.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <div style={{ color: "#9f8fc0", lineHeight: 1.6, marginTop: "0.4rem" }}>
        By the end, you should be able to:
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        {unit.canDo.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#e9e4f0",
            }}
          >
            <Square size={16} color="#9f8fc0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

