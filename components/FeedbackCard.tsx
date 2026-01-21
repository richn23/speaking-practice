"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import type { SkillType, FunctionType } from "@/lib/scoring-types";

// Skill display names and colors
const skillDisplay: Record<SkillType, { label: string; color: string }> = {
  range: { label: "Range", color: "#8b5cf6" },        // Purple
  accuracy: { label: "Accuracy", color: "#3b82f6" },  // Blue
  fluency: { label: "Fluency", color: "#10b981" },    // Green
  coherence: { label: "Coherence", color: "#f59e0b" }, // Amber
  interaction: { label: "Interaction", color: "#ec4899" }, // Pink
};

// Function display names
const functionDisplay: Record<FunctionType, { label: string; icon: string }> = {
  describing: { label: "Describing", icon: "🖼️" },
  narrating: { label: "Narrating", icon: "📖" },
  informing: { label: "Informing", icon: "💬" },
  mediating: { label: "Mediating", icon: "🔄" },
  opinion: { label: "Opinion", icon: "💭" },
};

interface FeedbackCardProps {
  taskType: string;
  taskTitle: string;
  function: FunctionType;
  secondaryFunction?: FunctionType;
  skills: Record<string, number>;
  overall: number;
  transcript: string;
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  strengths: string[];
  improvements: string[];
  feedback: string;
  onChatOpen?: () => void;
}

export default function FeedbackCard({
  taskType,
  taskTitle,
  function: primaryFunction,
  secondaryFunction,
  skills,
  overall,
  transcript,
  corrections,
  strengths,
  improvements,
  feedback,
  onChatOpen,
}: FeedbackCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Get score color
  const getScoreColor = (score: number, max: number = 5) => {
    const pct = score / max;
    if (pct >= 0.8) return "#22c55e"; // Green
    if (pct >= 0.6) return "#eab308"; // Yellow
    if (pct >= 0.4) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  // Score bar component
  const SkillBar = ({ skill, score }: { skill: string; score: number }) => {
    const display = skillDisplay[skill as SkillType] || { label: skill, color: "#9ca3af" };
    return (
      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <span style={{ color: "#d1d5db", fontSize: "0.875rem" }}>{display.label}</span>
          <span style={{ color: getScoreColor(score), fontWeight: 600 }}>{score}/5</span>
        </div>
        <div style={{ 
          height: "8px", 
          background: "rgba(255,255,255,0.1)", 
          borderRadius: "4px",
          overflow: "hidden"
        }}>
          <div style={{
            height: "100%",
            width: `${(score / 5) * 100}%`,
            background: display.color,
            borderRadius: "4px",
            transition: "width 0.5s ease"
          }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(30, 20, 50, 0.95), rgba(20, 15, 35, 0.98))",
      borderRadius: "16px",
      padding: "1.5rem",
      border: "1px solid rgba(139, 92, 246, 0.3)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    }}>
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: "#e9e4f0", fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>
            {taskTitle}
          </h3>
          <div style={{
            background: `linear-gradient(135deg, ${getScoreColor(overall, 100)}, ${getScoreColor(overall, 100)}88)`,
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            fontWeight: 800,
            color: "#fff",
            fontSize: "1.1rem",
          }}>
            {overall}%
          </div>
        </div>
        
        {/* Function badges */}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <span style={{
            background: "rgba(139, 92, 246, 0.2)",
            border: "1px solid rgba(139, 92, 246, 0.4)",
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            fontSize: "0.75rem",
            color: "#c4b5fd",
          }}>
            {functionDisplay[primaryFunction]?.icon} {functionDisplay[primaryFunction]?.label}
          </span>
          {secondaryFunction && (
            <span style={{
              background: "rgba(59, 130, 246, 0.2)",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              color: "#93c5fd",
            }}>
              {functionDisplay[secondaryFunction]?.icon} {functionDisplay[secondaryFunction]?.label}
            </span>
          )}
        </div>
      </div>

      {/* Skill Scores */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h4 style={{ color: "#a78bfa", fontSize: "0.875rem", marginBottom: "0.75rem", fontWeight: 600 }}>
          Skill Breakdown
        </h4>
        {Object.entries(skills).map(([skill, score]) => (
          <SkillBar key={skill} skill={skill} score={score as number} />
        ))}
      </div>

      {/* Feedback Summary */}
      <div style={{
        background: "rgba(139, 92, 246, 0.1)",
        borderRadius: "12px",
        padding: "1rem",
        marginBottom: "1rem",
        border: "1px solid rgba(139, 92, 246, 0.2)",
      }}>
        <p style={{ color: "#e9e4f0", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
          {feedback}
        </p>
      </div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h4 style={{ color: "#22c55e", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            ✓ Strengths
          </h4>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#d1d5db" }}>
            {strengths.map((s, i) => (
              <li key={i} style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas to improve */}
      {improvements.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h4 style={{ color: "#f59e0b", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            ↑ Areas to Improve
          </h4>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#d1d5db" }}>
            {improvements.map((s, i) => (
              <li key={i} style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expandable: Corrections */}
      {corrections.length > 0 && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "#d1d5db",
            cursor: "pointer",
            marginBottom: "0.75rem",
          }}
        >
          <span>Language Corrections ({corrections.length})</span>
          {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      )}
      
      {showDetails && corrections.length > 0 && (
        <div style={{ 
          background: "rgba(239, 68, 68, 0.1)", 
          borderRadius: "8px", 
          padding: "1rem",
          marginBottom: "0.75rem",
          border: "1px solid rgba(239, 68, 68, 0.2)",
        }}>
          {corrections.map((c, i) => (
            <div key={i} style={{ marginBottom: i < corrections.length - 1 ? "0.75rem" : 0 }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: "#fca5a5", textDecoration: "line-through" }}>"{c.original}"</span>
                <span style={{ color: "#9ca3af" }}>→</span>
                <span style={{ color: "#86efac" }}>"{c.corrected}"</span>
              </div>
              <p style={{ color: "#9ca3af", fontSize: "0.8rem", margin: "0.25rem 0 0 0" }}>
                {c.explanation}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Expandable: Transcript */}
      <button
        onClick={() => setShowTranscript(!showTranscript)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px",
          color: "#d1d5db",
          cursor: "pointer",
          marginBottom: "0.75rem",
        }}
      >
        <span>What you said</span>
        {showTranscript ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {showTranscript && (
        <div style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "0.75rem",
        }}>
          <p style={{ color: "#d1d5db", fontSize: "0.875rem", fontStyle: "italic", margin: 0, lineHeight: 1.6 }}>
            "{transcript}"
          </p>
        </div>
      )}

      {/* Chat button */}
      {onChatOpen && (
        <button
          onClick={onChatOpen}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.75rem",
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3))",
            border: "1px solid rgba(139, 92, 246, 0.4)",
            borderRadius: "8px",
            color: "#e9e4f0",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <MessageCircle size={18} />
          Questions about your feedback? Ask me!
        </button>
      )}
    </div>
  );
}
