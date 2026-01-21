"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Mic, Square, Check, Volume2, SkipForward, AlertTriangle } from "lucide-react";
import type { Task } from "@/data/unit1";

type MediationTaskProps = {
  task: Task;
  onComplete: (
    taskId: string,
    isRetry: boolean,
    audioBlob: Blob
  ) => void;
  isRetry?: boolean;
};

type MediationState =
  | "ready"        // Initial - show instructions
  | "playing"      // Audio is playing
  | "canReplay"    // Audio finished, can replay or continue
  | "prepareRecord"// No more replays, ready to record
  | "recording"    // Recording in progress
  | "review";      // Recording done, can submit or retry

const MAX_RECORDING_SECONDS = 120;
const WARNING_SECONDS = 15;

export default function MediationTask({ task, onComplete, isRetry = false }: MediationTaskProps) {
  const [state, setState] = useState<MediationState>("ready");
  const [playCount, setPlayCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stoppedByTimeLimit, setStoppedByTimeLimit] = useState(false);

  const maxReplays = task.maxReplays ?? 1;
  const maxPlays = maxReplays + 1; // First play + replays

  // Audio playback
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Get audio URL
  const AUDIO_BASE_URL = "https://hmvbvtsgvqhjmmhdxqsw.supabase.co/storage/v1/object/public/audio";
  
  const getAudioUrl = () => {
    if (task.audioUrl) {
      // If audioUrl is a full URL, use it; otherwise prepend base
      if (task.audioUrl.startsWith("http")) {
        return task.audioUrl;
      }
      // Convert /audio/unit1/mediation-1.mp3 to Supabase URL
      const path = task.audioUrl.replace(/^\/audio/, "");
      return `${AUDIO_BASE_URL}${path}`;
    }
    return `${AUDIO_BASE_URL}/unit1/${task.id}.mp3`;
  };

  // Play audio
  const handlePlay = () => {
    setError(null);
    setState("playing");

    const audio = new Audio(getAudioUrl());
    audioRef.current = audio;

    audio.onended = () => {
      const newPlayCount = playCount + 1;
      setPlayCount(newPlayCount);

      if (newPlayCount < maxPlays) {
        setState("canReplay");
      } else {
        setState("prepareRecord");
      }
    };

    audio.onerror = () => {
      setError("Could not load audio file.");
      setState("ready");
    };

    audio.play();
  };

  // Skip replay and go to record
  const handleSkipToRecord = () => {
    setState("prepareRecord");
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
    setPlayCount(0);
    setElapsedSeconds(0);
    setAudioBlob(null);
    setStoppedByTimeLimit(false);
    chunksRef.current = [];
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
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
    
    const ratio = task.expectedMinSeconds > 0 ? elapsedSeconds / task.expectedMinSeconds : 0;
    if (ratio < 0.6) return "#dc2626";
    if (ratio < 1) return "#f59e0b";
    return "#34d399";
  };
  
  // Check if in warning zone
  const isInWarningZone = MAX_RECORDING_SECONDS - elapsedSeconds <= WARNING_SECONDS;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

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
              You will hear 3 people talking. Listen carefully and take notes if you wish.
              You can play the audio <strong>{maxPlays === 2 ? "twice" : `${maxPlays} times`}</strong>.
              Then summarise what you heard.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={handlePlay}
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
              <Play size={18} />
              Play Audio
            </button>

            <div
              style={{
                padding: "0.25rem 0.65rem",
                borderRadius: 999,
                background: "rgba(124, 58, 237, 0.15)",
                border: "1px solid rgba(124, 58, 237, 0.3)",
                color: "#a78bfa",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {playCount}/{maxPlays} plays
            </div>
          </div>
        </>
      )}

      {/* Playing state */}
      {state === "playing" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem",
            background: "rgba(124, 58, 237, 0.1)",
            borderRadius: 8,
            border: "1px solid rgba(124, 58, 237, 0.3)",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(124, 58, 237, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            <Volume2 size={20} color="#a78bfa" />
          </div>
          <div>
            <div style={{ color: "#e9e4f0", fontWeight: 600 }}>Playing audio...</div>
            <div style={{ color: "#9f8fc0", fontSize: "0.85rem" }}>
              Listen carefully and take notes if you wish.
            </div>
          </div>
        </div>
      )}

      {/* Can replay state */}
      {state === "canReplay" && (
        <>
          <div
            style={{
              background: "rgba(52, 211, 153, 0.1)",
              borderLeft: "3px solid #34d399",
              padding: "1rem",
              borderRadius: 8,
            }}
          >
            <div style={{ color: "#34d399", fontWeight: 600, marginBottom: "0.25rem" }}>
              <Check size={16} style={{ display: "inline", marginRight: "0.35rem" }} />
              Audio finished
            </div>
            <div style={{ color: "#e9e4f0" }}>
              You can listen again or continue to record your summary.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={handlePlay}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: 999,
                border: "1px solid rgba(124, 58, 237, 0.4)",
                background: "rgba(124, 58, 237, 0.15)",
                color: "#a78bfa",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Play size={18} />
              Play Again ({maxPlays - playCount} left)
            </button>

            <button
              type="button"
              onClick={handleSkipToRecord}
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
              <SkipForward size={18} />
              Ready to Record
            </button>
          </div>
        </>
      )}

      {/* Prepare to record state */}
      {state === "prepareRecord" && (
        <>
          <div
            style={{
              background: "rgba(124, 58, 237, 0.1)",
              borderLeft: "3px solid #7c3aed",
              padding: "1rem",
              borderRadius: 8,
            }}
          >
            <div style={{ color: "#e9e4f0" }}>
              Now summarise what you heard. Speak for {task.expectedMinSeconds}-{task.expectedMaxSeconds} seconds.
              <br />
              <span style={{ color: "#9f8fc0", fontSize: "0.85rem" }}>
                Maximum recording time: {Math.floor(MAX_RECORDING_SECONDS / 60)} minutes.
              </span>
            </div>
          </div>

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
        </>
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

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
