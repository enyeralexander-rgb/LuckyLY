"use client";
import Link from "next/link";
import { AuthGuard } from "../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../lib/clientAuth";
import { useRouter } from "next/navigation";

type UserData = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
};

export default function CuentaPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarHover, setAvatarHover] = useState(false);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token) {
      setLoading(true);
      fetch("/api/user/profile", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            console.error("Error:", data.error);
            setLoading(false);
            return;
          }
          setUserData({
            id: data.id,
            name: data.name,
            email: data.email,
            username: data.username || null,
            avatarUrl: data.avatarUrl || null
          });
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error al cargar perfil:", err);
          setLoading(false);
        });
    }
  }, [auth]);

  if (loading) {
    return (
      <AuthGuard requiredRole={["USER"]}>
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        </main>
      </AuthGuard>
    );
  }

  const displayName = userData?.username || userData?.name || userData?.email.split("@")[0] || "Usuario";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <AuthGuard requiredRole={["USER"]}>
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "1000px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>MI CUENTA</h1>
          <Link href="/" style={{ color: "#85BB65", textDecoration: "none", fontWeight: 600 }}>← Volver al inicio</Link>
        </div>

        {/* Perfil del usuario */}
        <div className="card" style={{ padding: "2rem", marginBottom: "2rem", display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <div 
            style={{ position: "relative", flexShrink: 0 }}
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: userData?.avatarUrl ? `url(${userData.avatarUrl})` : "linear-gradient(135deg, #85BB65 0%, #f59e0b 100%)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "opacity 0.2s",
                opacity: avatarHover ? 0.8 : 1
              }}
              onClick={() => document.getElementById("avatar-input")?.click()}
            >
              {!userData?.avatarUrl && avatarInitial}
            </div>
            {avatarHover && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: "50%",
                  background: "rgba(0, 0, 0, 0.6)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  transition: "opacity 0.2s"
                }}
              >
                <span style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>📷</span>
                <span style={{ fontSize: "0.7rem", color: "#ffffff", textAlign: "center", padding: "0 0.5rem", lineHeight: "1.2" }}>
                  Cambiar foto de perfil
                </span>
              </div>
            )}
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !auth?.token) return;

                // Validar tamaño (máximo 5MB)
                if (file.size > 5 * 1024 * 1024) {
                  alert("La imagen debe ser menor a 5MB");
                  return;
                }

                // Validar tipo
                if (!file.type.startsWith("image/")) {
                  alert("El archivo debe ser una imagen");
                  return;
                }

                // Convertir a base64
                const reader = new FileReader();
                reader.onloadend = async () => {
                  const base64String = reader.result as string;
                  try {
                    const res = await fetch("/api/user/avatar", {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${auth.token}`
                      },
                      body: JSON.stringify({ avatarUrl: base64String })
                    });

                    if (res.ok) {
                      const data = await res.json();
                      setUserData({ ...userData!, avatarUrl: data.avatarUrl });
                      alert("Foto de perfil actualizada exitosamente");
                    } else {
                      const error = await res.json();
                      alert(error.error || "Error al actualizar foto de perfil");
                    }
                  } catch (err) {
                    console.error("Error:", err);
                    alert("Error al actualizar foto de perfil");
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 0.5rem", color: "var(--text-primary)" }}>{displayName}</h2>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>{userData?.email}</p>
          </div>
        </div>

        {/* Menú de opciones */}
        <div style={{ display: "grid", gap: "1rem" }}>
          <Link
            href="/cuenta/configuracion"
            className="card"
            style={{
              padding: "1.5rem",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ fontSize: "2rem" }}>⚙️</div>
              <div>
                <h3 style={{ margin: 0, color: "var(--text-primary)" }}>CONFIGURACIÓN DE LA CUENTA</h3>
                <p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Cambiar correo, nombre de usuario, contraseña o eliminar cuenta
                </p>
              </div>
            </div>
            <div style={{ fontSize: "1.5rem", color: "#85BB65" }}>→</div>
          </Link>

          <Link
            href="/cuenta/historial"
            className="card"
            style={{
              padding: "1.5rem",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ fontSize: "2rem" }}>🎲</div>
              <div>
                <h3 style={{ margin: 0, color: "var(--text-primary)" }}>HISTORIAL DE APUESTAS</h3>
                <p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Ver tus tickets, compras y resultados de sorteos
                </p>
              </div>
            </div>
            <div style={{ fontSize: "1.5rem", color: "#85BB65" }}>→</div>
          </Link>

          <Link
            href="/cuenta/datos-bancarios"
            className="card"
            style={{
              padding: "1.5rem",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ fontSize: "2rem" }}>🏦</div>
              <div>
                <h3 style={{ margin: 0, color: "var(--text-primary)" }}>DATOS BANCARIOS</h3>
                <p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Modificar datos bancarios para compras y pagos
                </p>
              </div>
            </div>
            <div style={{ fontSize: "1.5rem", color: "#85BB65" }}>→</div>
          </Link>
        </div>
      </main>
    </AuthGuard>
  );
}
