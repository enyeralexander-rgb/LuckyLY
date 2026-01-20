"use client";
import { AdminNavBar } from "../../../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../../../components/AuthGuard";
import { useState, useEffect } from "react";
import { getStoredAuth } from "../../../../../../lib/clientAuth";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const VENEZUELA_STATES = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar",
  "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón",
  "Guárico", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta",
  "Portuguesa", "Sucre", "Táchira", "Trujillo", "Vargas", "Yaracuy", "Zulia"
];

function ModificarSorteoPageContent() {
  const router = useRouter();
  const params = useParams();
  const raffleId = params.id as string;
  const auth = getStoredAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "NUMBERS" as "NUMBERS" | "ANIMALS" | "STATES" | "FLAGS" | "ZODIAC",
    pricePerSlot: "",
    slots: "",
    winnersCount: 1,
    startsAt: "",
    prizes: [""],
    mirrorMode: false
  });

  useEffect(() => {
    async function loadRaffle() {
      if (!auth?.token || !raffleId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/raffles/${raffleId}`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        const data = await res.json();

        if (data.error) {
          alert(`Error: ${data.error}`);
          router.push("/admin/sorteos/ejecutar");
          return;
        }

        // Verificar si se puede editar (no hay cupos CONFIRMED)
        const confirmedItems = data.ticketItems?.filter((item: any) => item.status === "CONFIRMED") || [];
        if (confirmedItems.length > 0) {
          setCanEdit(false);
        }

        // Parsear premios
        let parsedPrizes: string[] = [""];
        if (data.prizes && Array.isArray(data.prizes)) {
          parsedPrizes = data.prizes.map((p: string) => {
            const match = p.match(/[\d.]+/);
            return match ? match[0] : "";
          });
        }

        // Formatear fecha para input datetime-local
        let formattedStartsAt = "";
        if (data.startsAt) {
          const date = new Date(data.startsAt);
          formattedStartsAt = date.toISOString().slice(0, 16);
        }

        setFormData({
          title: data.title || "",
          description: data.description || "",
          type: data.type || "NUMBERS",
          pricePerSlot: data.pricePerSlot?.toString() || "",
          slots: data.slots?.toString() || "",
          winnersCount: data.winnersCount || 1,
          startsAt: formattedStartsAt,
          prizes: parsedPrizes.length > 0 ? parsedPrizes : [""],
          mirrorMode: data.mirrorMode || false
        });
      } catch (err) {
        console.error("Error al cargar sorteo:", err);
        alert("Error al cargar el sorteo");
        router.push("/admin/sorteos/ejecutar");
      } finally {
        setLoading(false);
      }
    }

    loadRaffle();
  }, [raffleId, auth?.token]);

  function handleWinnersCountChange(count: number) {
    const currentPrizes = [...formData.prizes];
    const newPrizes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      newPrizes.push(currentPrizes[i] !== undefined ? currentPrizes[i] : "");
    }
    
    setFormData({ ...formData, winnersCount: count, prizes: newPrizes });
  }

  function updatePrize(index: number, value: string) {
    const numericValue = value.replace(/[^0-9.]/g, "");
    const parts = numericValue.split(".");
    const cleanValue = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : numericValue;
    
    const newPrizes = [...formData.prizes];
    newPrizes[index] = cleanValue;
    setFormData({ ...formData, prizes: newPrizes });
  }

  function validatePrizes(): { error: string | null, invalidIndex: number | null } {
    const prizes = formData.prizes.slice(0, formData.winnersCount).map(p => parseFloat(p) || 0);
    
    if (prizes.length >= 3 && prizes[2] > prizes[1]) {
      return { error: "El 3° ganador no puede ganar un monto mayor que el 2° ganador", invalidIndex: 2 };
    }
    if (prizes.length >= 2 && prizes[1] > prizes[0]) {
      return { error: "El 2° ganador no puede ganar un monto mayor que el 1° ganador", invalidIndex: 1 };
    }
    
    return { error: null, invalidIndex: null };
  }

  function handlePriceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth?.token || !canEdit) {
      alert("No se puede editar este sorteo");
      return;
    }

    const validation = validatePrizes();
    if (validation.error) {
      alert(validation.error);
      return;
    }

    const validPrizes = formData.prizes.slice(0, formData.winnersCount).filter(p => p.trim() !== "" && parseFloat(p) > 0);
    if (validPrizes.length !== formData.winnersCount) {
      alert(`Debe ingresar ${formData.winnersCount} premio(s) válido(s)`);
      return;
    }

    setSaving(true);
    try {
      const formattedPrizes = validPrizes.map(p => `Bs. ${parseFloat(p).toFixed(2)}`);
      
      const payload = {
        title: formData.title,
        description: formData.description || null,
        pricePerSlot: parseFloat(formData.pricePerSlot),
        winnersCount: formData.winnersCount,
        prizes: formattedPrizes,
        startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : null,
        mirrorMode: formData.mirrorMode
      };

      const res = await fetch(`/api/raffles/${raffleId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${auth.token}` 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("✅ Sorteo actualizado exitosamente");
        router.push("/admin/sorteos/ejecutar");
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "No se pudo actualizar el sorteo"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al actualizar sorteo");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <AdminNavBar />
        <main className="container" style={{ paddingTop: "2rem", maxWidth: "800px" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando sorteo...</div>
        </main>
      </>
    );
  }

  if (!canEdit) {
    return (
      <>
        <AdminNavBar />
        <main className="container" style={{ paddingTop: "2rem", maxWidth: "800px" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            <h2 style={{ color: "#ef4444" }}>🔒 Sorteo no editable</h2>
            <p style={{ color: "var(--text-secondary)" }}>
              Este sorteo ya tiene cupos comprados y no puede ser editado.
            </p>
            <Link
              href="/admin/sorteos/ejecutar"
              style={{ display: "inline-block", marginTop: "1rem", padding: "0.75rem 1.5rem", background: "var(--color-primary)", color: "#fff", borderRadius: "8px", textDecoration: "none" }}
            >
              ← Volver a Ejecutar Sorteos
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "800px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>Editar Sorteo</h1>
          <Link href="/admin/sorteos/ejecutar" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
            ← Volver
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ display: "grid", gap: "1.5rem" }}>
          <div style={{ display: "grid", gap: ".5rem" }}>
            <label style={{ color: "var(--text-primary)" }}>Título del sorteo</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
          </div>

          <div style={{ display: "grid", gap: ".5rem" }}>
            <label style={{ color: "var(--text-primary)" }}>Descripción (opcional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
          </div>

          <div style={{ display: "grid", gap: ".5rem" }}>
            <label style={{ color: "var(--text-primary)" }}>Tipo de ruleta</label>
            <input
              type="text"
              value={formData.type}
              disabled
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-disabled-bg)", color: "var(--text-secondary)", cursor: "not-allowed" }}
            />
            <small style={{ color: "var(--text-secondary)" }}>El tipo de ruleta no puede modificarse</small>
          </div>

          <div style={{ display: "grid", gap: ".5rem" }}>
            <label style={{ color: "var(--text-primary)" }}>Precio por cupo (Bs.)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.pricePerSlot}
              onChange={(e) => setFormData({ ...formData, pricePerSlot: e.target.value })}
              onKeyDown={handlePriceKeyDown}
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
          </div>

          <div style={{ display: "grid", gap: ".5rem" }}>
            <label style={{ color: "var(--text-primary)" }}>Cantidad de cupos</label>
            <input
              type="text"
              value={formData.slots}
              disabled
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-disabled-bg)", color: "var(--text-secondary)", cursor: "not-allowed" }}
            />
            <small style={{ color: "var(--text-secondary)" }}>La cantidad de cupos no puede modificarse</small>
          </div>

          <div style={{ display: "grid", gap: ".5rem" }}>
            <label style={{ color: "var(--text-primary)" }}>Cantidad de ganadores (1-3)</label>
            <input
              type="number"
              min="1"
              max="3"
              required
              value={formData.winnersCount}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                const clampedValue = Math.min(Math.max(value, 1), 3);
                handleWinnersCountChange(clampedValue);
              }}
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
          </div>

          <div style={{ display: "grid", gap: ".5rem" }}>
            <label style={{ color: "var(--text-primary)" }}>Fecha y hora de inicio</label>
            <input
              type="datetime-local"
              value={formData.startsAt}
              onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
          </div>

          <div style={{ display: "grid", gap: ".5rem" }}>
            <label style={{ color: "var(--text-primary)" }}>Premios (Bs.)</label>
            {Array.from({ length: formData.winnersCount }, (_, idx) => {
              const prize = formData.prizes[idx] || "";
              const validation = validatePrizes();
              const hasError = validation.invalidIndex === idx;
              
              return (
                <div key={idx} style={{ display: "grid", gap: ".25rem" }}>
                  <label style={{ color: "var(--text-primary)", fontSize: ".875rem", fontWeight: 600 }}>
                    {idx === 0 ? "1°" : idx === 1 ? "2°" : "3°"} Ganador
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={prize}
                    onChange={(e) => updatePrize(idx, e.target.value)}
                    onKeyDown={handlePriceKeyDown}
                    placeholder="0.00"
                    style={{ 
                      padding: ".75rem", 
                      borderRadius: "8px", 
                      border: hasError ? "1px solid #ef4444" : "1px solid var(--border-color)", 
                      background: "var(--input-bg)", 
                      color: "var(--text-primary)" 
                    }}
                  />
                  {hasError && validation.error && (
                    <small style={{ color: "#ef4444", fontSize: ".75rem" }}>{validation.error}</small>
                  )}
                </div>
              );
            })}
          </div>

          <label style={{ display: "flex", gap: ".5rem", alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={formData.mirrorMode}
              onChange={(e) => setFormData({ ...formData, mirrorMode: e.target.checked })}
            />
            <span style={{ color: "var(--text-primary)" }}>Modo espejo (duplicar cupos)</span>
          </label>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              type="submit"
              disabled={saving}
              style={{ flex: 1, padding: ".75rem 1.5rem", borderRadius: "8px", border: "none", background: saving ? "#6b7280" : "#10b981", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Guardando..." : "💾 Guardar Cambios"}
            </button>
            <Link
              href="/admin/sorteos/ejecutar"
              style={{ padding: ".75rem 1.5rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-primary)", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </>
  );
}

export default function ModificarSorteoPage() {
  return (
    <AuthGuard requiredRole={["AGENT", "SUPERADMIN", "MASTER"]}>
      <ModificarSorteoPageContent />
    </AuthGuard>
  );
}
