"use client";

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
};

export default function MessageBubble({ role, content }: MessageBubbleProps) {
  return (
    <div
      className={`flex gap-2.5 ${
        role === "user" ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {role === "assistant" && (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed animate-fade-up ${
          role === "user"
            ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
            : "bg-gray-700 text-white rounded-2xl rounded-tl-sm"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
