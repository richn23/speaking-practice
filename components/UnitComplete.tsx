"use client";

import type { Unit } from "@/data/unit1";
import { CheckCircle } from "lucide-react";

type UnitCompleteProps = {
  unit: Pick<Unit, "title" | "objectives" | "canDo">;
  taskScores?: number[];
};

export default function UnitComplete({ unit, taskScores }: UnitCompleteProps) {
  const scores = taskScores && taskScores.length > 0 ? taskScores : [75];
  const average = scores.reduce((sum, v) => sum + v, 0) / (scores.length || 1);

  const practiceSummary = unit.objectives;

  const tips = [
    "Keep extending answers with one more detail or example.",
    "Practice smooth linking words for flow (first, then, after that).",
    "Review common routine verbs to stay accurate in present tense.",
  ];

  return (
    <div
      style={{
        background: "rgba(20, 10, 30, 0.65)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(124, 58, 237, 0.35)",
        borderRadius: 14,
        padding: "1.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        boxShadow: "0 6px 28px rgba(124, 58, 237, 0.25), 0 8px 30px rgba(0,0,0,0.45)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 20%, rgba(167, 139, 250, 0.12), transparent 35%), radial-gradient(circle at 80% 30%, rgba(124, 58, 237, 0.12), transparent 35%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 2fr",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#e9e4f0",
              fontFamily: "var(--font-heading), 'Orbitron', system-ui, sans-serif",
              letterSpacing: "0.04em",
            }}
          >
            Unit 1 Complete! 🎉
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                fontSize: "2.2rem",
                fontWeight: 800,
                color: "#a78bfa",
                fontFamily: "var(--font-heading), 'Orbitron', system-ui, sans-serif",
                letterSpacing: "0.03em",
              }}
            >
              {Math.round(average)}/100
            </div>
            <div style={{ color: "#9f8fc0", fontWeight: 600 }}>Overall score</div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              color: "#e9e4f0",
            }}
          >
            <div style={{ fontWeight: 700, color: "#e9e4f0" }}>What you practiced:</div>
            <ul
              style={{
                margin: 0,
                paddingLeft: "1.1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                color: "#e9e4f0",
              }}
            >
              {practiceSummary.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}
          >
            <div style={{ fontWeight: 700, color: "#e9e4f0" }}>You can now:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {unit.canDo.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    color: "#34d399",
                  }}
                >
                  <CheckCircle size={18} />
                  <span style={{ color: "#e9e4f0" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              color: "#e9e4f0",
            }}
          >
            <div style={{ fontWeight: 700, color: "#e9e4f0" }}>Things to keep practicing:</div>
            <ul
              style={{
                margin: 0,
                paddingLeft: "1.1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              {tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            disabled
            style={{
              marginTop: "0.5rem",
              alignSelf: "flex-start",
              padding: "0.65rem 1.2rem",
              borderRadius: 12,
              border: "1px solid rgba(63,63,70,0.6)",
              background: "rgba(63,63,70,0.35)",
              color: "#9f8fc0",
              cursor: "not-allowed",
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            Next: Unit 2 (Coming Soon)
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              background: "rgba(20, 10, 30, 0.5)",
              borderLeft: "4px solid #34d399",
              borderRadius: 10,
              padding: "0.9rem 1rem",
              border: "1px solid rgba(124, 58, 237, 0.18)",
              boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ color: "#34d399", fontWeight: 800, marginBottom: "0.35rem" }}>
              🌟 Best
            </div>
            <div style={{ color: "#e9e4f0", fontWeight: 700 }}>Daily Life Q&A</div>
            <div style={{ color: "#a78bfa", fontWeight: 700, marginTop: "0.15rem" }}>82/100</div>
            <div style={{ color: "#9f8fc0", marginTop: "0.35rem", lineHeight: 1.4 }}>
              Strong, clear answers with good detail and accurate tense use.
            </div>
          </div>

          <div
            style={{
              background: "rgba(20, 10, 30, 0.5)",
              borderLeft: "4px solid #f59e0b",
              borderRadius: 10,
              padding: "0.9rem 1rem",
              border: "1px solid rgba(124, 58, 237, 0.18)",
              boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ color: "#f59e0b", fontWeight: 800, marginBottom: "0.35rem" }}>
              📈 Focus area
            </div>
            <div style={{ color: "#e9e4f0", fontWeight: 700 }}>Long Talk: Weekend</div>
            <div style={{ color: "#a78bfa", fontWeight: 700, marginTop: "0.15rem" }}>68/100</div>
            <div style={{ color: "#9f8fc0", marginTop: "0.35rem", lineHeight: 1.4 }}>
              Add smoother linking phrases and one more example for richness.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



