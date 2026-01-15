"use client";
import { NavBar } from "../../components/NavBar";
import { Footer } from "../../components/Footer";
import { useEffect, useState } from "react";

type SocialMedia = {
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  youtube: string | null;
  tiktok: string | null;
  whatsapp: string | null;
};

export default function SocialPage() {
  const [social, setSocial] = useState<SocialMedia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/social")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setSocial(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <NavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "800px" }}>
        <h1>Redes Sociales</h1>
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : social ? (
          <div className="card" style={{ padding: "2rem", display: "grid", gap: "1.5rem" }}>
            {social.facebook && (
              <a href={social.facebook} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "#228D57", borderRadius: "8px", border: "1px solid #1f2937", textDecoration: "none", color: "#e2e8f0" }}>
                <span style={{ fontSize: "2rem" }}>📘</span>
                <span style={{ fontWeight: 600 }}>Facebook</span>
              </a>
            )}
            {social.instagram && (
              <a href={social.instagram} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "#228D57", borderRadius: "8px", border: "1px solid #1f2937", textDecoration: "none", color: "#e2e8f0" }}>
                <span style={{ fontSize: "2rem" }}>📷</span>
                <span style={{ fontWeight: 600 }}>Instagram</span>
              </a>
            )}
            {social.twitter && (
              <a href={social.twitter} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "#228D57", borderRadius: "8px", border: "1px solid #1f2937", textDecoration: "none", color: "#e2e8f0" }}>
                <span style={{ fontSize: "2rem" }}>🐦</span>
                <span style={{ fontWeight: 600 }}>Twitter</span>
              </a>
            )}
            {social.youtube && (
              <a href={social.youtube} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "#228D57", borderRadius: "8px", border: "1px solid #1f2937", textDecoration: "none", color: "#e2e8f0" }}>
                <span style={{ fontSize: "2rem" }}>📺</span>
                <span style={{ fontWeight: 600 }}>YouTube</span>
              </a>
            )}
            {social.tiktok && (
              <a href={social.tiktok} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "#228D57", borderRadius: "8px", border: "1px solid #1f2937", textDecoration: "none", color: "#e2e8f0" }}>
                <span style={{ fontSize: "2rem" }}>🎵</span>
                <span style={{ fontWeight: 600 }}>TikTok</span>
              </a>
            )}
            {social.whatsapp && (
              <a href={social.whatsapp} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "#228D57", borderRadius: "8px", border: "1px solid #1f2937", textDecoration: "none", color: "#e2e8f0" }}>
                <span style={{ fontSize: "2rem" }}>💬</span>
                <span style={{ fontWeight: 600 }}>WhatsApp</span>
              </a>
            )}
            {!social.facebook && !social.instagram && !social.twitter && !social.youtube && !social.tiktok && !social.whatsapp && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                No hay redes sociales configuradas.
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
            No hay redes sociales disponibles.
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

