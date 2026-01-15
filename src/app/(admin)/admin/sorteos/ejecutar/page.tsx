"use client";
import { AdminNavBar } from "../../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../../lib/clientAuth";
import Link from "next/link";

type Raffle = {
  id: string;
  title: string;
  type: string;
  pricePerSlot: number;
  slots: number;
  winnersCount: number;
  mirrorMode: boolean;
  status: string;
  startsAt: string | null;
  executedAt: string | null;
  createdAt: string;
  createdBy: { name: string } | null;
  ticketItems: { value: string; status?: string }[];
};

function EjecutarSorteosPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    setAuth(storedAuth);
    
    if (!storedAuth) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch("/api/raffles")
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
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
          // Priorizar por startsAt si existe
          const dateA = a.startsAt ? new Date(a.startsAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const dateB = b.startsAt ? new Date(b.startsAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return dateA - dateB; // Orden ascendente (más antiguos primero)
        });
        
        setRaffles(activeRaffles);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar sorteos:", err);
        setRaffles([]);
        setLoading(false);
      });
  }, []);

  function getAvailableSlots(raffle: Raffle) {
    // Contar solo los cupos confirmados (CONFIRMED), no los pendientes o rechazados
    // Si no hay status, asumimos que son confirmados (para compatibilidad con datos antiguos)
    const confirmedItems = raffle.ticketItems.filter((item: any) => !item.status || item.status === "CONFIRMED");
    return raffle.slots - confirmedItems.length;
  }

  function canExecute(raffle: Raffle) {
    // REGLA: Todos los cupos deben estar COMPRADOS (CONFIRMED) para ejecutar
    // No se permiten cupos PENDING o REJECTED
    const confirmedItems = raffle.ticketItems.filter((item: any) => item.status === "CONFIRMED");
    const pendingItems = raffle.ticketItems.filter((item: any) => item.status === "PENDING");
    const allSlotsPurchased = confirmedItems.length === raffle.slots;
    const noPendingSlots = pendingItems.length === 0;
    
    // Verificar fecha (si tiene startsAt, debe ser menor o igual a hoy - con margen de 1 minuto para evitar problemas de zona horaria)
    const now = new Date();
    const startDate = raffle.startsAt ? new Date(raffle.startsAt) : null;
    const hasValidDate = !startDate || startDate <= now;
    
    // El sorteo está listo si está activo, TODOS los cupos están COMPRADOS y CONFIRMADOS, no hay pendientes, y la fecha es válida
    const canExec = raffle.status === "ACTIVE" && allSlotsPurchased && noPendingSlots && hasValidDate;
    return canExec;
  }

  if (!auth) {
    return null;
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <h1>Ejecutar Sorteos</h1>
        
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando sorteos...</div>
        ) : raffles.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
            No hay sorteos activos disponibles para ejecutar
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {raffles.map((raffle) => {
              // Si no hay status, asumimos que son confirmados (para compatibilidad con datos antiguos)
              const confirmedItems = raffle.ticketItems.filter((item: any) => !item.status || item.status === "CONFIRMED");
              const availableSlots = getAvailableSlots(raffle);
              
              return (
                <div key={raffle.id} className="card" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 .5rem" }}>{raffle.title}</h3>
                      <div style={{ display: "grid", gap: ".5rem", fontSize: ".875rem", color: "#94a3b8" }}>
                        <div>
                          <strong>Tipo:</strong> {raffle.type} | <strong>Precio:</strong> Bs. {Number(raffle.pricePerSlot).toFixed(2)} | <strong>Creado por:</strong> {raffle.createdBy?.name || "N/A"}
                        </div>
                        <div>
                          <strong>Estado:</strong> {raffle.status} | <strong>Cupos confirmados:</strong> {confirmedItems.length}/{raffle.slots} | <strong>Ganadores:</strong> {raffle.winnersCount}
                        </div>
                        <div>
                          <strong>Fecha inicio:</strong> {raffle.startsAt ? new Date(raffle.startsAt).toLocaleString() : "Sin fecha"}
                        </div>
                      </div>
                    </div>
                    {canExecute(raffle) ? (
                      <Link
                        href={`/admin/sorteos/ejecutar/${raffle.id}`}
                        style={{ 
                          padding: ".75rem 1.5rem", 
                          background: "#85BB65", 
                          color: "#3E3E3C", 
                          borderRadius: "8px", 
                          fontWeight: 700,
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                          display: "inline-block",
                          boxShadow: "0 4px 6px rgba(133, 187, 101, 0.3)",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#16a34a";
                          e.currentTarget.style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#85BB65";
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        ⚡ Ejecutar
                      </Link>
                    ) : availableSlots === 0 && raffle.status === "ACTIVE" ? (
                      <span style={{ 
                        padding: ".75rem 1.5rem", 
                        background: "#f59e0b", 
                        color: "#3E3E3C", 
                        borderRadius: "8px", 
                        fontWeight: 700,
                        whiteSpace: "nowrap"
                      }}>
                        ⏳ Esperando fecha
                      </span>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                    <span style={{ padding: ".5rem .75rem", background: "#85BB65", borderRadius: "6px", fontSize: ".875rem", fontWeight: 600, color: "#3E3E3C" }}>
                      Disponibles: <strong style={{ color: "#3E3E3C" }}>{availableSlots}</strong>
                    </span>
                    <span style={{ padding: ".5rem .75rem", background: "#85BB65", borderRadius: "6px", fontSize: ".875rem", fontWeight: 600, color: "#3E3E3C" }}>
                      Confirmados: <strong style={{ color: "#3E3E3C" }}>{confirmedItems.length}</strong>
                    </span>
                    {canExecute(raffle) && (
                      <span style={{ padding: ".5rem .75rem", background: "#85BB65", borderRadius: "6px", fontSize: ".875rem", fontWeight: 600, color: "#3E3E3C" }}>
                        ✅ Listo para ejecutar
                      </span>
                    )}
                    {!canExecute(raffle) && availableSlots === 0 && raffle.status === "ACTIVE" && (
                      <span style={{ padding: ".5rem .75rem", background: "#f59e0b", borderRadius: "6px", fontSize: ".875rem", fontWeight: 600, color: "#3E3E3C" }}>
                        ⏳ Esperando fecha de inicio
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
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
