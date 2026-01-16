"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import Link from "next/link";

type ImageFile = {
  name: string;
  url: string;
  type: "image" | "video";
};

type HomePageConfig = {
  id?: string;
  heroImages: string[];
  heroAutoSlide: boolean;
  heroAutoSlideMode: string;
  heroAutoSlideInterval: number;
  heroImageSize?: string;
  instagramVideoUrl: string | null;
  heroEffect: string | null;
  heroEffectParams: Record<string, any> | null;
  heroScrollFade: boolean;
  heroOpacity: number;
  heroBlur: number;
  heroTextColor: string | null;
  heroSubtitleColor: string | null;
  heroOverlayColor: string | null;
  heroOverlayOpacity: number;
};

const AUTO_SLIDE_MODES = [
  { value: "none", label: "Ninguno" },
  { value: "linear", label: "Lineal (Izquierda a Derecha)" },
  { value: "reverse", label: "Reverso (Derecha a Izquierda)" },
  { value: "fade", label: "Desvanecimiento" },
  { value: "zoom", label: "Zoom In/Out" },
  { value: "slide-up", label: "Deslizar Hacia Arriba" },
  { value: "slide-down", label: "Deslizar Hacia Abajo" }
];

const HERO_EFFECTS = [
  { value: "fade", label: "Desvanecimiento (Fade)" },
  { value: "slide", label: "Deslizamiento (Slide)" },
  { value: "parallax", label: "Parallax" },
  { value: "fade-in-reveal", label: "Revelación con Desvanecimiento" },
  { value: "zoom-in-out", label: "Zoom In/Out" }
];

