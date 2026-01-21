"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import FeedbackChat from "./FeedbackChat";
import type { Task } from "@/data/unit1";

interface PronunciationData {
  overallScore: number;
  fluencyScore?: number;
  problemWords: Array<{ 
    word: string; 
    score: number; 
    ipa?: string; 
    problemPhonemes?: string[];
    heardAs?: string;
  }>;
}

function getPronunciationLabel(score: number): { label: string; isGood: boolean } {
  if (score >= 90) return { label: "Excellent", isGood: true };
  if (score >= 80) return { label: "Very clear", isGood: true };
  if (score >= 70) return { label: "Clear", isGood: true };
  if (score >= 60) return { label: "Mostly clear", isGood: false };
  return { label: "Needs work", isGood: false };
}

function getFluencyLabel(score: number): { label: string; isGood: boolean } {
  if (score >= 90) return { label: "Natural flow", isGood: true };
  if (score >= 80) return { label: "Good pace", isGood: true };
  if (score >= 70) return { label: "Steady", isGood: true };
  if (score >= 60) return { label: "A bit hesitant", isGood: false };
  return { label: "Work on your flow", isGood: false };
}

// Criteria configuration per task type
const taskCriteriaConfig: Record<Task["taskType"], {
  criteria: string[];
  scoreKeys: string[];
}> = {
  qa: {
    criteria: ["Task Achievement", "Elaboration", "Range", "Accuracy"],
    scoreKeys: ["taskCompletion", "elaboration", "vocabulary", "grammar"],
  },
  long_talk: {
    criteria: ["Task Achievement", "Elaboration", "Cohesion", "Range", "Accuracy"],
    scoreKeys: ["taskCompletion", "elaboration", "coherence", "vocabulary", "grammar"],
  },
  mediation: {
    criteria: ["Task Achievement", "Comprehension", "Cohesion", "Range", "Accuracy"],
    scoreKeys: ["taskCompletion", "comprehension", "coherence", "vocabulary", "grammar"],
  },
  image: {
    criteria: ["Task Achievement", "Elaboration", "Cohesion", "Range", "Accuracy"],
    scoreKeys: ["taskCompletion", "elaboration", "coherence", "vocabulary", "grammar"],
  },
  this_or_that: {
    criteria: ["Task Achievement", "Elaboration", "Fluency", "Range", "Accuracy"],
    scoreKeys: ["taskCompletion", "elaboration", "fluency", "vocabulary", "grammar"],
  },
  gateway: {
    criteria: ["Task Achievement", "Elaboration", "Cohesion", "Range", "Accuracy"],
    scoreKeys: ["taskCompletion", "elaboration", "coherence", "vocabulary", "grammar"],
  },
};

// Flexible scores type - all optional since different task types return different keys
type FeedbackScores = {
  taskCompletion?: number;
  elaboration?: number;
  coherence?: number;      // long_talk, image, gateway
  comprehension?: number;  // mediation
  fluency?: number;        // this_or_that
  grammar?: number;
  vocabulary?: number;
};

type FeedbackCardProps = {
  taskId: string;
  taskTitle: string;
  taskType: Task["taskType"];
  transcript?: string;
  scores?: FeedbackScores;
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
  pronunciationData?: PronunciationData;
};

