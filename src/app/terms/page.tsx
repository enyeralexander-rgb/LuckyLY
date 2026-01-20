"use client";
import { Footer } from "../../components/Footer";
import { useEffect, useState } from "react";
import Link from "next/link";

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>Términos y Condiciones</h1>
          <Link href="/" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>← Volver</Link>
        </div>
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : content ? (
          <div 
            className="card" 
            style={{ padding: "2rem", lineHeight: "1.8" }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No hay términos y condiciones disponibles.
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

