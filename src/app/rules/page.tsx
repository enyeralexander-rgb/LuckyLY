"use client";
import { Footer } from "../../components/Footer";
import { useEffect, useState } from "react";

export default function RulesPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/rules")
      .then((r) => r.json())
      .then((data) => {
        if (data.content) {
          setContent(data.content);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "800px" }}>
        <h1>Reglas de Sorteos</h1>
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : (
          <div className="card" style={{ padding: "2rem", whiteSpace: "pre-wrap", lineHeight: "1.8" }}>
            {content || "No hay reglas disponibles."}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

