"use client";

import { useEffect, useState, useRef } from "react";
import Pusher from "pusher-js";
import { Send } from "lucide-react";
import { getStoredAuth } from "../lib/clientAuth";

const CHANNEL_NAME = "live-chat";
const EVENT_NAME = "message";

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
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2";
    if (!key) {
      return;
    }

    const pusher = new Pusher(key, {
      cluster,
      enabledTransports: ["ws", "wss"],
    });

    const channel = pusher.subscribe(CHANNEL_NAME);

    channel.bind(EVENT_NAME, (payload: LiveChatMessage) => {
      setMessages((prev) => [...prev.slice(-199), payload]);
    });

    const onConnected = () => setConnected(true);
    const onDisconnected = () => setConnected(false);

    pusher.connection.bind("connected", onConnected);
    pusher.connection.bind("disconnected", onDisconnected);
    pusher.connection.bind("unavailable", onDisconnected);
    if (pusher.connection.state === "connected") {
      setConnected(true);
    }

    return () => {
      channel.unbind(EVENT_NAME);
      pusher.connection.unbind("connected", onConnected);
      pusher.connection.unbind("disconnected", onDisconnected);
      pusher.connection.unbind("unavailable", onDisconnected);
      pusher.unsubscribe(CHANNEL_NAME);
      pusher.disconnect();
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const auth = getStoredAuth();
    const user = auth?.user?.email?.split("@")[0] || "Anónimo";

    try {
      const res = await fetch("/api/live-chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, text }),
      });
      if (res.ok) {
        setInput("");
      }
    } catch {
      // Error silencioso o mostrar toast
    }
  };

  const hasPusher = Boolean(process.env.NEXT_PUBLIC_PUSHER_KEY);

  return (
    <div className="live-chat-inner">
      <div className="live-chat-status">
        {hasPusher ? (
          connected ? (
            <span className="live-chat-status-dot live-chat-status-online" />
          ) : (
            <span className="live-chat-status-dot live-chat-status-offline" />
          )
        ) : (
          <span className="live-chat-status-dot live-chat-status-offline" />
        )}
        <span className="live-chat-status-text">
          {!hasPusher
            ? "Chat no configurado"
            : connected
              ? "Chat en vivo"
              : "Conectando..."}
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
          disabled={!hasPusher || !connected}
          aria-label="Mensaje del chat"
        />
        <button
          type="submit"
          className="live-chat-send"
          disabled={!hasPusher || !connected || !input.trim()}
          aria-label="Enviar mensaje"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
