"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useState, useEffect } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";

const VENEZUELA_STATES = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar",
  "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón",
  "Guárico", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta",
  "Portuguesa", "Sucre", "Táchira", "Trujillo", "Vargas", "Yaracuy", "Zulia"
];

function TemplatesPageContent() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "NUMBERS" as "NUMBERS" | "ANIMALS" | "STATES" | "FLAGS" | "ZODIAC",
    pricePerSlot: "",
    slots: "",
    winnersCount: 1,
    mirrorMode: false,
    prizes: [""],
    startsAt: "",
  });
  const [customItems, setCustomItems] = useState<string[]>([]);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token) {
      loadTemplates();
    }
  }, [auth]);

  async function loadTemplates() {
    if (!auth?.token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/templates", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await res.json();
      if (data.error) {
        console.error("Error:", data.error);
        setTemplates([]);
      } else {
        setTemplates(data);
      }
    } catch (err) {
      console.error("Error:", err);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  function handleTypeChange(type: string) {
    setFormData({ ...formData, type: type as any });
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
    
    // Validar que la suma de premios no exceda el 50% de las ganancias totales
    const pricePerSlot = parseFloat(formData.pricePerSlot) || 0;
    const slots = parseInt(formData.slots) || 0;
    const totalIncome = pricePerSlot * slots;
    const maxPrizeTotal = totalIncome * 0.5; // 50% máximo
    const totalPrizes = prizes.reduce((sum, p) => sum + p, 0);
    
    if (totalPrizes > maxPrizeTotal && totalIncome > 0) {
      return { 
        error: `La suma de premios (Bs. ${totalPrizes.toFixed(2)}) excede el 50% de las ganancias totales (Bs. ${maxPrizeTotal.toFixed(2)})`, 
        invalidIndex: 0 
      };
    }
    
    return { error: null, invalidIndex: null };
  }

  // Prevenir entrada de caracteres no numéricos en campos de precio
  function handlePriceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  }

  function handleSlotsKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
      e.preventDefault();
    }
  }

  function validateSlots(): { valid: boolean; error: string | null } {
    const slots = parseInt(formData.slots);
    
    if (isNaN(slots) || slots <= 0) {
      return { valid: false, error: "El número de cupos debe ser mayor a 0" };
    }

    switch (formData.type) {
      case "STATES":
        if (slots !== 24) {
          return { valid: false, error: "Los estados deben tener exactamente 24 cupos" };
        }
        break;
      case "ZODIAC":
        if (slots !== 12) {
          return { valid: false, error: "Los signos zodiacales deben tener exactamente 12 cupos" };
        }
        break;
      case "NUMBERS":
      case "FLAGS":
        if (slots < 10 || slots > 100) {
          return { valid: false, error: "Los números y banderas deben tener entre 10 y 100 cupos" };
        }
        break;
      case "ANIMALS":
        if (slots < 10 || slots > 50) {
          return { valid: false, error: "Los animales deben tener entre 10 y 50 cupos" };
        }
        break;
    }

    return { valid: true, error: null };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!auth?.token || creating) return;

    // Validar cupos
    const slotsValidation = validateSlots();
    if (!slotsValidation.valid) {
      alert(slotsValidation.error);
      return;
    }

    // Validar premios
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

    setCreating(true);
    try {
      // Formatear premios como "Bs. X.XX"
      const formattedPrizes = validPrizes.map(p => `Bs. ${parseFloat(p).toFixed(2)}`);

      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          type: formData.type,
          pricePerSlot: parseFloat(formData.pricePerSlot),
          slots: parseInt(formData.slots),
          winnersCount: formData.winnersCount,
          mirrorMode: formData.mirrorMode,
          prizes: formattedPrizes.length > 0 ? formattedPrizes : null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Plantilla creada exitosamente");
        setFormData({
          name: "",
          description: "",
          type: "NUMBERS",
          pricePerSlot: "",
          slots: "",
          winnersCount: 1,
          mirrorMode: false,
          prizes: [""],
          startsAt: "",
        });
        loadTemplates();
      } else {
        alert(`Error: ${data.error || "No se pudo crear la plantilla"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error al crear plantilla");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!auth?.token || !confirm("¿Estás seguro de eliminar esta plantilla?")) return;

    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (res.ok) {
        alert("Plantilla eliminada exitosamente");
        loadTemplates();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "No se pudo eliminar"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error al eliminar plantilla");
    }
  }

  async function handleCreateRaffle(templateId: string) {
    const title = prompt("Ingresa el título para el sorteo:");
    if (!title) return;

    if (!auth?.token) return;
    try {
      const res = await fetch(`/api/admin/templates/${templateId}/create-raffle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ title }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Sorteo creado exitosamente desde la plantilla");
        router.push(`/admin/sorteos/ejecutar`);
      } else {
        alert(`Error: ${data.error || "No se pudo crear el sorteo"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error al crear sorteo");
    }
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "800px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>Plantillas de Sorteos</h1>
          <Link href="/admin" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
            ← Volver al Dashboard
          </Link>
        </div>

        <form onSubmit={handleCreate} className="card" style={{ display: "grid", gap: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ margin: 0, color: "var(--text-primary)" }}>Crear Nueva Plantilla</h2>
          
          <div style={{ display: "grid", gap: ".5rem" }}>
            <label style={{ color: "var(--text-primary)" }}>Nombre de la plantilla *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            <label style={{ color: "var(--text-primary)" }}>Fecha y hora de inicio (opcional)</label>
            <input
              type="datetime-local"
              value={formData.startsAt}
              onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
            <small style={{ color: "var(--text-primary)", opacity: 0.7 }}>Modificable hasta agotar los cupos</small>
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
              onKeyDown={handlePriceKeyDown}
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
          </div>

          <div style={{ display: "grid", gap: ".5rem" }}>
            <label style={{ color: "var(--text-primary)" }}>Cantidad de cupos</label>
            <input
              type="number"
              min={10}
              max={100}
              required
              value={formData.slots}
              onChange={(e) => {
                if (formData.type !== "STATES" && formData.type !== "ZODIAC") {
                  setFormData({ ...formData, slots: e.target.value });
                }
              }}
              onKeyDown={handleSlotsKeyDown}
              onBlur={() => {
                const slots = parseInt(formData.slots);
                if (!isNaN(slots)) {
                  if (slots < 10) setFormData({ ...formData, slots: "10" });
                  else if (slots > 100) setFormData({ ...formData, slots: "100" });
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
              {formData.type === "STATES" ? "24 estados fijos (automático)" : formData.type === "ZODIAC" ? "12 signos zodiacales fijos (automático)" : "Entre 10 y 100 cupos (mínimo 10, máximo 100)"}
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
                    onKeyDown={handlePriceKeyDown}
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
              Los premios deben estar ordenados de mayor a menor (1° ganador ≥ 2° ganador ≥ 3° ganador).
              <br />
              <strong style={{ color: "#f59e0b" }}>⚠️ Regla: La suma total de premios no puede exceder el 50% de las ganancias del sorteo.</strong>
              {formData.pricePerSlot && formData.slots && (
                <span style={{ display: "block", marginTop: "0.25rem" }}>
                  Ganancias totales: Bs. {(parseFloat(formData.pricePerSlot) * parseInt(formData.slots || "0")).toFixed(2)} | 
                  Máximo premios: Bs. {((parseFloat(formData.pricePerSlot) * parseInt(formData.slots || "0")) * 0.5).toFixed(2)}
                </span>
              )}
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
            disabled={creating || !formData.name || !formData.pricePerSlot || !formData.slots}
            style={{ padding: ".75rem 1.5rem", borderRadius: "8px", border: "none", background: creating || !formData.name || !formData.pricePerSlot || !formData.slots ? "#6b7280" : "#85BB65", color: "var(--text-primary)", fontWeight: 700, cursor: creating || !formData.name || !formData.pricePerSlot || !formData.slots ? "not-allowed" : "pointer" }}
          >
            {creating ? "Guardando..." : "Crear Plantilla"}
          </button>
        </form>

        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ margin: "0 0 1.5rem", color: "var(--text-primary)" }}>Plantillas Existentes</h2>
          {loading ? (
            <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando plantillas...</div>
          ) : templates.length === 0 ? (
            <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
              <p style={{ margin: 0, color: "var(--text-tertiary)" }}>No hay plantillas creadas aún.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1.5rem" }}>
              {templates.map((template) => (
                <div key={template.id} className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <h3 style={{ margin: "0 0 0.5rem", color: "var(--text-primary)" }}>{template.name}</h3>
                    {template.description && (
                      <p style={{ margin: 0, color: "var(--text-tertiary)", fontSize: "0.875rem" }}>{template.description}</p>
                    )}
                  </div>

                  <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-primary)" }}>
                    <div><strong>Tipo:</strong> {template.type}</div>
                    <div><strong>Precio:</strong> Bs. {Number(template.pricePerSlot).toFixed(2)}</div>
                    <div><strong>Cupos:</strong> {template.slots}</div>
                    <div><strong>Ganadores:</strong> {template.winnersCount}</div>
                    {template.mirrorMode && <div><strong>Modo Espejo:</strong> Sí</div>}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
                    <button
                      onClick={() => handleCreateRaffle(template.id)}
                      style={{
                        flex: 1,
                        padding: "0.75rem",
                        background: "#85BB65",
                        color: "var(--text-primary)",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Crear Sorteo
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      style={{
                        padding: "0.75rem 1rem",
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function TemplatesPage() {
  return (
    <AuthGuard requiredRole={["AGENT", "SUPERADMIN", "MASTER"]}>
      <TemplatesPageContent />
    </AuthGuard>
  );
}
