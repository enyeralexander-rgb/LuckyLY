"use client";
import { AdminNavBar } from "../../../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../../../components/AuthGuard";
import { useEffect, useState, useRef, useMemo } from "react";
import { getStoredAuth } from "../../../../../../lib/clientAuth";
import { useRouter } from "next/navigation";

// Definición de tipos
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
  prizes: string[];
  ticketItems: { value: string; status?: string }[];
};

const WHEEL_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B739", "#52BE80",
  "#EC7063", "#5DADE2", "#F4D03F", "#58D68D", "#EB984E",
  "#AF7AC5", "#76D7C4", "#F39C12", "#E74C3C", "#3498DB",
  "#1ABC9C", "#F1C40F", "#E67E22", "#9B59B6", "#34495E",
  "#E91E63", "#00BCD4", "#FF9800", "#8BC34A", "#9C27B0"
];

function EjecutarRafflePageContent({ params }: { params: { id: string } }) {
  const router = useRouter();
  // Nota: Asegúrate de que getStoredAuth no cause errores de hidratación (usa useEffect si es necesario)
  const [auth, setAuth] = useState<any>(null);
  
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados de la ruleta
  const [executing, setExecuting] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [currentSpin, setCurrentSpin] = useState(0);
  const [winners, setWinners] = useState<string[]>([]);
  const [blockedItems, setBlockedItems] = useState<Set<string>>(new Set());
  
  // Items mezclados
  const [shuffledItems, setShuffledItems] = useState<string[]>([]);
  const [rotation, setRotation] = useState(0);
  
  // Estados para animación
  const [spinDuration, setSpinDuration] = useState(5); // Duración aleatoria entre 5-13 segundos
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Función para reproducir sonido de victoria sobrio y corto
  const playVictorySound = () => {
    try {
      // Crear contexto de audio si no existe
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      const now = audioContext.currentTime;
      
      // Sonido de victoria sobrio: acorde mayor ascendente corto
      // Tres notas: Do - Mi - Sol (acorde mayor) con timbre suave
      
      // Nota 1: Do (C4 = 261.63 Hz)
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.type = 'sine'; // Onda seno para sonido suave
      osc1.frequency.value = 261.63;
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.1, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      // Nota 2: Mi (E4 = 329.63 Hz) - ligeramente después
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 329.63;
      gain2.gain.setValueAtTime(0, now + 0.05);
      gain2.gain.linearRampToValueAtTime(0.08, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      // Nota 3: Sol (G4 = 392.00 Hz) - más tarde
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.type = 'sine';
      osc3.frequency.value = 392.00;
      gain3.gain.setValueAtTime(0, now + 0.1);
      gain3.gain.linearRampToValueAtTime(0.08, now + 0.12);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      // Conectar y reproducir
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);
      
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.3);
      
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.start(now + 0.1);
      osc3.stop(now + 0.35);
    } catch (error) {
      console.error("Error al reproducir sonido de victoria:", error);
    }
  };
  
  // Cargar Auth en cliente
  useEffect(() => {
    setAuth(getStoredAuth());
    
    // Cleanup: cancelar animaciones al desmontar
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Fetch inicial
  useEffect(() => {
    if (auth?.token) {
      fetch("/api/raffles", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          const found = data.find((r: Raffle) => r.id === params.id);
          if (found) {
            setRaffle(found);
            // Inicializar items si ya hay ganadores previos o estado guardado
             // (Aquí podrías cargar el estado de shuffledItems si lo guardaste en BD)
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [auth, params.id]);

  // 1. MEMOIZACIÓN CRÍTICA:
  // Calculamos los items visuales una sola vez por render para evitar desincronización.
  // Si shuffledItems tiene datos, usamos eso. Si no, generamos la lista ordenada por defecto.
  const displayItems = useMemo(() => {
    if (!raffle) return [];
    
    // Si ya barajamos, usar eso
    if (shuffledItems.length > 0) return shuffledItems;

    // Si no, generar lista base según el tipo de ruleta
    const allPossibleSlots: string[] = [];
    
    if (raffle.type === "NUMBERS") {
      for (let i = 1; i <= raffle.slots; i++) {
        allPossibleSlots.push(String(i));
      }
    } else if (raffle.type === "STATES") {
      const VENEZUELA_STATES = [
        "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar",
        "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón",
        "Guárico", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta",
        "Portuguesa", "Sucre", "Táchira", "Trujillo", "Vargas", "Yaracuy", "Zulia"
      ];
      allPossibleSlots.push(...VENEZUELA_STATES.slice(0, raffle.slots));
    } else if (raffle.type === "ZODIAC") {
      const ZODIAC_SIGNS = [
        "♈ Aries", "♉ Tauro", "♊ Géminis", "♋ Cáncer", "♌ Leo", "♍ Virgo",
        "♎ Libra", "♏ Escorpio", "♐ Sagitario", "♑ Capricornio", "♒ Acuario", "♓ Piscis"
      ];
      allPossibleSlots.push(...ZODIAC_SIGNS.slice(0, raffle.slots));
    } else {
      // Para otros tipos (ANIMALS, FLAGS), usar los valores de los ticketItems
      const purchasedValues = raffle.ticketItems.map((t: { value: string }) => t.value);
      const uniqueValues = Array.from(new Set(purchasedValues)).sort();
      
      // Definir listas base según el tipo
      let baseList: string[] = [];
      if (raffle.type === "ANIMALS") {
        baseList = [
          "León", "Tigre", "Elefante", "Jirafa", "Cebra", "Mono", "Oso", "Lobo", 
          "Zorro", "Águila", "Delfín", "Ballena", "Tiburón", "Cocodrilo", "Serpiente", 
          "Pájaro", "Caballo", "Vaca", "Cerdo", "Gato", "Perro", "Conejo", "Ratón", 
          "Hámster", "Pez", "Tortuga", "Rana", "Mariposa", "Abeja", "Araña", 
          "Escorpión", "Camello", "Canguro", "Panda", "Koala", "Zebra", "Hipopótamo", 
          "Rinoceronte", "Jaguar", "Pantera", "Lince", "Búfalo", "Alce", "Ciervo", 
          "Mapache", "Mofeta", "Erizo", "Armadillo", "Tapir", "Capibara"
        ];
      } else if (raffle.type === "FLAGS") {
        baseList = [
          "🇻🇪 Venezuela", "🇨🇴 Colombia", "🇧🇷 Brasil", "🇦🇷 Argentina", "🇨🇱 Chile", "🇵🇪 Perú", "🇪🇨 Ecuador", 
          "🇺🇾 Uruguay", "🇵🇾 Paraguay", "🇧🇴 Bolivia", "🇲🇽 México", "🇪🇸 España", "🇫🇷 Francia", "🇮🇹 Italia", 
          "🇩🇪 Alemania", "🇬🇧 Reino Unido", "🇺🇸 Estados Unidos", "🇨🇦 Canadá", "🇯🇵 Japón", "🇨🇳 China", 
          "🇷🇺 Rusia", "🇮🇳 India", "🇦🇺 Australia", "🇳🇿 Nueva Zelanda", "🇿🇦 Sudáfrica", "🇪🇬 Egipto", 
          "🇲🇦 Marruecos", "🇹🇷 Turquía", "🇬🇷 Grecia", "🇵🇹 Portugal", "🇳🇱 Holanda", "🇧🇪 Bélgica", 
          "🇨🇭 Suiza", "🇦🇹 Austria", "🇸🇪 Suecia", "🇳🇴 Noruega", "🇩🇰 Dinamarca", "🇫🇮 Finlandia", 
          "🇵🇱 Polonia", "🇨🇿 República Checa", "🇭🇺 Hungría", "🇷🇴 Rumania", "🇧🇬 Bulgaria", "🇭🇷 Croacia", 
          "🇷🇸 Serbia", "🇺🇦 Ucrania", "🇰🇷 Corea del Sur", "🇹🇭 Tailandia", "🇵🇭 Filipinas", "🇮🇩 Indonesia"
        ];
      }
      
      // Combinar valores comprados con valores base
      const purchasedSet = new Set(uniqueValues);
      const availableFromBase = baseList.filter(v => !purchasedSet.has(v));
      allPossibleSlots.push(...uniqueValues, ...availableFromBase.slice(0, raffle.slots - uniqueValues.length));
      
      // Si aún faltan cupos, completar con placeholders
      while (allPossibleSlots.length < raffle.slots) {
        allPossibleSlots.push(`CUPO ${allPossibleSlots.length + 1}`);
      }
    }
    
    return allPossibleSlots.slice(0, raffle.slots);
  }, [raffle, shuffledItems]);

  const displaySlotAngle = 360 / (displayItems.length || 1);
  const radius = 280;

  // Ejecutar Giro
  async function handleExecuteSingleSpin() {
    if (!raffle || !auth?.token || executing || spinning) return;
    
    setExecuting(true);
    setSpinning(true);

    const nextSpin = currentSpin + 1;
    setCurrentSpin(nextSpin);

    // Obtener ganador del Backend
    let winnerValue = "";
    try {
      const res = await fetch(`/api/raffles/${raffle.id}/execute-spin`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}` 
        },
        body: JSON.stringify({ 
          blockedItems: Array.from(blockedItems),
          spinNumber: nextSpin
        })
      });
      
      if (!res.ok) throw new Error("Error API");
      const data = await res.json();
      winnerValue = data.winner;
    } catch (error) {
      alert("Error al obtener ganador del servidor.");
      setSpinning(false);
      setExecuting(false);
      return;
    }

    // LÓGICA DE GIRO CORREGIDA
    // 1. Encontrar índice del ganador en la lista ACTUAL visible
    const winnerIndex = displayItems.findIndex((v) => v === winnerValue);
    
    if (winnerIndex === -1) {
      alert("Error crítico: El ganador no está en la ruleta visual.");
      setSpinning(false);
      setExecuting(false);
      return;
    }

    // 2. Calcular Rotación
    // El puntero está en 0 grados (Arriba - CSS transform origin center).
    // En SVG normal, 0 grados es a la derecha (3 en punto).
    // Pero en nuestro SVG hemos rotado los segmentos -90 grados para que el índice 0 empiece arriba.
    
    // Queremos que el segmento ganador termine ARRIBA (angle 0 visual).
    // Ángulo del centro del segmento ganador:
    const segmentCenterAngle = (winnerIndex * displaySlotAngle) + (displaySlotAngle / 2);
    
    // Cuánto tenemos que rotar la ruleta para que ese ángulo llegue a 0 (o 360).
    // Target Rotation = 360 - segmentCenterAngle.
    // Ejemplo: Si el ganador está en 90°, tenemos que girar 270° más para que llegue a 0°.
    let targetRotation = 360 - segmentCenterAngle;

    // Tiempo de giro aleatorio entre 5-13 segundos
    const minDuration = 5;
    const maxDuration = 13;
    const randomDuration = minDuration + Math.random() * (maxDuration - minDuration);
    const spinTime = randomDuration * 1000; // Convertir a milisegundos
    
    // Delay aleatorio ±200ms
    const randomDelay = (Math.random() - 0.5) * 400; // -200ms a +200ms
    const finalDuration = spinTime + randomDelay;
    
    // Vueltas aleatorias sin máximo (entre 8-20 vueltas para más emoción)
    const minSpins = 8;
    const maxSpins = 20;
    const randomSpins = minSpins + Math.floor(Math.random() * (maxSpins - minSpins + 1));
    const spins = 360 * randomSpins;
    
    // Ajustar respecto a la rotación actual para que gire suavemente hacia adelante
    const currentRotationMod = rotation % 360;
    const newRotation = rotation + (360 - currentRotationMod) + spins + targetRotation;

    setRotation(newRotation);
    setSpinDuration(finalDuration / 1000);

    // Esperar animación con duración aleatoria
    await new Promise((resolve) => setTimeout(resolve, finalDuration));

    // Finalizar giro
    const newWinners = [...winners, winnerValue];
    const newBlocked = new Set(blockedItems);
    newBlocked.add(winnerValue);
    
    setWinners(newWinners);
    setBlockedItems(newBlocked);
    setSpinning(false);
    setExecuting(false);

    // Reproducir sonido de victoria sobrio al finalizar el giro
    playVictorySound();

    // Verificar si terminamos todos los ganadores
    if (newWinners.length >= raffle.winnersCount) {
      try {
        await fetch(`/api/raffles/${raffle.id}/execute`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              Authorization: `Bearer ${auth.token}` 
            },
            body: JSON.stringify({ winners: newWinners })
        });
        // Redirección automática eliminada - el usuario puede quedarse en la página
      } catch (e) { console.error(e); }
    }
  }

  // Helpers visuales
  function getSegmentPath(index: number, r: number) {
    // Ajuste -90 para empezar a las 12 en punto
    const startAngle = (index * displaySlotAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * displaySlotAngle - 90) * (Math.PI / 180);
    const x1 = 300 + r * Math.cos(startAngle);
    const y1 = 300 + r * Math.sin(startAngle);
    const x2 = 300 + r * Math.cos(endAngle);
    const y2 = 300 + r * Math.sin(endAngle);
    const largeArc = displaySlotAngle > 180 ? 1 : 0;
    return `M 300 300 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  // Calcular tamaño de fuente dinámico basado en el ancho del segmento
  function getFontSize(): number {
    if (displayItems.length === 0) return 14;
    const maxTextLength = Math.max(...displayItems.map(v => v.length));
    const textRadius = radius * 0.9; // 90% del radio para el texto
    const arcLength = textRadius * (displaySlotAngle * Math.PI / 180);
    const availableWidth = arcLength - 15; // Margen de 15px para evitar desbordamiento
    const charWidthRatio = 0.55; // Ratio más conservador para caracteres
    const calculatedSize = availableWidth / (maxTextLength * charWidthRatio);
    // Aumentar el tamaño en un 40% (multiplicar por 1.4)
    const increasedSize = calculatedSize * 1.4;
    // Limitar entre 14px y 25px para legibilidad (ajustado por el aumento del 40%)
    return Math.max(14, Math.min(25, Math.floor(increasedSize)));
  }

  function getTextTransform(index: number, r: number) {
    // Texto al 90% del radio (más cerca del borde)
    const textR = r * 0.9; 
    // Ángulo del centro del segmento
    const segmentCenterAngle = (index * displaySlotAngle) + (displaySlotAngle / 2);
    // Convertir a coordenadas SVG (donde -90° es arriba)
    const angle = segmentCenterAngle - 90;
    const rad = angle * (Math.PI / 180);
    const x = 300 + textR * Math.cos(rad);
    const y = 300 + textR * Math.sin(rad);
    // Rotar el texto para que siga la dirección radial (alineado con el segmento)
    return `translate(${x}, ${y}) rotate(${angle})`; 
  }

  // Renderizados condicionales
  if (loading) {
    return (
      <>
        <AdminNavBar />
        <div className="p-10 text-center">Cargando datos...</div>
      </>
    );
  }
  
  if (!raffle) {
    return (
      <>
        <AdminNavBar />
        <div className="p-10 text-center">Sorteo no encontrado</div>
      </>
    );
  }

  // REGLA: Todos los cupos deben estar COMPRADOS (CONFIRMED) para ejecutar
  const confirmedItems = raffle.ticketItems.filter((t: { status?: string }) => t.status === "CONFIRMED");
  const pendingItems = raffle.ticketItems.filter((t: { status?: string }) => t.status === "PENDING");
  const availableSlots = raffle.slots - confirmedItems.length;
  // Permitir ejecutar solo si TODOS los cupos están COMPRADOS y CONFIRMADOS (no hay pendientes)
  const canExecute = raffle.status === "ACTIVE" && confirmedItems.length === raffle.slots && pendingItems.length === 0 && (!raffle.startsAt || new Date(raffle.startsAt) <= new Date());
  const remainingSpins = raffle.winnersCount - winners.length;
  
  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "1000px" }}>
        <h1 style={{ marginBottom: "1.5rem" }}>Ejecutar Sorteo: {raffle.title}</h1>
        
        {/* Panel de Control - Centrado y dividido por secciones */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                <h3 style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".875rem" }}>Ganadores Seleccionados</h3>
                <p style={{ margin: ".5rem 0 0", fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)" }}>
                    {winners.length}/{raffle.winnersCount}
                </p>
            </div>
            <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                <h3 style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".875rem" }}>Giros Restantes</h3>
                <p style={{ margin: ".5rem 0 0", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {remainingSpins}
                </p>
            </div>
            <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                <h3 style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".875rem" }}>Estado</h3>
                <p style={{ margin: ".5rem 0 0", fontSize: "1.5rem", fontWeight: 700 }}>
                    {raffle.status}
                </p>
            </div>
            <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                <h3 style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".875rem" }}>Cupos Comprados</h3>
                <p style={{ margin: ".5rem 0 0", fontSize: "1.5rem", fontWeight: 700 }}>
                    {raffle.ticketItems.filter((t: { status?: string }) => t.status === "CONFIRMED" || !t.status).length}/{raffle.slots}
                </p>
            </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Contenedor de la Ruleta */}
            <div className="card" style={{ padding: "2rem", position: "relative", display: "flex", justifyContent: "center", alignItems: "flex-start", marginBottom: "2rem" }}>
                
                {/* 1. PUNTERO (Z-INDEX ALTO) - MITAD DENTRO, MITAD FUERA */}
                {/* Radio de la ruleta: 280px, centro en 300,300. Borde superior en y=20px del SVG */}
                {/* Flecha: 65px altura (45px + 20px). Para mitad dentro/mitad fuera: top = 20 - 32.5 = -12.5px */}
                <div style={{ 
                    position: "absolute", 
                    top: "-12.5px", // Posicionado para que quede mitad dentro (32.5px) y mitad fuera (32.5px) del borde
                    left: "50%", 
                    transform: "translateX(-50%)", 
                    zIndex: 20 
                }}>
                    <svg width="60" height="70" viewBox="0 0 60 70">
                        {/* Sombra */}
                        <path d="M 10 0 L 50 0 L 30 65 Z" fill="rgba(0,0,0,0.3)" transform="translate(0, 4)" />
                        {/* Triángulo físico - 65px de altura, sin borde, color verde */}
                        <path d="M 10 0 L 50 0 L 30 65 Z" fill="#85BB65" />
                    </svg>
                </div>

                {/* 2. RULETA GIRATORIA */}
                <svg
                    width="600"
                    height="600"
                    viewBox="0 0 600 600"
                    style={{
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: "center center",
                        transition: spinning ? `transform ${spinDuration}s cubic-bezier(0.17, 0.67, 0.12, 0.99)` : "none",
                        filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.3))"
                    }}
                >
                    {displayItems.map((item, i) => {
                        const isBlocked = blockedItems.has(item);
                        const isPurchased = raffle.ticketItems.some((t: { value: string }) => t.value === item);
                        const segmentColor = isBlocked ? "#6b7280" : WHEEL_COLORS[i % WHEEL_COLORS.length];
                        const opacity = isPurchased ? (isBlocked ? 0.8 : 1) : 0.6;
                        const fontSize = getFontSize();
                        
                        return (
                            <g key={i}>
                                <path
                                    d={getSegmentPath(i, radius)}
                                    fill={segmentColor}
                                    opacity={opacity}
                                    stroke="white"
                                    strokeWidth="2"
                                />
                                <text
                                    transform={getTextTransform(i, radius)}
                                    textAnchor="end"
                                    dominantBaseline="middle"
                                    fill="white"
                                    fontSize={fontSize}
                                    fontWeight="700"
                                    style={{ 
                                      textShadow: "2px 2px 4px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.8)",
                                      userSelect: "none",
                                      fontFamily: "system-ui, -apple-system, sans-serif",
                                      textTransform: "uppercase"
                                    }}
                                >
                                    {item.toUpperCase().trim()}
                                </text>
                            </g>
                        );
                    })}
                    {/* Borde rojo de la ruleta */}
                    <circle
                        cx="300"
                        cy="300"
                        r={radius}
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="4"
                    />
                    {/* Centro decorativo con círculo más grande */}
                    <circle 
                        cx="300" 
                        cy="300" 
                        r="40" 
                        fill="white" 
                        stroke="#dc2626" 
                        strokeWidth="3"
                        style={{
                          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.2))"
                        }}
                    />
                </svg>

                {/* 3. RESULTADO DEL GANADOR - SOBREPUESTO ENCIMA DE LA RULETA */}
                {winners.length > 0 && !spinning && (
                    <div style={{ 
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        zIndex: 15,
                        padding: "1.5rem 2rem",
                        textAlign: "center",
                        background: "linear-gradient(135deg, rgba(133, 187, 101, 0.95) 0%, rgba(16, 185, 129, 0.95) 100%)",
                        border: "3px solid #85BB65",
                        borderRadius: "12px",
                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                        minWidth: "300px"
                    }}>
                        <h3 style={{ margin: "0 0 1rem", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
                            {winners.length === 1 ? "🎉 ¡Ganador!" : `🎉 ¡Ganadores (${winners.length}/${raffle.winnersCount})!`}
                        </h3>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", justifyContent: "center" }}>
                            {winners.map((winner, idx) => (
                                <span key={idx} style={{ 
                                    padding: ".5rem 1rem", 
                                    background: "#85BB65", 
                                    color: "#ffffff", 
                                    borderRadius: "8px", 
                                    fontWeight: 700,
                                    fontSize: "1rem"
                                }}>
                                    {winner}
                                </span>
                            ))}
                        </div>
                        {winners.length < raffle.winnersCount && (
                            <div style={{ marginTop: "1rem", fontSize: ".875rem", color: "var(--text-primary)", opacity: 0.8 }}>
                                Faltan {remainingSpins} giro(s) restante(s)
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Botón de Ejecutar */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                <button
                    onClick={handleExecuteSingleSpin}
                    disabled={spinning || executing || !canExecute || winners.length >= raffle.winnersCount}
                    style={{
                        padding: ".75rem 2rem",
                        borderRadius: "8px",
                        border: "none",
                        background: canExecute && remainingSpins > 0 ? "#85BB65" : "#6b7280",
                        color: "var(--text-primary)",
                        fontWeight: 700,
                        fontSize: "1.125rem",
                        cursor: (spinning || executing || !canExecute || winners.length >= raffle.winnersCount) ? "not-allowed" : "pointer",
                        opacity: (spinning || executing || !canExecute || winners.length >= raffle.winnersCount) ? 0.5 : 1,
                        transition: "all 0.2s",
                        boxShadow: canExecute && remainingSpins > 0 ? "0 4px 12px rgba(133, 187, 101, 0.3)" : "none"
                    }}
                >
                    {spinning ? (
                        <span style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                            <span>⏳</span> Girando... ({remainingSpins} giro(s) restante(s))
                        </span>
                    ) : winners.length >= raffle.winnersCount ? (
                        "✅ Sorteo Finalizado"
                    ) : (
                        `▶️ Ejecutar Giro (${remainingSpins} restante(s))`
                    )}
                </button>
            </div>

            {!canExecute && (
              <div className="card" style={{ 
                  marginTop: "1rem", 
                  padding: "1rem", 
                  background: "rgba(239, 68, 68, 0.1)", 
                  border: "1px solid #ef4444", 
                  color: "#dc2626",
                  textAlign: "center",
                  fontWeight: 600
              }}>
                {availableSlots > 0 
                  ? `⚠️ REGLA: No se puede ejecutar la ruleta. Faltan ${availableSlots} cupo(s) por COMPRAR y CONFIRMAR. Todos los cupos deben estar COMPRADOS y CONFIRMADOS por los administradores antes de ejecutar.`
                  : pendingItems.length > 0
                  ? `⚠️ REGLA: No se puede ejecutar la ruleta. Hay ${pendingItems.length} cupo(s) pendientes de confirmación. Todos los cupos deben estar COMPRADOS y CONFIRMADOS antes de ejecutar.`
                  : "⚠️ REGLA: El sorteo no puede ejecutarse. Todos los cupos deben estar COMPRADOS y CONFIRMADOS por los administradores antes de ejecutar."}
              </div>
            )}
        </div>
      </main>
    </>
  );
}

export default function EjecutarRafflePage({ params }: { params: { id: string } }) {
  return (
    <AuthGuard requiredRole={["AGENT", "SUPERADMIN", "MASTER"]}>
      <EjecutarRafflePageContent params={params} />
    </AuthGuard>
  );
}
