"use client";

import { useState } from "react";
import type { Task } from "@/data/unit1";
import type { FunctionType, SkillType } from "@/lib/scoring-types";
import { Lock, Check } from "lucide-react";

// Task-specific components
import QATask from "@/components/QATask";
import LongTalkTask from "@/components/LongTalkTask";
import MediationTask from "@/components/MediationTask";
import ImageTask from "@/components/ImageTask";
import ThisOrThatTask from "@/components/ThisOrThatTask";
import GatewayTask from "@/components/GatewayTask";

// New feedback structure with Functions + Skills
type TaskFeedback = {
  // New scoring model
  function: FunctionType;
  secondaryFunction?: FunctionType;
  skills: Partial<Record<SkillType, number>>;
  overall: number;
  
  // Feedback content
  corrections?: {
    original: string;
    corrected: string;
    explanation: string;
  }[];
  strengths?: string[];
  improvements?: string[];
  feedback?: string;
  
  // Pronunciation (if available)
  pronunciationData?: {
    overallScore: number;
    fluencyScore?: number;
    problemWords: Array<{
      word: string;
      score: number;
      ipa?: string;
      problemPhonemes?: string[];
      heardAs?: string;
    }>;
  };
  
  // Error handling
  invalidReason?: string;
};

type TaskCardProps = {
  task: Task;
  isLocked: boolean;
  isCompleted: boolean;
  onComplete?: (
    taskId: string,
    isRetry?: boolean,
    transcript?: string,
    feedback?: TaskFeedback
  ) => void;
};

const typeLabels: Record<Task["taskType"], string> = {
  qa: "Q&A",
  long_talk: "Long Talk",
  mediation: "Mediation",
  image: "Image",
  this_or_that: "This or That",
  gateway: "Gateway",
};

