"use client";

import { useState, useEffect, useCallback } from "react";
import type { ImageFile } from "../types";
import { UPLOAD_MAX_SIZE_BYTES } from "../types";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

export function useAvailableImages(token: string | null) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setImages([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/homepage/images", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.images) {
        setImages(data.images);
      }
    } catch (err) {
      console.error("Error cargando imágenes:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upload = useCallback(
    async (file: File): Promise<{ ok: boolean; url?: string; error?: string }> => {
      if (!token) return { ok: false, error: "No autenticado" };
      if (!ALLOWED_TYPES.includes(file.type)) {
        return { ok: false, error: "Tipo de archivo no permitido. Solo: JPG, PNG, GIF, WEBP" };
      }
      if (file.size > UPLOAD_MAX_SIZE_BYTES) {
        return { ok: false, error: "El archivo es muy grande. Tamaño máximo: 5MB" };
      }
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/homepage/images/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          await refresh();
          return { ok: true, url: data.url };
        }
        return { ok: false, error: data.error || "No se pudo subir la imagen" };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al subir";
        return { ok: false, error: msg };
      } finally {
        setUploading(false);
      }
    },
    [token, refresh]
  );

  const deleteImage = useCallback(
    async (imageUrl: string): Promise<{ ok: boolean; error?: string }> => {
      if (!token) return { ok: false, error: "No autenticado" };
      setDeleting(true);
      try {
        const res = await fetch("/api/admin/homepage/images/delete", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imageUrl }),
        });
        const data = await res.json();
        if (res.ok) {
          await refresh();
          return { ok: true };
        }
        return { ok: false, error: data.error || "No se pudo eliminar la imagen" };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al eliminar";
        return { ok: false, error: msg };
      } finally {
        setDeleting(false);
      }
    },
    [token, refresh]
  );

  return { images, loading, uploading, deleting, refresh, upload, deleteImage };
}
