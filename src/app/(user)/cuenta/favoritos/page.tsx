"use client";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import Link from "next/link";
import { getItemWithEmoji } from "../../../../lib/raffleEmojis";

export default function FavoritosPage() {
  const [auth, setAuth] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token) {
      setLoading(true);
      fetch("/api/user/favorites", {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            console.error("Error:", data.error);
            setFavorites([]);
          } else {
            setFavorites(data);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error:", err);
          setFavorites([]);
          setLoading(false);
        });
    }
  }, [auth]);

  async function toggleFavorite(raffleId: string) {
    if (!auth?.token) return;

    try {
      const res = await fetch("/api/user/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ raffleId }),
      });

      const data = await res.json();
      if (res.ok) {
        // Recargar favoritos
        const favoritesRes = await fetch("/api/user/favorites", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        const favoritesData = await favoritesRes.json();
        setFavorites(favoritesData || []);
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }

  return (
    <AuthGuard requiredRole={["USER"]}>
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "1200px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>⭐ Mis Favoritos</h1>
          <Link href="/cuenta" style={{ color: "#85BB65", textDecoration: "none", fontWeight: 600 }}>
            ← Volver a MI CUENTA
          </Link>
        </div>

        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando favoritos...</div>
        ) : favorites.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>No tienes sorteos favoritos aún.</p>
            <Link href="/" style={{ color: "#85BB65", textDecoration: "none", marginTop: "1rem", display: "inline-block" }}>
              Explorar Sorteos →
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {favorites.map((fav) => {
              const raffle = fav.raffle;
              if (!raffle) return null;

              return (
                <div key={fav.id} className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{raffle.title}</h3>
                    <button
                      onClick={() => toggleFavorite(raffle.id)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "1.5rem",
                        cursor: "pointer",
                        padding: "0.25rem",
                      }}
                      title="Quitar de favoritos"
                    >
                      ⭐
                    </button>
                  </div>

                  {raffle.description && (
                    <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>{raffle.description}</p>
                  )}

                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem", color: "var(--text-primary)" }}>
                    <span>💰 Bs. {Number(raffle.pricePerSlot).toFixed(2)}</span>
                    <span>🎯 {raffle.slots} cupos</span>
                  </div>

                  <div style={{ marginTop: "auto" }}>
                    <Link
                      href={`/raffles/${raffle.id}`}
                      style={{
                        display: "block",
                        padding: "0.75rem",
                        background: "#85BB65",
                        color: "var(--text-primary)",
                        textAlign: "center",
                        textDecoration: "none",
                        borderRadius: "8px",
                        fontWeight: 600,
                      }}
                    >
                      Ver Sorteo
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
