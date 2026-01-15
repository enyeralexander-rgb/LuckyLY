import { Footer } from "../../components/Footer";
import { NavBar } from "../../components/NavBar";

export default function LivePage() {
  return (
    <>
      <NavBar />
      <main className="container" style={{ display: "grid", gap: "1.5rem", paddingTop: "2rem" }}>
        <div className="card" style={{ display: "grid", gap: "1rem" }}>
          <h1 style={{ margin: 0 }}>Sección en vivo</h1>
          <div style={{ position: "relative", paddingBottom: "56.25%", background: "#228D57", borderRadius: "12px", overflow: "hidden", border: "1px solid #1f2937" }}>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#64748b" }}>
              Iframe de YouTube/Twitch/RTMP aquí
            </div>
          </div>
          <button style={{ width: "fit-content", padding: ".75rem 1rem", background: "#85BB65", color: "#3E3E3C", border: "none", borderRadius: "8px", fontWeight: 700 }}>
            ¡Juega ahora!
          </button>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Chat en vivo (opcional)</h2>
          <p style={{ color: "#94a3b8" }}>Integrar proveedor de chat o componente WebSocket.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}

