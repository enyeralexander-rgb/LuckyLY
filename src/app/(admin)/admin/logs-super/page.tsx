"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";

type Log = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  createdAt: string;
  actor: { name: string; email: string } | null;
  meta: any;
};

function LogsSuperPageContent() {
  const auth = getStoredAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth?.token) {
      setLoading(true);
      fetch("/api/admin/logs/superadmins", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => {
          if (!r.ok) {
            return r.json().then((data) => {
              throw new Error(data.error || "Error al obtener logs");
            });
          }
          return r.json();
        })
        .then((data) => {
          // Asegurar que data sea un array
          if (Array.isArray(data)) {
            setLogs(data);
          } else if (data.error) {
            console.error("Error:", data.error);
            setLogs([]);
          } else {
            console.error("Respuesta inesperada:", data);
            setLogs([]);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error al cargar logs:", err);
          setLogs([]);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [auth]);

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <h1>Logs de Superadministradores</h1>
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : logs.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No hay logs registrados</div>
        ) : (
          <div className="card" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2937" }}>
                  <th style={{ padding: ".75rem", textAlign: "left" }}>Fecha</th>
                  <th style={{ padding: ".75rem", textAlign: "left" }}>Superadmin</th>
                  <th style={{ padding: ".75rem", textAlign: "left" }}>Acción</th>
                  <th style={{ padding: ".75rem", textAlign: "left" }}>Entidad</th>
                  <th style={{ padding: ".75rem", textAlign: "left" }}>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #1f2937" }}>
                    <td style={{ padding: ".75rem", fontSize: ".875rem" }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: ".75rem" }}>{log.actor?.name || "N/A"}</td>
                    <td style={{ padding: ".75rem" }}>{log.action}</td>
                    <td style={{ padding: ".75rem", fontSize: ".875rem" }}>
                      {log.entity} {log.entityId ? `#${log.entityId}` : ""}
                    </td>
                    <td style={{ padding: ".75rem", fontSize: ".875rem", color: "#94a3b8" }}>
                      {log.meta ? JSON.stringify(log.meta).substring(0, 50) + "..." : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

export default function LogsSuperPage() {
  return (
    <AuthGuard requiredRole={["MASTER"]}>
      <LogsSuperPageContent />
    </AuthGuard>
  );
}
