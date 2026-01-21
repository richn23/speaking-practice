"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Mic, Square, Check, Clock, AlertTriangle } from "lucide-react";
import type { Task } from "@/data/unit1";

type LongTalkTaskProps = {
  task: Task;
  onComplete: (
    taskId: string,
    isRetry: boolean,
    audioBlob: Blob
  ) => void;
  isRetry?: boolean;
};

type LongTalkState =
  | "ready"        // Initial - show instructions, prompt card clickable
  | "preparing"    // Prompt visible, countdown running
  | "recording"    // Recording in progress
  | "review";      // Recording done, can submit or retry

const PREP_TIME_SECONDS = 30;
const MAX_RECORDING_SECONDS = 120;
const WARNING_SECONDS = 15; // Warning when this many seconds left

export default function LongTalkTask({ task, onComplete, isRetry = false }: LongTalkTaskProps) {
  const [state, setState] = useState<LongTalkState>("ready");
  const [prepTimeLeft, setPrepTimeLeft] = useState(PREP_TIME_SECONDS);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [promptFading, setPromptFading] = useState(false);
  const [stoppedByTimeLimit, setStoppedByTimeLimit] = useState(false);

  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Prep time countdown
  useEffect(() => {
    if (state !== "preparing") return;
    if (prepTimeLeft <= 0) {
      // Prep time finished - fade prompt
      setPromptFading(true);
      return;
    }
    const id = setInterval(() => {
      setPrepTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [state, prepTimeLeft]);

  // Recording timer with auto-stop
  useEffect(() => {
    if (state !== "recording") return;
    
    // Auto-stop at max time
    if (elapsedSeconds >= MAX_RECORDING_SECONDS) {
      setStoppedByTimeLimit(true);
      handleStopRecording();
      return;
    }
    
    const id = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [state, elapsedSeconds]);

  // Parse prompt bullets
  const promptBullets = task.prompt
    ?.split("\n")
    .filter((line) => line.trim().startsWith("•"))
    .map((line) => line.replace(/^•\s*/, ""))
    .slice(0, 6) || [];

  const challengeLine = task.prompt
    ?.split("\n")
    .find((line) => line.toLowerCase().startsWith("challenge"));

  // Start preparation phase
  const handleStartPrep = () => {
    setState("preparing");
    setPrepTimeLeft(PREP_TIME_SECONDS);
    setPromptFading(false);
  };

  // Start recording
  const handleStartRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      setState("recording");
      setElapsedSeconds(0);
    } catch (err) {
      console.error("Microphone error:", err);
      setError("Microphone access denied or unavailable.");
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setState("review");
  };

  // Submit
  const handleSubmit = () => {
    if (audioBlob) {
      onComplete(task.id, isRetry, audioBlob);
    }
  };

  // Reset
  const handleReset = () => {
    setState("ready");
    setPrepTimeLeft(PREP_TIME_SECONDS);
    setElapsedSeconds(0);
    setAudioBlob(null);
    setPromptFading(false);
    setStoppedByTimeLimit(false);
    chunksRef.current = [];
    setError(null);
  };

  // Format time
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Get progress bar color based on elapsed time and limit
  const getProgressColor = () => {
    const timeLeft = MAX_RECORDING_SECONDS - elapsedSeconds;
    
    // Warning when approaching limit
    if (timeLeft <= WARNING_SECONDS) return "#ef4444"; // Red
    if (timeLeft <= 30) return "#f59e0b"; // Amber
    
    // Normal progress based on target time
    const ratio = task.expectedMinSeconds > 0 ? elapsedSeconds / task.expectedMinSeconds : 0;
    if (ratio < 0.6) return "#dc2626";
    if (ratio < 1) return "#f59e0b";
    return "#34d399";
  };
  
  // Check if in warning zone
  const isInWarningZone = MAX_RECORDING_SECONDS - elapsedSeconds <= WARNING_SECONDS;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      
      {/* Ready state - show prompt card to click */}
      {state === "ready" && (
        <>
          <div style={{ color: "#9f8fc0", fontSize: "0.95rem" }}>
            Click the prompt card below to start your {PREP_TIME_SECONDS}-second preparation time.
            <br />
            <span style={{ fontSize: "0.85rem" }}>
              Maximum recording time: {Math.floor(MAX_RECORDING_SECONDS / 60)} minutes.
            </span>
          </div>
          
          <button
            type="button"
            onClick={handleStartPrep}
            style={{
              background: "rgba(124, 58, 237, 0.1)",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              borderLeft: "3px solid #7c3aed",
              padding: "1rem",
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              marginBottom: "0.5rem" 
            }}>
              <div style={{ color: "#a78bfa", fontWeight: 600 }}>
                Prompt Ideas
              </div>
              <div
                style={{
                  padding: "0.2rem 0.65rem",
                  borderRadius: 999,
                  background: "rgba(52, 211, 153, 0.15)",
                  border: "1px solid rgba(52, 211, 153, 0.5)",
                  color: "#34d399",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                }}
              >
                {task.expectedMinSeconds}-{task.expectedMaxSeconds}s
              </div>
            </div>
            <div style={{ color: "#9f8fc0", fontSize: "0.9rem" }}>
              Click to reveal prompt and start {PREP_TIME_SECONDS}s prep time
            </div>
          </button>
        </>
      )}

      {/* Preparing state - prompt visible with countdown */}
      {(state === "preparing" || (state === "recording" && !promptFading)) && (
        <div
          style={{
            background: "rgba(124, 58, 237, 0.1)",
            border: "1px solid rgba(124, 58, 237, 0.3)",
            borderLeft: "3px solid #7c3aed",
            padding: "1rem",
            borderRadius: 8,
            opacity: promptFading ? 0 : 1,
            transition: promptFading ? "opacity 2s ease-out" : undefined,
          }}
        >
          {/* Header with timer */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            marginBottom: "0.75rem" 
          }}>
            <div style={{ color: "#a78bfa", fontWeight: 600 }}>
              Prompt Ideas
            </div>
            
            {state === "preparing" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.25rem 0.65rem",
                  borderRadius: 999,
                  background: prepTimeLeft <= 10 
                    ? "rgba(239, 68, 68, 0.2)" 
                    : "rgba(124, 58, 237, 0.2)",
                  border: prepTimeLeft <= 10 
                    ? "1px solid rgba(239, 68, 68, 0.5)" 
                    : "1px solid rgba(124, 58, 237, 0.4)",
                  color: prepTimeLeft <= 10 ? "#fca5a5" : "#a78bfa",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                <Clock size={14} />
                {prepTimeLeft}s
              </div>
            )}
          </div>

          {/* Bullet points */}
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
            {promptBullets.map((bullet, idx) => (
              <li key={idx} style={{ color: "#e9e4f0" }}>
                {bullet}
              </li>
            ))}
          </ul>

          {/* Challenge line */}
          {challengeLine && (
            <div style={{ color: "#9f8fc0", fontSize: "0.9rem", marginTop: "0.75rem" }}>
              {challengeLine}
            </div>
          )}
        </div>
      )}

      {/* Recording controls */}
      {state === "preparing" && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={handleStartRecording}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(124, 58, 237, 0.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Mic size={18} />
            Start Recording
          </button>
          <div style={{ color: "#9f8fc0", fontSize: "0.9rem" }}>
            Ready? You can start anytime.
          </div>
        </div>
      )}

      {state === "recording" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                color: isInWarningZone ? "#fca5a5" : "#fca5a5",
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#ef4444",
                  boxShadow: "0 0 12px rgba(239, 68, 68, 0.8)",
                  animation: "pulse 1s ease-in-out infinite",
                }}
              />
              Recording... {formatTime(elapsedSeconds)}
            </div>

            <button
              type="button"
              onClick={handleStopRecording}
              style={{
                padding: "0.6rem 1rem",
                borderRadius: 999,
                border: "none",
                background: "#dc2626",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(0, 0, 0, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Square size={16} />
              Stop
            </button>
          </div>

          {/* Warning message */}
          {isInWarningZone && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.75rem",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: 8,
                color: "#fca5a5",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              <AlertTriangle size={16} />
              {MAX_RECORDING_SECONDS - elapsedSeconds} seconds remaining - wrap up soon!
            </div>
          )}

          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
                  width: `${Math.min((elapsedSeconds / MAX_RECORDING_SECONDS) * 100, 100)}%`,
                  background: getProgressColor(),
                  boxShadow: `0 0 10px ${getProgressColor()}`,
                  transition: "width 1s linear",
                }}
              />
            </div>
            <div style={{ color: "#9f8fc0", fontSize: "0.85rem", minWidth: 100, textAlign: "right" }}>
              {formatTime(elapsedSeconds)} / {formatTime(MAX_RECORDING_SECONDS)}
            </div>
          </div>
        </div>
      )}

      {state === "review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {stoppedByTimeLimit ? (
            <div style={{ color: "#f59e0b", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={18} />
              Time's up! Recording stopped at {formatTime(MAX_RECORDING_SECONDS)}
            </div>
          ) : (
            <div style={{ color: "#34d399", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Check size={18} />
              Recording complete: {formatTime(elapsedSeconds)}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: "0.55rem 0.9rem",
                borderRadius: 999,
                border: "1px solid rgba(156, 163, 175, 0.8)",
                background: "transparent",
                color: "#e9e4f0",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(124, 58, 237, 0.35)",
              }}
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: "#fca5a5", fontWeight: 600 }}>{error}</div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
