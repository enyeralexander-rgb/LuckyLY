"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortableCarouselRowProps = {
  id: number;
  img: string;
  index: number;
  total: number;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
};

export function SortableCarouselRow({
  id,
  img,
  index,
  total,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SortableCarouselRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    padding: "0.75rem",
    flexWrap: "wrap",
    background: isDragging ? "#d0fdd7" : "#ffffff",
    borderRadius: "8px",
    border: isDragging ? "2px solid #2a8c4a" : "1px solid #d0fdd7",
    cursor: "grab",
    transition,
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp(index);
          }}
          disabled={index === 0}
          aria-label="Subir imagen en el carrusel"
          style={{
            padding: "0.25rem 0.5rem",
            background: index === 0 ? "#9ca3af" : "#2a8c4a",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: index === 0 ? "not-allowed" : "pointer",
            fontSize: "0.75rem",
          }}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown(index);
          }}
          disabled={index === total - 1}
          aria-label="Bajar imagen en el carrusel"
          style={{
            padding: "0.25rem 0.5rem",
            background: index === total - 1 ? "#9ca3af" : "#2a8c4a",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: index === total - 1 ? "not-allowed" : "pointer",
            fontSize: "0.75rem",
          }}
        >
          ↓
        </button>
      </div>
      <div
        style={{
          width: "120px",
          height: "80px",
          backgroundImage: `url(${img})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: "4px",
          border: "1px solid var(--border-color)",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, fontSize: "0.875rem", color: "var(--text-primary)", wordBreak: "break-all" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Imagen {index + 1}</div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{img}</div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        disabled={total === 1}
        aria-label={`Quitar imagen ${index + 1} del carrusel`}
        style={{
          padding: "0.5rem 1rem",
          background: "#ef4444",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: total === 1 ? "not-allowed" : "pointer",
        }}
      >
        ✖
      </button>
    </div>
  );
}
