"use client";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VENEZUELAN_BANKS } from "../../../../lib/banks";

type UserData = {
  id: string;
  name: string;
  email: string;
  documentId: string | null;
  nationalId: string | null;
  nationalIdType: string | null;
  phoneNumber: string | null;
  bank: string | null;
  bankPhone: string | null;
  bankDataUpdatedAt: string | null;
};

export default function DatosBancariosPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState({
    nationalIdType: "V",
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
    if (!auth?.token) return;
    setLoading(true);
    fetch("/api/user/profile", {
      headers: { Authorization: `Bearer ${auth.token}` },
      cache: "no-store",
      credentials: "same-origin",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          console.error("Error:", data.error);
          setLoading(false);
          return;
        }
        setUserData(data);
        setFormData({
          nationalIdType: data.nationalIdType || "V",
          nationalId: data.nationalId || "",
          bank: data.bank ?? "",
          phoneNumber: data.phoneNumber ?? "",
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar perfil:", err);
        setLoading(false);
      });
  }, [auth]);

  async function handleSave() {
    if (!auth?.token || saving) return;

    const phoneDigits = formData.phoneNumber.replace(/\D/g, "");
    if (!formData.bank || !formData.phoneNumber.trim()) {
      setMessage({ type: "error", text: "Banco y teléfono son obligatorios." });
      return;
    }
    if (phoneDigits.length < 11) {
      setMessage({ type: "error", text: "El teléfono debe tener al menos 11 dígitos." });
      return;
    }

    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          bank: formData.bank,
          phoneNumber: phoneDigits,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setUserData(data);
        setFormData({
          nationalIdType: data.nationalIdType || "V",
          nationalId: data.nationalId || "",
          bank: data.bank ?? formData.bank,
          phoneNumber: data.phoneNumber ?? phoneDigits,
        });
        setMessage({ type: "success", text: "Datos bancarios guardados exitosamente" });
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: "error", text: data.error || "Error al guardar datos" });
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage({ type: "error", text: "Error al guardar datos" });
    } finally {
      setSaving(false);
    }
  }

  function hasCompleteData(): boolean {
    const phoneDigits = formData.phoneNumber.replace(/\D/g, "");
    return !!(formData.bank && formData.phoneNumber.trim() && phoneDigits.length >= 11);
  }

  // Calcular restricción de 1 semana para datos bancarios
  function getBankDataRestriction(): { canChange: boolean; daysRemaining: number } | null {
    if (!userData?.bank || !userData?.phoneNumber || !userData?.bankDataUpdatedAt) {
      return null; // Nunca ha guardado datos, puede guardar
    }
    const lastUpdate = new Date(userData.bankDataUpdatedAt);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 7 - daysSinceUpdate);
    return { canChange: daysSinceUpdate >= 7, daysRemaining };
  }

  const bankRestriction = getBankDataRestriction();

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
          <h1 style={{ color: "var(--text-primary)" }}>DATOS BANCARIOS</h1>
          <Link href="/cuenta" style={{ color: "#85BB65", textDecoration: "none", fontWeight: 600 }}>← Volver a MI CUENTA</Link>
        </div>

        <div className="card" style={{ padding: "1.5rem", display: "grid", gap: "1.5rem" }}>
          <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "2px solid #ef4444", borderRadius: "8px", marginBottom: "1rem" }}>
            <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              ⚠️ IMPORTANTE
            </div>
            <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase" }}>
              LOS MISMOS DATOS BANCARIOS INGRESADOS SE UTILIZARÁN PARA REALIZAR EL PAGO EN CASO DE SER GANADORES DE ALGUNO DE LOS SORTEOS.
            </div>
          </div>

          {/* Aviso de restricción semanal */}
          <div style={{ padding: "1rem", background: "rgba(245, 158, 11, 0.1)", border: "2px solid #f59e0b", borderRadius: "8px" }}>
            <div style={{ color: "#d97706", fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.5rem" }}>
              📅 RESTRICCIÓN DE MODIFICACIÓN
            </div>
            <div style={{ color: "#d97706", fontSize: "0.875rem" }}>
              Una vez que guardes tus datos bancarios, solo podrás modificarlos <strong>1 vez por semana</strong>. 
              Asegúrate de ingresar la información correcta antes de guardar.
            </div>
            {bankRestriction && !bankRestriction.canChange && (
              <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "rgba(245, 158, 11, 0.2)", borderRadius: "4px" }}>
                <strong>⏳ Próxima modificación disponible en: {bankRestriction.daysRemaining} día(s)</strong>
              </div>
            )}
          </div>

          {message && (
            <p role="alert" style={{ margin: 0, padding: "0.75rem", borderRadius: "8px", background: message.type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)", color: message.type === "success" ? "#15803d" : "#b91c1c", fontWeight: 500 }}>
              {message.text}
            </p>
          )}

          <div>
            <p style={{ margin: "0 0 1rem", color: "var(--text-primary)", fontSize: ".875rem", opacity: 0.8 }}>
              Estos datos se utilizarán para pagos de cupos y retiros de premios mediante Pago Móvil.
            </p>
          </div>

          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: ".5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                Documento de Identidad *
              </label>
              <input
                type="text"
                value={userData?.documentId || ""}
                disabled
                readOnly
                style={{
                  width: "100%",
                  padding: ".75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--input-disabled-bg)",
                  color: "var(--text-secondary)",
                  fontSize: "1rem",
                  cursor: "not-allowed"
                }}
              />
              <small style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                Este dato no se puede modificar. Fue registrado al crear tu cuenta.
              </small>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: ".5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                Banco *
              </label>
              <select
                value={formData.bank}
                onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                style={{
                  width: "100%",
                  padding: ".75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  fontSize: "1rem"
                }}
              >
                <option value="">Selecciona un banco</option>
                {VENEZUELAN_BANKS.map((bank) => (
                  <option key={bank.code} value={bank.enumValue}>
                    ({bank.code}) {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="phone-datos-bancarios" style={{ display: "block", marginBottom: ".5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                Teléfono (Pago Móvil) *
              </label>
              <input
                id="phone-datos-bancarios"
                type="tel"
                inputMode="numeric"
                value={formData.phoneNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData({ ...formData, phoneNumber: value });
                  if (message) setMessage(null);
                }}
                placeholder="Ej: 04121234567 (mín. 11 dígitos)"
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
              <small style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                Solo números (sin guiones ni espacios)
              </small>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!hasCompleteData() || saving || (bankRestriction !== null && !bankRestriction.canChange)}
            style={{
              padding: ".75rem 1.5rem",
              background: hasCompleteData() && !saving && (bankRestriction === null || bankRestriction.canChange) ? "#85BB65" : "#6b7280",
              color: "var(--text-primary)",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: hasCompleteData() && !saving && (bankRestriction === null || bankRestriction.canChange) ? "pointer" : "not-allowed"
            }}
          >
            {saving ? "Guardando..." : bankRestriction !== null && !bankRestriction.canChange ? `Disponible en ${bankRestriction.daysRemaining} día(s)` : "Guardar Datos"}
          </button>
        </div>
      </main>
    </AuthGuard>
  );
}
