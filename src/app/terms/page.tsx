"use client";
import { Footer } from "../../components/Footer";
import { useEffect, useState } from "react";

export default function TermsPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/terms")
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
        <h1>Términos y Condiciones</h1>
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : (
          <div className="card" style={{ padding: "2rem", whiteSpace: "pre-wrap", lineHeight: "1.8" }}>
            {content || "No hay términos y condiciones disponibles."}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

