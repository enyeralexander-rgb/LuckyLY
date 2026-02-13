"use client";

import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SectionCard } from "./SectionCard";
import { SortableCarouselRow } from "./SortableCarouselRow";
import { useToast } from "./ToastContext";
import type { HomePageConfig, ImageFile } from "../types";
import { MAX_HERO_IMAGES, DEFAULT_HERO_IMAGE } from "../types";

type HeroCarouselSectionProps = {
  config: HomePageConfig;
  setConfig: React.Dispatch<React.SetStateAction<HomePageConfig>>;
  availableImages: ImageFile[];
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteImage: (imageUrl: string) => void;
  uploading: boolean;
  deleting: boolean;
  selectedImageForDeletion: string | null;
  validationError?: string;
};

export function HeroCarouselSection({
  config,
  setConfig,
  availableImages,
  onFileUpload,
  onDeleteImage,
  uploading,
  deleting,
  selectedImageForDeletion,
  validationError,
}: HeroCarouselSectionProps) {
  const addToast = useToast();
  const [showImageSelector, setShowImageSelector] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  function selectImage(imageUrl: string) {
    if (config.heroImages.length >= MAX_HERO_IMAGES) {
      addToast("warning", `Máximo ${MAX_HERO_IMAGES} imágenes permitidas. Elimina una imagen primero.`);
      return;
    }
    if (config.heroImages.includes(imageUrl)) {
      addToast("warning", "Esta imagen ya está seleccionada");
      return;
    }
    setConfig((c) => ({ ...c, heroImages: [...c.heroImages, imageUrl].slice(0, MAX_HERO_IMAGES) }));
    setShowImageSelector(false);
  }

  function removeHeroImage(index: number) {
    const newImages = [...config.heroImages];
    newImages.splice(index, 1);
    setConfig((c) => ({
      ...c,
      heroImages: newImages.length > 0 ? newImages : [DEFAULT_HERO_IMAGE],
    }));
  }

  function moveImageUp(index: number) {
    if (index === 0) return;
    const newImages = [...config.heroImages];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    setConfig((c) => ({ ...c, heroImages: newImages }));
  }

  function moveImageDown(index: number) {
    if (index === config.heroImages.length - 1) return;
    const newImages = [...config.heroImages];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    setConfig((c) => ({ ...c, heroImages: newImages }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over == null || active.id === over.id) return;
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    if (Number.isNaN(oldIndex) || Number.isNaN(newIndex)) return;
    const newImages = arrayMove(config.heroImages, oldIndex, newIndex);
    setConfig((c) => ({ ...c, heroImages: newImages }));
  }

  const imageList = availableImages.filter((img) => img.type === "image");
  const sortableIds = config.heroImages.map((_, i) => i);

  return (
    <SectionCard title="🖼️ Carrusel de Imágenes de Portada" collapsible storageKey="carousel">
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              Imágenes del Carrusel (Máximo {MAX_HERO_IMAGES})
            </span>
            <span style={{ fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
              {config.heroImages.length}/{MAX_HERO_IMAGES}
            </span>
          </div>
          {validationError && (
            <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem", color: "var(--color-error, #ef4444)" }}>
              {validationError}
            </div>
          )}
          {config.heroImages.length > 0 && (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <div style={{ display: "grid", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  {config.heroImages.map((img, index) => (
                    <SortableCarouselRow
                      key={`${img}-${index}`}
                      id={index}
                      img={img}
                      index={index}
                      total={config.heroImages.length}
                      onRemove={removeHeroImage}
                      onMoveUp={moveImageUp}
                      onMoveDown={moveImageDown}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {config.heroImages.length < MAX_HERO_IMAGES && (
            <>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setShowImageSelector(!showImageSelector)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "#2a8c4a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {showImageSelector ? "✖ Cerrar Selector" : "📁 SELECCIONAR ARCHIVO"}
                </button>
                <label
                  htmlFor="file-upload-carousel"
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: uploading ? "#6b7280" : "#3b82f6",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: uploading ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    display: "inline-block",
                  }}
                >
                  {uploading ? "⏳ Subiendo..." : "📤 SUBIR ARCHIVO"}
                </label>
                <input
                  id="file-upload-carousel"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/webm,video/ogg"
                  onChange={onFileUpload}
                  disabled={uploading}
                  style={{ display: "none" }}
                />
              </div>

              {showImageSelector && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    background: "var(--card-bg)",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <h4 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>
                    Imágenes Disponibles en /public/images/
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                      gap: "1rem",
                      maxHeight: "400px",
                      overflowY: "auto",
                    }}
                  >
                    {imageList.map((img) => (
                      <div
                        key={img.url}
                        style={{
                          position: "relative",
                          padding: "0.5rem",
                          background: config.heroImages.includes(img.url) ? "#9ca3af" : "#fff",
                          borderRadius: "8px",
                          border: config.heroImages.includes(img.url)
                            ? "2px solid #9ca3af"
                            : "2px solid #d4d4c4",
                          transition: "all 0.2s",
                        }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => selectImage(img.url)}
                          onKeyDown={(e) => e.key === "Enter" && selectImage(img.url)}
                          style={{
                            cursor: config.heroImages.includes(img.url) ? "not-allowed" : "pointer",
                            opacity: config.heroImages.includes(img.url) ? 0.5 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!config.heroImages.includes(img.url)) {
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.style.borderColor = "#2a8c4a";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!config.heroImages.includes(img.url)) {
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.style.borderColor = "#d4d4c4";
                                e.currentTarget.style.transform = "scale(1)";
                              }
                            }
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: "100px",
                              backgroundImage: `url(${img.url})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                              borderRadius: "4px",
                              maxWidth: "100%",
                            }}
                          />
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-primary)",
                              marginTop: "0.25rem",
                              textAlign: "center",
                              wordBreak: "break-all",
                            }}
                          >
                            {img.name}
                          </div>
                          {config.heroImages.includes(img.url) && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-tertiary)",
                                textAlign: "center",
                                marginTop: "0.25rem",
                              }}
                            >
                              ✓ Seleccionada
                            </div>
                          )}
                        </div>
                        {!config.heroImages.includes(img.url) && (
                          <button
                            type="button"
                            onClick={() => onDeleteImage(img.url)}
                            disabled={deleting && selectedImageForDeletion === img.url}
                            style={{
                              position: "absolute",
                              top: "0.5rem",
                              right: "0.5rem",
                              padding: "0.25rem 0.5rem",
                              background:
                                deleting && selectedImageForDeletion === img.url ? "#6b7280" : "#ef4444",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              cursor:
                                deleting && selectedImageForDeletion === img.url ? "not-allowed" : "pointer",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              zIndex: 10,
                            }}
                            title="Borrar imagen"
                          >
                            {deleting && selectedImageForDeletion === img.url ? "..." : "🗑️"}
                          </button>
                        )}
                      </div>
                    ))}
                    {imageList.length === 0 && (
                      <div
                        style={{
                          gridColumn: "1/-1",
                          textAlign: "center",
                          color: "var(--text-tertiary)",
                          padding: "2rem",
                        }}
                      >
                        No hay imágenes disponibles en /public/images/
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
