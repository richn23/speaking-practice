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

  if (!isOpen) {
    return (
      <div className="mt-4 pt-4 border-t border-purple-500/20">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 transition-all duration-200"
        >
          <span className="text-2xl">🧠</span>
          <span className="text-purple-200 font-medium">Ask about your feedback</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-purple-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <span className="text-purple-200 font-medium">Speaking Coach</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-purple-400 hover:text-purple-200 transition-colors p-1"
        >
          ✕
        </button>
      </div>

      <div className="h-64 overflow-y-auto mb-3 rounded-lg bg-black/30 p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <span className="text-xl">🧠</span>
              <div className="bg-purple-900/40 rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] border border-purple-500/20">
                <p className="text-purple-100 text-sm">
                  Hi! I'm your speaking coach. Ask me anything about your feedback, score, or how to improve! 😊
                </p>
              </div>
            </div>

            <div className="pl-8">
              <p className="text-purple-400 text-xs mb-2">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {STARTER_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleStarterClick(question)}
                    className="text-xs px-3 py-1.5 rounded-full bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 transition-colors"
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
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && <span className="text-xl">🧠</span>}
                <div
                  className={`rounded-lg px-3 py-2 max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-br-none"
                      : "bg-purple-900/40 text-purple-100 rounded-tl-none border border-purple-500/20"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2">
                <span className="text-xl">🧠</span>
                <div className="bg-purple-900/40 rounded-lg rounded-tl-none px-3 py-2 border border-purple-500/20">
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

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about your feedback..."
          disabled={isLoading}
          className="flex-1 bg-black/30 border border-purple-500/30 rounded-lg px-3 py-2 text-purple-100 placeholder-purple-400/50 text-sm focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white rounded-lg text-sm font-medium"
        >
          Send
        </button>
      </form>
    </div>
  );
}