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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
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
          style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
          onClick={() => setIsOpen(false)}
        >
          {/* Modal Content */}
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "#1a0a2e",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              height: "600px",
              maxHeight: "85vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ 
                background: "rgba(124, 58, 237, 0.2)",
                borderBottom: "1px solid rgba(124, 58, 237, 0.2)" 
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(124, 58, 237, 0.3)" }}
                >
                  <span className="text-xl">🧠</span>
                </div>
                <div>
                  <div className="text-purple-100 font-semibold">Speaking Coach</div>
                  <div className="text-purple-400 text-xs">Online</div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-purple-400 hover:text-purple-200 transition-colors p-2 hover:bg-purple-500/20 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3"
              style={{ background: "#0d0618" }}
            >
              {messages.length === 0 ? (
                <div className="space-y-4">
                  {/* Welcome message */}
                  <div className="flex gap-2 justify-start">
                    <div
                      className="rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%]"
                      style={{
                        background: "rgba(124, 58, 237, 0.25)",
                      }}
                    >
                      <p className="text-purple-100 text-sm">
                        Hi! 👋 I can help you understand your score. Ask me anything!
                      </p>
                    </div>
                  </div>

                  {/* Starter questions */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {STARTER_QUESTIONS.map((question) => (
                      <button
                        key={question}
                        onClick={() => handleStarterClick(question)}
                        className="text-xs px-3 py-2 rounded-full bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-2 max-w-[85%] ${
                          msg.role === "user"
                            ? "rounded-br-sm"
                            : "rounded-tl-sm"
                        }`}
                        style={{
                          background: msg.role === "user"
                            ? "#7c3aed"
                            : "rgba(124, 58, 237, 0.25)",
                        }}
                      >
                        <p className="text-purple-100 text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div
                        className="rounded-2xl rounded-tl-sm px-4 py-3"
                        style={{ background: "rgba(124, 58, 237, 0.25)" }}
                      >
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area - WhatsApp style */}
            <div
              className="p-3 flex-shrink-0"
              style={{ 
                background: "#1a0a2e",
                borderTop: "1px solid rgba(124, 58, 237, 0.2)" 
              }}
            >
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <div 
                  className="flex-1 rounded-3xl overflow-hidden"
                  style={{ background: "#0d0618", border: "1px solid rgba(124, 58, 237, 0.3)" }}
                >
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={isLoading}
                    rows={1}
                    className="w-full bg-transparent px-4 py-3 text-purple-100 placeholder-purple-400/50 focus:outline-none disabled:opacity-50 resize-none text-sm"
                    style={{ minHeight: "44px", maxHeight: "120px" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-50 transition-colors flex-shrink-0"
                  style={{ background: "#7c3aed" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}