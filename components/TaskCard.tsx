"use client";

import type { Task } from "@/data/unit1";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { uploadAudio } from "@/lib/uploadAudio";
import { Check, Lock, Play, Mic, Square } from "lucide-react";
import WaveformPlayer from "@/components/WaveformPlayer";
import { useEffect, useMemo, useRef, useState } from "react";

type TaskCardProps = {
  task: Task;
  isLocked: boolean;
  isCompleted: boolean;
  onComplete?: (
    taskId: string,
    isRetry?: boolean,
    transcript?: string,
    feedback?: {
      scores?: {
        taskCompletion: number;
        elaboration: number;
        coherence: number;
        grammar: number;
        vocabulary: number;
      };
      corrections?: {
        original: string;
        corrected: string;
        explanation: string;
      }[];
      vocabularyTip?: string;
      stretchSuggestion?: string;
      strength?: string;
    }
  ) => void;
};

const typeLabels: Record<Task["taskType"], string> = {
  qa: "Q&A",
  long_talk: "Long Talk",
  image: "Image",
  this_or_that: "This or That",
  gateway: "Gateway",
};

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const getProgressColor = (
  taskType: Task["taskType"],
  elapsed: number,
  expectedMin: number
) => {
  if (taskType === "qa") {
    if (elapsed < 10) return "#dc2626";
    if (elapsed < 15) return "#f59e0b";
    return "#34d399";
  }
  const ratio = expectedMin > 0 ? elapsed / expectedMin : 0;
  if (ratio < 0.6) return "#dc2626";
  if (ratio < 1) return "#f59e0b";
  return "#34d399";
};

