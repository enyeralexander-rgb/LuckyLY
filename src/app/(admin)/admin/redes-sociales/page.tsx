"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import Link from "next/link";

type SocialMedia = {
  id: string;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  youtube: string | null;
  tiktok: string | null;
  whatsapp: string | null;
  facebookEnabled?: boolean;
  instagramEnabled?: boolean;
  twitterEnabled?: boolean;
  youtubeEnabled?: boolean;
  tiktokEnabled?: boolean;
  whatsappEnabled?: boolean;
};

const NETWORKS = [
  { key: "facebook", label: "Facebook URL", placeholder: "https://facebook.com/tu-pagina" },
  { key: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/tu-cuenta" },
  { key: "twitter", label: "Twitter URL", placeholder: "https://twitter.com/tu-cuenta" },
  { key: "youtube", label: "YouTube URL", placeholder: "https://youtube.com/@tu-canal" },
  { key: "tiktok", label: "TikTok URL", placeholder: "https://tiktok.com/@tu-cuenta" },
  { key: "whatsapp", label: "WhatsApp URL", placeholder: "https://wa.me/584123456789" }
] as const;

function RedesSocialesPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [social, setSocial] = useState<SocialMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    facebook: "",
    instagram: "",
    twitter: "",
    youtube: "",
    tiktok: "",
    whatsapp: "",
    facebookEnabled: true,
    instagramEnabled: true,
    twitterEnabled: true,
    youtubeEnabled: true,
    tiktokEnabled: true,
    whatsappEnabled: true
  });

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  useEffect(() => {
    if (auth?.token) {
      setLoading(true);
      fetch("/api/admin/social", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) {
            setSocial(data);
            setFormData({
              facebook: data.facebook || "",
              instagram: data.instagram || "",
              twitter: data.twitter || "",
              youtube: data.youtube || "",
              tiktok: data.tiktok || "",
              whatsapp: data.whatsapp || "",
              facebookEnabled: data.facebookEnabled !== false,
              instagramEnabled: data.instagramEnabled !== false,
              twitterEnabled: data.twitterEnabled !== false,
              youtubeEnabled: data.youtubeEnabled !== false,
              tiktokEnabled: data.tiktokEnabled !== false,
              whatsappEnabled: data.whatsappEnabled !== false
            });
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [auth]);

  function setEnabled(key: (typeof NETWORKS)[number]["key"], value: boolean) {
    const enabledKey = `${key}Enabled` as keyof typeof formData;
    setFormData((prev) => ({ ...prev, [enabledKey]: value }));
  }

  async function handleSave() {
    if (!auth?.token || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/social", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const updated = await res.json();
        setSocial(updated);
        alert("Redes sociales actualizadas exitosamente");
      } else {
        const error = await res.json();
        alert(error.error || "Error al guardar");
      }
    } catch (error) {
      console.error("Error:", error);
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
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "800px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>Redes Sociales</h1>
          <Link href="/admin" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>← Volver</Link>
        </div>
        <div className="card" style={{ padding: "1.5rem", display: "grid", gap: "1.5rem" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".875rem" }}>
            Los enlaces habilitados se muestran en el menú flotante de la página principal (abajo a la izquierda). Deshabilita una red para ocultarla del menú sin borrar la URL.
          </p>
          <div style={{ display: "grid", gap: "1.25rem" }}>
            {NETWORKS.map(({ key, label, placeholder }) => {
              const enabledKey = `${key}Enabled` as keyof typeof formData;
              const enabled = !!formData[enabledKey];
              const value = formData[key as keyof typeof formData] as string;
              return (
                <div
                  key={key}
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: enabled ? undefined : "var(--input-bg)",
                    opacity: enabled ? 1 : 0.85
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem", flexWrap: "wrap", gap: ".5rem" }}>
                    <label style={{ color: "var(--text-primary)", fontWeight: 600 }}>{label}</label>
                    <button
                      type="button"
                      onClick={() => setEnabled(key, !enabled)}
                      style={{
                        padding: ".35rem .75rem",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: ".8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        background: enabled ? "#dc2626" : "#16a34a",
                        color: "#fff"
                      }}
                    >
                      {enabled ? "Deshabilitar" : "Habilitar"}
                    </button>
                  </div>
                  <input
                    type="url"
                    value={value}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    placeholder={placeholder}
                    disabled={!enabled}
                    style={{
                      width: "100%",
                      padding: ".75rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--input-bg)",
                      color: "var(--text-primary)",
                      fontSize: "1rem"
                    }}
                  />
                </div>
              );
            })}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: ".75rem 1.5rem",
              background: saving ? "#6b7280" : "#85BB65",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: saving ? "not-allowed" : "pointer"
            }}
          >
            {saving ? "Guardando..." : "Guardar Redes Sociales"}
          </button>
        </div>
      </main>
    </>
  );
}

export default function RedesSocialesPage() {
  return (
    <AuthGuard requiredRole={["MASTER"]}>
      <RedesSocialesPageContent />
    </AuthGuard>
  );
}
