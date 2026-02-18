"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import Link from "next/link";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  order: number;
  active: boolean;
};

function FaqAdminPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<FaqItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  useEffect(() => {
    if (auth?.token) loadItems();
  }, [auth]);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/faq", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.ok) {
        setItems(await res.json());
      }
    } catch {}
    setLoading(false);
  }

  function openNew() {
    setEditItem(null);
    setQuestion("");
    setAnswer("");
    setShowModal(true);
  }

  function openEdit(item: FaqItem) {
    setEditItem(item);
    setQuestion(item.question);
    setAnswer(item.answer);
    setShowModal(true);
  }

  async function handleSave() {
    if (!auth?.token || !question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      if (editItem) {
        const res = await fetch(`/api/admin/faq/${editItem.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify({ question, answer }),
        });
        if (!res.ok) { alert("Error al actualizar"); return; }
      } else {
        const res = await fetch("/api/admin/faq", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify({ question, answer }),
        });
        if (!res.ok) { alert("Error al crear"); return; }
      }
      setShowModal(false);
      loadItems();
    } catch {
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!auth?.token || !confirm("¿Eliminar esta pregunta?")) return;
    try {
      await fetch(`/api/admin/faq/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ method: "delete" }),
      });
      loadItems();
    } catch {
      alert("Error al eliminar");
    }
  }

  async function handleToggleActive(item: FaqItem) {
    if (!auth?.token) return;
    try {
      await fetch(`/api/admin/faq/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ active: !item.active }),
      });
      loadItems();
    } catch {
      alert("Error al cambiar estado");
    }
  }

  async function handleMove(index: number, direction: "up" | "down") {
    if (!auth?.token) return;
    const newItems = [...items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    setItems(newItems);
    try {
      await fetch("/api/admin/faq/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ ids: newItems.map((i) => i.id) }),
      });
    } catch {
      loadItems(); // Revert on error
    }
  }

  if (!auth) return null;

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "900px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>Preguntas Frecuentes (FAQ)</h1>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={openNew}
              style={{ padding: "0.5rem 1rem", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
            >
              + Nueva Pregunta
            </button>
            <Link href="/admin" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : items.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No hay preguntas frecuentes. Crea una con el botón arriba.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {items.map((item, index) => (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: "1.25rem",
                  opacity: item.active ? 1 : 0.5,
                  borderLeft: item.active ? "4px solid var(--color-primary)" : "4px solid #6b7280",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 0.5rem", color: "var(--text-primary)", fontSize: "1.1rem" }}>
                      {item.question}
                    </h3>
                    <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
                      {item.answer.length > 200 ? item.answer.slice(0, 200) + "..." : item.answer}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flexShrink: 0 }}>
                    <button
                      onClick={() => handleMove(index, "up")}
                      disabled={index === 0}
                      style={{ padding: "0.25rem 0.5rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "4px", cursor: index === 0 ? "default" : "pointer", opacity: index === 0 ? 0.3 : 1, fontSize: "0.8rem" }}
                      title="Mover arriba"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMove(index, "down")}
                      disabled={index === items.length - 1}
                      style={{ padding: "0.25rem 0.5rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "4px", cursor: index === items.length - 1 ? "default" : "pointer", opacity: index === items.length - 1 ? 0.3 : 1, fontSize: "0.8rem" }}
                      title="Mover abajo"
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                  <button
                    onClick={() => openEdit(item)}
                    style={{ padding: "0.35rem 0.75rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleToggleActive(item)}
                    style={{ padding: "0.35rem 0.75rem", background: item.active ? "#f59e0b" : "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}
                  >
                    {item.active ? "⏸ Desactivar" : "▶ Activar"}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{ padding: "0.35rem 0.75rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "var(--card-bg)", borderRadius: "12px", padding: "2rem", maxWidth: "600px", width: "100%", maxHeight: "85vh", overflow: "auto" }}>
            <h2 style={{ margin: "0 0 1.5rem", color: "var(--text-primary)" }}>
              {editItem ? "Editar Pregunta" : "Nueva Pregunta"}
            </h2>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--text-primary)" }}>Pregunta</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.95rem" }}
                  placeholder="¿Cómo puedo participar en un sorteo?"
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--text-primary)" }}>Respuesta</label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={6}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.95rem", resize: "vertical", fontFamily: "inherit" }}
                  placeholder="Para participar en un sorteo, debes crear una cuenta..."
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button
                onClick={handleSave}
                disabled={saving || !question.trim() || !answer.trim()}
                style={{ flex: 1, padding: "0.75rem", background: saving ? "#6b7280" : "#10b981", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: "0.75rem", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function FaqAdminPage() {
  return (
    <AuthGuard requiredRole={["MASTER"]}>
      <FaqAdminPageContent />
    </AuthGuard>
  );
}
