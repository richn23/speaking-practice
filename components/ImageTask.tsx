"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Check, AlertTriangle } from "lucide-react";
import type { Task } from "@/data/unit1";

type ImageTaskProps = {
  task: Task;
  onComplete: (
    taskId: string,
    isRetry: boolean,
    audioBlob: Blob
  ) => void;
  isRetry?: boolean;
};

type ImageTaskState =
  | "ready"      // Initial - show image and instructions
  | "countdown"  // 3-2-1 countdown
  | "recording"  // Recording in progress
  | "review";    // Recording done, can submit or retry

const MAX_RECORDING_SECONDS = 120;
const WARNING_SECONDS = 15;

export default function ImageTask({ task, onComplete, isRetry = false }: ImageTaskProps) {
  const [state, setState] = useState<ImageTaskState>("ready");
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stoppedByTimeLimit, setStoppedByTimeLimit] = useState(false);

  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

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

  // Start recording with countdown
  const handleStartRecording = async () => {
    setError(null);
    try {
      setState("countdown");
      
      // Get mic permission during countdown
      const streamPromise = navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Countdown
      for (let i = 3; i >= 1; i--) {
        setCountdown(i);
        await new Promise((r) => setTimeout(r, 1000));
      }
      setCountdown("Speak!");
      
      const stream = await streamPromise;
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

      await new Promise((r) => setTimeout(r, 300));
      setCountdown(null);
      
      mediaRecorder.start();
      setState("recording");
      setElapsedSeconds(0);
    } catch (err) {
      console.error("Microphone error:", err);
      setError("Microphone access denied or unavailable.");
      setState("ready");
      setCountdown(null);
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
    setElapsedSeconds(0);
    setAudioBlob(null);
    setCountdown(null);
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

  // Get progress bar color
  const getProgressColor = () => {
    const timeLeft = MAX_RECORDING_SECONDS - elapsedSeconds;
    
    // Warning when approaching limit
    if (timeLeft <= WARNING_SECONDS) return "#ef4444";
    if (timeLeft <= 30) return "#f59e0b";
    
    const minSeconds = task.expectedMinSeconds ?? 30;
    const ratio = minSeconds > 0 ? elapsedSeconds / minSeconds : 0;
    if (ratio < 0.6) return "#dc2626";
    if (ratio < 1) return "#f59e0b";
    return "#34d399";
  };
  
  // Check if in warning zone
  const isInWarningZone = MAX_RECORDING_SECONDS - elapsedSeconds <= WARNING_SECONDS;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "relative" }}>

      {/* Image display */}
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

      {/* Target time badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
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
          Target: {task.expectedMinSeconds ?? 30}-{task.expectedMaxSeconds ?? 60}s
        </div>
        <div style={{ color: "#9f8fc0", fontSize: "0.85rem" }}>
          Max: {Math.floor(MAX_RECORDING_SECONDS / 60)} minutes
        </div>
      </div>

      {/* Ready state */}
      {state === "ready" && (
        <button
          type="button"
          onClick={handleStartRecording}
          style={{
            alignSelf: "flex-start",
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
      )}

      {/* Recording state */}
      {state === "recording" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                color: "#fca5a5",
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

      {/* Review state */}
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

      {/* Countdown overlay */}
      {state === "countdown" && countdown && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(2px)",
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

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
