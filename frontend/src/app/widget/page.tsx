"use client";

import { useEffect, useState } from "react";
import ChatHeader from "@/components/widget/ChatHeader";
import ChatMessages from "@/components/widget/ChatMessages";
import ChatInput from "@/components/widget/ChatInput";

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
  const [isOpen, setIsOpen] = useState(false);

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
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.parent?.postMessage("close-chat-widget", "*");
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

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

  function handleSuggestionSelect(suggestion: string) {
    sendMessage(suggestion);
  }

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      window.parent?.postMessage("close-chat-widget", "*");
    }, 150);
  };

  return (
    <div 
      className={`flex flex-col bg-gray-900 text-white transition-all duration-250 ${
        isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{
        width: '360px',
        height: '560px',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
      }}
    >
      <ChatHeader onClose={handleClose} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatMessages messages={messages} typing={typing} onSuggestionSelect={handleSuggestionSelect} />
        <ChatInput input={input} setInput={setInput} onSend={sendMessage} disabled={typing} />
      </div>
    </div>
  );
}
