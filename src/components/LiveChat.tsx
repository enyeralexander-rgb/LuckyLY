"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Send } from "lucide-react";
import { getStoredAuth } from "../lib/clientAuth";

export type LiveChatMessage = {
  id: string;
  user: string;
  text: string;
  ts: number;
};

export function LiveChat() {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const s = io(origin, { path: "/socket.io", autoConnect: true });

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("live-chat:message", (msg: LiveChatMessage) => {
      setMessages((prev) => [...prev.slice(-199), msg]);
    });

    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !socket?.connected) return;
    const auth = getStoredAuth();
    const user = auth?.user?.email?.split("@")[0] || "Anónimo";
    socket.emit("live-chat:message", { user, text });
    setInput("");
  };

  return (
    <div className="live-chat-inner">
      <div className="live-chat-status">
        {connected ? (
          <span className="live-chat-status-dot live-chat-status-online" />
        ) : (
          <span className="live-chat-status-dot live-chat-status-offline" />
        )}
        <span className="live-chat-status-text">
          {connected ? "Chat en vivo" : "Conectando..."}
        </span>
      </div>
      <div className="live-chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="live-chat-empty">Escribe un mensaje para comenzar.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="live-chat-message">
            <span className="live-chat-message-user">{msg.user}:</span>{" "}
            <span className="live-chat-message-text">{msg.text}</span>
          </div>
        ))}
      </div>
      <form className="live-chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="live-chat-input"
          placeholder="Escribe un mensaje..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          disabled={!connected}
          aria-label="Mensaje del chat"
        />
        <button
          type="submit"
          className="live-chat-send"
          disabled={!connected || !input.trim()}
          aria-label="Enviar mensaje"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