function PaginaPrincipalContent() {
  const [auth, setAuth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableImages, setAvailableImages] = useState<ImageFile[]>([]);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [showVideoSelector, setShowVideoSelector] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [config, setConfig] = useState<HomePageConfig>({
    heroImages: ["/images/ruleta-fortuna-hero.jpg"],
    heroAutoSlide: false,
    heroAutoSlideMode: "linear",
    heroAutoSlideInterval: 5000,
    heroImageSize: "contain",
    instagramVideoUrl: "/images/RULETA FONDO REDES.mp4",
    heroEffect: "fade",
    heroEffectParams: {},
    heroScrollFade: true,
    heroOpacity: 80,
    heroBlur: 0,
    heroTextColor: null,
    heroSubtitleColor: null,
    heroOverlayColor: null,
    heroOverlayOpacity: 70
  });

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token) {
      loadConfig();
      loadAvailableImages();
    }
  }, [auth]);

  async function loadAvailableImages() {
    if (!auth?.token) return;
    try {
      const res = await fetch("/api/admin/homepage/images", {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      const data = await res.json();
      if (data.images) {
        setAvailableImages(data.images);
      }
    } catch (err) {
      console.error("Error cargando imágenes:", err);
    }
  }

  async function loadConfig() {
    if (!auth?.token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/homepage", {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      const data = await res.json();
      if (data.error) {
        console.error("Error:", data.error);
      } else {
        setConfig({
          heroImages: Array.isArray(data.heroImages) ? data.heroImages.slice(0, 5) : [data.heroImages || "/images/ruleta-fortuna-hero.jpg"].filter(Boolean).slice(0, 5),
          heroAutoSlide: data.heroAutoSlide ?? false,
          heroAutoSlideMode: data.heroAutoSlideMode || "linear",
          heroAutoSlideInterval: data.heroAutoSlideInterval || 5000,
          heroImageSize: data.heroImageSize || "contain",
          instagramVideoUrl: data.instagramVideoUrl || "",
          heroEffect: data.heroEffect || "fade",
          heroEffectParams: data.heroEffectParams || {},
          heroScrollFade: data.heroScrollFade ?? true,
          heroOpacity: data.heroOpacity !== undefined ? Math.round(data.heroOpacity * 100) : 80,
          heroBlur: data.heroBlur !== undefined ? Math.round(data.heroBlur * 5) : 0,
          heroTextColor: data.heroTextColor || null,
          heroSubtitleColor: data.heroSubtitleColor || null,
          heroOverlayColor: data.heroOverlayColor || null,
          heroOverlayOpacity: data.heroOverlayOpacity !== undefined ? Math.round(data.heroOverlayOpacity * 100) : 70
        });
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!auth?.token || saving) return;

    if (config.heroImages.length === 0) {
      alert("Debe haber al menos una imagen en el carrusel");
      return;
    }

    if (config.heroImages.length > 5) {
      alert("Máximo 5 imágenes permitidas");
      return;
    }

    setSaving(true);
    try {
      const dataToSend: any = {
        heroImages: config.heroImages || [],
        heroAutoSlide: config.heroAutoSlide ?? false,
        heroAutoSlideMode: config.heroAutoSlideMode || "linear",
        heroAutoSlideInterval: config.heroAutoSlideInterval ?? 5000,
        heroImageSize: config.heroImageSize || "contain",
        instagramVideoUrl: config.instagramVideoUrl || null,
        heroEffect: config.heroEffect || "fade",
        heroEffectParams: config.heroEffectParams || {},
        heroScrollFade: config.heroScrollFade ?? true,
        heroOpacity: (config.heroOpacity ?? 80) / 100,
        heroBlur: (config.heroBlur ?? 0) / 5,
        heroTextColor: config.heroTextColor || null,
        heroSubtitleColor: config.heroSubtitleColor || null,
        heroOverlayColor: config.heroOverlayColor || null,
        heroOverlayOpacity: (config.heroOverlayOpacity ?? 70) / 100,
        // NO enviar sectionOrder ni sectionVisibility - el Header NO se puede modificar desde este módulo
        sectionOrder: null,
        sectionVisibility: null
      };

      const res = await fetch("/api/admin/homepage", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify(dataToSend)
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ Configuración guardada exitosamente");
      } else {
        const errorMsg = data.error || data.message || "No se pudo guardar la configuración";
        console.error("Error del servidor:", data);
        alert(`❌ Error: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert(`Error al guardar configuración: ${err instanceof Error ? err.message : "Error desconocido"}`);
    } finally {
      setSaving(false);
    }
  }

  function selectImage(imageUrl: string) {
    if (config.heroImages.length >= 5) {
      alert("Máximo 5 imágenes permitidas. Elimina una imagen primero.");
      return;
    }
    if (config.heroImages.includes(imageUrl)) {
      alert("Esta imagen ya está seleccionada");
      return;
    }
    setConfig({ ...config, heroImages: [...config.heroImages, imageUrl].slice(0, 5) });
    setShowImageSelector(false);
  }

  function removeHeroImage(index: number) {
    const newImages = [...config.heroImages];
    newImages.splice(index, 1);
    setConfig({ ...config, heroImages: newImages.length > 0 ? newImages : ["/images/ruleta-fortuna-hero.jpg"] });
  }

  function moveImageUp(index: number) {
    if (index === 0) return;
    const newImages = [...config.heroImages];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    setConfig({ ...config, heroImages: newImages });
  }

  function moveImageDown(index: number) {
    if (index === config.heroImages.length - 1) return;
    const newImages = [...config.heroImages];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    setConfig({ ...config, heroImages: newImages });
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newImages = [...config.heroImages];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    setConfig({ ...config, heroImages: newImages });
    setDraggedIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  if (loading) {
    return (
      <AuthGuard requiredRole={["AGENT", "SUPERADMIN", "MASTER"]}>
        <AdminNavBar />
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando configuración...</div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={["AGENT", "SUPERADMIN", "MASTER"]}>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "1400px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, color: "#1a5c2e" }}>Configurar Carrusel de Portada</h1>
          <Link href="/admin" style={{ color: "#2a8c4a", textDecoration: "none", fontWeight: 600 }}>← Volver</Link>
        </div>

        {/* Sección Carrusel de Imágenes */}
        <div className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1.5rem", color: "#1a5c2e" }}>🖼️ Carrusel de Imágenes de Portada</h2>
          
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {/* Selector de Imágenes */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ color: "#1a5c2e", fontWeight: 600 }}>
                  Imágenes del Carrusel (Máximo 5)
                </label>
                <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  {config.heroImages.length}/5
                </span>
              </div>
              
              {config.heroImages.length > 0 && (
                <div style={{ display: "grid", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  {config.heroImages.map((img, index) => (
                    <div 
                      key={index} 
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      style={{ 
                        display: "flex", 
                        gap: "0.5rem", 
                        alignItems: "center", 
                        padding: "0.75rem", 
                        background: draggedIndex === index ? "#d0fdd7" : "#ffffff", 
                        borderRadius: "8px",
                        border: draggedIndex === index ? "2px solid #2a8c4a" : "1px solid #d0fdd7",
                        cursor: "move",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <button
                          onClick={() => moveImageUp(index)}
                          disabled={index === 0}
                          style={{ padding: "0.25rem 0.5rem", background: index === 0 ? "#9ca3af" : "#2a8c4a", color: "#fff", border: "none", borderRadius: "4px", cursor: index === 0 ? "not-allowed" : "pointer", fontSize: "0.75rem" }}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveImageDown(index)}
                          disabled={index === config.heroImages.length - 1}
                          style={{ padding: "0.25rem 0.5rem", background: index === config.heroImages.length - 1 ? "#9ca3af" : "#2a8c4a", color: "#fff", border: "none", borderRadius: "4px", cursor: index === config.heroImages.length - 1 ? "not-allowed" : "pointer", fontSize: "0.75rem" }}
                        >
                          ↓
                        </button>
                      </div>
                      <div style={{ width: "120px", height: "80px", backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: "4px", border: "1px solid #d0fdd7" }} />
                      <div style={{ flex: 1, fontSize: "0.875rem", color: "#1a5c2e", wordBreak: "break-all" }}>
                        <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Imagen {index + 1}</div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{img}</div>
                      </div>
                      <button
                        onClick={() => removeHeroImage(index)}
                        disabled={config.heroImages.length === 1}
                        style={{ padding: "0.5rem 1rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", cursor: config.heroImages.length === 1 ? "not-allowed" : "pointer" }}
                      >
                        ✖
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {config.heroImages.length < 5 && (
                <>
                  <button
                    onClick={() => setShowImageSelector(!showImageSelector)}
                    style={{ padding: "0.75rem 1.5rem", background: "#2a8c4a", color: "#ffffff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
                  >
                    {showImageSelector ? "✖ Cerrar Selector" : "📁 Seleccionar Imágenes"}
                  </button>

                  {showImageSelector && (
                    <div style={{ marginTop: "1rem", padding: "1rem", background: "#ffffff", borderRadius: "8px", border: "1px solid #d0fdd7" }}>
                      <h4 style={{ margin: "0 0 1rem", color: "#1a5c2e" }}>Imágenes Disponibles en /public/images/</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem", maxHeight: "400px", overflowY: "auto" }}>
                        {availableImages.filter(img => img.type === "image").map((img) => (
                          <div
                            key={img.url}
                            onClick={() => selectImage(img.url)}
                            style={{
                              cursor: config.heroImages.includes(img.url) ? "not-allowed" : "pointer",
                              opacity: config.heroImages.includes(img.url) ? 0.5 : 1,
                              padding: "0.5rem",
                              background: config.heroImages.includes(img.url) ? "#9ca3af" : "#fff",
                              borderRadius: "8px",
                              border: config.heroImages.includes(img.url) ? "2px solid #9ca3af" : "2px solid #d4d4c4",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              if (!config.heroImages.includes(img.url)) {
                                e.currentTarget.style.borderColor = "#2a8c4a";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!config.heroImages.includes(img.url)) {
                                e.currentTarget.style.borderColor = "#d4d4c4";
                                e.currentTarget.style.transform = "scale(1)";
                              }
                            }}
                          >
                            <div style={{ width: "100%", height: "100px", backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", borderRadius: "4px", maxWidth: "100%" }} />
                            <div style={{ fontSize: "0.75rem", color: "#1a5c2e", marginTop: "0.25rem", textAlign: "center", wordBreak: "break-all" }}>
                              {img.name}
                            </div>
                            {config.heroImages.includes(img.url) && (
                              <div style={{ fontSize: "0.75rem", color: "#6b7280", textAlign: "center", marginTop: "0.25rem" }}>✓ Seleccionada</div>
                            )}
                          </div>
                        ))}
                        {availableImages.filter(img => img.type === "image").length === 0 && (
                          <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#6b7280", padding: "2rem" }}>
                            No hay imágenes disponibles en /public/images/
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Tamaño de Imagen */}
            <div style={{ padding: "1rem", background: "#ffffff", borderRadius: "8px", border: "1px solid #d0fdd7" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#1a5c2e", fontWeight: 600 }}>
                Tamaño de Imagen de Portada
              </label>
              <select
                value={config.heroImageSize || "contain"}
                onChange={(e) => setConfig({ ...config, heroImageSize: e.target.value })}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #d0fdd7", background: "#fff", color: "#1a5c2e" }}
              >
                <option value="contain">Contener (Mostrar imagen completa - Recomendado)</option>
                <option value="cover">Cubrir (Llenar todo el espacio, puede recortar)</option>
                <option value="auto">Autoajustar (Llenar todo el espacio sin recortar, mostrando la imagen completa)</option>
              </select>
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                {config.heroImageSize === "contain" 
                  ? "✓ La imagen se mostrará completa sin recortes" 
                  : config.heroImageSize === "cover"
                  ? "⚠ La imagen puede recortarse para llenar todo el espacio"
                  : "✓ La imagen se ajustará automáticamente para llenar todo el espacio sin dejar vacíos arriba o abajo, preservando sus proporciones originales (sin estirar)"}
              </div>
            </div>

            {/* Auto-slide */}
            <div style={{ padding: "1rem", background: "#ffffff", borderRadius: "8px", display: "grid", gap: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={config.heroAutoSlide || false}
                  onChange={(e) => setConfig({ ...config, heroAutoSlide: e.target.checked })}
                />
                <span style={{ color: "#1a5c2e", fontWeight: 600 }}>Deslizamiento Automático</span>
              </label>
              {config.heroAutoSlide && (
                <div style={{ display: "grid", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", color: "#1a5c2e", fontWeight: 600 }}>
                      Modo de Deslizamiento
                    </label>
                    <select
                      value={config.heroAutoSlideMode || "linear"}
                      onChange={(e) => setConfig({ ...config, heroAutoSlideMode: e.target.value })}
                      style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #d0fdd7", background: "#fff", color: "#1a5c2e" }}
                    >
                      {AUTO_SLIDE_MODES.map(mode => (
                        <option key={mode.value} value={mode.value}>{mode.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <label style={{ color: "#1a5c2e", fontWeight: 600, minWidth: "120px" }}>Intervalo entre imágenes:</label>
                      <input
                        type="range"
                        min="2000"
                        max="15000"
                        step="500"
                        value={config.heroAutoSlideInterval || 5000}
                        onChange={(e) => setConfig({ ...config, heroAutoSlideInterval: parseInt(e.target.value) || 5000 })}
                        style={{ flex: 1 }}
                      />
                      <input
                        type="number"
                        min="2000"
                        max="15000"
                        step="500"
                        value={config.heroAutoSlideInterval || 5000}
                        onChange={(e) => setConfig({ ...config, heroAutoSlideInterval: Math.max(2000, parseInt(e.target.value) || 5000) })}
                        style={{ width: "100px", padding: "0.5rem", borderRadius: "4px", border: "1px solid #d0fdd7", background: "#fff", color: "#1a5c2e" }}
                      />
                      <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>ms</span>
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280", paddingLeft: "120px" }}>
                      ⚡ Velocidad: {config.heroAutoSlideInterval < 3000 ? "Muy Rápida" : config.heroAutoSlideInterval < 5000 ? "Rápida" : config.heroAutoSlideInterval < 8000 ? "Normal" : "Lenta"} 
                      (Recomendado: 5000-8000ms para mejor experiencia)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Efecto Visual */}
            <div style={{ padding: "1rem", background: "#ffffff", borderRadius: "8px", border: "1px solid #d0fdd7" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#1a5c2e", fontWeight: 600 }}>
                Efecto Visual de la Imagen
              </label>
              <select
                value={config.heroEffect || "fade"}
                onChange={(e) => setConfig({ ...config, heroEffect: e.target.value, heroEffectParams: {} })}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #d0fdd7", background: "#fff", color: "#1a5c2e" }}
              >
                {HERO_EFFECTS.map(effect => (
                  <option key={effect.value} value={effect.value}>{effect.label}</option>
                ))}
              </select>
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                {config.heroEffect === "fade" && "✓ Transición suave entre imágenes"}
                {config.heroEffect === "slide" && "✓ Deslizamiento horizontal entre imágenes"}
                {config.heroEffect === "parallax" && "✓ Efecto parallax con movimiento"}
                {config.heroEffect === "fade-in-reveal" && "✓ Revelación con desvanecimiento"}
                {config.heroEffect === "zoom-in-out" && "✓ Zoom al hacer scroll"}
              </div>
            </div>

            {/* Desvanecimiento al hacer scroll */}
            <div style={{ padding: "1rem", background: "#ffffff", borderRadius: "8px", border: "1px solid #d0fdd7" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={config.heroScrollFade ?? true}
                  onChange={(e) => setConfig({ ...config, heroScrollFade: e.target.checked })}
                />
                <span style={{ color: "#1a5c2e", fontWeight: 600 }}>Desvanecimiento al hacer scroll</span>
              </label>
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280", paddingLeft: "1.5rem" }}>
                {config.heroScrollFade ? "✓ El carrusel se desvanecerá al hacer scroll hacia abajo" : "✗ El carrusel permanecerá visible al hacer scroll"}
              </div>
            </div>

            {/* Opacidad de la Imagen */}
            <div style={{ padding: "1rem", background: "#ffffff", borderRadius: "8px", border: "1px solid #d0fdd7" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#1a5c2e", fontWeight: 600 }}>
                Opacidad de la Imagen de Portada
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.heroOpacity ?? 80}
                  onChange={(e) => setConfig({ ...config, heroOpacity: parseInt(e.target.value) || 80 })}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={config.heroOpacity ?? 80}
                  onChange={(e) => setConfig({ ...config, heroOpacity: Math.max(0, Math.min(100, parseInt(e.target.value) || 80)) })}
                  style={{ width: "80px", padding: "0.5rem", borderRadius: "4px", border: "1px solid #d0fdd7", background: "#fff", color: "#1a5c2e" }}
                />
                <span style={{ color: "#6b7280", fontSize: "0.875rem", minWidth: "30px" }}>%</span>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                {config.heroOpacity === 0 && "Transparente (invisible)"}
                {config.heroOpacity > 0 && config.heroOpacity < 30 && "Muy transparente"}
                {config.heroOpacity >= 30 && config.heroOpacity < 60 && "Transparente"}
                {config.heroOpacity >= 60 && config.heroOpacity < 90 && "Semi-transparente"}
                {config.heroOpacity >= 90 && config.heroOpacity < 100 && "Casi opaco"}
                {config.heroOpacity === 100 && "Completamente opaco"}
              </div>
            </div>

            {/* Desenfoque de la Imagen */}
            <div style={{ padding: "1rem", background: "#ffffff", borderRadius: "8px", border: "1px solid #d0fdd7" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#1a5c2e", fontWeight: 600 }}>
                Desenfoque de la Imagen de Portada
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.heroBlur ?? 0}
                  onChange={(e) => setConfig({ ...config, heroBlur: parseInt(e.target.value) || 0 })}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={config.heroBlur ?? 0}
                  onChange={(e) => setConfig({ ...config, heroBlur: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                  style={{ width: "80px", padding: "0.5rem", borderRadius: "4px", border: "1px solid #d0fdd7", background: "#fff", color: "#1a5c2e" }}
                />
                <span style={{ color: "#6b7280", fontSize: "0.875rem", minWidth: "30px" }}>%</span>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                {config.heroBlur === 0 && "Sin desenfoque (nítido)"}
                {config.heroBlur > 0 && config.heroBlur < 25 && "Desenfoque ligero"}
                {config.heroBlur >= 25 && config.heroBlur < 50 && "Desenfoque moderado"}
                {config.heroBlur >= 50 && config.heroBlur < 75 && "Desenfoque fuerte"}
                {config.heroBlur >= 75 && "Desenfoque muy fuerte"}
              </div>
            </div>

            {/* Color del Texto del Título */}
            <div style={{ padding: "1rem", background: "#ffffff", borderRadius: "8px", border: "1px solid #d0fdd7" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#1a5c2e", fontWeight: 600 }}>
                Color del Texto del Título
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="color"
                  value={config.heroTextColor || "#e2e8f0"}
                  onChange={(e) => setConfig({ ...config, heroTextColor: e.target.value })}
                  style={{ width: "60px", height: "40px", borderRadius: "4px", border: "1px solid #d0fdd7", cursor: "pointer" }}
                />
                <input
                  type="text"
                  value={config.heroTextColor || "#e2e8f0"}
                  onChange={(e) => setConfig({ ...config, heroTextColor: e.target.value || null })}
                  placeholder="#e2e8f0"
                  style={{ flex: 1, padding: "0.5rem", borderRadius: "4px", border: "1px solid #d0fdd7", background: "#fff", color: "#1a5c2e" }}
                />
                <button
                  onClick={() => setConfig({ ...config, heroTextColor: null })}
                  style={{ padding: "0.5rem 1rem", background: "#6b7280", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.875rem" }}
                >
                  Reset
                </button>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                {config.heroTextColor ? `✓ Color personalizado: ${config.heroTextColor}` : "Usando color por defecto (#e2e8f0)"}
              </div>
            </div>

            {/* Color del Texto del Subtítulo */}
            <div style={{ padding: "1rem", background: "#ffffff", borderRadius: "8px", border: "1px solid #d0fdd7" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#1a5c2e", fontWeight: 600 }}>
                Color del Texto del Subtítulo
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="color"
                  value={config.heroSubtitleColor || "#cbd5e1"}
                  onChange={(e) => setConfig({ ...config, heroSubtitleColor: e.target.value })}
                  style={{ width: "60px", height: "40px", borderRadius: "4px", border: "1px solid #d0fdd7", cursor: "pointer" }}
                />
                <input
                  type="text"
                  value={config.heroSubtitleColor || "#cbd5e1"}
                  onChange={(e) => setConfig({ ...config, heroSubtitleColor: e.target.value || null })}
                  placeholder="#cbd5e1"
                  style={{ flex: 1, padding: "0.5rem", borderRadius: "4px", border: "1px solid #d0fdd7", background: "#fff", color: "#1a5c2e" }}
                />
                <button
                  onClick={() => setConfig({ ...config, heroSubtitleColor: null })}
                  style={{ padding: "0.5rem 1rem", background: "#6b7280", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.875rem" }}
                >
                  Reset
                </button>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                {config.heroSubtitleColor ? `✓ Color personalizado: ${config.heroSubtitleColor}` : "Usando color por defecto (#cbd5e1)"}
              </div>
            </div>

            {/* Color del Overlay */}
            <div style={{ padding: "1rem", background: "#ffffff", borderRadius: "8px", border: "1px solid #d0fdd7" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#1a5c2e", fontWeight: 600 }}>
                Color del Overlay
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="color"
                  value={config.heroOverlayColor || "#0b1221"}
                  onChange={(e) => setConfig({ ...config, heroOverlayColor: e.target.value })}
                  style={{ width: "60px", height: "40px", borderRadius: "4px", border: "1px solid #d0fdd7", cursor: "pointer" }}
                />
                <input
                  type="text"
                  value={config.heroOverlayColor || "#0b1221"}
                  onChange={(e) => setConfig({ ...config, heroOverlayColor: e.target.value || null })}
                  placeholder="#0b1221"
                  style={{ flex: 1, padding: "0.5rem", borderRadius: "4px", border: "1px solid #d0fdd7", background: "#fff", color: "#1a5c2e" }}
                />
                <button
                  onClick={() => setConfig({ ...config, heroOverlayColor: null })}
                  style={{ padding: "0.5rem 1rem", background: "#6b7280", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.875rem" }}
                >
                  Reset
                </button>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                {config.heroOverlayColor ? `✓ Color personalizado: ${config.heroOverlayColor}` : "Usando color por defecto (#0b1221)"}
              </div>
            </div>

            {/* Opacidad del Overlay */}
            <div style={{ padding: "1rem", background: "#ffffff", borderRadius: "8px", border: "1px solid #d0fdd7" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#1a5c2e", fontWeight: 600 }}>
                Opacidad del Overlay
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.heroOverlayOpacity ?? 70}
                  onChange={(e) => setConfig({ ...config, heroOverlayOpacity: parseInt(e.target.value) || 70 })}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={config.heroOverlayOpacity ?? 70}
                  onChange={(e) => setConfig({ ...config, heroOverlayOpacity: Math.max(0, Math.min(100, parseInt(e.target.value) || 70)) })}
                  style={{ width: "80px", padding: "0.5rem", borderRadius: "4px", border: "1px solid #d0fdd7", background: "#fff", color: "#1a5c2e" }}
                />
                <span style={{ color: "#6b7280", fontSize: "0.875rem", minWidth: "30px" }}>%</span>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                {config.heroOverlayOpacity === 0 && "Sin overlay (transparente)"}
                {config.heroOverlayOpacity > 0 && config.heroOverlayOpacity < 30 && "Overlay muy transparente"}
                {config.heroOverlayOpacity >= 30 && config.heroOverlayOpacity < 60 && "Overlay semi-transparente"}
                {config.heroOverlayOpacity >= 60 && config.heroOverlayOpacity < 90 && "Overlay opaco"}
                {config.heroOverlayOpacity >= 90 && "Overlay muy opaco"}
              </div>
            </div>
          </div>
        </div>

        {/* Video de Instagram */}
        <div className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1.5rem", color: "#1a5c2e" }}>🎥 Video de Instagram</h2>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "#1a5c2e", fontWeight: 600 }}>
              Video Seleccionado
            </label>
            {config.instagramVideoUrl && (
              <div style={{ marginBottom: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.75rem", background: "#ffffff", borderRadius: "8px" }}>
                <video
                  src={config.instagramVideoUrl}
                  style={{ width: "150px", height: "100px", objectFit: "cover", borderRadius: "4px", border: "1px solid #d0fdd7" }}
                  muted
                  loop
                />
                <div style={{ flex: 1, fontSize: "0.875rem", color: "#1a5c2e", wordBreak: "break-all" }}>{config.instagramVideoUrl}</div>
                <button
                  onClick={() => setConfig({ ...config, instagramVideoUrl: "" })}
                  style={{ padding: "0.5rem 1rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                >
                  ✖
                </button>
              </div>
            )}
            <button
              onClick={() => setShowVideoSelector(!showVideoSelector)}
              style={{ padding: "0.75rem 1.5rem", background: "#2a8c4a", color: "#ffffff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
            >
              {showVideoSelector ? "✖ Cerrar Selector" : "📁 Seleccionar Video"}
            </button>

            {showVideoSelector && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "#ffffff", borderRadius: "8px", border: "1px solid #d0fdd7" }}>
                <h4 style={{ margin: "0 0 1rem", color: "#1a5c2e" }}>Videos Disponibles en /public/images/</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", maxHeight: "400px", overflowY: "auto" }}>
                  {availableImages.filter(img => img.type === "video").map((video) => (
                    <div
                      key={video.url}
                      onClick={() => {
                        setConfig({ ...config, instagramVideoUrl: video.url });
                        setShowVideoSelector(false);
                      }}
                      style={{
                        cursor: "pointer",
                        padding: "0.5rem",
                        background: config.instagramVideoUrl === video.url ? "#2a8c4a" : "#fff",
                        borderRadius: "8px",
                        border: config.instagramVideoUrl === video.url ? "2px solid #2a8c4a" : "2px solid #d4d4c4",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        if (config.instagramVideoUrl !== video.url) {
                          e.currentTarget.style.borderColor = "#2a8c4a";
                          e.currentTarget.style.transform = "scale(1.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (config.instagramVideoUrl !== video.url) {
                          e.currentTarget.style.borderColor = "#d4d4c4";
                          e.currentTarget.style.transform = "scale(1)";
                        }
                      }}
                    >
                      <video
                        src={video.url}
                        style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "4px" }}
                        muted
                        loop
                      />
                      <div style={{ fontSize: "0.75rem", color: "#1a5c2e", marginTop: "0.25rem", textAlign: "center", wordBreak: "break-all" }}>
                        {video.name}
                      </div>
                      {config.instagramVideoUrl === video.url && (
                        <div style={{ fontSize: "0.75rem", color: "#ffffff", textAlign: "center", marginTop: "0.25rem", fontWeight: 600 }}>✓ Seleccionado</div>
                      )}
                    </div>
                  ))}
                  {availableImages.filter(img => img.type === "video").length === 0 && (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#6b7280", padding: "2rem" }}>
                      No hay videos disponibles en /public/images/
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vista Previa y Botones */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              padding: "0.75rem 1.5rem",
              background: showPreview ? "#ef4444" : "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer"
            }}
          >
            {showPreview ? "✖ Cerrar Vista Previa" : "👁️ Vista Previa"}
          </button>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={() => {
                // Crear configuración para preview sin sectionOrder ni sectionVisibility
                // El Header siempre se muestra, no se puede modificar desde este módulo
                const previewConfig = {
                  ...config,
                  sectionOrder: null,
                  sectionVisibility: null
                };
                const previewUrl = `/preview?config=${encodeURIComponent(JSON.stringify(previewConfig))}`;
                window.open(previewUrl, "_blank");
              }}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#8b5cf6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer"
              }}
            >
              🔗 Abrir en Nueva Pestaña
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "0.75rem 2rem",
                background: saving ? "#6b7280" : "#2a8c4a",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: saving ? "not-allowed" : "pointer"
              }}
            >
              {saving ? "Guardando..." : "💾 Guardar Configuración"}
            </button>
          </div>
        </div>

        {/* Vista Previa Responsive */}
        {showPreview && (
          <div className="card" style={{ padding: "2rem", marginTop: "1.5rem", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0, color: "#1a5c2e" }}>👁️ Vista Previa</h2>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  style={{
                    padding: "0.5rem 1rem",
                    background: previewDevice === "mobile" ? "#2a8c4a" : "#d0fdd7",
                    color: previewDevice === "mobile" ? "#fff" : "#1a5c2e",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  📱 Móvil
                </button>
                <button
                  onClick={() => setPreviewDevice("tablet")}
                  style={{
                    padding: "0.5rem 1rem",
                    background: previewDevice === "tablet" ? "#2a8c4a" : "#d0fdd7",
                    color: previewDevice === "tablet" ? "#fff" : "#1a5c2e",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  📱 Tablet
                </button>
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  style={{
                    padding: "0.5rem 1rem",
                    background: previewDevice === "desktop" ? "#2a8c4a" : "#d0fdd7",
                    color: previewDevice === "desktop" ? "#fff" : "#1a5c2e",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  💻 Desktop
                </button>
              </div>
            </div>
            <div style={{
              border: "2px solid #d4d4c4",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#f9fafb",
              display: "flex",
              justifyContent: "center",
              padding: "1rem"
            }}>
              <div style={{
                width: previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%",
                maxWidth: "100%",
                background: "#fff",
                border: "8px solid #1f2937",
                borderRadius: "8px",
                overflow: "hidden",
                transform: previewDevice === "mobile" ? "scale(0.8)" : previewDevice === "tablet" ? "scale(0.9)" : "scale(1)",
                transformOrigin: "top center",
                transition: "all 0.3s"
              }}>
                <iframe
                  src={`/preview?config=${encodeURIComponent(JSON.stringify({
                    ...config,
                    sectionOrder: null,
                    sectionVisibility: null
                  }))}`}
                  style={{
                    width: "100%",
                    height: previewDevice === "mobile" ? "667px" : previewDevice === "tablet" ? "1024px" : "800px",
                    border: "none",
                    pointerEvents: "auto",
                    overflow: "auto"
                  }}
                  title="Vista Previa"
                  scrolling="yes"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}

export default function PaginaPrincipalPage() {
  return <PaginaPrincipalContent />;
}
