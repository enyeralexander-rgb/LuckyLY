"use client";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getItemWithEmoji } from "../../../../lib/raffleEmojis";

type Props = {
  params: { id: string };
};

type Raffle = {
  id: string;
  title: string;
  type: string;
  pricePerSlot: number;
  slots: number;
  status: string;
  ticketItems: { value: string }[];
  prizes: string[];
  winnersCount: number;
  description: string | null;
  startsAt: string | null;
  closesAt: string | null;
};

type UserProfile = {
  emailVerified: boolean;
  bank: string | null;
  phoneNumber: string | null;
};

export default function RaffleDetailPage({ params }: Props) {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [buying, setBuying] = useState(false);
  const [userPurchasedSlots, setUserPurchasedSlots] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  // Obtener perfil del usuario para verificar correo y datos bancarios
  useEffect(() => {
    if (auth?.token) {
      fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) {
            setUserProfile({
              emailVerified: data.emailVerified || false,
              bank: data.bank || null,
              phoneNumber: data.phoneNumber || null
            });
          }
        })
        .catch(() => {});
    }
  }, [auth]);

  useEffect(() => {
    fetch(`/api/raffles`)
      .then((r) => r.json())
      .then((data) => {
        const found = data.find((r: Raffle) => r.id === params.id);
        if (found) {
          setRaffle(found);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  // Obtener cupos comprados por el usuario en este sorteo
  useEffect(() => {
    if (auth?.token && raffle) {
      fetch(`/api/user/raffles/${raffle.id}/slots`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error && typeof data.count === 'number') {
            setUserPurchasedSlots(data.count);
          }
        })
        .catch(() => {});

    }
  }, [auth, raffle]);

  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      NUMBERS: "NÚMEROS",
      ANIMALS: "ANIMALES",
      STATES: "ESTADOS",
      FLAGS: "BANDERAS",
      ZODIAC: "SIGNOS ZODIACALES"
    };
    return labels[type] || type.toUpperCase();
  }

  function formatPrizesList(prizes: string[]): string {
    if (!prizes || prizes.length === 0) return "";
    
    return prizes.map((prize, index) => {
      // Extraer número del premio (puede venir como "Bs. 1000.00", "1000 Bs", etc.)
      const match = prize.match(/(\d+(?:\.\d+)?)\s*Bs?/i);
      let amount = 0;
      if (match) {
        amount = parseFloat(match[1]);
      } else {
        const numberMatch = prize.match(/(\d+(?:\.\d+)?)/);
        if (numberMatch) {
          amount = parseFloat(numberMatch[1]);
        }
      }
      
      const ordinal = index === 0 ? "1°" : index === 1 ? "2°" : "3°";
      return `${ordinal} Ganador: Bs. ${amount.toFixed(2)}`;
    }).join("\n");
  }

  function formatPrize(prize: string): string {
    // Extraer número del premio (puede venir como "1000 Bs", "1500 Bs", "1000.50 Bs", etc.)
    const match = prize.match(/(\d+(?:\.\d+)?)\s*Bs?/i);
    if (match) {
      const amount = parseFloat(match[1]);
      return `Bs. ${amount.toFixed(2)}`;
    }
    // Si no tiene formato de "X Bs", intentar extraer número y formatear
    const numberMatch = prize.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      const amount = parseFloat(numberMatch[1]);
      return `Bs. ${amount.toFixed(2)}`;
    }
    // Si no se puede parsear, retornar como está pero con "Bs." al inicio
    return prize.includes("Bs") ? prize : `Bs. ${prize}`;
  }

  function getAllPossibleSlots(): string[] {
    if (!raffle) return [];
    
    const purchased = raffle.ticketItems.map((t) => t.value);
    const purchasedSet = new Set(purchased);
    const all: string[] = [];
    
    // Definir listas de valores según el tipo
    let availableValues: string[] = [];
    
    if (raffle.type === "NUMBERS") {
      // Para números, generar del 1 al slots
      availableValues = Array.from({ length: raffle.slots }, (_, i) => String(i + 1));
    } else if (raffle.type === "STATES") {
      const VENEZUELA_STATES = [
        "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar",
        "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón",
        "Guárico", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta",
        "Portuguesa", "Sucre", "Táchira", "Trujillo", "Vargas", "Yaracuy", "Zulia"
      ];
      availableValues = VENEZUELA_STATES;
    } else if (raffle.type === "ANIMALS") {
      const ANIMALS = [
        "León", "Tigre", "Elefante", "Jirafa", "Cebra", "Mono", "Oso", "Lobo", 
        "Zorro", "Águila", "Delfín", "Ballena", "Tiburón", "Cocodrilo", "Serpiente", 
        "Pájaro", "Caballo", "Vaca", "Cerdo", "Gato", "Perro", "Conejo", "Ratón", 
        "Hámster", "Pez", "Tortuga", "Rana", "Mariposa", "Abeja", "Araña", 
        "Escorpión", "Camello", "Canguro", "Panda", "Koala", "Zebra", "Hipopótamo", 
        "Rinoceronte", "Jaguar", "Pantera", "Lince", "Búfalo", "Alce", "Ciervo", 
        "Mapache", "Mofeta", "Erizo", "Armadillo", "Tapir", "Capibara"
      ];
      availableValues = ANIMALS;
    } else if (raffle.type === "FLAGS") {
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
      availableValues = COUNTRIES;
    } else if (raffle.type === "ZODIAC") {
      const ZODIAC_SIGNS = [
        "♈ Aries", "♉ Tauro", "♊ Géminis", "♋ Cáncer", "♌ Leo", "♍ Virgo",
        "♎ Libra", "♏ Escorpio", "♐ Sagitario", "♑ Capricornio", "♒ Acuario", "♓ Piscis"
      ];
      availableValues = ZODIAC_SIGNS;
    }
    
    // Filtrar valores disponibles (excluyendo los ya comprados)
    const available = availableValues.filter(v => !purchasedSet.has(v));
    
    // Tomar solo los primeros N valores disponibles según el número de slots
    const neededCount = raffle.slots;
    const selectedAvailable = available.slice(0, neededCount - purchased.length);
    
    // Combinar: primero los disponibles, luego los comprados
    all.push(...selectedAvailable);
    all.push(...purchased);
    
    // Si aún faltan cupos, completar con los siguientes valores de la lista
    if (all.length < neededCount) {
      const remaining = neededCount - all.length;
      const remainingValues = available.slice(selectedAvailable.length, selectedAvailable.length + remaining);
      all.push(...remainingValues);
    }
    
    // Asegurar que tenemos exactamente el número de slots requerido
    return all.slice(0, neededCount);
  }

  function isSlotPurchased(value: string): boolean {
    if (!raffle) return false;
    // Un cupo está comprado si tiene status CONFIRMED
    return raffle.ticketItems.some((t: any) => t.value === value && t.status === "CONFIRMED");
  }

  function isSlotPending(value: string): boolean {
    if (!raffle) return false;
    // Un cupo está pendiente si tiene status PENDING (pago móvil)
    return raffle.ticketItems.some((t: any) => t.value === value && t.status === "PENDING");
  }

  function toggleSlot(value: string) {
    if (isSlotPurchased(value) || buying) return;
    
    // Verificar si ya alcanzó el límite de 2 cupos
    if (userPurchasedSlots >= 2) {
      alert("Ya has alcanzado el límite de 2 cupos por sorteo. No puedes comprar más cupos en este sorteo.");
      return;
    }
    
    const newSelected = new Set(selectedSlots);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      // Limitar considerando los cupos ya comprados (máximo 2 por sorteo)
      const maxSelectable = 2 - userPurchasedSlots;
      if (newSelected.size >= maxSelectable) {
        alert(`Solo puedes seleccionar un máximo de ${maxSelectable} cupo(s) más. Ya tienes ${userPurchasedSlots} cupo(s) comprado(s).`);
        return;
      }
      newSelected.add(value);
    }
    setSelectedSlots(newSelected);
  }

  function handleBuy() {
    if (!auth?.token || !raffle || selectedSlots.size === 0 || buying) return;
    
    // Verificar si el usuario tiene correo verificado
    if (!userProfile?.emailVerified) {
      const confirmVerify = confirm(
        "⚠️ Debes verificar tu correo electrónico antes de realizar una compra.\n\n¿Deseas ir a verificar tu correo ahora?"
      );
      if (confirmVerify) {
        // Guardar la URL de retorno para después de verificar
        sessionStorage.setItem("pendingPurchase", JSON.stringify({
          raffleId: raffle.id,
          items: Array.from(selectedSlots),
          total: Number(raffle.pricePerSlot) * selectedSlots.size
        }));
        router.push("/cuenta/configuracion?action=verify-email");
      }
      return;
    }
    
    // Verificar si el usuario tiene datos bancarios completos
    if (!userProfile?.bank || !userProfile?.phoneNumber || userProfile.phoneNumber.length < 11) {
      const confirmBank = confirm(
        "⚠️ Debes completar tus datos bancarios antes de realizar una compra.\n\n¿Deseas ir a completar tus datos bancarios ahora?"
      );
      if (confirmBank) {
        // Guardar la URL de retorno para después de completar datos
        sessionStorage.setItem("pendingPurchase", JSON.stringify({
          raffleId: raffle.id,
          items: Array.from(selectedSlots),
          total: Number(raffle.pricePerSlot) * selectedSlots.size
        }));
        router.push("/cuenta/datos-bancarios");
      }
      return;
    }
    
    // Redirigir a la página de pagos con los datos
    const items = Array.from(selectedSlots);
    const totalPrice = Number(raffle.pricePerSlot) * items.length;
    
    router.push(`/payment?raffleId=${raffle.id}&items=${encodeURIComponent(JSON.stringify(items))}&total=${totalPrice}`);
  }

  if (loading) {
    return (
      <AuthGuard>
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        </main>
      </AuthGuard>
    );
  }

  if (!raffle) {
    return (
      <AuthGuard>
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
            Sorteo no encontrado
          </div>
        </main>
      </AuthGuard>
    );
  }

  const allSlots = getAllPossibleSlots();
  // Contar solo cupos confirmados (excluir pendientes y rechazados)
  const confirmedSlots = raffle.ticketItems.filter((t: any) => t.status === "CONFIRMED").length;
  const availableSlots = raffle.slots - confirmedSlots;
  const totalPrice = Number(raffle.pricePerSlot) * selectedSlots.size;
  const canBuy = selectedSlots.size > 0 && !buying && auth?.token && raffle.status === "ACTIVE" && availableSlots > 0 && userPurchasedSlots < 3;

  return (
    <AuthGuard requiredRole={["USER"]}>
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "1200px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0 }}>{raffle.title}</h1>
          <Link href="/" style={{ color: "#85BB65", textDecoration: "none" }}>← Volver</Link>
        </div>

        {/* Información del sorteo */}
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem", display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <div style={{ color: "#94a3b8", fontSize: ".875rem", marginBottom: ".25rem" }}>Tipo</div>
              <strong>{getTypeLabel(raffle.type)}</strong>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: ".875rem", marginBottom: ".25rem" }}>Precio por cupo</div>
              <strong style={{ color: "#228D57", fontSize: "1.25rem" }}>Bs. {Number(raffle.pricePerSlot).toFixed(2)}</strong>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: ".875rem", marginBottom: ".25rem" }}>Cupos disponibles</div>
              <strong style={{ color: availableSlots > 0 ? "#85BB65" : "#ef4444" }}>
                {availableSlots}/{raffle.slots}
              </strong>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: ".875rem", marginBottom: ".25rem" }}>Ganadores</div>
              <strong>{raffle.winnersCount}</strong>
            </div>
          </div>
          {raffle.prizes && Array.isArray(raffle.prizes) && raffle.prizes.length > 0 && (
            <div style={{ marginTop: ".5rem", padding: "1rem", background: "#f5f5e6", borderRadius: "8px", border: "1px solid #d4d4c4" }}>
              <div style={{ color: "#3E3E3C", fontSize: ".875rem", marginBottom: ".5rem", opacity: 0.8 }}>Premios</div>
              <div style={{ color: "#228D57", fontWeight: 700, fontSize: "1.6875rem", fontFamily: "var(--font-oswald), sans-serif", whiteSpace: "pre-line" }}>
                {formatPrizesList(raffle.prizes)}
              </div>
            </div>
          )}
          {raffle.description && (
            <div style={{ marginTop: ".5rem", padding: "1rem", background: "#f5f5e6", borderRadius: "8px", border: "1px solid #d4d4c4", color: "#3E3E3C" }}>
              {raffle.description}
            </div>
          )}
        </div>

        {/* Selección de cupos */}
        <div className="card" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Seleccionar cupos</h2>
            {selectedSlots.size > 0 && (
              <div style={{ padding: ".5rem 1rem", background: "#85BB65", borderRadius: "8px", color: "#3E3E3C", fontWeight: 700 }}>
                {selectedSlots.size} cupo(s) seleccionado(s) - Total: Bs. {totalPrice.toFixed(2)}
              </div>
            )}
          </div>
          
          {!auth ? (
            <div style={{ padding: "1.5rem", textAlign: "center", background: "#1f2937", borderRadius: "8px", color: "#94a3b8" }}>
              <p style={{ margin: "0 0 1rem" }}>Debes iniciar sesión para comprar cupos</p>
              <Link href="/auth/login" style={{ padding: ".75rem 1.5rem", background: "#85BB65", color: "#3E3E3C", borderRadius: "8px", fontWeight: 700, textDecoration: "none", display: "inline-block" }}>
                Iniciar sesión
              </Link>
            </div>
          ) : raffle.status !== "ACTIVE" ? (
            <div style={{ padding: "1.5rem", textAlign: "center", background: "#3b0c0c", borderRadius: "8px", color: "#fca5a5" }}>
              Este sorteo no está disponible para compra
            </div>
          ) : availableSlots === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", background: "#3b0c0c", borderRadius: "8px", color: "#fca5a5" }}>
              Todos los cupos han sido comprados
            </div>
          ) : (
            <>
              {userPurchasedSlots >= 3 && (
                <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "1px solid #ef4444", color: "#fca5a5", marginBottom: "1rem" }}>
                  <strong>⚠️ Límite alcanzado:</strong> Ya has comprado {userPurchasedSlots} cupo(s) en este sorteo. El máximo permitido es 2 cupos por sorteo.
                </div>
              )}
              <div style={{ display: "grid", gap: ".75rem", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
                {allSlots.map((slot) => {
                  const purchased = isSlotPurchased(slot);
                  const pending = isSlotPending(slot);
                  const selected = selectedSlots.has(slot);
                  
                  return (
                    <button
                      key={slot}
                      onClick={() => toggleSlot(slot)}
                      disabled={purchased || pending || buying || userPurchasedSlots >= 3}
                      style={{
                        padding: "0.75rem 0.5rem",
                        borderRadius: "10px",
                        textAlign: "center",
                        border: selected ? "2px solid #85BB65" : pending ? "2px solid #f59e0b" : userPurchasedSlots >= 3 ? "1px solid #6b7280" : "1px solid #1f2937",
                        background: purchased 
                          ? "#3b0c0c" 
                          : pending
                          ? "rgba(245, 158, 11, 0.2)"
                          : userPurchasedSlots >= 3
                          ? "#1f2937"
                          : selected 
                          ? "rgba(133, 187, 101, 0.2)" 
                          : "#0b1221",
                        color: purchased ? "#fca5a5" : pending ? "#f59e0b" : userPurchasedSlots >= 3 ? "#6b7280" : selected ? "#85BB65" : "#e2e8f0",
                        fontWeight: selected || pending ? 700 : 600,
                        cursor: purchased || pending || buying || userPurchasedSlots >= 3 ? "not-allowed" : "pointer",
                        opacity: purchased || pending || userPurchasedSlots >= 3 ? 0.6 : 1,
                        transition: "all 0.2s",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "0.85rem",
                        minHeight: "48px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      title={getItemWithEmoji(slot, raffle?.type || "")}
                    >
                      {purchased ? "✕" : pending ? "⏳" : selected ? "✓" : ""} {getItemWithEmoji(slot, raffle?.type || "")}
                    </button>
                  );
                })}
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #1f2937" }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: ".875rem" }}>Total a pagar</div>
                  <strong style={{ fontSize: "1.5rem", color: "#228D57" }}>Bs. {totalPrice.toFixed(2)}</strong>
                </div>
                <button
                  onClick={handleBuy}
                  disabled={!canBuy}
                  style={{
                    padding: ".75rem 2rem",
                    background: canBuy ? "#85BB65" : "#6b7280",
                    color: "#3E3E3C",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "1.125rem",
                    cursor: canBuy ? "pointer" : "not-allowed",
                    opacity: canBuy ? 1 : 0.6
                  }}
                >
                  {buying ? "Procesando..." : "Comprar cupos"}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}

