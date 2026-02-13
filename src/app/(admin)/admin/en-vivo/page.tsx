"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import Link from "next/link";

type LiveConfig = {
  streamUrl: string;
  chatIframeUrl: string;
};

function EnVivoPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [config, setConfig] = useState<LiveConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ streamUrl: "", chatIframeUrl: "" });

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  useEffect(() => {
    if (auth?.token) {
      setLoading(true);
      fetch("/api/admin/live", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) {
            setConfig(data);
            setFormData({
              streamUrl: data.streamUrl || "",
              chatIframeUrl: data.chatIframeUrl || ""
            });
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [auth]);

  async function handleSave() {
    if (!auth?.token || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/live", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        alert("Configuración En vivo actualizada correctamente.");
      } else {
        const err = await res.json();
        alert(err.error || "Error al guardar");
      }
    } catch {
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!auth || loading) {
    return (
      <>
        <AdminNavBar />
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>Configuración En vivo</h1>
          <Link href="/admin" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>← Volver</Link>
        </div>
        <div className="card" style={{ padding: "1.5rem", display: "grid", gap: "1.5rem", maxWidth: "720px" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            Configura la URL del reproductor (canal) y la URL del widget de chat que se muestran en la sección <strong>/live</strong>.
          </p>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontWeight: 600, color: "var(--text-primary)" }}>URL del reproductor (iframe)</label>
            <input
              type="url"
              value={formData.streamUrl}
              onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
              placeholder="https://player.kick.com/luckylywin"
              style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
          </div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontWeight: 600, color: "var(--text-primary)" }}>URL del chat (iframe)</label>
            <textarea
              value={formData.chatIframeUrl}
              onChange={(e) => setFormData({ ...formData, chatIframeUrl: e.target.value })}
              placeholder="https://botrix.live/widgets/chat/..."
              rows={3}
              style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{ padding: "0.75rem 1.5rem", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <Link href="/live" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>Ver página En vivo →</Link>
          </div>
        </div>
      </main>
    </>
  );
}

export default function EnVivoPage() {
  return (
    <AuthGuard requiredRole={["SUPERADMIN", "MASTER"]}>
      <EnVivoPageContent />
    </AuthGuard>
  );
}
