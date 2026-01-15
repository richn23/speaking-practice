"use client";

import React, { useState, useRef, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FeedbackContext {
  transcript: string;
  taskTitle: string;
  taskInstructions: string;
  taskPrompt: string;
  scoreOverall: number;
  performanceLabel: string;
  scores: {
    taskCompletion: number;
    elaboration: number;
    coherence: number;
    grammar: number;
    vocabulary: number;
  };
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  vocabularyTip: string;
  strength: string;
}

interface FeedbackChatProps {
  feedbackContext: FeedbackContext;
}

const STARTER_QUESTIONS = [
  "Why did I get this score?",
  "How can I improve?",
  "Explain the corrections",
  "What did I do well?",
];

export default function FeedbackChat({ feedbackContext }: FeedbackChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleStarterClick = (question: string) => {
    sendMessage(question);
  };

  return (
    <>
      {/* Trigger Button */}
      <div className="mt-4 pt-4 border-t border-purple-500/20">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 transition-all duration-200"
        >
          <span className="text-2xl">🧠</span>
          <span className="text-purple-200 font-medium">Ask about your feedback</span>
        </button>
      </div>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
          onClick={() => setIsOpen(false)}
        >
          {/* Modal Content */}
          <div
            className="w-full max-w-lg rounded-xl overflow-hidden"
            style={{
              background: "rgba(30, 15, 45, 0.95)",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              backdropFilter: "blur(12px)",
              maxHeight: "80vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid rgba(124, 58, 237, 0.2)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧠</span>
                <span className="text-purple-200 font-semibold text-lg">Speaking Coach</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-purple-400 hover:text-purple-200 transition-colors p-2 hover:bg-purple-500/20 rounded-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Messages Area */}
            <div
              className="p-4 space-y-4 overflow-y-auto"
              style={{ height: "400px" }}
            >
              {messages.length === 0 ? (
                <div className="space-y-4">
                  {/* Welcome message */}
                  <div className="flex gap-3">
                    <span className="text-2xl flex-shrink-0">🧠</span>
                    <div
                      className="rounded-lg rounded-tl-none px-4 py-3"
                      style={{
                        background: "rgba(124, 58, 237, 0.15)",
                        border: "1px solid rgba(124, 58, 237, 0.2)",
                      }}
                    >
                      <p className="text-purple-100">
                        Hi! I&apos;m your speaking coach. Ask me anything about your feedback, score, or how to improve! 😊
                      </p>
                    </div>
                  </div>

                  {/* Starter questions */}
                  <div className="pl-11">
                    <p className="text-purple-400 text-sm mb-3">Quick questions:</p>
                    <div className="flex flex-wrap gap-2">
                      {STARTER_QUESTIONS.map((question) => (
                        <button
                          key={question}
                          onClick={() => handleStarterClick(question)}
                          className="text-sm px-4 py-2 rounded-full bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && <span className="text-2xl flex-shrink-0">🧠</span>}
                      <div
                        className={`rounded-lg px-4 py-3 max-w-[80%] ${
                          msg.role === "user"
                            ? "rounded-br-none"
                            : "rounded-tl-none"
                        }`}
                        style={{
                          background: msg.role === "user"
                            ? "rgba(124, 58, 237, 0.6)"
                            : "rgba(124, 58, 237, 0.15)",
                          border: "1px solid rgba(124, 58, 237, 0.2)",
                        }}
                      >
                        <p className="text-purple-100 whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex gap-3">
                      <span className="text-2xl flex-shrink-0">🧠</span>
                      <div
                        className="rounded-lg rounded-tl-none px-4 py-3"
                        style={{
                          background: "rgba(124, 58, 237, 0.15)",
                          border: "1px solid rgba(124, 58, 237, 0.2)",
                        }}
                      >
                        <div className="flex gap-1.5">
                          <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce"></span>
                          <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                          <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div
              className="px-4 py-3"
              style={{ borderTop: "1px solid rgba(124, 58, 237, 0.2)" }}
            >
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about your feedback..."
                  disabled={isLoading}
                  className="flex-1 bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-purple-100 placeholder-purple-400/50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}