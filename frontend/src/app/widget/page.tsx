"use client";

import { api } from "@/lib/api";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const sessionIdKey = "dental-widget-session";

export default function WidgetPage() {
  const [clientSlug, setClientSlug] = useState("default");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi, I'm the dental receptionist. How can I help today?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  function createSessionId() {
    const value = crypto.randomUUID();
    window.localStorage.setItem(sessionIdKey, value);
    setSessionId(value);
    return value;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setClientSlug(params.get("client_slug") || "default");
    const existing = window.localStorage.getItem(sessionIdKey);
    if (existing) {
      setSessionId(existing);
      return;
    }
    createSessionId();
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function sendMessage(text: string) {
    const cleaned = text.trim();
    if (!cleaned) return;
    console.log("[widget] sendMessage", {
      clientSlug,
      sessionId,
      message: cleaned,
    });
    setMessages((prev) => [...prev, { role: "user", content: cleaned }]);
    setInput("");
    setTyping(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientSlug, sessionId, message: cleaned }),
      });
      if (!response.ok) throw new Error("Network error");
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        console.log("[widget] chat response JSON", data);
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        setTyping(false);
      } else {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");
        setTyping(false);
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        const decoder = new TextDecoder();
        let assistantMessage = "";
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.type === 'metadata') {
                console.log("[widget] stream metadata", data);
              } else if (data.type === 'chunk') {
                assistantMessage += data.text;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1].content = assistantMessage;
                  return next;
                });
              }
            } catch (e) {
              console.error("Parse error", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("[widget] chat error", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't reach the clinic right now." },
      ]);
      setTyping(false);
    }
  }

  function startNewChat() {
    const value = createSessionId();
    setMessages([{ role: "assistant", content: "Hi, I'm the dental receptionist. How can I help today?" }]);
    setInput("");
    setTyping(false);
    console.log("[widget] new chat session", value);
  }

  return (
    <div className="flex h-screen w-full flex-col bg-slate-950 text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 shrink-0">
        <div>
          <div className="font-semibold">Dental Receptionist</div>
          <div className="text-xs text-slate-400">Online now</div>
        </div>
        <button
          onClick={() => window.parent?.postMessage("close-chat-widget", "*")}
          className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-medium hover:bg-cyan-600 transition-colors"
        >
          Close
        </button>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 shrink-0 bg-slate-900/50">
          <div className="text-xs text-slate-400">Session: {sessionId || "..."}</div>
          <button
            type="button"
            onClick={startNewChat}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/5"
          >
            New Chat
          </button>
        </div>
        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((msg, index) => (
            <div
              key={`${msg.role}-${index}`}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                msg.role === "user"
                  ? "ml-auto bg-cyan-500 text-white"
                  : "bg-white/5 border border-white/10 text-slate-100"
              }`}
            >
              {msg.content}
            </div>
          ))}
          {typing ? (
            <div className="max-w-[85%] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              Typing...
            </div>
          ) : null}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage(input);
          }}
          className="border-t border-white/10 p-3 shrink-0"
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about services, hours, or book a visit..."
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500/50 transition-colors"
            />
            <button className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-600 transition-colors">
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
