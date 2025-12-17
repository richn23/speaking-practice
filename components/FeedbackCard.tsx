"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Volume2 } from "lucide-react";

type FeedbackCardProps = {
  taskId: string;
  taskTitle: string;
  transcript?: string;
  scores?: {
    taskCompletion: number;
    elaboration: number;
    coherence: number;
    grammar: number;
    vocabulary: number;
  };
  scoreOverall?: number;
  performanceLabel?: string;
  corrections?: {
    original: string;
    corrected: string;
    explanation: string;
  }[];
  vocabularyTip?: string;
  stretchSuggestion?: string;
  strength?: string;
};

export default function FeedbackCard({
  taskId,
  taskTitle,
  transcript,
  scoreOverall,
  performanceLabel,
  scores,
  corrections,
  vocabularyTip,
  stretchSuggestion,
  strength,
}: FeedbackCardProps) {
  const [open, setOpen] = useState(true);

  const toggle = () => setOpen((v) => !v);

  return (
    <div
      style={{
        background: "rgba(30, 15, 45, 0.7)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(124, 58, 237, 0.2)",
        borderRadius: 12,
        marginTop: "0.75rem",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={toggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.9rem 1rem",
          background: "transparent",
          border: "none",
          color: "#e9e4f0",
          cursor: "pointer",
        }}
        aria-expanded={open}
        aria-controls={`feedback-${taskId}`}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
          <Check size={18} color="#34d399" />
          <span>Feedback: {taskTitle}</span>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      <div
        id={`feedback-${taskId}`}
        style={{
          maxHeight: open ? 1000 : 0,
          opacity: open ? 1 : 0,
          transition: "max-height 300ms ease, opacity 300ms ease",
        }}
      >
        <div style={{ padding: "0.75rem 1rem 1rem 1rem", color: "#e9e4f0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {typeof scoreOverall === "number" && performanceLabel && (
            <div
              style={{
                background: "rgba(124, 58, 237, 0.08)",
                borderRadius: 10,
                padding: "0.85rem",
                border: "1px solid rgba(124, 58, 237, 0.2)",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "0.35rem",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-heading), 'Orbitron', system-ui, sans-serif",
                  fontSize: "2rem",
                  color: "#a78bfa",
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                }}
              >
                {Math.round(scoreOverall)}/100
              </div>
              <div style={{ color: "#9f8fc0", fontWeight: 700 }}>{performanceLabel}</div>
            </div>
          )}

          <div
            style={{
              background: "rgba(20, 10, 30, 0.6)",
              borderRadius: 10,
              padding: "0.75rem",
              border: "1px solid rgba(124, 58, 237, 0.15)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "0.4rem", color: "#e9e4f0" }}>
              What you said:
            </div>
            <div
              style={{
                color: "#9f8fc0",
                lineHeight: 1.5,
                borderLeft: "3px solid rgba(124, 58, 237, 0.4)",
                paddingLeft: "0.6rem",
                fontStyle: "italic",
              }}
            >
              {transcript && transcript.trim().length > 0
                ? transcript
                : "Sorry, the audio was unclear or too short. Please try to record again."}
            </div>
          </div>

          {scores ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.5rem",
              }}
            >
              {[
                { label: "Task Completion", value: scores.taskCompletion },
                { label: "Elaboration", value: scores.elaboration },
                { label: "Coherence", value: scores.coherence },
                { label: "Grammar", value: scores.grammar },
                { label: "Vocabulary", value: scores.vocabulary },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "rgba(20, 10, 30, 0.6)",
                    borderRadius: 10,
                    padding: "0.65rem",
                    border: "1px solid rgba(124, 58, 237, 0.12)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem",
                  }}
                >
                  <div style={{ color: "#9f8fc0", fontSize: "0.9rem" }}>{item.label}</div>
                  <div style={{ fontWeight: 700, color: "#e9e4f0" }}>{item.value}/5</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#9f8fc0" }}>No feedback available yet.</div>
          )}

          {corrections && corrections.length > 0 && (
            <div
              style={{
                background: "rgba(20, 10, 30, 0.6)",
                borderRadius: 10,
                padding: "0.75rem",
                border: "1px solid rgba(124, 58, 237, 0.12)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "0.5rem", color: "#e9e4f0" }}>
                Corrections
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {corrections.map((c, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(124, 58, 237, 0.08)",
                      borderRadius: 8,
                      padding: "0.65rem",
                      border: "1px solid rgba(124, 58, 237, 0.1)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    <div style={{ color: "#9f8fc0", fontSize: "0.9rem" }}>
                      You said: <span style={{ color: "#9f9fb5" }}>{c.original}</span>
                    </div>
                    <div style={{ color: "#34d399", fontWeight: 700 }}>Try: {c.corrected}</div>
                    <div style={{ color: "#9f8fc0", fontSize: "0.85rem" }}>{c.explanation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vocabularyTip && (
            <div
              style={{
                background: "rgba(20, 10, 30, 0.6)",
                borderRadius: 10,
                padding: "0.75rem",
                border: "1px solid rgba(124, 58, 237, 0.12)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "#e9e4f0" }}>
                Vocabulary tip
              </div>
              <div style={{ color: "#e9e4f0", lineHeight: 1.5 }}>{vocabularyTip}</div>
            </div>
          )}

          {stretchSuggestion && (
            <div
              style={{
                background: "rgba(20, 10, 30, 0.6)",
                borderRadius: 10,
                padding: "0.75rem",
                border: "1px solid rgba(124, 58, 237, 0.12)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "#e9e4f0" }}>
                Stretch suggestion
              </div>
              <div style={{ color: "#e9e4f0", lineHeight: 1.5 }}>{stretchSuggestion}</div>
            </div>
          )}

          {strength && (
            <div
              style={{
                background: "rgba(20, 10, 30, 0.6)",
                borderRadius: 10,
                padding: "0.75rem",
                border: "1px solid rgba(124, 58, 237, 0.12)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "#e9e4f0" }}>
                Strength
              </div>
              <div style={{ color: "#34d399", lineHeight: 1.5 }}>{strength}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

