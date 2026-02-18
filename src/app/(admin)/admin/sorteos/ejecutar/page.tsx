"use client";
import { AdminNavBar } from "../../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../../lib/clientAuth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getItemWithEmoji } from "../../../../../lib/raffleEmojis";

// Listas de valores para cada tipo de ruleta
const VENEZUELA_STATES = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar",
  "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón",
  "Guárico", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta",
  "Portuguesa", "Sucre", "Táchira", "Trujillo", "Vargas", "Yaracuy", "Zulia"
];

const ANIMALS = [
  "León", "Tigre", "Elefante", "Jirafa", "Cebra", "Mono", "Oso", "Lobo", 
  "Zorro", "Águila", "Delfín", "Ballena", "Tiburón", "Cocodrilo", "Serpiente", 
  "Pájaro", "Caballo", "Vaca", "Cerdo", "Gato", "Perro", "Conejo", "Ratón", 
  "Hámster", "Pez", "Tortuga", "Rana", "Mariposa", "Abeja", "Araña", 
  "Escorpión", "Camello", "Canguro", "Panda", "Koala", "Zebra", "Hipopótamo", 
  "Rinoceronte", "Jaguar", "Pantera", "Lince", "Búfalo", "Alce", "Ciervo", 
  "Mapache", "Mofeta", "Erizo", "Armadillo", "Tapir", "Capibara"
];

const COUNTRIES = [
  "🇻🇪 Venezuela", "🇨🇴 Colombia", "🇧🇷 Brasil", "🇦🇷 Argentina", "🇨🇱 Chile", "🇵🇪 Perú", "🇪🇨 Ecuador", 
  "🇺🇾 Uruguay", "🇵🇾 Paraguay", "🇧🇴 Bolivia", "🇲🇽 México", "🇪🇸 España", "🇫🇷 Francia", "🇮🇹 Italia", 
  "🇩🇪 Alemania", "🇬🇧 Reino Unido", "🇺🇸 Estados Unidos", "🇨🇦 Canadá", "🇯🇵 Japón", "🇨🇳 China", 
  "🇷🇺 Rusia", "🇮🇳 India", "🇦🇺 Australia", "🇳🇿 Nueva Zelanda", "🇿🇦 Sudáfrica", "🇪🇬 Egipto", 
  "🇲🇦 Marruecos", "🇹🇷 Turquía", "🇬🇷 Grecia", "🇵🇹 Portugal", "🇳🇱 Holanda", "🇧🇪 Bélgica", 
  "🇨🇭 Suiza", "🇦🇹 Austria", "🇸🇪 Suecia", "🇳🇴 Noruega", "🇩🇰 Dinamarca", "🇫🇮 Finlandia", 
  "🇵🇱 Polonia", "🇨🇿 República Checa", "🇭🇺 Hungría", "🇷🇴 Rumania", "🇧🇬 Bulgaria", "🇭🇷 Croacia", 
  "🇷🇸 Serbia", "🇺🇦 Ucrania", "🇰🇷 Corea del Sur", "🇹🇭 Tailandia", "🇵🇭 Filipinas", "🇮🇩 Indonesia"
];

const ZODIAC_SIGNS = [
  "♈ Aries", "♉ Tauro", "♊ Géminis", "♋ Cáncer", "♌ Leo", "♍ Virgo",
  "♎ Libra", "♏ Escorpio", "♐ Sagitario", "♑ Capricornio", "♒ Acuario", "♓ Piscis"
];

type TicketItem = {
  id: string;
  value: string;
  status: string;
  ticket?: {
    user?: {
      name: string;
      email: string;
    };
  };
};

type Raffle = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  pricePerSlot: number;
  slots: number;
  winnersCount: number;
  mirrorMode: boolean;
  status: string;
  approved: boolean;
  startsAt: string | null;
  executedAt: string | null;
  createdAt: string;
  prizes: string[] | null;
  createdBy: { name: string } | null;
  ticketItems: TicketItem[];
};

