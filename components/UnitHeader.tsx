"use client";

import type { Unit } from "@/data/unit1";

type UnitHeaderProps = {
  unit: Pick<Unit, "level" | "title" | "description">;
  completedCount: number;
  totalCount: number;
};

export default function UnitHeader({
  unit,
  completedCount,
  totalCount,
}: UnitHeaderProps) {
  const safeTotal = Math.max(0, totalCount);
  const safeCompleted = Math.min(Math.max(0, completedCount), safeTotal);

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
        gap: "0.75rem",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          alignSelf: "flex-start",
          padding: "0.25rem 0.75rem",
          borderRadius: 999,
          background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
          color: "#ffffff",
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        {unit.level}
      </div>

      <div
        style={{
          fontSize: "2rem",
          fontWeight: 600,
          color: "#e9e4f0",
          fontFamily: "var(--font-heading), 'Orbitron', system-ui, sans-serif",
          letterSpacing: "0.05em",
          lineHeight: 1.2,
        }}
      >
        {unit.title}
      </div>

      <div
        style={{
          color: "#9f8fc0",
          lineHeight: 1.6,
        }}
      >
        {unit.description}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
          marginTop: "0.5rem",
        }}
      >
        <div
          style={{
            color: "#e9e4f0",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Task {safeCompleted} of {safeTotal}
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            width: "100%",
          }}
        >
          {Array.from({ length: safeTotal }).map((_, idx) => {
            const isDone = idx < safeCompleted;
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: "0.45rem",
                  borderRadius: 999,
                  background: isDone ? "#a78bfa" : "#3f3f46",
                  boxShadow: isDone ? "0 0 12px rgba(167, 139, 250, 0.6)" : "none",
                  transition: "background 0.2s ease, box-shadow 0.2s ease",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}





