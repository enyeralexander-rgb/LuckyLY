"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";

type SocialMedia = {
  id: string;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  youtube: string | null;
  tiktok: string | null;
  whatsapp: string | null;
};

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
    whatsapp: ""
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
              whatsapp: data.whatsapp || ""
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
        <h1>Redes Sociales</h1>
        <div className="card" style={{ padding: "1.5rem", display: "grid", gap: "1.5rem" }}>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: ".5rem", color: "#3E3E3C", fontWeight: 600 }}>
                Facebook URL
              </label>
              <input
                type="url"
                value={formData.facebook}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                placeholder="https://facebook.com/tu-pagina"
                style={{
                  width: "100%",
                  padding: ".75rem",
                  borderRadius: "8px",
                  border: "1px solid #d4d4c4",
                  background: "#F5F5E6",
                  color: "#3E3E3C",
                  fontSize: "1rem"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: ".5rem", color: "#3E3E3C", fontWeight: 600 }}>
                Instagram URL
              </label>
              <input
                type="url"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="https://instagram.com/tu-cuenta"
                style={{
                  width: "100%",
                  padding: ".75rem",
                  borderRadius: "8px",
                  border: "1px solid #d4d4c4",
                  background: "#F5F5E6",
                  color: "#3E3E3C",
                  fontSize: "1rem"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: ".5rem", color: "#3E3E3C", fontWeight: 600 }}>
                Twitter URL
              </label>
              <input
                type="url"
                value={formData.twitter}
                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                placeholder="https://twitter.com/tu-cuenta"
                style={{
                  width: "100%",
                  padding: ".75rem",
                  borderRadius: "8px",
                  border: "1px solid #d4d4c4",
                  background: "#F5F5E6",
                  color: "#3E3E3C",
                  fontSize: "1rem"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: ".5rem", color: "#3E3E3C", fontWeight: 600 }}>
                YouTube URL
              </label>
              <input
                type="url"
                value={formData.youtube}
                onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                placeholder="https://youtube.com/@tu-canal"
                style={{
                  width: "100%",
                  padding: ".75rem",
                  borderRadius: "8px",
                  border: "1px solid #d4d4c4",
                  background: "#F5F5E6",
                  color: "#3E3E3C",
                  fontSize: "1rem"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: ".5rem", color: "#3E3E3C", fontWeight: 600 }}>
                TikTok URL
              </label>
              <input
                type="url"
                value={formData.tiktok}
                onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                placeholder="https://tiktok.com/@tu-cuenta"
                style={{
                  width: "100%",
                  padding: ".75rem",
                  borderRadius: "8px",
                  border: "1px solid #d4d4c4",
                  background: "#F5F5E6",
                  color: "#3E3E3C",
                  fontSize: "1rem"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: ".5rem", color: "#3E3E3C", fontWeight: 600 }}>
                WhatsApp URL
              </label>
              <input
                type="url"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="https://wa.me/584123456789"
                style={{
                  width: "100%",
                  padding: ".75rem",
                  borderRadius: "8px",
                  border: "1px solid #d4d4c4",
                  background: "#F5F5E6",
                  color: "#3E3E3C",
                  fontSize: "1rem"
                }}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: ".75rem 1.5rem",
              background: saving ? "#6b7280" : "#85BB65",
              color: "#3E3E3C",
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