export default function TaskCard({
  task,
  isLocked,
  isCompleted,
  onComplete,
}: TaskCardProps) {
  const [recordingState, setRecordingState] = useState<"ready" | "starting" | "recording" | "review">("ready");
  const [isRetry, setIsRetry] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string | number | null>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [promptFading, setPromptFading] = useState(false);
  const promptFadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const promptHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const {
    isRecording,
    audioBlob,
    audioUrl,
    recordedDuration,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();
  const badgeLabel = useMemo(() => {
    if (task.taskType === "long_talk") {
      if (task.id === "longtalk-a") return "Long Talk 1";
      if (task.id === "longtalk-b") return "Long Talk 2";
      return "Long Talk";
    }
    return typeLabels[task.taskType] ?? "Task";
  }, [task.taskType, task.id]);

  useEffect(() => {
    if (!isRecording) return;
    setElapsedSeconds(0);
    const id = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  useEffect(() => {
    if (recordingState === "recording") {
      setBarWidth(0);
      requestAnimationFrame(() => setBarWidth(100));
    } else {
      setBarWidth(0);
    }
  }, [recordingState]);

  useEffect(() => {
    return () => {
      if (promptFadeTimerRef.current) clearTimeout(promptFadeTimerRef.current);
      if (promptHideTimerRef.current) clearTimeout(promptHideTimerRef.current);
    };
  }, []);

  const startPromptCycle = () => {
    if (promptFadeTimerRef.current) clearTimeout(promptFadeTimerRef.current);
    if (promptHideTimerRef.current) clearTimeout(promptHideTimerRef.current);
    setPromptExpanded(true);
    setPromptFading(false);
    promptFadeTimerRef.current = setTimeout(() => {
      setPromptFading(true);
    }, 35000);
    promptHideTimerRef.current = setTimeout(() => {
      setPromptExpanded(false);
      setPromptFading(false);
    }, 40000);
  };

  const resetPromptCycle = () => {
    if (promptFadeTimerRef.current) clearTimeout(promptFadeTimerRef.current);
    if (promptHideTimerRef.current) clearTimeout(promptHideTimerRef.current);
    setPromptExpanded(false);
    setPromptFading(false);
  };

  const startButtonLabel =
    recordingState === "starting"
      ? countdown ?? "Starting..."
      : countdown ?? "Start Recording";

  useEffect(() => {
    if (!isRecording && recordedDuration) {
      setElapsedSeconds(Math.max(0, Math.round(recordedDuration)));
    }
  }, [isRecording, recordedDuration]);

  const containerStyle: React.CSSProperties = {
    background: isLocked ? "rgba(20, 10, 30, 0.45)" : "rgba(20, 10, 30, 0.6)",
    backdropFilter: isLocked ? undefined : "blur(12px)",
    border: isLocked ? "1px solid rgba(63, 63, 70, 0.4)" : "1px solid rgba(124, 58, 237, 0.3)",
    boxShadow: isLocked ? "none" : "0 4px 20px rgba(0, 0, 0, 0.4)",
    borderRadius: 12,
    padding: "1.25rem",
    opacity: isLocked ? 0.85 : 1,
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    color: "#e9e4f0",
    position: "relative",
  };

  const promptBoxStyle: React.CSSProperties = {
    background: "rgba(124, 58, 237, 0.1)",
    borderLeft: "3px solid #7c3aed",
    padding: "0.75rem",
    borderRadius: 8,
    color: "#e9e4f0",
  };

  const itemsBoxStyle: React.CSSProperties = {
    ...promptBoxStyle,
    padding: "0.5rem 0.75rem",
  };

  const playButtonDisabled = task.hasAudio && !task.audioEnabled;

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.2rem 0.65rem",
            borderRadius: 999,
            background: "rgba(124, 58, 237, 0.15)",
            color: "#a78bfa",
            fontWeight: 600,
            fontSize: "0.85rem",
            letterSpacing: "0.02em",
          }}
        >
          {badgeLabel}
        </div>

        {isCompleted && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              color: "#34d399",
              fontWeight: 600,
              marginLeft: "auto",
            }}
          >
            <Check size={16} /> Completed
          </div>
        )}

        {isLocked && !isCompleted && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              color: "#9f8fc0",
              fontWeight: 600,
              marginLeft: "auto",
            }}
          >
            <Lock size={16} /> Locked
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          fontFamily: "var(--font-heading), 'Orbitron', system-ui, sans-serif",
          letterSpacing: "0.04em",
          color: "#e9e4f0",
          lineHeight: 1.3,
        }}
      >
        {task.title}
      </div>

      <div style={{ color: "#9f8fc0", lineHeight: 1.6 }}>{task.instructions}</div>

      {task.imageUrl && (
        <div
          style={{
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid rgba(124, 58, 237, 0.25)",
            background: "rgba(124, 58, 237, 0.05)",
          }}
        >
          <img
            src={task.imageUrl}
            alt={task.title}
            style={{ width: "100%", display: "block" }}
          />
        </div>
      )}

      {task.taskType === "long_talk" && task.prompt && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => startPromptCycle()}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: 999,
              border: "1px solid rgba(124,58,237,0.4)",
              background: "rgba(124,58,237,0.12)",
              color: "#e9e4f0",
              fontWeight: 700,
              letterSpacing: "0.02em",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            Prompt ideas
          </button>
          <div
            style={{
              padding: "0.2rem 0.65rem",
              borderRadius: 999,
              background: "rgba(52, 211, 153, 0.15)",
              border: "1px solid rgba(52, 211, 153, 0.5)",
              color: "#34d399",
              fontWeight: 700,
              fontSize: "0.85rem",
              letterSpacing: "0.02em",
            }}
          >
            {task.expectedMinSeconds}-{task.expectedMaxSeconds}s
          </div>
        </div>
      )}

      {task.taskType !== "long_talk" && task.prompt && <div style={promptBoxStyle}>{task.prompt}</div>}

      {task.items && task.items.length > 0 && (
        <div style={itemsBoxStyle}>
          <ol style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {task.items.map((item) => (
              <li key={item.id} style={{ color: "#e9e4f0" }}>
                {item.promptText}
              </li>
            ))}
          </ol>
        </div>
      )}

      {task.taskType === "long_talk" && task.prompt && promptExpanded && (
        <div
          style={{
            marginTop: "0.35rem",
            border: "1px solid rgba(124, 58, 237, 0.2)",
            borderRadius: 10,
            background: "rgba(20, 10, 30, 0.8)",
            padding: "0.75rem",
            opacity: promptFading ? 0 : 1,
            transition: promptFading ? "opacity 5s ease-out" : undefined,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <div style={{ color: "#9f8fc0", fontSize: "0.95rem" }}>
              Speak for {task.expectedMinSeconds}-{task.expectedMaxSeconds} seconds about your typical day.
            </div>
            <div
              style={{
                padding: "0.2rem 0.6rem",
                borderRadius: 999,
                background: "rgba(167, 139, 250, 0.15)",
                border: "1px solid rgba(167, 139, 250, 0.5)",
                color: "#a78bfa",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              {task.expectedMinSeconds}-{task.expectedMaxSeconds}s
            </div>
          </div>
          <div style={{ color: "#e9e4f0", fontWeight: 700, marginBottom: "0.35rem" }}>Prompt ideas</div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
              lineHeight: 1.6,
            }}
          >
            {task.prompt
              .split("\n")
              .filter((line) => line.trim().startsWith("•"))
              .slice(0, 6)
              .map((line, idx) => (
                <li key={idx} style={{ color: "#e9e4f0" }}>
                  {line.replace(/^•\s*/, "")}
                </li>
              ))}
          </ul>
          {task.prompt
            .split("\n")
            .find((line) => line.toLowerCase().startsWith("challenge")) && (
            <div style={{ color: "#9f8fc0", fontSize: "0.9rem", marginTop: "0.5rem" }}>
              {task.prompt
                .split("\n")
                .find((line) => line.toLowerCase().startsWith("challenge"))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
        {task.hasAudio && (
          <button
            type="button"
            disabled={playButtonDisabled}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              padding: "0.5rem 0.75rem",
              borderRadius: 10,
              border: "1px solid rgba(124, 58, 237, 0.4)",
              background: playButtonDisabled ? "rgba(63,63,70,0.6)" : "rgba(124, 58, 237, 0.15)",
              color: playButtonDisabled ? "#6b7280" : "#a78bfa",
              cursor: playButtonDisabled ? "not-allowed" : "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            aria-label="Play audio"
          >
            <Play size={16} />
            <span style={{ fontWeight: 600 }}>Play</span>
          </button>
        )}

        {isCompleted && recordingState === "ready" && (
          <button
            type="button"
            onClick={() => {
              setIsRetry(true);
              setRecordingState("ready");
              setElapsedSeconds(0);
              setErrorMessage(null);
              resetRecording();
              resetPromptCycle();
            }}
            style={{
              alignSelf: "flex-start",
              padding: "0.4rem 0.8rem",
              borderRadius: 999,
              border: "1px solid rgba(156, 163, 175, 0.6)",
              background: "transparent",
              color: "#e5e7eb",
              fontWeight: 600,
              letterSpacing: "0.02em",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        )}

        {!isLocked && (!isCompleted || isRetry || recordingState !== "ready") && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            {recordingState === "ready" && (
              <button
                type="button"
                onClick={async () => {
                  setErrorMessage(null);
                  try {
                    setElapsedSeconds(0);
                    setRecordingState("starting");
                    const streamPromise = navigator.mediaDevices.getUserMedia({ audio: true });
                    for (let i = 3; i >= 1; i--) {
                      setCountdown(i);
                      await new Promise((r) => setTimeout(r, 1000));
                    }
                    setCountdown("Speak!");
                    const stream = await streamPromise;
                    await new Promise((r) => setTimeout(r, 300));
                    setCountdown(null);
                    await startRecording(stream, true);
                    setRecordingState("recording");
                    setIsRetry((prev) => prev);
                  } catch (err) {
                    setRecordingState("ready");
                    setErrorMessage("Microphone access denied or unavailable.");
                    console.error(err);
                  }
                }}
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                  color: "#ffffff",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  cursor: "pointer",
                  boxShadow: "0 6px 18px rgba(124, 58, 237, 0.35)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <Mic size={16} />
              {startButtonLabel}
              </button>
            )}

            {recordingState === "recording" && (
              <>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    color: "#fca5a5",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#ef4444",
                      display: "inline-block",
                      boxShadow: "0 0 12px rgba(239, 68, 68, 0.8)",
                      animation: "pulse 1s ease-in-out infinite",
                    }}
                  />
                  Recording...
                </div>
                <button
                  type="button"
                  onClick={() => {
                    stopRecording();
                    setRecordingState("review");
                  }}
                  style={{
                    padding: "0.6rem 1rem",
                    borderRadius: 999,
                    border: "none",
                    background: "#dc2626",
                    color: "#ffffff",
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                    cursor: "pointer",
                    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.35)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Square size={16} />
                  Stop Recording
                </button>
              </>
            )}

            {recordingState === "review" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setRecordingState("ready");
                    setIsRetry(false);
                    setErrorMessage(null);
                    resetRecording();
                    setElapsedSeconds(0);
                    resetPromptCycle();
                  }}
                  style={{
                    padding: "0.55rem 0.9rem",
                    borderRadius: 999,
                    border: "1px solid rgba(156, 163, 175, 0.8)",
                    background: "transparent",
                    color: "#e9e4f0",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    cursor: "pointer",
                  }}
                >
                  Try Again
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (!audioBlob) {
                      setErrorMessage("No recording found. Please record again.");
                      return;
                    }
                    setIsSubmitting(true);
                    setErrorMessage(null);
                    try {
                      const path = await uploadAudio(audioBlob, task.id);
                      if (!path) {
                        console.warn("Upload failed; continuing without stored copy");
                      }
                    } catch (uploadErr) {
                      console.error("Upload failed; continuing without stored copy", uploadErr);
                    }

                    // Transcribe
                    setIsTranscribing(true);
                    try {
                      const formData = new FormData();
                      formData.append("audio", audioBlob, "recording.webm");
                      const response = await fetch("/api/transcribe", {
                        method: "POST",
                        body: formData,
                      });
                    const { transcript: t, error: transcribeError, message: transcribeMessage } = await response.json();
                    if (transcribeError || !t) {
                      setErrorMessage(
                        transcribeMessage ||
                          "Sorry, the audio was unclear or too short. Please try to record again.",
                      );
                      setIsSubmitting(false);
                      setIsTranscribing(false);
                      setIsGeneratingFeedback(false);
                      return;
                    }
                      setTranscript(t ?? "");

                      // Feedback
                      setIsGeneratingFeedback(true);
                      const fbResponse = await fetch("/api/feedback", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          taskId: task.id,
                          taskType: task.taskType,
                          taskTitle: task.title,
                          taskInstructions: task.instructions,
                          taskPrompt: task.prompt,
                          transcript: t,
                        }),
                      });
                      const fbJson = await fbResponse.json();
                      const feedback = fbJson.feedback;
                      if (fbJson.error || !feedback) {
                        throw new Error(fbJson.error || "Feedback failed");
                      }

                      onComplete?.(task.id, isRetry, t ?? "", feedback);
                    } catch (e) {
                      console.error("Transcription/Feedback error", e);
                      setErrorMessage("Transcription or feedback failed. Please try again.");
                    } finally {
                      setIsSubmitting(false);
                      setIsTranscribing(false);
                      setIsGeneratingFeedback(false);
                      setRecordingState("ready");
                      setIsRetry(false);
                      resetRecording();
                      setElapsedSeconds(0);
                    }
                  }}
                  style={{
                    padding: "0.6rem 1rem",
                    borderRadius: 999,
                    border: "none",
                    background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                    color: "#ffffff",
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    boxShadow: "0 6px 18px rgba(124, 58, 237, 0.35)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isGeneratingFeedback
                    ? "Generating feedback..."
                    : isTranscribing
                    ? "Transcribing..."
                    : "Submit"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {recordingState === "recording" && (
        <RecordingProgress
          elapsedSeconds={elapsedSeconds}
          taskType={task.taskType}
          expectedMinSeconds={task.expectedMinSeconds}
          expectedMaxSeconds={task.expectedMaxSeconds}
          recordingState={recordingState}
          barWidth={barWidth}
        />
      )}

      {audioUrl && audioBlob && recordingState === "review" && (
        <div
          style={{
            marginTop: "0.5rem",
          }}
        >
          <div style={{ color: "#e9e4f0", fontWeight: 600, marginBottom: "0.4rem" }}>
            Review your recording
          </div>
          <WaveformPlayer audioUrl={audioUrl} audioBlob={audioBlob} />
        </div>
      )}

      {errorMessage && (
        <div style={{ color: "#fca5a5", fontWeight: 600, marginTop: "0.35rem" }}>
          {errorMessage}
        </div>
      )}

      {isLocked && !isCompleted && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "#9f8fc0",
            fontSize: "0.95rem",
          }}
        >
          <Lock size={16} /> Complete the previous task to unlock
        </div>
      )}

      {isLocked && !isCompleted && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 12,
            background:
              "linear-gradient(to bottom, rgba(20,10,30,0.25) 0%, rgba(20,10,30,0.75) 45%, rgba(20,10,30,0.95) 100%)",
            backdropFilter: "blur(6px)",
            pointerEvents: "none",
          }}
        />
      )}

      {recordingState === "starting" && countdown && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(2px)",
            pointerEvents: "none",
            background: "rgba(0,0,0,0.45)",
            borderRadius: 12,
            zIndex: 200,
          }}
        >
          <div
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: 12,
              background: "rgba(20, 10, 30, 0.85)",
              border: "1px solid rgba(124, 58, 237, 0.4)",
              color: "#e9e4f0",
              fontWeight: 800,
              fontSize: countdown === "Speak!" ? "1.4rem" : "1.8rem",
              letterSpacing: "0.05em",
              boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
            }}
          >
            {countdown}
          </div>
        </div>
      )}
    </div>
  );
}

