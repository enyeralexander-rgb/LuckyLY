"use client";
import { useEffect, useState } from "react";

import { Footer } from "../../components/Footer";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export default function FaqPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/faq")
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <>
      <main style={{ minHeight: "80vh", padding: "2rem 1rem", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", color: "var(--text-primary)", marginBottom: "0.5rem", fontSize: "2rem" }}>
          Preguntas Frecuentes
        </h1>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "2rem" }}>
          Encuentra respuestas a las preguntas más comunes sobre nuestros sorteos.
          De igual manera te invitamos a unirte a nuestra comunidad en Instagram, Facebook y WhatsApp
          para mantenerte al tanto de nuestros sorteos y responder a todas tus preguntas.
        </p>

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "2rem" }}>Cargando...</div>
        ) : items.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No hay preguntas frecuentes disponibles en este momento.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {items.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    overflow: "hidden",
                    transition: "box-shadow 0.2s",
                    boxShadow: isOpen ? "0 4px 12px rgba(133, 187, 101, 0.2)" : undefined,
                  }}
                >
                  <button
                    onClick={() => toggle(item.id)}
                    style={{
                      width: "100%",
                      padding: "1.25rem 1.5rem",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1rem",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "1.05rem", lineHeight: 1.4 }}>
                      {item.question}
                    </span>
                    <span
                      style={{
                        fontSize: "1.25rem",
                        color: "var(--color-primary)",
                        transition: "transform 0.3s ease",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        flexShrink: 0,
                      }}
                    >
                      ▼
                    </span>
                  </button>
                  <div
                    style={{
                      maxHeight: isOpen ? "500px" : "0",
                      overflow: "hidden",
                      transition: "max-height 0.35s ease, padding 0.35s ease",
                      padding: isOpen ? "0 1.5rem 1.25rem" : "0 1.5rem",
                    }}
                  >
                    <div
                      style={{
                        borderTop: "1px solid var(--border-color)",
                        paddingTop: "1rem",
                        color: "var(--text-secondary)",
                        fontSize: "0.95rem",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {item.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
