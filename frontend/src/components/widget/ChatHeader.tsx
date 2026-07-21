"use client";

import { X } from "lucide-react";

interface ChatHeaderProps {
  onClose: () => void;
}

export default function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-800" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">AI Receptionist</h3>
          <p className="text-xs text-gray-400">Usually replies instantly</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        aria-label="Close chat"
      >
        <X className="w-4 h-4 text-gray-300" />
      </button>
    </div>
  );
}
