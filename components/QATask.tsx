"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Mic, Square, Check } from "lucide-react";
import type { Task, TaskItem } from "@/data/unit1";

type QATaskProps = {
  task: Task;
  onComplete: (
    taskId: string,
    isRetry: boolean,
    audioBlob: Blob
  ) => void;
  isRetry?: boolean;
};

type QAState = 
  | "ready"           // Initial state - show instructions
  | "playing"         // Playing current question audio
  | "recording"       // Recording answer
  | "between"         // Brief pause between questions
  | "complete";       // All questions done, ready to submit

export default function QATask({ task, onComplete, isRetry = false }: QATaskProps) {
  const [state, setState] = useState<QAState>("ready");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Audio playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const items = task.items || [];
  const totalQuestions = items.length;
  const currentItem = items[currentQuestionIndex];
  
  // Timer for current question
  useEffect(() => {
    if (state !== "recording") {
      setElapsedSeconds(0);
      return;
    }
    const id = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setTotalElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [state]);

  // Get audio URL for current question
  const AUDIO_BASE_URL = "https://hmvbvtsgvqhjmmhdxqsw.supabase.co/storage/v1/object/public/audio";
  
  const getAudioUrl = (item: TaskItem) => {
    return `${AUDIO_BASE_URL}/unit1/${item.id}.mp3`;
  };

  // Play a specific question audio - takes the item directly to avoid stale state
  const playQuestion = (item: TaskItem, index: number) => {
    setState("playing");
    const audio = new Audio(getAudioUrl(item));
    audioRef.current = audio;
    
    audio.onended = () => {
      // Question finished playing, start recording phase
      setState("recording");
    };
    
    audio.onerror = () => {
      setError(`Could not load audio for question ${index + 1}`);
      setState("recording"); // Continue anyway so they can still answer
    };
    
    audio.play();
  };

  // Start the Q&A flow
  const handleStart = async () => {
    setError(null);
    try {
      // Get microphone permission upfront
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Set up MediaRecorder
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
      
      // Start recording (will record continuously)
      mediaRecorder.start();
      
      // Play first question - pass the item directly
      playQuestion(items[0], 0);
    } catch (err) {
      console.error("Microphone error:", err);
      setError("Microphone access denied or unavailable.");
    }
  };

  // Move to next question
  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      // More questions to go
      const nextIndex = currentQuestionIndex + 1;
      const nextItem = items[nextIndex];
      
      setState("between");
      setCurrentQuestionIndex(nextIndex);
      
      // Brief pause then play next question - pass the item directly
      setTimeout(() => {
        playQuestion(nextItem, nextIndex);
      }, 500);
    } else {
      // All questions done
      finishRecording();
    }
  };

  // Finish recording and prepare for submission
  const finishRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setState("complete");
  };

  // Submit the recording
  const handleSubmit = () => {
    if (audioBlob) {
      onComplete(task.id, isRetry, audioBlob);
    }
  };

  // Reset for retry
  const handleReset = () => {
    setState("ready");
    setCurrentQuestionIndex(0);
    setElapsedSeconds(0);
    setTotalElapsedSeconds(0);
    setAudioBlob(null);
    chunksRef.current = [];
    setError(null);
  };

  // Format time display
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Progress indicator */}
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
                idx < currentQuestionIndex || (state === "complete" && idx === currentQuestionIndex)
                  ? "#34d399"
                  : idx === currentQuestionIndex && state !== "ready"
                  ? "#7c3aed"
                  : "rgba(124, 58, 237, 0.2)",
              color:
                idx < currentQuestionIndex || (idx === currentQuestionIndex && state !== "ready") || state === "complete"
                  ? "#fff"
                  : "#9f8fc0",
              border:
                idx === currentQuestionIndex && state !== "ready" && state !== "complete"
                  ? "2px solid #a78bfa"
                  : "1px solid rgba(124, 58, 237, 0.3)",
            }}
          >
            {idx < currentQuestionIndex || state === "complete" ? <Check size={14} /> : idx + 1}
          </div>
        ))}
        
        {state !== "ready" && (
          <div style={{ marginLeft: "auto", color: "#9f8fc0", fontSize: "0.9rem" }}>
            Total: {formatTime(totalElapsedSeconds)}
          </div>
        )}
      </div>

      {/* Current question display */}
      {state !== "ready" && state !== "complete" && (
        <div
          style={{
            background: "rgba(124, 58, 237, 0.1)",
            borderLeft: "3px solid #7c3aed",
            padding: "0.75rem 1rem",
            borderRadius: 8,
          }}
        >
          <div style={{ color: "#9f8fc0", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </div>
          <div style={{ color: "#e9e4f0", fontWeight: 500 }}>
            {currentItem?.promptText}
          </div>
        </div>
      )}

      {/* State-specific UI */}
      {state === "ready" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ color: "#9f8fc0", fontSize: "0.95rem" }}>
            You'll hear {totalQuestions} questions. After each question, record your answer, then press "Next" to continue.
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
            <Play size={18} />
            Start
          </button>
        </div>
      )}

      {state === "playing" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#a78bfa",
            fontWeight: 600,
          }}
        >
          <Play size={18} />
          Playing question...
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
          </div>
          
          <button
            type="button"
            onClick={handleNext}
            style={{
              alignSelf: "flex-start",
              padding: "0.6rem 1.2rem",
              borderRadius: 999,
              border: "none",
              background: currentQuestionIndex < totalQuestions - 1 
                ? "linear-gradient(135deg, #7c3aed, #5b21b6)"
                : "#34d399",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {currentQuestionIndex < totalQuestions - 1 ? (
              <>Next Question</>
            ) : (
              <>
                <Square size={16} />
                Finish
              </>
            )}
          </button>
        </div>
      )}

      {state === "between" && (
        <div style={{ color: "#9f8fc0" }}>Loading next question...</div>
      )}

      {state === "complete" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ color: "#34d399", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Check size={18} />
            All {totalQuestions} questions answered! Total time: {formatTime(totalElapsedSeconds)}
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
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
