"use client";

import { Send } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function ChatInput({ input, setInput, onSend, disabled }: ChatInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700 bg-gray-800">
      <div className="flex gap-2 items-center">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about appointments..."
          disabled={disabled}
          className="flex-1 bg-gray-700 border border-gray-600 rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Type your message"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