function EjecutarSorteosPageContent() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [showCuposModal, setShowCuposModal] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    setAuth(storedAuth);
    
    if (!storedAuth) {
      setLoading(false);
      return;
    }

    loadRaffles();
  }, []);

  async function loadRaffles() {
    setLoading(true);
    try {
      const res = await fetch("/api/raffles?includeNotApproved=true");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.error) {
        console.error("Error:", data.error);
        setRaffles([]);
        setLoading(false);
        return;
      }
      // Filtrar solo sorteos activos (no finalizados)
      let activeRaffles = Array.isArray(data) ? data.filter((r: Raffle) => r.status === "ACTIVE") : [];
      
      // Ordenar por orden cronológico: primero por startsAt (si existe), luego por createdAt
      activeRaffles.sort((a: Raffle, b: Raffle) => {
        const dateA = a.startsAt ? new Date(a.startsAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.startsAt ? new Date(b.startsAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return dateA - dateB;
      });
      
      setRaffles(activeRaffles);
    } catch (err) {
      console.error("Error al cargar sorteos:", err);
      setRaffles([]);
    } finally {
      setLoading(false);
    }
  }

  function getSlotStats(raffle: Raffle) {
    const confirmed = raffle.ticketItems.filter((item: TicketItem) => item.status === "CONFIRMED").length;
    const pending = raffle.ticketItems.filter((item: TicketItem) => item.status === "PENDING").length;
    const available = raffle.slots - confirmed - pending;
    return { confirmed, pending, available };
  }

  function canEdit(raffle: Raffle) {
    // Solo se puede editar si no hay cupos comprados (CONFIRMED)
    const stats = getSlotStats(raffle);
    return stats.confirmed === 0;
  }

  function canExecute(raffle: Raffle) {
    const stats = getSlotStats(raffle);
    const allSlotsPurchased = stats.confirmed === raffle.slots;
    const noPendingSlots = stats.pending === 0;
    const now = new Date();
    const startDate = raffle.startsAt ? new Date(raffle.startsAt) : null;
    const hasValidDate = !startDate || startDate <= now;
    // Debe estar aprobado, activo, todos los cupos CONFIRMADOS, sin pendientes, y fecha válida
    return raffle.approved && raffle.status === "ACTIVE" && allSlotsPurchased && noPendingSlots && hasValidDate;
  }

  function canDelete(raffle: Raffle) {
    const stats = getSlotStats(raffle);
    return stats.confirmed === 0 && stats.pending === 0;
  }

  async function handleDelete(raffleId: string, title: string) {
    if (!auth?.token || !confirm(`¿Estás seguro de ELIMINAR el sorteo "${title}"?\n\nEsta acción NO se puede deshacer.`)) return;
    setDeleting(raffleId);
    try {
      const res = await fetch(`/api/admin/raffles/${raffleId}/delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (res.ok) {
        alert("✅ Sorteo eliminado exitosamente");
        loadRaffles();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "No se pudo eliminar"}`);
      }
    } catch {
      alert("Error al eliminar el sorteo");
    } finally {
      setDeleting(null);
    }
  }

  async function handleApprove(raffleId: string) {
    if (!auth?.token || !confirm("¿Estás seguro de aprobar este sorteo? Una vez aprobado, será visible para todos los usuarios.")) return;

    setApproving(raffleId);
    try {
      const res = await fetch(`/api/raffles/${raffleId}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (res.ok) {
        alert("✅ Sorteo aprobado exitosamente");
        loadRaffles();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "No se pudo aprobar el sorteo"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error al aprobar el sorteo");
    } finally {
      setApproving(null);
    }
  }

  function openCuposModal(raffle: Raffle) {
    setSelectedRaffle(raffle);
    setShowCuposModal(true);
  }

  function closeCuposModal() {
    setSelectedRaffle(null);
    setShowCuposModal(false);
  }

  if (!auth) {
    return null;
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "1200px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>Ejecutar Sorteos</h1>
          <Link href="/admin/sorteos/crear" style={{ padding: "0.75rem 1.5rem", background: "var(--color-primary)", color: "#ffffff", borderRadius: "8px", textDecoration: "none", fontWeight: 600 }}>
            + Crear Sorteo
          </Link>
        </div>
        
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando sorteos...</div>
        ) : raffles.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No hay sorteos activos disponibles para ejecutar
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {raffles.map((raffle) => {
              const stats = getSlotStats(raffle);
              const canEditRaffle = canEdit(raffle);
              const canDeleteRaffle = canDelete(raffle);
              const canExec = canExecute(raffle);
              
              return (
                <div key={raffle.id} className="card" style={{ padding: "1.5rem" }}>
                  {/* Header del sorteo */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                    <div style={{ flex: 1, minWidth: "250px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{raffle.title}</h3>
                        {!raffle.approved && (
                          <span style={{ padding: "0.25rem 0.5rem", background: "#f59e0b", color: "#fff", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                            PENDIENTE APROBACIÓN
                          </span>
                        )}
                        {raffle.approved && (
                          <span style={{ padding: "0.25rem 0.5rem", background: "#10b981", color: "#fff", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                            APROBADO ✓
                          </span>
                        )}
                      </div>
                      {raffle.description && (
                        <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>{raffle.description}</p>
                      )}
                    </div>
                    
                    {/* Botón de Ejecutar */}
                    {canExec && (
                      <Link
                        href={`/admin/sorteos/ejecutar/${raffle.id}`}
                        style={{ 
                          padding: ".75rem 1.5rem", 
                          background: "#10b981", 
                          color: "#fff", 
                          borderRadius: "8px", 
                          fontWeight: 700,
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          boxShadow: "0 4px 6px rgba(16, 185, 129, 0.3)",
                          transition: "all 0.2s"
                        }}
                      >
                        ⚡ Ejecutar Sorteo
                      </Link>
                    )}
                  </div>

                  {/* Información del sorteo */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem", padding: "1rem", background: "var(--bg-accent)", borderRadius: "8px" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Tipo</span>
                      <p style={{ margin: "0.25rem 0 0", fontWeight: 600, color: "var(--text-primary)" }}>{raffle.type}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Precio por cupo</span>
                      <p style={{ margin: "0.25rem 0 0", fontWeight: 600, color: "var(--text-primary)" }}>Bs. {Number(raffle.pricePerSlot).toFixed(2)}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total cupos</span>
                      <p style={{ margin: "0.25rem 0 0", fontWeight: 600, color: "var(--text-primary)" }}>{raffle.slots}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Ganadores</span>
                      <p style={{ margin: "0.25rem 0 0", fontWeight: 600, color: "var(--text-primary)" }}>{raffle.winnersCount}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Fecha inicio</span>
                      <p style={{ margin: "0.25rem 0 0", fontWeight: 600, color: "var(--text-primary)" }}>
                        {raffle.startsAt ? new Date(raffle.startsAt).toLocaleString() : "Sin fecha"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Creado por</span>
                      <p style={{ margin: "0.25rem 0 0", fontWeight: 600, color: "var(--text-primary)" }}>{raffle.createdBy?.name || "N/A"}</p>
                    </div>
                  </div>

                  {/* Premios */}
                  {raffle.prizes && Array.isArray(raffle.prizes) && raffle.prizes.length > 0 && (
                    <div style={{ marginBottom: "1rem", padding: "1rem", background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)", borderRadius: "8px" }}>
                      <span style={{ fontSize: "0.75rem", color: "#92400e", textTransform: "uppercase", fontWeight: 600 }}>🏆 Premios</span>
                      <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                        {raffle.prizes.map((prize, idx) => (
                          <span key={idx} style={{ padding: "0.5rem 1rem", background: "#fff", borderRadius: "6px", fontWeight: 700, color: "#92400e" }}>
                            {idx + 1}° - {prize}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Estado de cupos */}
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                    <span style={{ padding: ".5rem .75rem", background: "#10b981", color: "#fff", borderRadius: "6px", fontSize: ".875rem", fontWeight: 600 }}>
                      ✓ Confirmados: {stats.confirmed}
                    </span>
                    <span style={{ padding: ".5rem .75rem", background: "#f59e0b", color: "#fff", borderRadius: "6px", fontSize: ".875rem", fontWeight: 600 }}>
                      ⏳ Pendientes: {stats.pending}
                    </span>
                    <span style={{ padding: ".5rem .75rem", background: "#6b7280", color: "#fff", borderRadius: "6px", fontSize: ".875rem", fontWeight: 600 }}>
                      📋 Disponibles: {stats.available}
                    </span>
                  </div>

                  {/* Botones de acción */}
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                    <button
                      onClick={() => openCuposModal(raffle)}
                      style={{ 
                        padding: "0.5rem 1rem", 
                        background: "var(--color-primary)", 
                        color: "#fff", 
                        border: "none", 
                        borderRadius: "6px", 
                        cursor: "pointer", 
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem"
                      }}
                    >
                      👁️ Ver Cupos
                    </button>

                    {canEditRaffle && (
                      <Link
                        href={`/admin/sorteos/modificar/${raffle.id}`}
                        style={{ 
                          padding: "0.5rem 1rem", 
                          background: "#3b82f6", 
                          color: "#fff", 
                          borderRadius: "6px", 
                          textDecoration: "none",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem"
                        }}
                      >
                        ✏️ Editar
                      </Link>
                    )}

                    {!raffle.approved && (
                      <button
                        onClick={() => handleApprove(raffle.id)}
                        disabled={approving === raffle.id}
                        style={{ 
                          padding: "0.5rem 1rem", 
                          background: approving === raffle.id ? "#6b7280" : "#10b981", 
                          color: "#fff", 
                          border: "none", 
                          borderRadius: "6px", 
                          cursor: approving === raffle.id ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem"
                        }}
                      >
                        {approving === raffle.id ? "Aprobando..." : "✅ Aprobar"}
                      </button>
                    )}

                    {!canEditRaffle && (
                      <span style={{ padding: "0.5rem 1rem", background: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "0.875rem" }}>
                        🔒 No editable (hay cupos comprados)
                      </span>
                    )}

                    {canDeleteRaffle && (
                      <button
                        onClick={() => handleDelete(raffle.id, raffle.title)}
                        disabled={deleting === raffle.id}
                        style={{ 
                          padding: "0.5rem 1rem", 
                          background: deleting === raffle.id ? "#6b7280" : "#ef4444", 
                          color: "#fff", 
                          border: "none", 
                          borderRadius: "6px", 
                          cursor: deleting === raffle.id ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem"
                        }}
                      >
                        {deleting === raffle.id ? "Eliminando..." : "🗑️ Eliminar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Ver Cupos */}
      {showCuposModal && selectedRaffle && (
        <div style={{ 
          position: "fixed", 
          inset: 0, 
          background: "rgba(0,0,0,0.5)", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div style={{ 
            background: "var(--card-bg)", 
            borderRadius: "12px", 
            padding: "2rem", 
            maxWidth: "950px", 
            width: "100%", 
            maxHeight: "85vh", 
            overflow: "auto" 
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ margin: 0, color: "var(--text-primary)" }}>Estado de Cupos - {selectedRaffle.title}</h2>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  Tipo: <strong>{selectedRaffle.type}</strong> | Total: <strong>{selectedRaffle.slots}</strong> cupos
                </p>
              </div>
              <button
                onClick={closeCuposModal}
                style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-primary)" }}
              >
                ✖
              </button>
            </div>

            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", 
              gap: "0.5rem" 
            }}>
              {(() => {
                // Generar lista de valores según el tipo de ruleta
                let slotValues: string[] = [];
                if (selectedRaffle.type === "NUMBERS") {
                  slotValues = Array.from({ length: selectedRaffle.slots }, (_, i) => String(i + 1));
                } else if (selectedRaffle.type === "STATES") {
                  slotValues = VENEZUELA_STATES.slice(0, selectedRaffle.slots);
                } else if (selectedRaffle.type === "ANIMALS") {
                  slotValues = ANIMALS.slice(0, selectedRaffle.slots);
                } else if (selectedRaffle.type === "FLAGS") {
                  slotValues = COUNTRIES.slice(0, selectedRaffle.slots);
                } else if (selectedRaffle.type === "ZODIAC") {
                  slotValues = ZODIAC_SIGNS.slice(0, selectedRaffle.slots);
                }

                return slotValues.map((slotValue, i) => {
                  // Buscar si este cupo está en ticketItems (comparar por valor exacto o número)
                  const item = selectedRaffle.ticketItems.find(ti => 
                    ti.value === slotValue || 
                    ti.value === String(i + 1) ||
                    ti.value === String(i + 1).padStart(2, "0")
                  );
                  
                  let bgColor = "#e5e7eb"; // Disponible
                  let textColor = "#374151";
                  let statusIcon = "📋";
                  let statusText = "Disponible";
                  let userName = "";

                  if (item) {
                    if (item.status === "CONFIRMED") {
                      bgColor = "#10b981";
                      textColor = "#fff";
                      statusIcon = "✓";
                      statusText = "Comprado";
                      userName = item.ticket?.user?.name || "Usuario";
                    } else if (item.status === "PENDING") {
                      bgColor = "#f59e0b";
                      textColor = "#fff";
                      statusIcon = "⏳";
                      statusText = "Pendiente";
                      userName = item.ticket?.user?.name || "Usuario";
                    } else if (item.status === "REJECTED") {
                      bgColor = "#ef4444";
                      textColor = "#fff";
                      statusIcon = "✖";
                      statusText = "Rechazado";
                    }
                  }

                  const displayValue = getItemWithEmoji(slotValue, selectedRaffle.type);

                  return (
                    <div 
                      key={i}
                      style={{ 
                        padding: "0.6rem 0.5rem", 
                        background: bgColor, 
                        borderRadius: "8px",
                        textAlign: "center",
                        color: textColor,
                        minHeight: "70px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center"
                      }}
                      title={userName ? `${statusText} - ${userName}` : statusText}
                    >
                      <div style={{ 
                        fontSize: selectedRaffle.type === "NUMBERS" ? "1.1rem" : "0.8rem", 
                        fontWeight: 700, 
                        overflow: "hidden", 
                        textOverflow: "ellipsis", 
                        whiteSpace: "nowrap" 
                      }}>
                        {statusIcon} {displayValue}
                      </div>
                      <div style={{ fontSize: "0.65rem", marginTop: "0.25rem", opacity: 0.9 }}>{statusText}</div>
                      {userName && (
                        <div style={{ fontSize: "0.6rem", marginTop: "0.15rem", opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {userName}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "20px", height: "20px", background: "#10b981", borderRadius: "4px" }}></div>
                <span style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>Comprado</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "20px", height: "20px", background: "#f59e0b", borderRadius: "4px" }}></div>
                <span style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>Pendiente</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "20px", height: "20px", background: "#e5e7eb", borderRadius: "4px" }}></div>
                <span style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>Disponible</span>
              </div>
            </div>

            <button
              onClick={closeCuposModal}
              style={{ 
                marginTop: "1.5rem", 
                width: "100%", 
                padding: "0.75rem", 
                background: "var(--color-primary)", 
                color: "#fff", 
                border: "none", 
                borderRadius: "8px", 
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function EjecutarSorteosPage() {
  return (
    <AuthGuard requiredRole={["AGENT", "SUPERADMIN", "MASTER"]}>
      <EjecutarSorteosPageContent />
    </AuthGuard>
  );
}
