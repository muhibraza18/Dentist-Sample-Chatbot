"use client";

import { useEffect, useRef } from "react";
import TypingIndicator from "./TypingIndicator";

type Message = { role: "user" | "assistant"; content: string };

interface ChatMessagesProps {
  messages: Message[];
  typing: boolean;
}

export default function ChatMessages({ messages, typing }: ChatMessagesProps) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  return (
    <div 
      ref={scroller}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
    >
      {messages.map((msg, index) => (
        <div
          key={`${msg.role}-${index}`}
          className={`flex gap-3 animate-fade-in ${
            msg.role === "user" ? "flex-row-reverse" : "flex-row"
          }`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {msg.role === "assistant" && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          )}
          <div
            className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl rounded-tr-none shadow-lg shadow-cyan-500/20"
                : "bg-gray-800 text-gray-100 rounded-2xl rounded-tl-none border border-gray-700/50"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}
      {typing && (
        <div className="flex gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <TypingIndicator />
        </div>
      )}
    </div>
  );
}
