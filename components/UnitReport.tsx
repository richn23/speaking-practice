"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import type { FunctionType, SkillType } from "@/lib/scoring-types";

// Display config
const functionDisplay: Record<FunctionType, { label: string; icon: string; color: string }> = {
  describing: { label: "Describing", icon: "🖼️", color: "#8b5cf6" },
  narrating: { label: "Narrating", icon: "📖", color: "#3b82f6" },
  informing: { label: "Informing", icon: "💬", color: "#10b981" },
  mediating: { label: "Mediating", icon: "🔄", color: "#f59e0b" },
  opinion: { label: "Opinion", icon: "💭", color: "#ec4899" },
};

const skillDisplay: Record<SkillType, { label: string; color: string }> = {
  range: { label: "Range", color: "#8b5cf6" },
  accuracy: { label: "Accuracy", color: "#3b82f6" },
  fluency: { label: "Fluency", color: "#10b981" },
  coherence: { label: "Coherence", color: "#f59e0b" },
  interaction: { label: "Interaction", color: "#ec4899" },
};

// Skill improvement suggestions
const skillImprovements: Record<SkillType, string> = {
  range: "Try using more varied vocabulary for each topic",
  accuracy: "Review verb tenses and sentence structure",
  fluency: "Practice speaking without long pauses",
  coherence: "Use more linking words (first, then, because, however)",
  interaction: "Focus on answering all parts of questions fully",
};

interface TaskScore {
  taskId: string;
  taskType: string;
  function: FunctionType;
  secondaryFunction?: FunctionType;
  skills: Partial<Record<SkillType, number>>;
  overall: number;
  transcript: string;
  corrections: Array<{ original: string; corrected: string; explanation: string }>;
  strengths: string[];
  improvements: string[];
}

interface UnitReportProps {
  unitTitle: string;
  level: string;
  tasks: TaskScore[];
  onTaskClick?: (taskId: string) => void;
  onChatOpen?: () => void;
}

