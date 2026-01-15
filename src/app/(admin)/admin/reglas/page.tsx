"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";

function ReglasPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  useEffect(() => {
    if (auth?.token) {
      setLoading(true);
      fetch("/api/admin/rules", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            console.error("Error:", data.error);
            setLoading(false);
            return;
          }
          setContent(data.content || "");
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error al cargar reglas:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [auth]);

  function insertTag(tag: string, placeholder?: string) {
    const textarea = document.getElementById("rules-editor") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);

    let insertText = "";
    switch (tag) {
      case "h1":
        insertText = `<h1>${selectedText || placeholder || "Título Principal"}</h1>`;
        break;
      case "h2":
        insertText = `<h2>${selectedText || placeholder || "Subtítulo"}</h2>`;
        break;
      case "h3":
        insertText = `<h3>${selectedText || placeholder || "Título Menor"}</h3>`;
        break;
      case "p":
        insertText = `<p>${selectedText || placeholder || "Párrafo"}</p>`;
        break;
      case "strong":
        insertText = `<strong>${selectedText || placeholder || "Texto en negrita"}</strong>`;
        break;
      case "em":
        insertText = `<em>${selectedText || placeholder || "Texto en cursiva"}</em>`;
        break;
      case "ul":
        insertText = `<ul>\n  <li>${selectedText || placeholder || "Elemento de lista"}</li>\n</ul>`;
        break;
      case "ol":
        insertText = `<ol>\n  <li>${selectedText || placeholder || "Elemento numerado"}</li>\n</ol>`;
        break;
      case "link":
        insertText = `<a href="${placeholder || "https://ejemplo.com"}" target="_blank" rel="noopener noreferrer">${selectedText || "Texto del enlace"}</a>`;
        break;
      case "img":
        insertText = `<img src="${placeholder || "https://ejemplo.com/imagen.jpg"}" alt="${selectedText || "Descripción de la imagen"}" style="max-width: 100%; height: auto;" />`;
        break;
      case "hr":
        insertText = `<hr />`;
        break;
      case "br":
        insertText = `<br />`;
        break;
      default:
        return;
    }

    const newContent = before + insertText + after;
    setContent(newContent);

    // Restaurar el foco y la posición del cursor
    setTimeout(() => {
      textarea.focus();
      const newPos = start + insertText.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }

  async function handleSave() {
    if (!auth?.token) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        alert("Reglas actualizadas exitosamente");
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "No se pudo guardar"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "1200px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1>Reglas de Sorteos</h1>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                padding: ".5rem 1rem",
                borderRadius: "8px",
                border: "1px solid #d4d4c4",
                background: showPreview ? "#85BB65" : "#F5F5E6",
                color: showPreview ? "#fff" : "#3E3E3C",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              {showPreview ? "Editar" : "Vista Previa"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: ".5rem 1rem",
                borderRadius: "8px",
                border: "none",
                background: "#85BB65",
                color: "#fff",
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : showPreview ? (
          <div className="card" style={{ padding: "2rem" }}>
            <div
              dangerouslySetInnerHTML={{ __html: content || "<p>No hay contenido para mostrar</p>" }}
              style={{
                lineHeight: "1.6",
                color: "#3E3E3C"
              }}
            />
          </div>
        ) : (
          <div className="card" style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", padding: ".75rem", background: "#F5F5E6", borderRadius: "8px", border: "1px solid #d4d4c4" }}>
              <button
                onClick={() => insertTag("h1")}
                style={{ padding: ".5rem .75rem", borderRadius: "4px", border: "1px solid #d4d4c4", background: "#fff", cursor: "pointer", fontSize: ".875rem" }}
                title="Título Principal"
              >
                H1
              </button>
              <button
                onClick={() => insertTag("h2")}
                style={{ padding: ".5rem .75rem", borderRadius: "4px", border: "1px solid #d4d4c4", background: "#fff", cursor: "pointer", fontSize: ".875rem" }}
                title="Subtítulo"
              >
                H2
              </button>
              <button
                onClick={() => insertTag("h3")}
                style={{ padding: ".5rem .75rem", borderRadius: "4px", border: "1px solid #d4d4c4", background: "#fff", cursor: "pointer", fontSize: ".875rem" }}
                title="Título Menor"
              >
                H3
              </button>
              <button
                onClick={() => insertTag("p")}
                style={{ padding: ".5rem .75rem", borderRadius: "4px", border: "1px solid #d4d4c4", background: "#fff", cursor: "pointer", fontSize: ".875rem" }}
                title="Párrafo"
              >
                P
              </button>
              <button
                onClick={() => insertTag("strong")}
                style={{ padding: ".5rem .75rem", borderRadius: "4px", border: "1px solid #d4d4c4", background: "#fff", cursor: "pointer", fontSize: ".875rem", fontWeight: 700 }}
                title="Negrita"
              >
                <strong>B</strong>
              </button>
              <button
                onClick={() => insertTag("em")}
                style={{ padding: ".5rem .75rem", borderRadius: "4px", border: "1px solid #d4d4c4", background: "#fff", cursor: "pointer", fontSize: ".875rem", fontStyle: "italic" }}
                title="Cursiva"
              >
                I
              </button>
              <button
                onClick={() => {
                  const url = prompt("Ingresa la URL de la imagen:");
                  if (url) {
                    insertTag("img", url);
                  }
                }}
                style={{ padding: ".5rem .75rem", borderRadius: "4px", border: "1px solid #d4d4c4", background: "#fff", cursor: "pointer", fontSize: ".875rem" }}
                title="Insertar Imagen"
              >
                🖼️
              </button>
              <button
                onClick={() => {
                  const url = prompt("Ingresa la URL del enlace:");
                  if (url) {
                    insertTag("link", url);
                  }
                }}
                style={{ padding: ".5rem .75rem", borderRadius: "4px", border: "1px solid #d4d4c4", background: "#fff", cursor: "pointer", fontSize: ".875rem" }}
                title="Insertar Enlace"
              >
                🔗
              </button>
              <button
                onClick={() => insertTag("ul")}
                style={{ padding: ".5rem .75rem", borderRadius: "4px", border: "1px solid #d4d4c4", background: "#fff", cursor: "pointer", fontSize: ".875rem" }}
                title="Lista con viñetas"
              >
                • Lista
              </button>
              <button
                onClick={() => insertTag("ol")}
                style={{ padding: ".5rem .75rem", borderRadius: "4px", border: "1px solid #d4d4c4", background: "#fff", cursor: "pointer", fontSize: ".875rem" }}
                title="Lista numerada"
              >
                1. Lista
              </button>
              <button
                onClick={() => insertTag("hr")}
                style={{ padding: ".5rem .75rem", borderRadius: "4px", border: "1px solid #d4d4c4", background: "#fff", cursor: "pointer", fontSize: ".875rem" }}
                title="Línea horizontal"
              >
                ─
              </button>
            </div>
            <textarea
              id="rules-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={25}
              style={{
                padding: "1rem",
                borderRadius: "8px",
                border: "1px solid #d4d4c4",
                background: "#F5F5E6",
                color: "#3E3E3C",
                fontFamily: "monospace",
                fontSize: ".875rem",
                lineHeight: "1.5",
                resize: "vertical"
              }}
              placeholder="Ingresa las reglas de los sorteos usando HTML. Usa los botones de arriba para insertar elementos comunes..."
            />
            <div style={{ padding: ".75rem", background: "#e5e7eb", borderRadius: "8px", fontSize: ".875rem", color: "#3E3E3C" }}>
              <strong>💡 Consejos:</strong>
              <ul style={{ margin: ".5rem 0 0 1.5rem", padding: 0 }}>
                <li>Puedes usar HTML directamente para formatear el contenido</li>
                <li>Usa los botones de arriba para insertar elementos comunes</li>
                <li>Para imágenes, usa URLs completas (https://...)</li>
                <li>Para enlaces, asegúrate de incluir el protocolo (http:// o https://)</li>
                <li>Usa "Vista Previa" para ver cómo se verá el contenido</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function ReglasPage() {
  return (
    <AuthGuard requiredRole={["MASTER"]}>
      <ReglasPageContent />
    </AuthGuard>
  );
}
