"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useMemo, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHomePageConfig } from "./hooks/useHomePageConfig";
import { useAvailableImages } from "./hooks/useAvailableImages";
import { useUnsavedChanges } from "./hooks/useUnsavedChanges";
import { ToastProvider, useToast } from "./components/ToastContext";
import { HeroCarouselSection } from "./components/HeroCarouselSection";
import { HeroAppearanceSection } from "./components/HeroAppearanceSection";
import { PreviewSection } from "./components/PreviewSection";
import { validateHomePageConfig } from "./types";

function PaginaPrincipalContent() {
  const router = useRouter();
  const addToast = useToast();
  const [auth, setAuth] = useState<ReturnType<typeof getStoredAuth>>(null);
  const {
    config,
    setConfig,
    lastSavedConfig,
    loading,
    error: configError,
    save,
    saving,
  } = useHomePageConfig();
  const {
    images: availableImages,
    upload,
    deleteImage,
    refresh: loadAvailableImages,
    uploading,
    deleting,
  } = useAvailableImages(auth?.token ?? null);

  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [selectedImageForDeletion, setSelectedImageForDeletion] = useState<string | null>(null);

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(lastSavedConfig),
    [config, lastSavedConfig]
  );
  const validationErrors = useMemo(() => validateHomePageConfig(config), [config]);
  useUnsavedChanges(isDirty);

  function handleRestore() {
    if (!isDirty) return;
    if (window.confirm("¿Restaurar la última configuración guardada? Se perderán los cambios no guardados.")) {
      setConfig(lastSavedConfig);
      addToast("success", "Configuración restaurada");
    }
  }

  function handleVolverClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!isDirty) return;
    e.preventDefault();
    if (
      window.confirm("Tienes cambios sin guardar. ¿Salir de todos modos? Se perderán los cambios.")
    ) {
      router.push("/admin");
    }
  }

  async function handleSave() {
    const result = await save();
    if (result.ok) {
      addToast("success", "Configuración guardada exitosamente");
    } else {
      addToast("error", result.error ?? "No se pudo guardar");
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = await upload(file);
    event.target.value = "";
    if (result.ok) {
      addToast("success", "Imagen subida exitosamente");
    } else {
      addToast("error", result.error ?? "No se pudo subir la imagen");
    }
  }

  async function handleDeleteImage(imageUrl: string) {
    if (config.heroImages.includes(imageUrl)) {
      addToast(
        "warning",
        "No puedes eliminar una imagen que está en uso en el carrusel. Primero remuévela del carrusel."
      );
      return;
    }
    const imageName = imageUrl.replace("/images/", "");
    if (
      !window.confirm(
        `¿Estás seguro de que quieres eliminar la imagen "${imageName}"?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setSelectedImageForDeletion(imageUrl);
    const result = await deleteImage(imageUrl);
    setSelectedImageForDeletion(null);
    if (result.ok) {
      addToast("success", "Imagen eliminada exitosamente");
    } else {
      addToast("error", result.error ?? "No se pudo eliminar la imagen");
    }
  }

  if (loading) {
    return (
      <AuthGuard requiredRole={["AGENT", "SUPERADMIN", "MASTER"]}>
        <AdminNavBar />
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            Cargando configuración...
          </div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={["AGENT", "SUPERADMIN", "MASTER"]}>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "1400px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>Configurar Carrusel de Portada</h1>
          <Link
            href="/admin"
            onClick={handleVolverClick}
            style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}
            aria-label="Volver al panel de administración"
          >
            ← Volver
          </Link>
        </div>

        {isDirty && (
          <div
            className="card"
            style={{
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              background: "var(--color-warning-bg, #fffbeb)",
              border: "1px solid var(--color-warning, #f59e0b)",
              color: "var(--color-warning, #b45309)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 600 }}>● Tienes cambios sin guardar</span>
            <button
              type="button"
              onClick={handleRestore}
              style={{
                padding: "0.5rem 1rem",
                background: "#6b7280",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Restaurar último guardado
            </button>
          </div>
        )}

        {configError && (
          <div
            className="card"
            style={{
              padding: "1rem",
              marginBottom: "1rem",
              background: "var(--color-error, #fef2f2)",
              color: "var(--color-error, #b91c1c)",
            }}
          >
            {configError}
          </div>
        )}

        <HeroCarouselSection
          config={config}
          setConfig={setConfig}
          availableImages={availableImages}
          onFileUpload={handleFileUpload}
          onDeleteImage={handleDeleteImage}
          uploading={uploading}
          deleting={deleting}
          selectedImageForDeletion={selectedImageForDeletion}
          validationError={validationErrors.heroImages}
        />
        <HeroAppearanceSection
          config={config}
          setConfig={setConfig}
          validationError={validationErrors.heroAutoSlideInterval}
        />
        <PreviewSection
          config={config}
          showPreview={showPreview}
          setShowPreview={setShowPreview}
          previewDevice={previewDevice}
          setPreviewDevice={setPreviewDevice}
          onOpenInNewTab={() => {
            const previewConfig = { ...config, sectionOrder: null, sectionVisibility: null };
            window.open(
              `/preview?config=${encodeURIComponent(JSON.stringify(previewConfig))}`,
              "_blank"
            );
          }}
          onSave={handleSave}
          saving={saving}
          isDirty={isDirty}
        />
      </main>
    </AuthGuard>
  );
}

export default function PaginaPrincipalPage() {
  return (
    <ToastProvider>
      <PaginaPrincipalContent />
    </ToastProvider>
  );
}
