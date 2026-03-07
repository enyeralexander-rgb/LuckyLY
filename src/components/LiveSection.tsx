"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../lib/clientAuth";
import { LiveChat } from "./LiveChat";

type LiveConfig = {
  streamUrl: string;
  chatIframeUrl: string;
};

export function LiveSection() {
  const [config, setConfig] = useState<LiveConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuth(getStoredAuth());
    fetch("/api/public/live")
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          streamUrl: data.streamUrl || "",
          chatIframeUrl: data.chatIframeUrl || ""
        });
      })
      .catch(() => setConfig({ streamUrl: "", chatIframeUrl: "" }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="container home-live-section" style={{ display: "grid", gap: "1.5rem", padding: "2rem 0" }}>
      <div className="card home-live-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <h2 className="home-live-title">MOMENTO DE LA SUERTE</h2>
          <Link
            href="/live"
            style={{
              color: "#85BB65",
              textDecoration: "none",
              fontWeight: 600,
              padding: ".5rem 1rem",
              borderRadius: "8px",
              border: "1px solid #85BB65"
            }}
          >
            Ir a la sala →
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Cargando...</div>
        ) : (
          <div className="live-layout">
            <div className="live-stream-wrap">
              {config?.streamUrl ? (
                <iframe
                  src={config.streamUrl}
                  className="live-stream-iframe"
                  allowFullScreen
                  title="Stream en vivo"
                />
              ) : (
                <div className="live-placeholder">Sin reproductor configurado</div>
              )}
            </div>
            <div className="live-chat-wrap">
              <LiveChat />
            </div>
          </div>
        )}

        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".875rem", textAlign: "center" }}>
          Mira el stream en vivo y participa en el chat. Configura el canal y el chat desde el módulo En vivo en el panel de administración.
        </p>
        {mounted && !auth && (
          <Link
            href="/auth/login"
            style={{
              padding: ".75rem 1.5rem",
              background: "#85BB65",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              width: "fit-content",
              textDecoration: "none",
              display: "inline-block",
              margin: "0 auto",
              textTransform: "uppercase",
              fontFamily: "var(--font-cherry-bomb), cursive, system-ui, sans-serif"
            }}
          >
            JUEGA Y GANA ¡AHORA!
          </Link>
        )}
      </div>
    </section>
  );
}
