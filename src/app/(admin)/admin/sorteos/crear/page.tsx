"use client";
import { AdminNavBar } from "../../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../../components/AuthGuard";
import { useState, useEffect } from "react";
import { getStoredAuth } from "../../../../../lib/clientAuth";
import { useRouter } from "next/navigation";

const VENEZUELA_STATES = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar",
  "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón",
  "Guárico", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta",
  "Portuguesa", "Sucre", "Táchira", "Trujillo", "Vargas", "Yaracuy", "Zulia"
];

type Template = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  pricePerSlot: number;
  slots: number;
  winnersCount: number;
  mirrorMode: boolean;
  prizes: string[] | null;
};

function CrearSorteosPageContent() {
  const router = useRouter();
  const auth = getStoredAuth();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
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

  // Cargar plantillas al iniciar
  useEffect(() => {
    async function loadTemplates() {
      if (!auth?.token) {
        setLoadingTemplates(false);
        return;
      }
      try {
        const res = await fetch("/api/admin/templates", {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setTemplates(data);
        }
      } catch (err) {
        console.error("Error al cargar plantillas:", err);
      } finally {
        setLoadingTemplates(false);
      }
    }
    loadTemplates();
  }, [auth?.token]);

  // Función para aplicar una plantilla
  function applyTemplate(templateId: string) {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Parsear premios de la plantilla (formato "Bs. X.XX")
    let parsedPrizes: string[] = [];
    if (template.prizes && Array.isArray(template.prizes)) {
      parsedPrizes = template.prizes.map(p => {
        // Extraer número del premio (puede ser "Bs. 1000.00", "1000 Bs", etc.)
        const match = p.match(/(\d+(?:\.\d+)?)/);
        return match ? match[1] : "";
      });
    }

    // Ajustar cantidad de premios según winnersCount
    while (parsedPrizes.length < template.winnersCount) {
      parsedPrizes.push("");
    }

    // Aplicar todos los campos de la plantilla
    const newFormData = {
      title: "", // Mantener vacío para que el usuario lo llene
      description: template.description || "",
      type: template.type as "NUMBERS" | "ANIMALS" | "STATES" | "FLAGS" | "ZODIAC",
      pricePerSlot: String(template.pricePerSlot),
      slots: String(template.slots),
      winnersCount: template.winnersCount,
      mirrorMode: template.mirrorMode,
      startsAt: formData.startsAt, // Mantener la fecha si ya se había establecido
      prizes: parsedPrizes.slice(0, template.winnersCount)
    };

    setFormData(newFormData);

    // Actualizar customItems según el tipo de la plantilla
    if (template.type === "STATES") {
      setCustomItems(VENEZUELA_STATES);
    } else {
      setCustomItems([]);
    }
  }

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
    const slots = parseInt(formData.slots) || 0;
    const pricePerSlot = parseFloat(formData.pricePerSlot) || 0;
    const totalIncome = slots * pricePerSlot;
    const requiredTotalPrize = totalIncome * 0.70;

    const currentPrizes = formData.prizes.slice(0, formData.winnersCount).map(p => parseFloat(p) || 0);
    const currentTotalPrize = currentPrizes.reduce((a, b) => a + b, 0);

    // Validar orden descendente
    if (currentPrizes.length >= 3 && currentPrizes[2] > currentPrizes[1]) {
      return { error: "El 3° ganador no puede ganar un monto mayor que el 2° ganador", invalidIndex: 2 };
    }
    if (currentPrizes.length >= 2 && currentPrizes[1] > currentPrizes[0]) {
      return { error: "El 2° ganador no puede ganar un monto mayor que el 1° ganador", invalidIndex: 1 };
    }

    // Validar regla del 70% (con margen de error de 0.1)
    if (Math.abs(currentTotalPrize - requiredTotalPrize) > 0.1) {
      return { 
        error: `El total de premios (Bs. ${currentTotalPrize.toFixed(2)}) debe ser el 70% del ingreso total (Bs. ${requiredTotalPrize.toFixed(2)})`, 
        invalidIndex: -1 
      };
    }
    
    return { error: null, invalidIndex: null };
  }

  // Validar cantidad de cupos (mínimo 10, máximo 100)
  function validateSlots(): string | null {
    const slots = parseInt(formData.slots);
    if (formData.type === "STATES" || formData.type === "ZODIAC") {
      return null; // Los fijos no se validan aquí
    }
    if (isNaN(slots) || slots < 10) {
      return "La cantidad mínima de cupos es 10";
    }
    if (slots > 100) {
      return "La cantidad máxima de cupos es 100";
    }
    return null;
  }

  // Prevenir entrada de caracteres no numéricos en campos de precio
  function handlePriceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Prevenir la letra 'e', 'E', '+', '-' que son válidos en inputs type="number"
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  }

  function handleSlotsKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Prevenir cualquier caracter que no sea número o teclas de control
    if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
      e.preventDefault();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth?.token) {
      alert("No autenticado");
      return;
    }

    // Validar cantidad de cupos
    const slotsError = validateSlots();
    if (slotsError) {
      alert(slotsError);
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
        
        {/* Selector de Plantillas */}
        {!loadingTemplates && templates.length > 0 && (
          <div className="card" style={{ marginBottom: "1.5rem", padding: "1.5rem", background: "var(--bg-accent)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <label style={{ color: "var(--text-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                📋 Usar Plantilla:
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    applyTemplate(e.target.value);
                  }
                }}
                defaultValue=""
                style={{ 
                  flex: 1,
                  minWidth: "200px",
                  padding: ".75rem", 
                  borderRadius: "8px", 
                  border: "2px solid var(--color-primary)", 
                  background: "var(--input-bg)", 
                  color: "var(--text-primary)",
                  fontWeight: 500
                }}
              >
                <option value="">-- Selecciona una plantilla (opcional) --</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.type} - {template.slots} cupos - Bs. {Number(template.pricePerSlot).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Selecciona una plantilla para cargar automáticamente la configuración del sorteo.
            </p>
          </div>
        )}

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
                  // Solo permitir valores entre 10 y 100
                  const value = e.target.value;
                  setFormData({ ...formData, slots: value });
                }
              }}
              onKeyDown={handleSlotsKeyDown}
              onBlur={() => {
                // Validar al salir del campo
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
            </small>
            
            {/* Validación en tiempo real del 70% */}
            {formData.pricePerSlot && formData.slots && (
              <div style={{ 
                marginTop: "0.5rem", 
                padding: "0.75rem", 
                borderRadius: "8px", 
                background: "var(--input-bg)",
                border: "1px solid var(--border-color)"
              }}>
                {(() => {
                  const slots = parseInt(formData.slots) || 0;
                  const price = parseFloat(formData.pricePerSlot) || 0;
                  const required = slots * price * 0.70;
                  const current = formData.prizes.slice(0, formData.winnersCount).reduce((sum, p) => sum + (parseFloat(p) || 0), 0);
                  const diff = current - required;
                  const isCorrect = Math.abs(diff) < 0.1;

                  return (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Total requerido (70%):</span>
                        <strong style={{ color: "var(--text-primary)" }}>Bs. {required.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Total actual:</span>
                        <strong style={{ color: isCorrect ? "#85BB65" : "#ef4444" }}>Bs. {current.toFixed(2)}</strong>
                      </div>
                      {!isCorrect && (
                        <div style={{ marginTop: "0.5rem", color: "#ef4444", fontSize: "0.875rem", fontWeight: 600 }}>
                          ⚠️ Ajuste necesario: {diff > 0 ? `Sobran Bs. ${diff.toFixed(2)}` : `Faltan Bs. ${Math.abs(diff).toFixed(2)}`}
                        </div>
                      )}
                      {isCorrect && (
                        <div style={{ marginTop: "0.5rem", color: "#85BB65", fontSize: "0.875rem", fontWeight: 600 }}>
                          ✅ ¡Perfecto! El total de premios es exactamente el 70%.
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
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
