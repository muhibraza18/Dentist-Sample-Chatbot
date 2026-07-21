"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import Suggestions from "./Suggestions";

type Message = { role: "user" | "assistant"; content: string };

interface ChatMessagesProps {
  messages: Message[];
  typing: boolean;
  onSuggestionSelect: (suggestion: string) => void;
}

export default function ChatMessages({ messages, typing, onSuggestionSelect }: ChatMessagesProps) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const isEmpty = messages.length === 1 && messages[0].role === "assistant";

  return (
    <div 
      ref={scroller}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
    >
      {isEmpty && (
        <div className="flex flex-col items-center justify-center h-full text-center py-8">
          <div className="text-4xl mb-4">👋</div>
          <h3 className="text-lg font-semibold text-white mb-2">Welcome!</h3>
          <p className="text-sm text-gray-400 mb-4">I'm your Dental AI Receptionist.</p>
          <p className="text-sm text-gray-400">How can I help today?</p>
          <Suggestions onSelect={onSuggestionSelect} />
        </div>
      )}
      {!isEmpty && messages.map((msg, index) => (
        <MessageBubble key={`${msg.role}-${index}`} role={msg.role} content={msg.content} />
      ))}
      {typing && <TypingIndicator />}
    </div>
  );
}