export default function UnitReport({ unitTitle, level, tasks, onTaskClick, onChatOpen }: UnitReportProps) {
  const [showTaskBreakdown, setShowTaskBreakdown] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Calculate aggregated function scores
  const functionScores = useMemo(() => {
    return tasks.reduce((acc, task) => {
      // Primary function
      if (!acc[task.function]) {
        acc[task.function] = { total: 0, count: 0 };
      }
      acc[task.function].total += task.overall;
      acc[task.function].count += 1;

      // Secondary function (if exists)
      if (task.secondaryFunction) {
        if (!acc[task.secondaryFunction]) {
          acc[task.secondaryFunction] = { total: 0, count: 0 };
        }
        acc[task.secondaryFunction].total += task.overall;
        acc[task.secondaryFunction].count += 1;
      }

      return acc;
    }, {} as Record<FunctionType, { total: number; count: number }>);
  }, [tasks]);

  // Calculate aggregated skill scores
  const skillScores = useMemo(() => {
    return tasks.reduce((acc, task) => {
      Object.entries(task.skills).forEach(([skill, score]) => {
        if (score !== undefined) {
          if (!acc[skill as SkillType]) {
            acc[skill as SkillType] = { total: 0, count: 0 };
          }
          acc[skill as SkillType].total += score;
          acc[skill as SkillType].count += 1;
        }
      });
      return acc;
    }, {} as Record<SkillType, { total: number; count: number }>);
  }, [tasks]);

  // Overall score
  const overallScore = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round(tasks.reduce((sum, t) => sum + t.overall, 0) / tasks.length);
  }, [tasks]);

  // CEFR estimate
  const getCefrEstimate = (score: number): { label: string; sublabel: string } => {
    if (score >= 85) return { label: "Strong A2+", sublabel: "Ready for B1!" };
    if (score >= 70) return { label: "Solid A2+", sublabel: "Good progress" };
    if (score >= 55) return { label: "Developing A2", sublabel: "Keep practicing" };
    if (score >= 40) return { label: "A2 emerging", sublabel: "Building foundations" };
    return { label: "Below A2", sublabel: "More practice needed" };
  };

  const performance = getCefrEstimate(overallScore);

  // Aggregate strengths from all tasks
  const aggregatedStrengths = useMemo(() => {
    const allStrengths = tasks.flatMap(t => t.strengths || []);
    // Deduplicate and take top 3
    return [...new Set(allStrengths)].slice(0, 3);
  }, [tasks]);

  // Find areas to improve (lowest 2 skills below 3.5)
  const areasToImprove = useMemo(() => {
    const skillAverages = Object.entries(skillScores)
      .map(([skill, data]) => ({
        skill: skill as SkillType,
        avg: data.total / data.count,
      }))
      .sort((a, b) => a.avg - b.avg);

    return skillAverages
      .filter(s => s.avg < 3.5)
      .slice(0, 2)
      .map(s => skillImprovements[s.skill]);
  }, [skillScores]);

  const getScoreColor = (score: number, max: number = 100) => {
    const pct = score / max;
    if (pct >= 0.7) return "#22c55e";
    if (pct >= 0.5) return "#eab308";
    if (pct >= 0.3) return "#f97316";
    return "#ef4444";
  };

  // Score circle component
  const ScoreCircle = ({ score, label, color }: { score: number; label: string; color: string }) => (
    <div style={{ textAlign: "center", minWidth: "70px" }}>
      <div style={{
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        background: `conic-gradient(${color} ${score}%, rgba(255,255,255,0.1) ${score}%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 0.5rem",
      }}>
        <div style={{
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: "rgba(20, 15, 35, 0.95)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          color: color,
          fontSize: "0.9rem",
        }}>
          {score}
        </div>
      </div>
      <span style={{ color: "#9ca3af", fontSize: "0.7rem" }}>{label}</span>
    </div>
  );

  return (
    <div style={{
      background: "rgba(20, 10, 30, 0.8)",
      backdropFilter: "blur(12px)",
      borderRadius: "16px",
      padding: "1.5rem",
      border: "1px solid rgba(139, 92, 246, 0.3)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      marginTop: "1rem",
    }}>
      {/* Celebration Header */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎉</div>
        <h2 style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "#e9e4f0",
          fontFamily: "var(--font-heading), 'Orbitron', system-ui, sans-serif",
          marginBottom: "0.25rem",
          margin: 0,
        }}>
          Unit Complete!
        </h2>
        <div style={{ color: "#a78bfa", fontSize: "1rem" }}>{unitTitle}</div>
      </div>

      {/* Overall Score Box */}
      <div style={{
        background: "rgba(124, 58, 237, 0.15)",
        border: "1px solid rgba(124, 58, 237, 0.3)",
        borderRadius: 12,
        padding: "1.25rem",
        textAlign: "center",
        marginBottom: "1.25rem",
      }}>
        <div style={{ color: "#9f8fc0", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
          Overall Score
        </div>
        <div style={{
          fontSize: "3rem",
          fontWeight: 800,
          color: getScoreColor(overallScore),
          fontFamily: "var(--font-heading), 'Orbitron', monospace",
          lineHeight: 1,
        }}>
          {overallScore}
        </div>
        
        {/* Progress bar */}
        <div style={{
          height: 10,
          background: "rgba(124, 58, 237, 0.2)",
          borderRadius: 5,
          margin: "1rem auto",
          maxWidth: 250,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${overallScore}%`,
            background: overallScore >= 70 
              ? "linear-gradient(90deg, #a78bfa, #34d399)" 
              : "linear-gradient(90deg, #a78bfa, #fbbf24)",
            borderRadius: 5,
            transition: "width 1s ease",
          }} />
        </div>
        
        <div style={{ color: "#e9e4f0", fontWeight: 600, fontSize: "1.1rem" }}>
          {performance.label}
        </div>
        <div style={{ color: "#9f8fc0", fontSize: "0.85rem" }}>
          {performance.sublabel}
        </div>
      </div>

      {/* Function Scores */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ color: "#a78bfa", fontSize: "0.9rem", marginBottom: "1rem", fontWeight: 600, textAlign: "center" }}>
          Functions
        </h3>
        <div style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          gap: "0.75rem", 
          justifyContent: "center" 
        }}>
          {(Object.keys(functionDisplay) as FunctionType[]).map((func) => {
            const data = functionScores[func];
            const score = data ? Math.round(data.total / data.count) : 0;
            const display = functionDisplay[func];
            return (
              <ScoreCircle
                key={func}
                score={score}
                label={display.label}
                color={data ? display.color : "rgba(255,255,255,0.2)"}
              />
            );
          })}
        </div>
      </div>

      {/* Skill Scores */}
      <div style={{
        background: "rgba(20, 10, 30, 0.6)",
        border: "1px solid rgba(124, 58, 237, 0.2)",
        borderRadius: 12,
        padding: "1rem",
        marginBottom: "1.25rem",
      }}>
        <h3 style={{ color: "#a78bfa", fontSize: "0.9rem", marginBottom: "1rem", fontWeight: 600, textAlign: "center" }}>
          Skills
        </h3>
        {(Object.keys(skillDisplay) as SkillType[]).map((skill) => {
          const data = skillScores[skill];
          if (!data) return null;
          const avg = data.total / data.count;
          const display = skillDisplay[skill];
          return (
            <div key={skill} style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ color: "#d1d5db", fontSize: "0.875rem" }}>{display.label}</span>
                <span style={{ color: display.color, fontWeight: 600 }}>{avg.toFixed(1)}/5</span>
              </div>
              <div style={{
                height: "8px",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                overflow: "hidden"
              }}>
                <div style={{
                  height: "100%",
                  width: `${(avg / 5) * 100}%`,
                  background: display.color,
                  borderRadius: "4px",
                  transition: "width 0.5s ease"
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Strengths */}
      {aggregatedStrengths.length > 0 && (
        <div style={{
          background: "rgba(52, 211, 153, 0.08)",
          border: "1px solid rgba(52, 211, 153, 0.2)",
          borderRadius: 12,
          padding: "1rem",
          marginBottom: "1rem",
        }}>
          <div style={{ color: "#34d399", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.6rem" }}>
            ✓ Strengths
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#e9e4f0", lineHeight: 1.6 }}>
            {aggregatedStrengths.map((strength, i) => (
              <li key={i} style={{ marginBottom: "0.3rem" }}>{strength}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas to Improve */}
      {areasToImprove.length > 0 && (
        <div style={{
          background: "rgba(251, 191, 36, 0.08)",
          border: "1px solid rgba(251, 191, 36, 0.2)",
          borderRadius: 12,
          padding: "1rem",
          marginBottom: "1rem",
        }}>
          <div style={{ color: "#fbbf24", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.6rem" }}>
            ↑ Areas to Improve
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#e9e4f0", lineHeight: 1.6 }}>
            {areasToImprove.map((area, i) => (
              <li key={i} style={{ marginBottom: "0.3rem" }}>{area}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Task Breakdown (collapsible) */}
      <button
        onClick={() => setShowTaskBreakdown(!showTaskBreakdown)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.85rem 1rem",
          background: "rgba(139, 92, 246, 0.1)",
          border: "1px solid rgba(139, 92, 246, 0.2)",
          borderRadius: "10px",
          color: "#a78bfa",
          cursor: "pointer",
          fontWeight: 600,
          marginBottom: showTaskBreakdown ? "0.75rem" : "1rem",
        }}
      >
        <span>Task Breakdown</span>
        {showTaskBreakdown ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {showTaskBreakdown && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          {tasks.map((task, i) => (
            <div
              key={task.taskId}
              onClick={() => onTaskClick?.(task.taskId)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem 1rem",
                background: "rgba(20, 10, 30, 0.6)",
                borderRadius: "8px",
                cursor: onTaskClick ? "pointer" : "default",
                border: "1px solid rgba(124, 58, 237, 0.15)",
              }}
            >
              <div>
                <span style={{ color: "#e9e4f0", fontSize: "0.9rem" }}>
                  Task {i + 1}: {task.taskType.replace("_", " ")}
                </span>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <span style={{
                    fontSize: "0.7rem",
                    color: functionDisplay[task.function]?.color || "#9ca3af",
                  }}>
                    {functionDisplay[task.function]?.icon} {functionDisplay[task.function]?.label}
                  </span>
                </div>
              </div>
              <span style={{
                color: getScoreColor(task.overall),
                fontWeight: 700,
                fontSize: "1rem",
              }}>
                {task.overall}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chat Button */}
      <button
        onClick={() => onChatOpen ? onChatOpen() : setShowChat(!showChat)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "0.85rem 1rem",
          background: "rgba(124, 58, 237, 0.2)",
          border: "1px solid rgba(124, 58, 237, 0.3)",
          borderRadius: "10px",
          color: "#c4b5fd",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        <MessageCircle size={18} />
        Questions about your feedback? Ask me!
      </button>

      {/* Placeholder chat (if no onChatOpen provided) */}
      {showChat && !onChatOpen && (
        <div style={{
          marginTop: "1rem",
          padding: "1rem",
          background: "rgba(124, 58, 237, 0.1)",
          border: "1px solid rgba(124, 58, 237, 0.2)",
          borderRadius: 10,
          color: "#9f8fc0",
          textAlign: "center",
        }}>
          Chat feature coming soon! For now, use the chat button on individual tasks.
        </div>
      )}
    </div>
  );
}