type RecordingProgressProps = {
  elapsedSeconds: number;
  taskType: Task["taskType"];
  expectedMinSeconds: number;
  expectedMaxSeconds: number;
  recordingState: "ready" | "recording" | "review";
  barWidth: number;
};

function RecordingProgress({
  elapsedSeconds,
  taskType,
  expectedMinSeconds,
  expectedMaxSeconds,
  recordingState,
  barWidth,
}: RecordingProgressProps) {
  const targetMin =
    taskType === "qa" ? 15 : expectedMinSeconds > 0 ? expectedMinSeconds : 1;
  const targetMax =
    taskType === "qa" ? 25 : expectedMaxSeconds > 0 ? expectedMaxSeconds : targetMin;
  const percent = Math.min(elapsedSeconds / targetMax, 1);
  const color = getProgressColor(taskType, elapsedSeconds, targetMin);

  return (
    <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div
        style={{
          position: "relative",
          flex: 1,
          height: 6,
          borderRadius: 999,
          background: "rgba(63,63,70,0.6)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            width: `${barWidth}%`,
            background: color,
            boxShadow: `0 0 10px ${color}`,
            transition: `width ${targetMax}s linear`,
          }}
        />
      </div>
      <div style={{ color: "#e9e4f0", fontWeight: 600, minWidth: 70, textAlign: "right" }}>
        {formatTime(Math.floor(elapsedSeconds))}
      </div>
    </div>
  );
}
