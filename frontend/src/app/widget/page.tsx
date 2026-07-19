"use client";

import { api } from "@/lib/api";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const sessionIdKey = "dental-widget-session";

export default function WidgetPage() {
  const [open, setOpen] = useState(true);
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
      const response = await api.post<{ reply: string }>("/api/chat", {
        clientSlug,
        sessionId,
        message: cleaned,
      });
      console.log("[widget] chat response", response);
      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
    } catch (error) {
      console.error("[widget] chat error", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't reach the clinic right now." },
      ]);
    } finally {
      console.log("[widget] clearing typing state");
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
    <div className="flex h-screen items-end justify-end bg-transparent p-0 sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-none border border-white/10 bg-slate-950 text-white shadow-2xl sm:rounded-3xl">
        <button
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between border-b border-white/10 px-4 py-3 text-left"
        >
          <div>
            <div className="font-semibold">Dental Receptionist</div>
            <div className="text-xs text-slate-400">Online now</div>
          </div>
          <span className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-medium">
            {open ? "Close" : "Open"}
          </span>
        </button>
        {open ? (
          <div className="flex h-[70vh] flex-col sm:h-[640px]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-xs text-slate-400">Session: {sessionId || "..."}</div>
              <button
                type="button"
                onClick={startNewChat}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5"
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
                      : "bg-white/8 border border-white/10 text-slate-100"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {typing ? (
                <div className="max-w-[85%] rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-slate-300">
                  Typing...
                </div>
              ) : null}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage(input);
              }}
              className="border-t border-white/10 p-3"
            >
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask about services, hours, insurance, or book a visit..."
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
                />
                <button className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-medium text-white">
                  Send
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
