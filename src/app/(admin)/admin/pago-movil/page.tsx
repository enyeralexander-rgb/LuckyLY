"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";

function PagoMovilPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [cedula, setCedula] = useState<string>("");
  const [telefono, setTelefono] = useState<string>("");
  const [destino, setDestino] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    setAuth(storedAuth);
  }, []);

  useEffect(() => {
    if (auth?.token) {
      setLoading(true);
      fetch("/api/admin/payment-mobile", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            console.error("Error:", data.error);
            setLoading(false);
            return;
          }
          if (data.imageUrl) {
            setImageUrl(data.imageUrl);
          }
          setCedula(data.cedula || "");
          setTelefono(data.telefono || "");
          setDestino(data.destino || "");
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [auth]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo
    if (!selectedFile.type.startsWith("image/")) {
      alert("El archivo debe ser una imagen");
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert("La imagen no debe exceder 5MB");
      return;
    }

    setFile(selectedFile);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
      
      // Validar dimensiones (9:16, máximo 1080x1920)
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const expectedRatio = 9 / 16;
        
        if (Math.abs(aspectRatio - expectedRatio) > 0.1) {
          alert(`La imagen debe tener una relación de aspecto 9:16. Actual: ${img.width}x${img.height}`);
        }
        
        if (img.width > 1080 || img.height > 1920) {
          alert(`La imagen no debe exceder 1080x1920 píxeles. Actual: ${img.width}x${img.height}`);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(selectedFile);
  }

  async function handleUpload() {
    if (!auth?.token || !file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/admin/payment-mobile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${auth.token}`
        },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setImageUrl(data.imageUrl);
        setPreview(null);
        setFile(null);
        alert("Imagen de pago móvil actualizada exitosamente");
      } else {
        alert(data.error || "Error al subir imagen");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al subir imagen");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveData() {
    if (!auth?.token) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/payment-mobile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          cedula: cedula.trim() || null,
          telefono: telefono.trim() || null,
          destino: destino.trim() || null
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert("Datos de pago móvil actualizados exitosamente");
      } else {
        alert(data.error || "Error al guardar datos");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar datos");
    } finally {
      setSaving(false);
    }
  }

  if (!auth || loading) {
    return (
      <>
        <AdminNavBar />
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "800px" }}>
        <h1>Configuración de Pago Móvil</h1>
        
        <div className="card" style={{ padding: "1.5rem", display: "grid", gap: "2rem", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ margin: "0 0 1rem" }}>Imagen Actual</h3>
            {imageUrl ? (
              <div style={{ marginBottom: "1rem" }}>
                <img 
                  src={imageUrl} 
                  alt="Pago Móvil" 
                  style={{ 
                    width: "100%", 
                    maxWidth: "300px", 
                    height: "auto",
                    borderRadius: "8px", 
                    border: "1px solid #1f2937",
                    display: "block",
                    margin: "0 auto",
                    objectFit: "contain"
                  }} 
                />
              </div>
            ) : (
              <div style={{ padding: "2rem", textAlign: "center", color: var(--text-primary), background: var(--input-bg), borderRadius: "8px", border: "1px dashed #d4d4c4" }}>
                No hay imagen configurada
              </div>
            )}
          </div>

          <div>
            <h3 style={{ margin: "0 0 1rem", color: var(--text-primary) }}>Subir Nueva Imagen</h3>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: ".5rem", color: var(--text-primary), fontSize: ".875rem" }}>
                  Seleccionar imagen (Formato 9:16, máximo 1080x1920px)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  style={{
                    width: "100%",
                    padding: ".75rem",
                    borderRadius: "8px",
                    border: 1px solid var(--border-color),
                    background: var(--input-bg),
                    color: var(--text-primary)
                  }}
                />
              </div>

              {preview && (
                <div>
                  <div style={{ marginBottom: ".5rem", color: var(--text-secondary), fontSize: ".875rem" }}>Vista previa:</div>
                  <img 
                    src={preview} 
                    alt="Preview" 
                    style={{ 
                      width: "100%", 
                      maxWidth: "300px", 
                      borderRadius: "8px", 
                      border: "1px solid #1f2937",
                      display: "block",
                      margin: "0 auto"
                    }} 
                  />
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                style={{
                  padding: ".75rem 1.5rem",
                  background: (!file || uploading) ? "#6b7280" : "#85BB65",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  cursor: (!file || uploading) ? "not-allowed" : "pointer"
                }}
              >
                {uploading ? "Subiendo..." : "Subir Imagen"}
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "1.5rem", display: "grid", gap: "1.5rem" }}>
          <div>
            <h3 style={{ margin: "0 0 1rem", color: var(--text-primary) }}>Datos para Copiar y Pegar</h3>
            <p style={{ margin: "0 0 1rem", color: var(--text-secondary), fontSize: ".875rem" }}>
              Estos datos se mostrarán a los usuarios cuando seleccionen la opción de pago móvil para que puedan copiarlos fácilmente.
            </p>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: ".5rem", color: var(--text-primary), fontSize: ".875rem", fontWeight: 600 }}>
                  CÉDULA:
                </label>
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Ej: V-12345678"
                  style={{
                    width: "100%",
                    padding: ".75rem",
                    borderRadius: "8px",
                    border: 1px solid var(--border-color),
                    background: var(--input-bg),
                    color: var(--text-primary)
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: ".5rem", color: var(--text-primary), fontSize: ".875rem", fontWeight: 600 }}>
                  TELÉFONO:
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 0412-1234567"
                  style={{
                    width: "100%",
                    padding: ".75rem",
                    borderRadius: "8px",
                    border: 1px solid var(--border-color),
                    background: var(--input-bg),
                    color: var(--text-primary)
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: ".5rem", color: var(--text-primary), fontSize: ".875rem", fontWeight: 600 }}>
                  DESTINO:
                </label>
                <input
                  type="text"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  placeholder="Ej: 0102-1234-5678-9012-34"
                  style={{
                    width: "100%",
                    padding: ".75rem",
                    borderRadius: "8px",
                    border: 1px solid var(--border-color),
                    background: var(--input-bg),
                    color: var(--text-primary)
                  }}
                />
              </div>
              <button
                onClick={handleSaveData}
                disabled={saving}
                style={{
                  padding: ".75rem 1.5rem",
                  background: saving ? "#6b7280" : "#85BB65",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer"
                }}
              >
                {saving ? "Guardando..." : "Guardar Datos"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function PagoMovilPage() {
  return (
    <AuthGuard requiredRole={["MASTER"]}>
      <PagoMovilPageContent />
    </AuthGuard>
  );
}
