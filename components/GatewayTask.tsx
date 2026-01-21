"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Volume2, CheckCircle2, Circle } from "lucide-react";
import type { Task } from "@/data/unit1";

type GatewayTaskProps = {
  task: Task;
  onComplete: (taskId: string, isRetry: boolean, audioBlob: Blob) => void;
  isRetry?: boolean;
};

type Phase = "prep" | "ready" | "recording" | "done" | "error";

const PREP_TIME = 30; // 30 seconds to prepare
const RECORD_TIME = 90; // 90 seconds to speak

export default function GatewayTask({ task, onComplete, isRetry = false }: GatewayTaskProps) {
  const [phase, setPhase] = useState<Phase>("prep");
  const [prepCountdown, setPrepCountdown] = useState(PREP_TIME);
  const [recordTime, setRecordTime] = useState(0);
  const [checkedPoints, setCheckedPoints] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Parse key points from prompt
  const keyPoints = task.prompt
    ?.split("\n")
    .filter(line => line.trim().startsWith("•") || line.trim().startsWith("-"))
    .map(line => line.replace(/^[•\-]\s*/, "").trim()) || [];

  // Prep countdown - goes to "ready" phase, NOT auto-record
  useEffect(() => {
    if (phase === "prep" && prepCountdown > 0) {
      prepTimerRef.current = setTimeout(() => {
        setPrepCountdown(prev => prev - 1);
      }, 1000);
    } else if (phase === "prep" && prepCountdown === 0) {
      setPhase("ready"); // Go to ready phase, wait for user to click
    }
    return () => {
      if (prepTimerRef.current) clearTimeout(prepTimerRef.current);
    };
  }, [phase, prepCountdown]);

  // Recording timer
  useEffect(() => {
    if (phase === "recording") {
      recordTimerRef.current = setInterval(() => {
        setRecordTime(prev => {
          if (prev >= RECORD_TIME) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [phase]);

  const startRecording = async () => {
    try {
      setErrorMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });
        stream.getTracks().forEach(track => track.stop());
        onComplete(task.id, isRetry, blob);
      };

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setRecordTime(0);
      setPhase("recording");
    } catch (err) {
      console.error("Microphone access error:", err);
      setErrorMessage("Could not access microphone. Please check permissions.");
      setPhase("error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setPhase("done");
    }
  };

  const skipPrep = () => {
    setPrepCountdown(0);
    setPhase("ready");
  };

  const tryAgain = () => {
    setPhase("ready");
    setRecordTime(0);
    setErrorMessage("");
    chunksRef.current = [];
  };

  const togglePoint = (index: number) => {
    setCheckedPoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getProgressColor = () => {
    if (recordTime >= 75) return "#34d399"; // Green - great length
    if (recordTime >= 45) return "#a78bfa"; // Purple - good
    return "#fbbf24"; // Yellow - keep going
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      
      {/* Statement/Topic */}
      {task.statement && (
        <div
          style={{
            background: "rgba(124, 58, 237, 0.15)",
            border: "1px solid rgba(124, 58, 237, 0.3)",
            borderRadius: 10,
            padding: "1rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#a78bfa", marginBottom: "0.5rem", fontWeight: 600 }}>
            Topic Statement
          </div>
          <div style={{ fontSize: "1.1rem", color: "#e9e4f0", fontStyle: "italic", lineHeight: 1.5 }}>
            "{task.statement}"
          </div>
        </div>
      )}

      {/* Key Points Checklist */}
      {keyPoints.length > 0 && (
        <div
          style={{
            background: "rgba(20, 10, 30, 0.6)",
            border: "1px solid rgba(124, 58, 237, 0.2)",
            borderRadius: 10,
            padding: "1rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#a78bfa", marginBottom: "0.75rem", fontWeight: 600 }}>
            Include these points:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {keyPoints.map((point, index) => (
              <button
                key={index}
                onClick={() => togglePoint(index)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  background: checkedPoints.has(index) 
                    ? "rgba(52, 211, 153, 0.1)" 
                    : "rgba(124, 58, 237, 0.05)",
                  border: checkedPoints.has(index)
                    ? "1px solid rgba(52, 211, 153, 0.3)"
                    : "1px solid rgba(124, 58, 237, 0.15)",
                  borderRadius: 8,
                  padding: "0.6rem 0.75rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 150ms ease",
                }}
              >
                {checkedPoints.has(index) ? (
                  <CheckCircle2 size={18} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <Circle size={18} color="#9f8fc0" style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <span style={{ color: checkedPoints.has(index) ? "#34d399" : "#e9e4f0", lineHeight: 1.4 }}>
                  {point}
                </span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#9f8fc0", marginTop: "0.75rem" }}>
            Tap to check off points as you cover them
          </div>
        </div>
      )}

      {/* Prep Phase */}
      {phase === "prep" && (
        <div
          style={{
            background: "rgba(251, 191, 36, 0.1)",
            border: "1px solid rgba(251, 191, 36, 0.3)",
            borderRadius: 10,
            padding: "1.25rem",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#fbbf24", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
            ⏱️ Preparation Time
          </div>
          <div
            style={{
              fontSize: "2.5rem",
              fontWeight: 700,
              color: "#fbbf24",
              fontFamily: "var(--font-heading), monospace",
            }}
          >
            {prepCountdown}s
          </div>
          <div style={{ color: "#9f8fc0", fontSize: "0.9rem", margin: "0.75rem 0" }}>
            Read the topic and plan what you'll say
          </div>
          <button
            onClick={skipPrep}
            style={{
              background: "rgba(124, 58, 237, 0.2)",
              border: "1px solid rgba(124, 58, 237, 0.4)",
              borderRadius: 8,
              padding: "0.5rem 1rem",
              color: "#a78bfa",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            I'm ready – skip countdown
          </button>
        </div>
      )}

      {/* Ready Phase - waiting for user to start */}
      {phase === "ready" && (
        <div
          style={{
            background: "rgba(52, 211, 153, 0.1)",
            border: "1px solid rgba(52, 211, 153, 0.3)",
            borderRadius: 10,
            padding: "1.25rem",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#34d399", fontSize: "1rem", marginBottom: "0.75rem", fontWeight: 600 }}>
            ✓ Ready when you are!
          </div>
          <div style={{ color: "#9f8fc0", fontSize: "0.9rem", marginBottom: "1rem" }}>
            Click the button below to start your 90-second response
          </div>
          <button
            onClick={startRecording}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              margin: "0 auto",
              background: "rgba(52, 211, 153, 0.2)",
              border: "1px solid rgba(52, 211, 153, 0.4)",
              borderRadius: 8,
              padding: "0.85rem 1.5rem",
              color: "#34d399",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            <Mic size={20} />
            Start Recording
          </button>
        </div>
      )}

      {/* Recording Phase */}
      {phase === "recording" && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: 10,
            padding: "1.25rem",
          }}
        >
          {/* Timer */}
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <div style={{ color: "#ef4444", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
              🔴 Recording
            </div>
            <div
              style={{
                fontSize: "2.5rem",
                fontWeight: 700,
                color: getProgressColor(),
                fontFamily: "var(--font-heading), monospace",
              }}
            >
              {formatTime(recordTime)} / {formatTime(RECORD_TIME)}
            </div>
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: 8,
              background: "rgba(124, 58, 237, 0.2)",
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(recordTime / RECORD_TIME) * 100}%`,
                background: getProgressColor(),
                transition: "width 1s linear, background-color 300ms ease",
              }}
            />
          </div>

          {/* Time guidance */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#9f8fc0", marginBottom: "1rem" }}>
            <span>Keep going...</span>
            <span style={{ color: recordTime >= 45 ? "#34d399" : "#9f8fc0" }}>
              {recordTime >= 45 ? "✓ Good length!" : "Aim for 60-90 seconds"}
            </span>
          </div>

          {/* Stop button */}
          <button
            onClick={stopRecording}
            disabled={recordTime < 30}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.85rem",
              background: recordTime < 30 ? "rgba(107, 114, 128, 0.3)" : "rgba(239, 68, 68, 0.2)",
              border: recordTime < 30 ? "1px solid rgba(107, 114, 128, 0.4)" : "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: 8,
              color: recordTime < 30 ? "#6b7280" : "#fca5a5",
              cursor: recordTime < 30 ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            <Square size={18} />
            {recordTime < 30 ? `Wait ${30 - recordTime}s...` : "Stop & Submit"}
          </button>
          
          {recordTime < 30 && (
            <div style={{ fontSize: "0.8rem", color: "#9f8fc0", textAlign: "center", marginTop: "0.5rem" }}>
              Minimum 30 seconds required
            </div>
          )}
        </div>
      )}

      {/* Error Phase - allow retry */}
      {phase === "error" && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 10,
            padding: "1.25rem",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#fca5a5", fontSize: "1rem", marginBottom: "0.5rem", fontWeight: 600 }}>
            Something went wrong
          </div>
          <div style={{ color: "#9f8fc0", fontSize: "0.9rem", marginBottom: "1rem" }}>
            {errorMessage || "There was a problem with your recording."}
          </div>
          <button
            onClick={tryAgain}
            style={{
              background: "rgba(124, 58, 237, 0.2)",
              border: "1px solid rgba(124, 58, 237, 0.4)",
              borderRadius: 8,
              padding: "0.75rem 1.25rem",
              color: "#a78bfa",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: 600,
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Done Phase */}
      {phase === "done" && (
        <div
          style={{
            background: "rgba(52, 211, 153, 0.1)",
            border: "1px solid rgba(52, 211, 153, 0.3)",
            borderRadius: 10,
            padding: "1.25rem",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#34d399", fontSize: "1.1rem", fontWeight: 600 }}>
            ✓ Recording complete!
          </div>
          <div style={{ color: "#9f8fc0", fontSize: "0.9rem", marginTop: "0.5rem" }}>
            Processing your response...
          </div>
        </div>
      )}
    </div>
  );
}
