"use client";
import { AdminNavBar } from "../../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../../components/AuthGuard";
import { useState } from "react";
import { getStoredAuth } from "../../../../../lib/clientAuth";
import { useRouter } from "next/navigation";

const VENEZUELA_STATES = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar",
  "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón",
  "Guárico", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta",
  "Portuguesa", "Sucre", "Táchira", "Trujillo", "Vargas", "Yaracuy", "Zulia"
];

function CrearSorteosPageContent() {
  const router = useRouter();
  const auth = getStoredAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "NUMBERS" as "NUMBERS" | "ANIMALS" | "STATES" | "FLAGS" | "ZODIAC",
    pricePerSlot: "",
    slots: "",
    winnersCount: 1,
    startsAt: "",
    prizes: [""], // Se ajustará automáticamente según winnersCount
    mirrorMode: false
  });

  const [customItems, setCustomItems] = useState<string[]>([]);

  function handleTypeChange(type: string) {
    if (type === "STATES") {
      setCustomItems(VENEZUELA_STATES);
      setFormData({ ...formData, type: type as any, slots: "24" });
    } else if (type === "ZODIAC") {
      setCustomItems([]);
      setFormData({ ...formData, type: type as any, slots: "12" });
    } else {
      setCustomItems([]);
      setFormData({ ...formData, type: type as any, slots: "" });
    }
  }

  function handleWinnersCountChange(count: number) {
    // Ajustar el número de premios al número de ganadores
    const currentPrizes = [...formData.prizes];
    const newPrizes: string[] = [];
    
    // Asegurar que siempre haya exactamente 'count' premios
    for (let i = 0; i < count; i++) {
      newPrizes.push(currentPrizes[i] !== undefined ? currentPrizes[i] : "");
    }
    
    setFormData({ ...formData, winnersCount: count, prizes: newPrizes });
  }

  function updatePrize(index: number, value: string) {
    // Solo permitir números (incluyendo punto decimal)
    const numericValue = value.replace(/[^0-9.]/g, "");
    // Evitar múltiples puntos decimales
    const parts = numericValue.split(".");
    const cleanValue = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : numericValue;
    
    const newPrizes = [...formData.prizes];
    newPrizes[index] = cleanValue;
    setFormData({ ...formData, prizes: newPrizes });
  }

  function validatePrizes(): { error: string | null, invalidIndex: number | null } {
    // Validar que el 3° ganador no puede ganar más que el 2°, y el 2° no puede ganar más que el 1°
    const prizes = formData.prizes.slice(0, formData.winnersCount).map(p => parseFloat(p) || 0);
    
    if (prizes.length >= 3 && prizes[2] > prizes[1]) {
      return { error: "El 3° ganador no puede ganar un monto mayor que el 2° ganador", invalidIndex: 2 };
    }
    if (prizes.length >= 2 && prizes[1] > prizes[0]) {
      return { error: "El 2° ganador no puede ganar un monto mayor que el 1° ganador", invalidIndex: 1 };
    }
    
    return { error: null, invalidIndex: null };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth?.token) {
      alert("No autenticado");
      return;
    }

    // Validar premios antes de enviar
    const validation = validatePrizes();
    if (validation.error) {
      alert(validation.error);
      return;
    }

    // Validar que haya un premio válido por cada ganador
    const validPrizes = formData.prizes.slice(0, formData.winnersCount).filter(p => p.trim() !== "" && parseFloat(p) > 0);
    if (validPrizes.length !== formData.winnersCount) {
      alert(`Debe ingresar ${formData.winnersCount} premio(s) válido(s) para ${formData.winnersCount} ganador(es)`);
      return;
    }

    setLoading(true);
    try {
      // Formatear premios como "Bs. X.XX"
      const formattedPrizes = validPrizes.map(p => `Bs. ${parseFloat(p).toFixed(2)}`);
      
      const payload = {
        ...formData,
        pricePerSlot: parseFloat(formData.pricePerSlot),
        slots: parseInt(formData.slots),
        prizes: formattedPrizes,
        startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : null
      };

      const res = await fetch("/api/raffles", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Sorteo creado exitosamente");
        router.push("/admin/sorteos/ejecutar");
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "No se pudo crear el sorteo"}`);
      }
    } catch (error) {
      alert("Error al crear sorteo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "800px" }}>
        <h1 style={{ color: "var(--text-primary)" }}>Crear Sorteo</h1>
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
            <select
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            >
              <option value="NUMBERS">NÚMEROS (10-100)</option>
              <option value="ANIMALS">ANIMALES (10-50)</option>
              <option value="STATES">ESTADOS (24 fijos)</option>
              <option value="FLAGS">BANDERAS (10-100)</option>
              <option value="ZODIAC">SIGNOS ZODIACALES (12 fijos)</option>
            </select>
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
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
          </div>

          <div style={{ display: "grid", gap: ".5rem" }}>
            <label style={{ color: "var(--text-primary)" }}>Cantidad de cupos</label>
            <input
              type="number"
              min={formData.type === "STATES" || formData.type === "ZODIAC" ? (formData.type === "STATES" ? 24 : 12) : formData.type === "NUMBERS" || formData.type === "FLAGS" ? 10 : 10}
              max={formData.type === "STATES" || formData.type === "ZODIAC" ? (formData.type === "STATES" ? 24 : 12) : formData.type === "NUMBERS" || formData.type === "FLAGS" ? 100 : 50}
              required
              value={formData.slots}
              onChange={(e) => {
                if (formData.type !== "STATES" && formData.type !== "ZODIAC") {
                  setFormData({ ...formData, slots: e.target.value });
                }
              }}
              disabled={formData.type === "STATES" || formData.type === "ZODIAC"}
              style={{ 
                padding: ".75rem", 
                borderRadius: "8px", 
                border: "1px solid var(--border-color)", 
                background: (formData.type === "STATES" || formData.type === "ZODIAC") ? "var(--input-disabled-bg)" : "var(--input-bg)", 
                color: "var(--text-primary)",
                cursor: (formData.type === "STATES" || formData.type === "ZODIAC") ? "not-allowed" : "text",
                opacity: (formData.type === "STATES" || formData.type === "ZODIAC") ? 0.7 : 1
              }}
            />
            <small style={{ color: "var(--text-primary)", opacity: 0.7 }}>
              {formData.type === "STATES" ? "24 estados fijos (automático)" : formData.type === "ZODIAC" ? "12 signos zodiacales fijos (automático)" : formData.type === "NUMBERS" || formData.type === "FLAGS" ? "Entre 10 y 100" : "Entre 10 y 50"}
            </small>
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
              onBlur={(e) => {
                const value = parseInt(e.target.value) || 1;
                const clampedValue = Math.min(Math.max(value, 1), 3);
                if (value !== clampedValue) {
                  handleWinnersCountChange(clampedValue);
                }
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
            <small style={{ color: "var(--text-primary)", opacity: 0.7 }}>Modificable hasta agotar los cupos</small>
          </div>

          <div style={{ display: "grid", gap: ".5rem" }}>
            <label style={{ color: "var(--text-primary)" }}>Premios (Bs.) - {formData.winnersCount} premio(s) requerido(s)</label>
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
                    placeholder="0.00"
                    style={{ 
                      padding: ".75rem", 
                      borderRadius: "8px", 
                      border: hasError ? "1px solid #ef4444" : "1px solid #d4d4c4", 
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
            <small style={{ color: "var(--text-primary)", opacity: 0.7 }}>
              Los premios deben estar ordenados de mayor a menor (1° ganador ≥ 2° ganador ≥ 3° ganador)
            </small>
          </div>

          <label style={{ display: "flex", gap: ".5rem", alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={formData.mirrorMode}
              onChange={(e) => setFormData({ ...formData, mirrorMode: e.target.checked })}
            />
            <span>Modo espejo (duplicar cupos)</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{ padding: ".75rem 1.5rem", borderRadius: "8px", border: "none", background: "#85BB65", color: "var(--text-primary)", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Guardando..." : "Crear Sorteo"}
          </button>
        </form>
      </main>
    </>
  );
}

export default function CrearSorteosPage() {
  return (
    <AuthGuard requiredRole={["AGENT", "SUPERADMIN", "MASTER"]}>
      <CrearSorteosPageContent />
    </AuthGuard>
  );
}
