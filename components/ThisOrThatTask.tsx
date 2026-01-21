"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Check } from "lucide-react";
import type { Task } from "@/data/unit1";

type ThisOrThatTaskProps = {
  task: Task;
  onComplete: (
    taskId: string,
    isRetry: boolean,
    audioBlob: Blob
  ) => void;
  isRetry?: boolean;
};

type ThisOrThatState =
  | "ready"       // Initial - show instructions
  | "countdown"   // Countdown before showing first pair
  | "speaking"    // Pair visible, timer running, recording
  | "complete"    // All pairs done
  | "review";     // Can submit or retry

export default function ThisOrThatTask({ task, onComplete, isRetry = false }: ThisOrThatTaskProps) {
  const [state, setState] = useState<ThisOrThatState>("ready");
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [speakingTimeLeft, setSpeakingTimeLeft] = useState(0);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const items = task.items || [];
  const totalPairs = items.length;
  const currentItem = items[currentPairIndex];
  
  const countdownSeconds = 3;
const speakingSecondsPerItem = 30;

  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Speaking timer - counts down per pair
  useEffect(() => {
    if (state !== "speaking") return;
    
    if (speakingTimeLeft <= 0) {
      // Time's up for this pair, move to next
      advanceToNextPair();
      return;
    }

    const id = setInterval(() => {
      setSpeakingTimeLeft((prev) => prev - 1);
      setTotalElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(id);
  }, [state, speakingTimeLeft]);

  // Advance to next pair or finish
  const advanceToNextPair = async () => {
    if (currentPairIndex < totalPairs - 1) {
      // More pairs to go - show countdown for next
      setCurrentPairIndex((prev) => prev + 1);
      await runCountdown();
      setSpeakingTimeLeft(speakingSecondsPerItem);
      setState("speaking");
    } else {
      // All pairs done
      finishRecording();
    }
  };

  // Run the 3-2-1 countdown
  const runCountdown = async () => {
    setState("countdown");
    for (let i = countdownSeconds; i >= 1; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);
  };

  // Start the whole flow
  const handleStart = async () => {
    setError(null);
    try {
      // Get mic permission
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

      // Start recording
      mediaRecorder.start();
      setTotalElapsedSeconds(0);
      setCurrentPairIndex(0);

      // Run first countdown
      await runCountdown();

      // Start speaking phase
      setSpeakingTimeLeft(speakingSecondsPerItem);
      setState("speaking");

    } catch (err) {
      console.error("Microphone error:", err);
      setError("Microphone access denied or unavailable.");
      setState("ready");
    }
  };

  // Manual next (if they finish early)
  const handleNext = () => {
    advanceToNextPair();
  };

  // Finish recording
  const finishRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setState("complete");
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
    setCurrentPairIndex(0);
    setSpeakingTimeLeft(0);
    setTotalElapsedSeconds(0);
    setAudioBlob(null);
    setCountdown(null);
    chunksRef.current = [];
    setError(null);
  };

  // Format time
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Get timer color based on time left
  const getTimerColor = () => {
    if (speakingTimeLeft <= 5) return "#ef4444";
    if (speakingTimeLeft <= 10) return "#f59e0b";
    return "#34d399";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "relative" }}>

      {/* Progress dots */}
      {state !== "ready" && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {items.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 600,
                background:
                  idx < currentPairIndex || (state === "complete" && idx === currentPairIndex)
                    ? "#34d399"
                    : idx === currentPairIndex
                    ? "#7c3aed"
                    : "rgba(124, 58, 237, 0.2)",
                color:
                  idx < currentPairIndex || idx === currentPairIndex || state === "complete"
                    ? "#fff"
                    : "#9f8fc0",
                border:
                  idx === currentPairIndex && state !== "complete"
                    ? "2px solid #a78bfa"
                    : "1px solid rgba(124, 58, 237, 0.3)",
              }}
            >
              {idx < currentPairIndex || state === "complete" ? <Check size={14} /> : idx + 1}
            </div>
          ))}

          <div style={{ marginLeft: "auto", color: "#9f8fc0", fontSize: "0.9rem" }}>
            Total: {formatTime(totalElapsedSeconds)}
          </div>
        </div>
      )}

      {/* Ready state */}
      {state === "ready" && (
        <>
          <div
            style={{
              background: "rgba(124, 58, 237, 0.1)",
              borderLeft: "3px solid #7c3aed",
              padding: "1rem",
              borderRadius: 8,
            }}
          >
            <div style={{ color: "#e9e4f0", lineHeight: 1.6 }}>
              You'll see {totalPairs} choices. For each one, give your preference and a quick reason.
              No prep time - just speak! You have {speakingSecondsPerItem} seconds per choice.
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
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
            Start
          </button>
        </>
      )}

      {/* Speaking state - show current pair */}
      {state === "speaking" && currentItem && (
        <>
          {/* The choice card */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(124, 58, 237, 0.1))",
              border: "2px solid rgba(124, 58, 237, 0.4)",
              borderRadius: 12,
              padding: "1.5rem",
              textAlign: "center",
            }}
          >
            <div style={{ color: "#9f8fc0", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
              Choice {currentPairIndex + 1} of {totalPairs}
            </div>
            <div
              style={{
                color: "#e9e4f0",
                fontSize: "1.4rem",
                fontWeight: 700,
                fontFamily: "var(--font-heading), 'Orbitron', system-ui, sans-serif",
              }}
            >
              {currentItem.promptText}
            </div>
          </div>

          {/* Timer and controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* Countdown timer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: 999,
                background: `rgba(${speakingTimeLeft <= 5 ? "239, 68, 68" : speakingTimeLeft <= 10 ? "245, 158, 11" : "52, 211, 153"}, 0.15)`,
                border: `1px solid ${getTimerColor()}`,
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
              <span style={{ color: getTimerColor(), fontWeight: 700, fontSize: "1.1rem" }}>
                {speakingTimeLeft}s
              </span>
            </div>

            {/* Next button */}
            <button
              type="button"
              onClick={handleNext}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: 999,
                border: "none",
                background:
                  currentPairIndex < totalPairs - 1
                    ? "linear-gradient(135deg, #7c3aed, #5b21b6)"
                    : "#34d399",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(0, 0, 0, 0.25)",
              }}
            >
              {currentPairIndex < totalPairs - 1 ? "Next →" : "Finish"}
            </button>
          </div>
        </>
      )}

      {/* Complete state */}
      {state === "complete" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ color: "#34d399", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Check size={18} />
            All {totalPairs} choices completed! Total time: {formatTime(totalElapsedSeconds)}
          </div>

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
            backdropFilter: "blur(4px)",
            background: "rgba(0,0,0,0.6)",
            borderRadius: 12,
            zIndex: 200,
          }}
        >
          <div
            style={{
              padding: "1.5rem 2.5rem",
              borderRadius: 16,
              background: "rgba(20, 10, 30, 0.95)",
              border: "2px solid rgba(124, 58, 237, 0.5)",
              color: "#e9e4f0",
              fontWeight: 800,
              fontSize: "3rem",
              letterSpacing: "0.05em",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
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
