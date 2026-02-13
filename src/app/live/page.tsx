"use client";

import { Footer } from "../../components/Footer";
import { useEffect, useState } from "react";
import Link from "next/link";

type LiveConfig = {
  streamUrl: string;
  chatIframeUrl: string;
};

export default function LivePage() {
  const [config, setConfig] = useState<LiveConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    <>
      <main className="container live-page">
        <div className="live-page-header">
          <h1 className="live-page-title">En vivo</h1>
          <Link href="/" className="live-page-back">← Inicio</Link>
        </div>

        {loading ? (
          <div className="card live-loading">Cargando...</div>
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
              {config?.chatIframeUrl ? (
                <iframe
                  src={config.chatIframeUrl}
                  className="live-chat-iframe"
                  title="Chat en vivo"
                />
              ) : (
                <div className="live-placeholder">Sin chat configurado</div>
              )}
            </div>
          </div>
        )}

        <div className="live-cta">
          <Link href="/sorteos" className="live-cta-button">¡Juega ahora!</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