export default function FeedbackCard({
  taskId,
  taskTitle,
  taskType,
  transcript,
  scoreOverall,
  performanceLabel,
  scores,
  corrections,
  vocabularyTip,
  stretchSuggestion,
  strength,
  pronunciationData,
}: FeedbackCardProps) {
  const [open, setOpen] = useState(true);
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  const toggle = () => setOpen((v) => !v);

  const playPronunciation = async (word: string) => {
    setPlayingWord(word);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      });
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingWord(null);
      audio.play();
    } catch (error) {
      console.error("TTS playback error:", error);
      setPlayingWord(null);
    }
  };

  // Get the criteria config for this task type
  console.log("[FeedbackCard] taskType received:", taskType);
  const config = taskCriteriaConfig[taskType] || taskCriteriaConfig.long_talk;
  console.log("[FeedbackCard] Using config:", config.criteria);

  // Build the score items to display based on task type
  const getScoreItems = () => {
    if (!scores) return [];
    
    return config.criteria.map((label, index) => {
      const key = config.scoreKeys[index] as keyof FeedbackScores;
      return {
        label,
        value: scores[key] ?? 0,
      };
    });
  };

  const scoreItems = getScoreItems();

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
          maxHeight: open ? "none" : 0,
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

          {scores && scoreItems.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.5rem",
              }}
            >
              {scoreItems.map((item) => (
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
                  <div style={{ color: "#9f8fc0", fontSize: "0.85rem" }}>{item.label}</div>
                  <div
                    style={{
                      color: "#e9e4f0",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                    }}
                  >
                    {item.value}/5
                  </div>
                </div>
              ))}
            </div>
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

          {pronunciationData && (
            <div
              style={{
                background: "rgba(20, 10, 30, 0.6)",
                borderRadius: 10,
                padding: "0.75rem",
                border: "1px solid rgba(124, 58, 237, 0.12)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "0.5rem", color: "#e9e4f0" }}>
                Pronunciation & Fluency
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: pronunciationData.problemWords.length > 0 ? "0.75rem" : 0 }}>
                {(() => {
                  const pronLabel = getPronunciationLabel(pronunciationData.overallScore);
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#9f8fc0" }}>Pronunciation:</span>
                      <span style={{ color: pronLabel.isGood ? "#34d399" : "#fbbf24", fontWeight: 600 }}>
                        {pronLabel.label} {pronLabel.isGood && "✓"}
                      </span>
                    </div>
                  );
                })()}
                {pronunciationData.fluencyScore !== undefined && (() => {
                  const fluencyLabel = getFluencyLabel(pronunciationData.fluencyScore);
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#9f8fc0" }}>Fluency:</span>
                      <span style={{ color: fluencyLabel.isGood ? "#34d399" : "#fbbf24", fontWeight: 600 }}>
                        {fluencyLabel.label} {fluencyLabel.isGood && "✓"}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {pronunciationData.problemWords.length > 0 && (
                <div
                  style={{
                    padding: "0.75rem",
                    borderRadius: 8,
                    background: "rgba(124, 58, 237, 0.1)",
                    border: "1px solid rgba(124, 58, 237, 0.15)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "#c4b5fd",
                      marginBottom: "0.5rem",
                    }}
                  >
                    We had trouble understanding these words:
                  </div>
                  <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: 0, padding: 0, listStyle: "none" }}>
                    {pronunciationData.problemWords.map((item, index) => (
                      <li
                        key={index}
                        style={{
                          background: "rgba(20, 10, 30, 0.5)",
                          borderRadius: 8,
                          padding: "0.6rem 0.75rem",
                          border: "1px solid rgba(124, 58, 237, 0.1)",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "#e9e4f0", marginBottom: "0.4rem", fontSize: "1rem" }}>
                          {item.word}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" }}>
                          {item.heardAs && (
                            <div style={{ color: "#fbbf24" }}>
                              <span style={{ color: "#9f8fc0" }}>We heard: </span>
                              <span style={{ fontFamily: "serif" }}>{item.heardAs}</span>
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#9f8fc0" }}>Target: </span>
                            {item.ipa ? (
                              <span style={{ color: "#34d399", fontFamily: "serif" }}>{item.ipa}</span>
                            ) : (
                              <span style={{ color: "#9f8fc0", fontStyle: "italic" }}>loading...</span>
                            )}
                            <button
                              onClick={() => playPronunciation(item.word)}
                              disabled={playingWord === item.word}
                              style={{
                                padding: "0.2rem 0.4rem",
                                background: playingWord === item.word ? "rgba(124, 58, 237, 0.25)" : "rgba(124, 58, 237, 0.1)",
                                border: "1px solid rgba(124, 58, 237, 0.3)",
                                borderRadius: 6,
                                cursor: playingWord === item.word ? "default" : "pointer",
                                transition: "background 150ms ease",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                              title="Hear correct pronunciation"
                            >
                              {playingWord === item.word ? (
                                <span style={{ color: "#a78bfa", fontSize: "0.75rem" }}>Playing...</span>
                              ) : (
                                <span style={{ fontSize: "0.9rem" }}>🔊</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Chat with coach */}
          {scores && transcript && (
            <FeedbackChat
              taskType={taskType}
              feedbackContext={{
                transcript: transcript || "",
                taskTitle: taskTitle,
                taskInstructions: "",
                taskPrompt: "",
                scoreOverall: scoreOverall || 0,
                performanceLabel: performanceLabel || "",
                scores: scores,
                corrections: corrections || [],
                vocabularyTip: vocabularyTip || "",
                strength: strength || "",
                pronunciationData: pronunciationData,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
