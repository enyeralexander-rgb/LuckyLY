"use client";
import { AuthGuard } from "../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../lib/clientAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VENEZUELAN_BANKS } from "../../../lib/banks";

type UserData = {
  id: string;
  name: string;
  email: string;
  nationalId: string | null;
  phoneNumber: string | null;
  bank: string | null;
  bankPhone: string | null;
};

export default function PerfilPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState({
    nationalId: "",
    bank: "",
    phoneNumber: ""
  });

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token) {
      setLoading(true);
      fetch("/api/user/profile", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            console.error("Error:", data.error);
            setLoading(false);
            return;
          }
          setUserData(data);
          setFormData({
            nationalId: data.nationalId || "",
            bank: data.bank || "",
            phoneNumber: data.phoneNumber || ""
          });
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error al cargar perfil:", err);
          setLoading(false);
        });
    }
  }, [auth]);

  async function handleSave() {
    if (!auth?.token || saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const updated = await res.json();
        setUserData(updated);
        setMessage({ type: "success", text: "Datos bancarios guardados exitosamente" });
        setTimeout(() => setMessage(null), 5000);
        const returnUrl = sessionStorage.getItem("returnUrl");
        if (returnUrl) {
          sessionStorage.removeItem("returnUrl");
          window.location.href = returnUrl;
        }
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Error al guardar datos" });
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage({ type: "error", text: "Error al guardar datos" });
    } finally {
      setSaving(false);
    }
  }

  function hasCompleteData(): boolean {
    return !!(formData.nationalId && formData.bank && formData.phoneNumber);
  }

  if (loading) {
    return (
      <AuthGuard requiredRole={["USER"]}>
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={["USER"]}>
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "800px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1>Datos Bancarios</h1>
          <Link href="/cuenta" style={{ color: "#85BB65", textDecoration: "none" }}>← Volver a MI CUENTA</Link>
        </div>

        <div className="card" style={{ padding: "1.5rem", display: "grid", gap: "1.5rem" }}>
          {message && (
            <p role="alert" style={{ margin: 0, padding: "0.75rem", borderRadius: "8px", background: message.type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)", color: message.type === "success" ? "#15803d" : "#b91c1c", fontWeight: 500 }}>
              {message.text}
            </p>
          )}
          <div>
            <p style={{ margin: "0 0 1rem", color: "#3E3E3C", fontSize: ".875rem", opacity: 0.8 }}>
              Estos datos se utilizarán para pagos y retiros de premios mediante Pago Móvil.
            </p>
          </div>

          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: ".5rem", color: "#3E3E3C", fontWeight: 600 }}>
                Cédula de Identidad *
              </label>
              <input
                type="text"
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                placeholder="Ej: V-12345678"
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
                Banco *
              </label>
              <select
                value={formData.bank}
                onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                style={{
                  width: "100%",
                  padding: ".75rem",
                  borderRadius: "8px",
                  border: "1px solid #d4d4c4",
                  background: "#F5F5E6",
                  color: "#3E3E3C",
                  fontSize: "1rem"
                }}
              >
                <option value="">Selecciona un banco.</option>
                {VENEZUELAN_BANKS.map((bank) => (
                  <option key={bank.code} value={bank.name}>
                    ({bank.code}) {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: ".5rem", color: "#3E3E3C", fontWeight: 600 }}>
                Teléfono (Pago Móvil) *
              </label>
              <input
                type="text"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="Ej: 0412-1234567"
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
            disabled={!hasCompleteData() || saving}
            style={{
              padding: ".75rem 1.5rem",
              background: hasCompleteData() && !saving ? "#85BB65" : "#6b7280",
              color: "#3E3E3C",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: hasCompleteData() && !saving ? "pointer" : "not-allowed"
            }}
          >
            {saving ? "Guardando..." : "Guardar Datos"}
          </button>
        </div>
      </main>
    </AuthGuard>
  );
}

