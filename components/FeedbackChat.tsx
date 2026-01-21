"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Task } from "@/data/unit1";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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

interface FeedbackContext {
  transcript: string;
  taskTitle: string;
  taskInstructions: string;
  taskPrompt: string;
  scoreOverall: number;
  performanceLabel: string;
  scores: FeedbackScores;
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  vocabularyTip: string;
  strength: string;
  pronunciationData?: {
    overallScore: number;
    fluencyScore?: number;
    problemWords: Array<{
      word: string;
      score: number;
      ipa?: string;
      heardAs?: string;
    }>;
  };
}

interface FeedbackChatProps {
  taskType: Task["taskType"];
  feedbackContext: FeedbackContext;
}

const STARTER_QUESTIONS = [
  "Why this score?",
  "How to improve?",
  "Explain corrections",
];

export default function FeedbackChat({ taskType, feedbackContext }: FeedbackChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          conversationHistory: messages,
          taskType,
          feedbackContext,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: ChatMessage = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Sorry, I had trouble responding. Please try again! 😅",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleStarterClick = (question: string) => {
    sendMessage(question);
  };

  const modalContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.85)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          maxHeight: "85vh",
          background: "#1a0a2e",
          border: "1px solid rgba(124, 58, 237, 0.4)",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: "rgba(124, 58, 237, 0.25)",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(124, 58, 237, 0.2)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: "rgba(124, 58, 237, 0.4)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
              }}
            >
              🧠
            </div>
            <div>
              <div style={{ color: "#e9e4f0", fontWeight: 600, fontSize: "1rem" }}>
                Speaking Coach
              </div>
              <div style={{ color: "#34d399", fontSize: "0.75rem" }}>● Online</div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "rgba(124, 58, 237, 0.2)",
              border: "none",
              color: "#e9e4f0",
              cursor: "pointer",
              fontSize: "1.2rem",
              padding: "8px 12px",
              borderRadius: 8,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            padding: 16,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: "#0d0618",
            minHeight: 250,
          }}
        >
          {messages.length === 0 ? (
            <>
              <div
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "85%",
                  padding: "12px 16px",
                  borderRadius: 16,
                  borderBottomLeftRadius: 4,
                  background: "rgba(124, 58, 237, 0.2)",
                  color: "#e9e4f0",
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                }}
              >
                Hi! 👋 I can help you understand your score. Ask me anything!
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {STARTER_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleStarterClick(question)}
                    style={{
                      padding: "8px 14px",
                      background: "rgba(124, 58, 237, 0.15)",
                      border: "1px solid rgba(124, 58, 237, 0.3)",
                      borderRadius: 20,
                      color: "#c4b5fd",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    padding: "12px 16px",
                    borderRadius: 16,
                    borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                    borderBottomLeftRadius: msg.role === "assistant" ? 4 : 16,
                    background: msg.role === "user" ? "#7c3aed" : "rgba(124, 58, 237, 0.2)",
                    color: msg.role === "user" ? "white" : "#e9e4f0",
                    fontSize: "0.95rem",
                    lineHeight: 1.5,
                  }}
                >
                  {msg.content}
                </div>
              ))}

              {isLoading && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    padding: "12px 16px",
                    borderRadius: 16,
                    borderBottomLeftRadius: 4,
                    background: "rgba(124, 58, 237, 0.2)",
                  }}
                >
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ width: 8, height: 8, background: "#a78bfa", borderRadius: "50%", animation: "bounce 1s infinite" }}></span>
                    <span style={{ width: 8, height: 8, background: "#a78bfa", borderRadius: "50%", animation: "bounce 1s infinite 0.15s" }}></span>
                    <span style={{ width: 8, height: 8, background: "#a78bfa", borderRadius: "50%", animation: "bounce 1s infinite 0.3s" }}></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div
          style={{
            padding: 14,
            background: "#1a0a2e",
            borderTop: "1px solid rgba(124, 58, 237, 0.2)",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading}
            autoComplete="off"
            autoCorrect="off"
            style={{
              flex: 1,
              background: "#0d0618",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              borderRadius: 24,
              padding: "12px 18px",
              color: "#e9e4f0",
              fontSize: "16px",
              outline: "none",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !inputValue.trim()}
            style={{
              width: 48,
              height: 48,
              background: "#7c3aed",
              border: "none",
              borderRadius: "50%",
              color: "white",
              cursor: isLoading || !inputValue.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: isLoading || !inputValue.trim() ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Trigger Button */}
      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(124, 58, 237, 0.2)" }}>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            background: "rgba(124, 58, 237, 0.2)",
            border: "1px solid rgba(124, 58, 237, 0.3)",
            borderRadius: 8,
            color: "#c4b5fd",
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          🧠 Ask about your feedback
        </button>
      </div>

      {/* Portal modal to body */}
      {mounted && isOpen && createPortal(modalContent, document.body)}
    </>
  );
}