export default function TaskCard({
  task,
  isLocked,
  isCompleted,
  onComplete,
}: TaskCardProps) {
  
  // Progress status for submission flow
  const [submissionStatus, setSubmissionStatus] = useState<string>("");
  const [submissionError, setSubmissionError] = useState<string>("");

  // Handle completion from child task components
  const handleTaskComplete = async (taskId: string, isRetry: boolean, audioBlob: Blob) => {
    if (!onComplete) return;
    
    setSubmissionError("");
    setSubmissionStatus("Uploading audio...");

    try {
      // Upload audio
      const { uploadAudio } = await import("@/lib/uploadAudio");
      const path = await uploadAudio(audioBlob, taskId);
      if (!path) {
        console.warn("Upload failed; continuing without stored copy");
      }
    } catch (uploadErr) {
      console.error("Upload failed; continuing without stored copy", uploadErr);
    }

    // Transcribe
    setSubmissionStatus("Transcribing...");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const { transcript, error: transcribeError } = await response.json();
      
      if (transcribeError || !transcript) {
        console.error("Transcription failed:", transcribeError);
        setSubmissionStatus("");
        setSubmissionError("There was a problem with your recording. Please try again.");
        return;
      }

      // Pronunciation assessment
      setSubmissionStatus("Generating feedback...");
      let pronunciationData;
      try {
        const { convertToWav, needsConversion } = await import("@/lib/convertToWav");
        let audioForPronunciation: Blob = audioBlob;
        if (needsConversion(audioBlob.type)) {
          audioForPronunciation = await convertToWav(audioBlob);
        }
        
        const pronFormData = new FormData();
        pronFormData.append("audio", audioForPronunciation, "recording.wav");
        const pronunciationResponse = await fetch("/api/pronunciation", {
          method: "POST",
          body: pronFormData,
        });
        const pronData = await pronunciationResponse.json();
        
        if (pronData.problemWords?.length > 0) {
          const ipaResponse = await fetch("/api/ipa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              words: pronData.problemWords.map((w: { word: string }) => w.word),
            }),
          });
          const ipaData = await ipaResponse.json();
          
          pronData.problemWords = pronData.problemWords.map((pw: { word: string; score: number; problemPhonemes?: string[] }) => {
            const ipaMatch = ipaData.words?.find((w: { word: string; ipa: string }) =>
              w.word.toLowerCase() === pw.word.toLowerCase()
            );
            return { ...pw, ipa: ipaMatch?.ipa };
          });
        }
        
        pronunciationData = {
          overallScore: pronData.overallScore ?? 0,
          fluencyScore: pronData.fluencyScore ?? 0,
          problemWords: pronData.problemWords ?? [],
        };
      } catch (pronError) {
        console.warn("Pronunciation assessment failed; continuing without it", pronError);
      }

      // Generate feedback (new API returns function + skills)
      setSubmissionStatus("Almost done...");
      const fbResponse = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          taskType: task.taskType,
          taskTitle: task.title,
          prompt: task.prompt || task.instructions,
          expectedMinSeconds: task.expectedMinSeconds,
          expectedMaxSeconds: task.expectedMaxSeconds,
        }),
      });
      const fbJson = await fbResponse.json();
      
      // Check for error from API
      if (fbJson.error) {
        console.error("Feedback failed:", fbJson.error);
        setSubmissionStatus("");
        setSubmissionError(fbJson.error);
        return;
      }

      // Build feedback object from new API response
      const feedback: TaskFeedback = {
        function: fbJson.function,
        secondaryFunction: fbJson.secondaryFunction,
        skills: fbJson.skills,
        overall: fbJson.overall,
        corrections: fbJson.corrections || [],
        strengths: fbJson.strengths || [],
        improvements: fbJson.improvements || [],
        feedback: fbJson.feedback || "",
      };

      // Add pronunciation data if available
      if (pronunciationData) {
        feedback.pronunciationData = pronunciationData;
      }

      setSubmissionStatus("");
      onComplete(taskId, isRetry, transcript, feedback);
    } catch (e) {
      console.error("Transcription/Feedback error", e);
      setSubmissionStatus("");
      setSubmissionError("Something went wrong. Please try again.");
    }
  };

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

  // Render the appropriate task component based on taskType
  const renderTaskContent = () => {
    if (isLocked) return null;
    
    switch (task.taskType) {
      case "qa":
        return (
          <QATask
            task={task}
            onComplete={handleTaskComplete}
            isRetry={isCompleted}
          />
        );
      case "long_talk":
        return (
          <LongTalkTask
            task={task}
            onComplete={handleTaskComplete}
            isRetry={isCompleted}
          />
        );
      case "mediation":
        return (
          <MediationTask
            task={task}
            onComplete={handleTaskComplete}
            isRetry={isCompleted}
          />
        );
      case "image":
        return (
          <ImageTask
            task={task}
            onComplete={handleTaskComplete}
            isRetry={isCompleted}
          />
        );
      case "this_or_that":
        return (
          <ThisOrThatTask
            task={task}
            onComplete={handleTaskComplete}
            isRetry={isCompleted}
          />
        );
      case "gateway":
        return (
          <GatewayTask
            task={task}
            onComplete={handleTaskComplete}
            isRetry={isCompleted}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={containerStyle}>
      {/* Header: Badge + Status */}
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
          {typeLabels[task.taskType] ?? "Task"}
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

      {/* Title */}
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

      {/* Instructions */}
      <div style={{ color: "#9f8fc0", lineHeight: 1.6 }}>{task.instructions}</div>

      {/* Task-specific content */}
      {renderTaskContent()}

      {/* Submission Progress Status */}
      {submissionStatus && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem",
            background: "rgba(124, 58, 237, 0.15)",
            border: "1px solid rgba(124, 58, 237, 0.3)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              border: "2px solid #a78bfa",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <span style={{ color: "#a78bfa", fontWeight: 600 }}>{submissionStatus}</span>
        </div>
      )}

      {/* Submission Error */}
      {submissionError && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: 8,
            color: "#fca5a5",
            fontWeight: 600,
          }}
        >
          {submissionError}
        </div>
      )}

      {/* Locked message */}
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

      {/* Locked overlay */}
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

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
